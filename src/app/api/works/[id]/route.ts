import { NextResponse } from "next/server";
import {
  CollaborationProjectStatus,
  CommerceAggregateType,
  ContentStatus,
  LimitedPreorderStatus,
  Prisma,
  ProjectDesignAuthorizationStatus,
  ProjectProductStatus,
  ReviewStatus
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canHardDeleteWork,
  canOfflineWork,
  canResubmitOfflineWork,
  getWorkDeleteDependencies,
  lifecycleConflict
} from "@/lib/content-lifecycle";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { canEditWork } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assertNoLimitedPreorderPaymentSolicitation } from "@/lib/projects/preorder-lifecycle";
import { pendingVisibleState } from "@/lib/works/mutations";
import { workPatchSchema } from "@/lib/works/validation";

type WorkRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const WORK_OFFLINE_PREORDER_NOTICE = "关联作品已下架，本期预售已自动暂停接单；已有订单意向会保留，平台正在核查版权、内容与后续处理。";

async function runWorkLifecycleTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("作品下架与预售暂停发生并发冲突，请刷新后重试");
}

function isConfiguredLimitedPreorder(campaign: {
  preorderStatus: LimitedPreorderStatus;
  preorderTargetQuantity: number | null;
  preorderCapacity: number | null;
  preorderDeadline: Date | null;
} | null) {
  return Boolean(campaign && (
    campaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
    || campaign.preorderTargetQuantity !== null
    || campaign.preorderCapacity !== null
    || campaign.preorderDeadline !== null
  ));
}

function workOfferIsLocked(project: {
  presaleCampaign: {
    id: string;
    preorderStatus: LimitedPreorderStatus;
    preorderTargetQuantity: number | null;
    preorderCapacity: number | null;
    preorderDeadline: Date | null;
  } | null;
  designAuthorizations: Array<{
    status: ProjectDesignAuthorizationStatus;
    preorderCampaignId: string | null;
  }>;
}) {
  const campaign = project.presaleCampaign;
  if (!isConfiguredLimitedPreorder(campaign)) return false;
  return campaign!.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
    || project.designAuthorizations.some((authorization) => (
      authorization.preorderCampaignId === campaign!.id
      && (
        authorization.status === ProjectDesignAuthorizationStatus.PENDING
        || authorization.status === ProjectDesignAuthorizationStatus.ACCEPTED
      )
    ));
}

export async function PATCH(request: Request, context: WorkRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      images: true,
      collaborationProjects: {
        where: { presaleCampaignId: { not: null } },
        select: {
          presaleCampaign: {
            select: {
              id: true,
              preorderStatus: true,
              preorderTargetQuantity: true,
              preorderCapacity: true,
              preorderDeadline: true
            }
          },
          designAuthorizations: {
            select: { status: true, preorderCampaignId: true }
          }
        }
      }
    }
  });

  if (action) {
    if (!work || (user.role !== "ADMIN" && work.userId !== user.id)) {
      return NextResponse.json({ ok: false, message: "没有权限操作该作品。" }, { status: 403 });
    }

    if (action === "offline") {
      if (!canOfflineWork(work)) {
        return NextResponse.json({ ok: false, message: "当前作品状态不能下架；如需归档历史记录，需要后续 Migration 支持。" }, { status: 422 });
      }
      const { updated, pausedCampaignIds } = await runWorkLifecycleTransaction(async (tx) => {
        const currentWork = await tx.work.findUnique({
          where: { id },
          select: { id: true, userId: true, title: true, reviewStatus: true, contentStatus: true }
        });
        if (!currentWork || !canOfflineWork(currentWork)) {
          throw new Error("作品状态已变化，不能重复下架；请刷新后重试");
        }
        const openProjects = await tx.collaborationProject.findMany({
          where: {
            workId: id,
            presaleCampaignId: { not: null },
            presaleCampaign: { is: { preorderStatus: LimitedPreorderStatus.OPEN } }
          },
          select: { id: true, status: true, presaleCampaignId: true }
        });
        const offlineAt = new Date();
        const nextWork = await tx.work.update({
          where: { id },
          data: {
            reviewStatus: ReviewStatus.OFFLINE,
            contentStatus: ContentStatus.OFFLINE
          }
        });
        const pausedIds: string[] = [];

        for (const project of openProjects) {
          const campaignId = project.presaleCampaignId;
          if (!campaignId || pausedIds.includes(campaignId)) continue;
          const paused = await tx.presaleCampaign.updateMany({
            where: { id: campaignId, workId: id, preorderStatus: LimitedPreorderStatus.OPEN },
            data: {
              preorderStatus: LimitedPreorderStatus.PAUSED,
              preorderPausedAt: offlineAt,
              preorderDecisionReason: "关联作品下架，系统自动停止接单",
              preorderPublicNotice: WORK_OFFLINE_PREORDER_NOTICE
            }
          });
          if (paused.count !== 1) continue;

          await tx.collaborationProject.updateMany({
            where: { id: project.id, workId: id, status: CollaborationProjectStatus.PREORDER_OPEN },
            data: { status: CollaborationProjectStatus.PREORDER_READY }
          });
          await tx.projectProduct.updateMany({
            where: { projectId: project.id, preorderCampaignId: campaignId, status: ProjectProductStatus.PREORDER_OPEN },
            data: { status: ProjectProductStatus.PAUSED }
          });
          await tx.commerceStateEvent.create({
            data: {
              aggregateType: CommerceAggregateType.CAMPAIGN,
              aggregateId: campaignId,
              fromState: LimitedPreorderStatus.OPEN,
              toState: LimitedPreorderStatus.PAUSED,
              actorId: user.id,
              reason: "WORK_OFFLINED",
              metadata: { projectId: project.id, workId: id, automatic: true }
            }
          });
          await tx.adminLog.create({
            data: {
              adminId: user.id,
              action: "WORK_OFFLINE_PAUSE_LIMITED_PREORDER",
              targetType: "PresaleCampaign",
              targetId: campaignId,
              detail: {
                projectId: project.id,
                workId: id,
                oldCampaignStatus: LimitedPreorderStatus.OPEN,
                newCampaignStatus: LimitedPreorderStatus.PAUSED,
                oldProjectStatus: project.status,
                publicNotice: WORK_OFFLINE_PREORDER_NOTICE
              }
            }
          });
          pausedIds.push(campaignId);
        }

        return { updated: nextWork, pausedCampaignIds: pausedIds };
      });
      if (user.role === "ADMIN" && updated.userId !== user.id) {
        await createNotificationSafe({
          recipientId: updated.userId,
          actorId: user.id,
          eventType: NOTIFICATION_EVENTS.WORK_OFFLINED,
          title: "作品已下架",
          body: `你的作品《${updated.title}》已被平台下架，可在作品管理中查看状态。`,
          targetUrl: "/me?tab=works"
        });
      }
      return NextResponse.json({ ok: true, action: "offline", work: updated, pausedCampaignIds });
    }

    if (action === "resubmit") {
      if (!canResubmitOfflineWork(work)) {
        return NextResponse.json({ ok: false, message: "当前作品不需要重新提交。" }, { status: 422 });
      }
      const updated = await prisma.work.update({
        where: { id },
        data: {
          ...pendingVisibleState,
          rejectReason: null
        }
      });
      return NextResponse.json({ ok: true, action: "restored", work: updated });
    }

    return NextResponse.json({ ok: false, message: "生命周期操作不支持。" }, { status: 422 });
  }

  if (!work || !canEditWork(user, work)) {
    return NextResponse.json({ message: "无权编辑该作品。" }, { status: 403 });
  }

  const parsed = workPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "请检查作品信息。" }, { status: 400 });
  }

  const data = parsed.data;

  if (work.collaborationProjects.some((project) => isConfiguredLimitedPreorder(project.presaleCampaign))) {
    try {
      if (data.title) assertNoLimitedPreorderPaymentSolicitation(data.title, "作品标题");
      if (data.description) assertNoLimitedPreorderPaymentSolicitation(data.description, "作品说明");
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : "作品信息包含不允许的付款指引。" }, { status: 422 });
    }
  }

  if (work.collaborationProjects.some(workOfferIsLocked)) {
    return NextResponse.json(
      { message: "作品已进入本期限量预售邀请或生命周期，消费者可见作品资料与图片已冻结；如需调整，请先由作者拒绝或撤销并由平台按活动状态处理。" },
      { status: 409 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const currentProjects = await tx.collaborationProject.findMany({
      where: { workId: id, presaleCampaignId: { not: null } },
      select: {
        presaleCampaign: {
          select: {
            id: true,
            preorderStatus: true,
            preorderTargetQuantity: true,
            preorderCapacity: true,
            preorderDeadline: true
          }
        },
        designAuthorizations: { select: { status: true, preorderCampaignId: true } }
      }
    });
    if (currentProjects.some(workOfferIsLocked)) {
      throw new Error("LIMITED_PREORDER_WORK_OFFER_LOCKED");
    }
    if (data.images) {
      await tx.workImage.deleteMany({
        where: {
          workId: id
        }
      });
    }

    return tx.work.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        workType: data.workType,
        styleTags: data.styleTags,
        isOriginal: data.isOriginal,
        isAiAssisted: data.isAiAssisted,
        isOpenCoop: data.isOpenCoop,
        wantsFabric: data.wantsFabric,
        wantsSample: data.wantsSample,
        wantsIncubation: data.wantsIncubation,
        ...pendingVisibleState,
        rejectReason: null,
        images: data.images
          ? {
              create: data.images.map((image, index) => ({
                imageUrl: image.imageUrl,
                sortOrder: index
              }))
            }
          : undefined
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error) => {
    if (error instanceof Error && error.message === "LIMITED_PREORDER_WORK_OFFER_LOCKED") return null;
    throw error;
  });

  if (!updated) {
    return NextResponse.json(
      { message: "作品的限量预售授权状态刚刚发生变化，资料未保存；请刷新后重新核对。" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    work: {
      ...updated,
      images: updated.images.map((image) => ({
        ...image,
        imageUrl: image.imageUrl,
        url: image.imageUrl,
        src: image.imageUrl,
        sortOrder: image.sortOrder
      }))
    }
  });
}

export async function DELETE(_request: Request, context: WorkRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const work = await prisma.work.findUnique({
    where: { id }
  });

  if (!work || (user.role !== "ADMIN" && work.userId !== user.id)) {
    return NextResponse.json({ message: "无权删除该作品。" }, { status: 403 });
  }

  const dependencies = await getWorkDeleteDependencies(id);
  if (!canHardDeleteWork(work, dependencies)) {
    if (canOfflineWork(work)) {
      return NextResponse.json(
        {
          ok: false,
          code: "USE_OFFLINE",
          message: "该作品已经公开展示，不能直接永久删除。你可以先将它下架，历史推荐、询盘和孵化记录会被保留。",
          dependencies
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      lifecycleConflict("该作品已经产生互动或合作记录，不能永久删除。你可以将它下架或保留为历史记录。", dependencies),
      { status: 409 }
    );
  }

  await prisma.work.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true, action: "deleted" });
}

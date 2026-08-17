import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectDesignAuthorizationStatus, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import {
  requestProjectDesignAuthorization,
  respondProjectDesignAuthorization,
  revokeProjectDesignAuthorization
} from "@/lib/projects/actions";
import { projectDesignAuthorizationPolicy } from "@/lib/projects/design-authorization-policy";
import {
  LIMITED_PREORDER_QUALIFICATION_LABELS,
  LIMITED_PREORDER_STATUS_LABELS,
  summarizeLimitedPreorderOrders
} from "@/lib/projects/preorder-lifecycle";
import {
  createLimitedPreorderOfferEnvelope,
  hashLimitedPreorderOfferSnapshot,
  readLimitedPreorderOfferSnapshot,
  type LimitedPreorderOfferSnapshot
} from "@/lib/projects/preorder-offer";
import { formatMoneyCents, PROJECT_AUTHORIZATION_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { isPublicQualityWork } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

function formatSnapshotDate(value: string | null) {
  if (!value) return "未设置";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "记录异常" : formatDate(parsed);
}

function OwnerOfferPreview({ snapshot }: { snapshot: LimitedPreorderOfferSnapshot }) {
  return (
    <section className="mt-4 rounded-[8px] border border-sky-200 bg-sky-50 p-4" aria-label="项目负责人发送前确认的精确开售资料">
      <p className="text-xs font-semibold tracking-[0.12em] text-sky-800/60">OWNER REVIEW · 发送前逐项确认</p>
      <h4 className="mt-1 font-semibold text-sky-950">你将发送给作者的本期精确开售资料</h4>
      <p className="mt-2 text-xs leading-5 text-sky-900/70">这些价格、图片、限量、交付、条款与 SKU 由你确认后发送；平台不会代替你或作者决定。任何字段变化都会产生新指纹并要求重新邀请。</p>
      <div className="mt-3 rounded-[6px] bg-white p-3 text-xs leading-5 text-ink/58">
        <p className="font-semibold text-ink">项目：{snapshot.projectTitle}</p>
        {snapshot.projectDescription ? <p className="mt-1">{snapshot.projectDescription}</p> : null}
        <p className="mt-1">项目目标：{snapshot.projectTargetQuantity ?? "未填写"} · 项目预算：{snapshot.projectEstimatedBudget ?? "未填写"}</p>
        <p className="mt-2 font-semibold text-ink">作品：{snapshot.workTitle}</p>
        {snapshot.workDescription ? <p className="mt-1">{snapshot.workDescription}</p> : null}
        <p className="mt-2 font-semibold text-ink">活动：{snapshot.campaignTitle}</p>
        {snapshot.campaignDescription ? <p className="mt-1">{snapshot.campaignDescription}</p> : null}
        <p className="mt-1">预计价格：{snapshot.campaignEstimatedPrice ?? "未填写"} · {snapshot.campaignPriceNote ?? "无价格补充说明"}</p>
        <p className="mt-1">活动尺码：{snapshot.campaignSizeOptions.join(" / ") || "未填写"} · 活动颜色：{snapshot.campaignColorOptions.join(" / ") || "未填写"}</p>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[6px] bg-white p-3"><dt className="text-ink/40">成团目标</dt><dd className="mt-1 font-semibold">{snapshot.targetQuantity ?? "未设置"} 件</dd></div>
        <div className="rounded-[6px] bg-white p-3"><dt className="text-ink/40">总限量</dt><dd className="mt-1 font-semibold">{snapshot.capacity ?? "未设置"} 件</dd></div>
        <div className="rounded-[6px] bg-white p-3"><dt className="text-ink/40">截止时间</dt><dd className="mt-1 font-semibold">{formatSnapshotDate(snapshot.deadline)}</dd></div>
        <div className="rounded-[6px] bg-white p-3"><dt className="text-ink/40">条款版本</dt><dd className="mt-1 font-semibold">{snapshot.termsVersion}</dd></div>
      </dl>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {snapshot.displayImageUrls.map((imageUrl, index) => (
          <img key={imageUrl} src={imageUrl} alt={`本期开售展示图 ${index + 1}`} className="aspect-[4/3] w-full rounded-[6px] bg-white object-cover" />
        ))}
      </div>
      <p className="mt-3 whitespace-pre-wrap rounded-[6px] bg-white p-3 text-xs leading-5 text-ink/58">{snapshot.termsText}</p>
      <div className="mt-3 space-y-3">
        {snapshot.products.map((product) => (
          <article key={product.id} className="rounded-[7px] bg-white p-4 text-xs leading-5 text-ink/58">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h5 className="font-semibold text-ink">{product.title}</h5>
              <span className="font-semibold text-ink">{formatMoneyCents(product.price, product.currency)} · 目标 {product.targetQuantity ?? "未设"} · 限 {product.preorderLimit ?? "未设"}</span>
            </div>
            <p className="mt-2">{product.description}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p><span className="font-semibold text-ink/70">图片阶段：</span>{product.imageStage}</p>
              <p><span className="font-semibold text-ink/70">预计发货：</span>{formatSnapshotDate(product.estimatedShipDate)}</p>
              <p><span className="font-semibold text-ink/70">面料与工艺：</span>{product.materialDescription}</p>
              <p><span className="font-semibold text-ink/70">护理：</span>{product.careInstructions}</p>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {product.skus.map((sku) => (
                <p key={sku.id} className="rounded-[5px] bg-paper p-2">{sku.size} / {sku.color} · 容量 {sku.capacity ?? "未设"} · {formatMoneyCents(sku.priceOverride ?? product.price, product.currency)}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function MyDesignAuthorizationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/authorizations");

  const [authorizations, outgoingProjects] = await Promise.all([
    prisma.projectDesignAuthorization.findMany({
    where: { designerUserId: user.id },
    include: {
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          targetQuantity: true,
          estimatedBudget: true,
          workId: true,
          ownerUserId: true,
          createdById: true,
          designerAuthorizationStatus: true,
          work: {
            select: {
              userId: true,
              title: true,
              description: true,
              reviewStatus: true,
              contentStatus: true,
              visibility: true,
              images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } }
            }
          },
          presaleCampaign: {
            select: {
              id: true,
              workId: true,
              title: true,
              description: true,
              estimatedPrice: true,
              priceNote: true,
              sizeOptions: true,
              colorOptions: true,
              preorderStatus: true,
              preorderQualificationMode: true,
              preorderTargetQuantity: true,
              preorderCapacity: true,
              preorderDeadline: true,
              preorderTermsVersion: true,
              preorderTermsText: true,
              preorderPaymentInstructions: true,
              preorderPublicNotice: true,
              preorderOrders: {
                select: {
                  quantity: true, status: true, paymentStatus: true, fulfillmentStatus: true,
                  confirmedAt: true,
                  confirmedById: true,
                  confirmationChannel: true,
                  confirmationEvidenceRef: true,
                  confirmationSummary: true,
                  productSnapshot: true
                }
              }
            }
          },
          products: { include: { skus: true } }
        }
      },
      work: { select: { id: true, title: true } },
      owner: { select: { nickname: true } }
    },
    orderBy: { requestedAt: "desc" }
    }),
    user.role === UserRole.ADMIN ? Promise.resolve([]) : prisma.collaborationProject.findMany({
      where: {
        OR: [
          { ownerUserId: user.id },
          { ownerUserId: null, createdById: user.id }
        ],
        workId: { not: null }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        targetQuantity: true,
        estimatedBudget: true,
        ownerUserId: true,
        createdById: true,
        designerAuthorizationStatus: true,
        work: {
          select: {
            id: true,
            title: true,
            description: true,
            userId: true,
            user: { select: { nickname: true } },
            images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } }
          }
        },
        designAuthorizations: {
          select: {
            status: true,
            preorderCampaignId: true,
            termsVersion: true,
            scope: true,
            royaltyDescription: true,
            requestedAt: true,
            ownerUserId: true,
            workId: true,
            designerUserId: true,
            offerHash: true,
            offerSnapshot: true
          },
          take: 1
        },
        presaleCampaign: {
          select: {
            id: true,
            workId: true,
            title: true,
            description: true,
            estimatedPrice: true,
            priceNote: true,
            sizeOptions: true,
            colorOptions: true,
            preorderStatus: true,
            preorderQualificationMode: true,
            preorderTargetQuantity: true,
            preorderCapacity: true,
            preorderDeadline: true,
            preorderTermsVersion: true,
            preorderTermsText: true,
            preorderPaymentInstructions: true
          }
        },
        products: { include: { skus: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 50
    })
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-ink/40">DESIGN RIGHTS</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">设计授权</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">项目方可以发起合作请求，但不能代替你同意。请先核对作品、授权范围、分成说明与条款版本，再独立决定接受或拒绝。成团前可以撤销；已经成团或进入生产后，需通过项目异常、取消与退款流程处理。</p>
        </div>
        <Link href="/me/projects" className="inline-flex min-h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink">返回我的项目</Link>
      </div>

      <section className="mt-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-ink/35">PROJECT INITIATOR</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">我发起的授权邀请</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">选择项目后一键发送平台标准邀请。授权对象固定为关联作品的作者；你不能代替作者接受，也不能自行修改授权范围或分成表述。</p>
        </div>
        <div className="mt-4 space-y-3">
          {outgoingProjects.length ? outgoingProjects.map((project) => {
            const authorization = project.designAuthorizations[0] ?? null;
            const campaignStatus = project.presaleCampaign?.preorderStatus ?? null;
            const currentOwnerUserId = project.ownerUserId ?? project.createdById;
            const policy = projectDesignAuthorizationPolicy(project.presaleCampaign?.id ?? null);
            const currentOffer = project.presaleCampaign && project.work
              ? createLimitedPreorderOfferEnvelope({
                  projectId: project.id,
                  projectTitle: project.title,
                  projectDescription: project.description,
                  projectTargetQuantity: project.targetQuantity,
                  projectEstimatedBudget: project.estimatedBudget,
                  workTitle: project.work.title,
                  workDescription: project.work.description,
                  campaign: project.presaleCampaign,
                  products: project.products,
                  displayImageUrls: project.work.images.map((image) => image.imageUrl)
                })
              : null;
            const frozenOffer = readLimitedPreorderOfferSnapshot(authorization?.offerSnapshot);
            const exactOfferBound = !policy.preorderCampaignId || Boolean(
              authorization?.offerHash
              && frozenOffer
              && frozenOffer.projectId === project.id
              && frozenOffer.campaignId === policy.preorderCampaignId
              && frozenOffer.workId === project.work?.id
              && hashLimitedPreorderOfferSnapshot(frozenOffer) === authorization.offerHash
            );
            const pendingRequiresStandardRefresh = Boolean(
              authorization
              && authorization.status === ProjectDesignAuthorizationStatus.PENDING
              && (
                authorization.termsVersion !== policy.termsVersion
                || authorization.preorderCampaignId !== policy.preorderCampaignId
                || authorization.scope !== policy.scope
                || authorization.royaltyDescription !== policy.royaltyNotice
                || authorization.ownerUserId !== currentOwnerUserId
                || authorization.workId !== project.work?.id
                || authorization.designerUserId !== project.work?.userId
                || !exactOfferBound
                || authorization.offerHash !== (currentOffer?.hash ?? null)
                || Boolean(currentOffer?.issues.length)
              )
            );
            const acceptedCurrentStandard = Boolean(
              authorization
              && authorization.status === ProjectDesignAuthorizationStatus.ACCEPTED
              && authorization.termsVersion === policy.termsVersion
              && authorization.preorderCampaignId === policy.preorderCampaignId
              && authorization.scope === policy.scope
              && authorization.royaltyDescription === policy.royaltyNotice
              && authorization.ownerUserId === currentOwnerUserId
              && authorization.workId === project.work?.id
              && authorization.designerUserId === project.work?.userId
              && exactOfferBound
              && authorization.offerHash === (currentOffer?.hash ?? null)
              && !currentOffer?.issues.length
            );
            const canRestoreRevoked = authorization?.status === ProjectDesignAuthorizationStatus.REVOKED
              && campaignStatus === "PAUSED";
            const lifecycleLocked = campaignStatus !== null
              && campaignStatus !== "NOT_STARTED"
              && !canRestoreRevoked;
            const offerReady = !currentOffer || currentOffer.issues.length === 0;
            const canSend = offerReady && !lifecycleLocked && (
              !authorization
              || authorization.status === ProjectDesignAuthorizationStatus.REJECTED
              || authorization.status === ProjectDesignAuthorizationStatus.REVOKED
              || pendingRequiresStandardRefresh
            );
            return (
              <article key={project.id} className="rounded-[10px] border border-black/8 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-ink">{project.title}</h3>
                    <p className="mt-1 text-sm text-ink/55">作品：{project.work?.title ?? "未关联"} · 作者：{project.work?.user.nickname ?? "作品作者"}</p>
                    <p className="mt-2 text-xs text-ink/40">
                      {authorization
                        ? `${PROJECT_AUTHORIZATION_LABELS[authorization.status]} · ${policy.label} · 条款 ${authorization.termsVersion} · ${formatDate(authorization.requestedAt)}`
                        : "尚未发送标准授权邀请"}
                    </p>
                  </div>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">
                    {campaignStatus ? `预售：${campaignStatus}` : "未关联预售活动"}
                  </span>
                </div>
                {currentOffer ? <OwnerOfferPreview snapshot={currentOffer.snapshot} /> : null}
                {currentOffer?.issues.length ? (
                  <div className="mt-4 rounded-[7px] border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
                    <p className="font-semibold">最终资料尚未完成，不能发送邀请</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">{currentOffer.issues.map((item) => <li key={item.code + item.message}>{item.message}</li>)}</ul>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={"/projects/" + (project.slug ?? project.id)} className="inline-flex min-h-10 items-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">查看项目</Link>
                  {canSend ? (
                    <form action={requestProjectDesignAuthorization} className="grid w-full gap-3 rounded-[7px] border border-sky-200 bg-sky-50 p-4 sm:w-auto sm:min-w-[360px]">
                      <input type="hidden" name="projectId" value={project.id} />
                      {currentOffer ? <input type="hidden" name="expectedOfferHash" value={currentOffer.hash} /> : null}
                      {currentOffer ? (
                        <label className="flex items-start gap-2 text-xs leading-5 text-sky-950">
                          <input type="checkbox" name="confirmOfferEnvelope" required className="mt-1" />
                          我已逐项核对以上图片、价格、目标、限量、交付、条款与 SKU，并确认由我向作品作者发送这一精确版本。
                        </label>
                      ) : null}
                      <button className="min-h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white">
                        {pendingRequiresStandardRefresh
                          ? "更新为标准邀请"
                          : authorization?.status === ProjectDesignAuthorizationStatus.REVOKED
                            ? "重新邀请作者"
                            : "邀请作者参与"}
                      </button>
                    </form>
                  ) : null}
                  {authorization?.status === ProjectDesignAuthorizationStatus.PENDING && !pendingRequiresStandardRefresh ? <span className="inline-flex min-h-10 items-center text-sm font-semibold text-amber-700">等待作者决定</span> : null}
                  {authorization?.status === ProjectDesignAuthorizationStatus.ACCEPTED ? (
                    <span className={`inline-flex min-h-10 items-center text-sm font-semibold ${acceptedCurrentStandard ? "text-emerald-700" : "text-amber-700"}`}>
                      {acceptedCurrentStandard ? "作者已同意当前标准授权" : "旧版授权待更新（需作者先撤销）"}
                    </span>
                  ) : null}
                  {lifecycleLocked ? <span className="inline-flex min-h-10 items-center text-xs text-ink/45">活动已启动，授权状态由生命周期规则保护。</span> : null}
                </div>
              </article>
            );
          }) : (
            <div className="rounded-[10px] border border-dashed border-black/12 bg-white p-6 text-sm leading-6 text-ink/55">目前没有由你负责且已关联作品的项目。</div>
          )}
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-ink/35">WORK AUTHOR</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">需要我决定的邀请</h2>
        </div>
        {authorizations.length ? authorizations.map((authorization) => {
          const projectHref = "/projects/" + (authorization.project.slug ?? authorization.project.id);
          const currentOwnerUserId = authorization.project.ownerUserId ?? authorization.project.createdById;
          const policy = projectDesignAuthorizationPolicy(authorization.project.presaleCampaign?.id ?? null);
          const offerSnapshot = readLimitedPreorderOfferSnapshot(authorization.offerSnapshot);
          const campaign = authorization.project.presaleCampaign;
          const currentOffer = campaign && authorization.project.work
            ? createLimitedPreorderOfferEnvelope({
                projectId: authorization.project.id,
                projectTitle: authorization.project.title,
                projectDescription: authorization.project.description,
                projectTargetQuantity: authorization.project.targetQuantity,
                projectEstimatedBudget: authorization.project.estimatedBudget,
                workTitle: authorization.project.work.title,
                workDescription: authorization.project.work.description,
                campaign,
                products: authorization.project.products,
                displayImageUrls: authorization.project.work.images.map((image) => image.imageUrl)
              })
            : null;
          const exactOfferBound = !policy.preorderCampaignId || Boolean(
            authorization.offerHash
            && offerSnapshot
            && offerSnapshot.projectId === authorization.projectId
            && offerSnapshot.campaignId === policy.preorderCampaignId
            && offerSnapshot.workId === authorization.workId
            && hashLimitedPreorderOfferSnapshot(offerSnapshot) === authorization.offerHash
          );
          const standardInvitationValid = Boolean(
            currentOwnerUserId
            && authorization.termsVersion === policy.termsVersion
            && authorization.preorderCampaignId === policy.preorderCampaignId
            && authorization.scope === policy.scope
            && authorization.royaltyDescription === policy.royaltyNotice
            && authorization.ownerUserId === currentOwnerUserId
            && authorization.workId === authorization.project.workId
            && authorization.designerUserId === authorization.project.work?.userId
            && exactOfferBound
            && (!campaign || Boolean(
              currentOffer
              && !currentOffer.issues.length
              && authorization.offerHash === currentOffer.hash
              && authorization.project.work
              && isPublicQualityWork(authorization.project.work)
            ))
          );
          const revocationLocked = campaign?.preorderStatus === "GOAL_REACHED"
            || campaign?.preorderStatus === "PRODUCTION";
          const preorderSummary = campaign
            ? summarizeLimitedPreorderOrders(campaign.preorderOrders, campaign.preorderQualificationMode, currentOffer?.hash ?? null)
            : null;
          const showLimitedPreorder = Boolean(campaign && (
            campaign.preorderStatus !== "NOT_STARTED"
            || campaign.preorderTargetQuantity !== null
            || campaign.preorderCapacity !== null
          ));
          return (
            <article key={authorization.id} className="rounded-[10px] border border-black/8 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-ink/40">条款 {authorization.termsVersion}</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{authorization.project.title}</h2>
                  <p className="mt-1 text-sm text-ink/55">作品：{authorization.work.title} · 发起方：{authorization.owner.nickname ?? "项目主理人"}</p>
                </div>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/65">{PROJECT_AUTHORIZATION_LABELS[authorization.status]}</span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[8px] bg-paper p-4">
                  <p className="text-xs font-semibold text-ink/40">授权范围</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/65">{authorization.scope}</p>
                </div>
                <div className="rounded-[8px] bg-paper p-4">
                  <p className="text-xs font-semibold text-ink/40">分成说明</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/65">{authorization.royaltyDescription ?? "尚未填写；接受前建议先与项目方确认。"}</p>
                </div>
              </div>

              {policy.preorderCampaignId && offerSnapshot ? (
                <section className="mt-5 rounded-[8px] border border-sky-200 bg-sky-50 p-4 md:p-5" aria-label="邀请时冻结的本期开售资料">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-sky-800/60">EXACT OFFER · 邀请时冻结</p>
                      <h3 className="mt-1 font-semibold text-sky-950">本期精确开售资料</h3>
                      <p className="mt-2 text-xs leading-5 text-sky-900/65">接受只针对下面这一期、这些商品与 SKU。任何价格、限量、交付或条款变化，旧授权都会失效并需要重新邀请。</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-900">不收款试点</span>
                  </div>

                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-[6px] bg-white p-3"><dt className="text-xs text-ink/40">成团目标</dt><dd className="mt-1 font-semibold">{offerSnapshot.targetQuantity ?? "未设置"} 件</dd></div>
                    <div className="rounded-[6px] bg-white p-3"><dt className="text-xs text-ink/40">活动总限量</dt><dd className="mt-1 font-semibold">{offerSnapshot.capacity ?? "未设置"} 件</dd></div>
                    <div className="rounded-[6px] bg-white p-3"><dt className="text-xs text-ink/40">截止时间</dt><dd className="mt-1 font-semibold">{formatSnapshotDate(offerSnapshot.deadline)}</dd></div>
                    <div className="rounded-[6px] bg-white p-3"><dt className="text-xs text-ink/40">条款版本</dt><dd className="mt-1 font-semibold">{offerSnapshot.termsVersion}</dd></div>
                  </dl>
                  <div className="mt-3 rounded-[6px] bg-white p-3 text-sm leading-6 text-ink/60">
                    <p className="font-semibold text-ink">项目：{offerSnapshot.projectTitle}</p>
                    {offerSnapshot.projectDescription ? <p>{offerSnapshot.projectDescription}</p> : null}
                    <p className="mt-2 font-semibold text-ink">作品：{offerSnapshot.workTitle}</p>
                    {offerSnapshot.workDescription ? <p>{offerSnapshot.workDescription}</p> : null}
                    <p className="mt-2 font-semibold text-ink">活动：{offerSnapshot.campaignTitle}</p>
                    {offerSnapshot.campaignDescription ? <p>{offerSnapshot.campaignDescription}</p> : null}
                    <p>预计价格：{offerSnapshot.campaignEstimatedPrice ?? "未填写"} · {offerSnapshot.campaignPriceNote ?? "无补充说明"}</p>
                    <p>活动尺码：{offerSnapshot.campaignSizeOptions.join(" / ") || "未填写"} · 活动颜色：{offerSnapshot.campaignColorOptions.join(" / ") || "未填写"}</p>
                  </div>
                  <p className="mt-3 rounded-[6px] bg-white p-3 text-sm leading-6 text-ink/65">
                    本期仅记录经平台人工核验的订单意向，不在线收款、不收定金，也不提供线下付款指引。
                  </p>
                  <p className="mt-3 whitespace-pre-wrap rounded-[6px] bg-white p-3 text-xs leading-6 text-ink/55">{offerSnapshot.termsText}</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {offerSnapshot.displayImageUrls.map((imageUrl, index) => (
                      <img key={imageUrl} src={imageUrl} alt={`作者决定时冻结的展示图 ${index + 1}`} className="aspect-[4/3] w-full rounded-[6px] bg-white object-cover" />
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    {offerSnapshot.products.map((product) => (
                      <article key={product.id} className="rounded-[8px] border border-sky-100 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-ink">{product.title}</h4>
                            <p className="mt-1 text-sm font-semibold text-ink/65">{formatMoneyCents(product.price, product.currency)}</p>
                          </div>
                          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">商品硬限量 {product.preorderLimit ?? "未设置"}</span>
                        </div>
                        <dl className="mt-3 grid gap-2 text-xs leading-5 text-ink/58 sm:grid-cols-2">
                          <div><dt className="font-semibold text-ink/40">商品说明</dt><dd>{product.description ?? "未提供"}</dd></div>
                          <div><dt className="font-semibold text-ink/40">图片阶段</dt><dd>{product.imageStage ?? "未说明"}</dd></div>
                          <div><dt className="font-semibold text-ink/40">面料与工艺</dt><dd>{product.materialDescription ?? "未提供"}</dd></div>
                          <div><dt className="font-semibold text-ink/40">护理说明</dt><dd>{product.careInstructions ?? "未提供"}</dd></div>
                          <div><dt className="font-semibold text-ink/40">预计发货</dt><dd>{formatSnapshotDate(product.estimatedShipDate)}</dd></div>
                          <div><dt className="font-semibold text-ink/40">商品目标量</dt><dd>{product.targetQuantity ?? "未设置"} 件</dd></div>
                        </dl>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {product.skus.map((sku) => (
                            <div key={sku.id} className="rounded-[6px] bg-paper p-3 text-xs leading-5 text-ink/58">
                              <p className="font-semibold text-ink">{sku.size} / {sku.color}</p>
                              <p>容量：{sku.capacity ?? "未设置"} 件</p>
                              <p>价格：{formatMoneyCents(sku.priceOverride ?? product.price, product.currency)}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="mt-3 break-all text-[11px] leading-5 text-sky-900/50">资料指纹：{authorization.offerHash}</p>
                </section>
              ) : null}
              {policy.preorderCampaignId && !offerSnapshot ? (
                <p className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  本期精确开售资料缺失或损坏，当前不能接受。请项目负责人重新发送邀请。
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/45">
                <span>请求：{formatDate(authorization.requestedAt)}</span>
                <span>接受：{formatDate(authorization.acceptedAt)}</span>
                <span>撤销：{formatDate(authorization.revokedAt)}</span>
              </div>
              {authorization.status === ProjectDesignAuthorizationStatus.PENDING && !standardInvitationValid ? (
                <p className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  这是一条旧版或项目负责人已变化的邀请，当前不能接受。请项目负责人重新发送平台标准邀请；你仍可直接拒绝。
                </p>
              ) : null}
              {authorization.status === ProjectDesignAuthorizationStatus.ACCEPTED && !standardInvitationValid ? (
                <p className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  这份已接受授权不是当前 V2.3 标准版本，或与当前项目负责人、作品、作者绑定不一致，不能用于限量预售开售或生产。如果你愿意按当前标准参与，请先在成团前撤销，再由当前项目负责人重新发送标准邀请。
                </p>
              ) : null}

              {campaign && preorderSummary && showLimitedPreorder ? (
                <section className="mt-5 rounded-[8px] border border-black/8 bg-paper p-4" aria-label="限量预售状态">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-ink/40">LIMITED PREORDER · V2.3</p>
                      <h3 className="mt-1 font-semibold text-ink">{LIMITED_PREORDER_STATUS_LABELS[campaign.preorderStatus]}</h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/60">
                      {LIMITED_PREORDER_QUALIFICATION_LABELS[campaign.preorderQualificationMode]}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[6px] bg-white p-3">
                      <dt className="text-xs text-ink/40">当前合格件数</dt>
                      <dd className="mt-1 font-semibold text-ink">{preorderSummary.qualifiedQuantity} / {campaign.preorderTargetQuantity ?? "待配置"}</dd>
                    </div>
                    <div className="rounded-[6px] bg-white p-3">
                      <dt className="text-xs text-ink/40">本期限量</dt>
                      <dd className="mt-1 font-semibold text-ink">{campaign.preorderCapacity ?? "待配置"}</dd>
                    </div>
                    <div className="rounded-[6px] bg-white p-3">
                      <dt className="text-xs text-ink/40">截止时间</dt>
                      <dd className="mt-1 font-semibold text-ink">{formatDate(campaign.preorderDeadline)}</dd>
                    </div>
                  </dl>
                  {campaign.preorderPublicNotice ? <p className="mt-3 text-sm leading-6 text-ink/60">平台公开说明：{campaign.preorderPublicNotice}</p> : null}
                  <p className="mt-3 text-xs leading-5 text-ink/40">这里只展示聚合进度，不展示买家身份、联系方式或订单私密信息。预售不等于现货，最终生产与退款安排以平台状态为准。</p>
                </section>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={projectHref} className="inline-flex min-h-10 items-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">查看公开项目</Link>
                {authorization.status === ProjectDesignAuthorizationStatus.PENDING ? (
                  <>
                    {standardInvitationValid ? <form action={respondProjectDesignAuthorization}>
                      <input type="hidden" name="projectId" value={authorization.projectId} />
                      <input type="hidden" name="authorizationId" value={authorization.id} />
                      <input type="hidden" name="expectedUpdatedAt" value={authorization.updatedAt.toISOString()} />
                      <input type="hidden" name="status" value={ProjectDesignAuthorizationStatus.ACCEPTED} />
                      <button className="min-h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white">接受授权</button>
                    </form> : null}
                    <form action={respondProjectDesignAuthorization}>
                      <input type="hidden" name="projectId" value={authorization.projectId} />
                      <input type="hidden" name="authorizationId" value={authorization.id} />
                      <input type="hidden" name="expectedUpdatedAt" value={authorization.updatedAt.toISOString()} />
                      <input type="hidden" name="status" value={ProjectDesignAuthorizationStatus.REJECTED} />
                      <button className="min-h-10 rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700">拒绝授权</button>
                    </form>
                  </>
                ) : null}
                {authorization.status === ProjectDesignAuthorizationStatus.ACCEPTED && !revocationLocked ? (
                  <form action={revokeProjectDesignAuthorization}>
                    <input type="hidden" name="projectId" value={authorization.projectId} />
                    <button className="min-h-10 rounded-full border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-800">撤销授权</button>
                  </form>
                ) : null}
              </div>
              {authorization.status === ProjectDesignAuthorizationStatus.ACCEPTED && revocationLocked ? (
                <p className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  活动已经成团或进入生产，不能单方面撤销授权。请通过项目异常、取消与退款流程处理，平台将保留订单与状态审计记录。
                </p>
              ) : null}
              <p className="mt-4 text-xs leading-5 text-ink/40">授权决定只改变合作许可状态，不会自动创建订单、扣款、生产任务或收入。</p>
            </article>
          );
        }) : (
          <div className="rounded-[10px] border border-dashed border-black/12 bg-white p-8 text-sm leading-6 text-ink/55">目前没有需要你处理的设计授权请求。项目方发起后，会显示在这里。</div>
        )}
      </section>
    </main>
  );
}

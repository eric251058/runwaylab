import Link from "next/link";
import {
  LimitedPreorderStatus,
  PresaleCampaignIntentStatus
} from "@prisma/client";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import {
  evaluateLimitedPreorderAdmission,
  LIMITED_PREORDER_STATUS_LABELS
} from "@/lib/projects/preorder-lifecycle";
import {
  groupPilotReadinessIssues,
  isPilotLifecycleConfigurable,
  LIMITED_PREORDER_PILOT_TEMPLATE,
  pilotReadinessAction,
  pilotSafetyIssues
} from "@/lib/projects/preorder-pilot-readiness";
import { isPublicQualityWork } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  return value
    ? value.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "未设置";
}

export default async function LimitedPreorderReadinessPage() {
  const [projects, featureEnabled] = await Promise.all([
    prisma.collaborationProject.findMany({
      where: { presaleCampaignId: { not: null } },
      include: {
        work: {
          select: {
            userId: true,
            title: true,
            description: true,
            reviewStatus: true,
            contentStatus: true,
            visibility: true,
            images: { select: { imageUrl: true } }
          }
        },
        presaleCampaign: {
          include: {
            intents: { select: { status: true, quantity: true } }
          }
        },
        designAuthorizations: {
          select: { status: true, preorderCampaignId: true, workId: true, designerUserId: true, ownerUserId: true, termsVersion: true },
          take: 1
        },
        products: {
          include: { skus: { orderBy: { createdAt: "asc" } } },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    isFeatureEnabled("feature.limited_preorder_v23")
  ]);

  const linkedCounts = await Promise.all(
    projects.map((project) =>
      project.presaleCampaignId
        ? prisma.collaborationProject.count({ where: { presaleCampaignId: project.presaleCampaignId } })
        : Promise.resolve(0)
    )
  );

  const items = projects.flatMap((project, index) => {
    const campaign = project.presaleCampaign;
    if (!campaign) return [];

    const confirmedDemandQuantity = campaign.intents
      .filter((intent) => intent.status === PresaleCampaignIntentStatus.CONFIRMED)
      .reduce((sum, intent) => sum + intent.quantity, 0);
    const configurable = isPilotLifecycleConfigurable(campaign.preorderStatus);
    const admission = configurable
      ? evaluateLimitedPreorderAdmission({
          campaignId: campaign.id,
          linkedProjectCount: linkedCounts[index],
          campaignWorkId: campaign.workId,
          projectWorkId: project.workId,
          workOwnerUserId: project.work?.userId ?? null,
          projectOwnerUserId: project.ownerUserId ?? project.createdById,
          publicWorkReady: Boolean(project.work && isPublicQualityWork(project.work)),
          projectStatus: project.status,
          projectVisibility: project.visibility,
          projectAuthorizationStatus: project.designerAuthorizationStatus,
          authorizationRecordStatus: project.designAuthorizations[0]?.status ?? null,
          authorizationPreorderCampaignId: project.designAuthorizations[0]?.preorderCampaignId ?? null,
          authorizationRecordWorkId: project.designAuthorizations[0]?.workId ?? null,
          authorizationDesignerUserId: project.designAuthorizations[0]?.designerUserId ?? null,
          authorizationOwnerUserId: project.designAuthorizations[0]?.ownerUserId ?? null,
          authorizationTermsVersion: project.designAuthorizations[0]?.termsVersion ?? null,
          demandTargetQuantity: campaign.targetCount,
          confirmedDemandQuantity,
          demandCampaignStatus: campaign.status,
          preorderStatus: campaign.preorderStatus,
          preorderQualificationMode: campaign.preorderQualificationMode,
          preorderTargetQuantity: campaign.preorderTargetQuantity,
          preorderCapacity: campaign.preorderCapacity,
          preorderDeadline: campaign.preorderDeadline,
          preorderTermsVersion: campaign.preorderTermsVersion,
          preorderTermsText: campaign.preorderTermsText,
          preorderPaymentInstructions: campaign.preorderPaymentInstructions,
          products: project.products,
          resume: campaign.preorderStatus === LimitedPreorderStatus.PAUSED
        })
      : null;
    const issues = admission
      ? [...admission.issues, ...pilotSafetyIssues(campaign.preorderQualificationMode)]
      : [];
    const ready = Boolean(admission?.ok && issues.length === 0);

    return [{
      project,
      campaign,
      confirmedDemandQuantity,
      configurable,
      issues,
      issueGroups: groupPilotReadinessIssues(issues),
      ready
    }];
  }).sort((left, right) => Number(right.ready) - Number(left.ready) || left.issues.length - right.issues.length);

  const readyCount = items.filter((item) => item.ready).length;
  const preparationCount = items.filter((item) => item.configurable && !item.ready).length;
  const activeCount = items.filter((item) => !item.configurable).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin · V2.3 Pilot Readiness</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">限量预售试点准入</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/58">
            汇总所有已关联需求活动的项目，按正式生命周期规则列出阻断项。这里不绕过准入、不自动改业务数据，也不直接开放预售。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/projects" className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">
            返回合作项目
          </Link>
          <Link href="/legal/presale-rules" className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">
            查看用户规则
          </Link>
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/40">V2.3 功能开关</p>
          <p className={"mt-2 text-xl font-semibold " + (featureEnabled ? "text-amber-700" : "text-emerald-700")}>
            {featureEnabled ? "已开启" : "保持关闭"}
          </p>
          <p className="mt-2 text-xs leading-5 text-ink/45">首个候选完成验收前应保持关闭。</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4"><p className="text-xs font-semibold text-ink/40">资料已就绪</p><p className="mt-2 text-3xl font-semibold">{readyCount}</p></div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4"><p className="text-xs font-semibold text-ink/40">仍有阻断</p><p className="mt-2 text-3xl font-semibold">{preparationCount}</p></div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4"><p className="text-xs font-semibold text-ink/40">生命周期已启动</p><p className="mt-2 text-3xl font-semibold">{activeCount}</p></div>
      </section>

      <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">First pilot policy</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">首期保守试点模板</h2>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{LIMITED_PREORDER_PILOT_TEMPLATE.version}</span>
        </div>
        <p className="mt-3 text-sm font-semibold text-ink/70">只允许 CONFIRMED_ORDER；建议开放 {LIMITED_PREORDER_PILOT_TEMPLATE.recommendedWindowDays.min}–{LIMITED_PREORDER_PILOT_TEMPLATE.recommendedWindowDays.max} 天。</p>
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-ink/58 md:grid-cols-2">
          {LIMITED_PREORDER_PILOT_TEMPLATE.principles.map((principle) => <li key={principle} className="rounded-[6px] bg-paper px-3 py-2">{principle}</li>)}
        </ul>
      </section>

      <section className="mt-8 grid gap-4">
        {items.length ? items.map(({ project, campaign, confirmedDemandQuantity, configurable, issues, issueGroups, ready }) => (
          <article key={project.id} className="rounded-[8px] border border-black/8 bg-white p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (ready ? "bg-emerald-100 text-emerald-800" : configurable ? "bg-amber-100 text-amber-800" : "bg-ink text-white")}>
                    {ready ? "资料已就绪" : configurable ? `${issues.length} 个阻断项` : LIMITED_PREORDER_STATUS_LABELS[campaign.preorderStatus]}
                  </span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{campaign.preorderQualificationMode}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{project.title}</h2>
                <p className="mt-1 text-sm text-ink/50">{project.work?.title ?? "作品待关联"} · {campaign.title}</p>
              </div>
              <Link href={`/admin/projects/${project.id}/preorder`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                进入预售工作台
              </Link>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">需求确认</p><p className="mt-1 font-semibold">{confirmedDemandQuantity} / {campaign.targetCount}</p></div>
              <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">成团目标</p><p className="mt-1 font-semibold">{campaign.preorderTargetQuantity ?? "未设置"}</p></div>
              <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">活动限量</p><p className="mt-1 font-semibold">{campaign.preorderCapacity ?? "未设置"}</p></div>
              <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">截止时间</p><p className="mt-1 font-semibold">{formatDate(campaign.preorderDeadline)}</p></div>
              <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">商品 / SKU</p><p className="mt-1 font-semibold">{project.products.length} / {project.products.reduce((sum, product) => sum + product.skus.length, 0)}</p></div>
            </div>

            {configurable && issueGroups.length ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {issueGroups.map((group) => (
                  <div key={group.area} className="rounded-[8px] border border-black/8 p-4">
                    <h3 className="text-sm font-semibold">{group.area}</h3>
                    <div className="mt-2 grid gap-2">
                      {group.issues.map((item) => {
                        const action = pilotReadinessAction(project.id, item.code);
                        return (
                          <div key={item.code + item.message} className="flex items-start justify-between gap-3 rounded-[6px] bg-paper p-3">
                            <p className="text-xs leading-5 text-ink/58">{item.message}</p>
                            <Link href={action.href} className="shrink-0 text-xs font-semibold text-ink underline underline-offset-4">{action.label}</Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {ready ? (
              <div className="mt-4 rounded-[8px] bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                资料层面已满足首期试点准入。仍需人工复核生产 MOQ、交付承诺与消费者可见条款，再单独审批开启功能开关。
              </div>
            ) : null}
            {!configurable ? (
              <div className="mt-4 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">
                该活动已经进入生命周期，后续状态操作、异常处置和审计请在单项目工作台完成。
              </div>
            ) : null}
          </article>
        )) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无已关联需求活动的合作项目。</div>
        )}
      </section>
    </main>
  );
}

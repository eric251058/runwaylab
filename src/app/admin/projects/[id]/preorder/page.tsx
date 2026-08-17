import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
  PresaleCampaignIntentStatus,
  ProjectDesignAuthorizationStatus,
  ProjectProductStatus
} from "@prisma/client";
import { dateInputValue } from "@/lib/commercial-collaboration";
import { saveProjectProduct, saveProjectSku } from "@/lib/commercial-collaboration-actions";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { requestProjectDesignAuthorization } from "@/lib/projects/actions";
import {
  cancelLimitedPreorderCampaign,
  closeLimitedPreorderCampaign,
  configureLimitedPreorderCampaign,
  openLimitedPreorderCampaign,
  pauseLimitedPreorderCampaign,
  resumeLimitedPreorderCampaign,
  settleLimitedPreorderCampaign,
  startLimitedPreorderProduction
} from "@/lib/projects/preorder-lifecycle-actions";
import {
  evaluateLimitedPreorderAdmission,
  LIMITED_PREORDER_QUALIFICATION_LABELS,
  LIMITED_PREORDER_STATUS_LABELS,
  summarizeLimitedPreorderOrders
} from "@/lib/projects/preorder-lifecycle";
import { PROJECT_AUTHORIZATION_LABELS, PROJECT_PRODUCT_STATUS_LABELS, formatMoneyCents } from "@/lib/projects/rules";
import { isPublicQualityWork } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function dateTimeInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16) : "";
}

export default async function AdminPreorderPreparationPage({ params }: PageProps) {
  const { id } = await params;
  const [project, preorderEnabled] = await Promise.all([
    prisma.collaborationProject.findUnique({
      where: { id },
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
        presaleCampaign: { include: { intents: { select: { status: true, quantity: true } } } },
        designAuthorizations: { select: { status: true, workId: true, designerUserId: true }, take: 1 },
        products: { include: { skus: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }
      }
    }),
    isFeatureEnabled("feature.limited_preorder_v23")
  ]);
  if (!project) notFound();

  const campaign = project.presaleCampaign;
  const [orders, linkedProjectCount] = campaign
    ? await Promise.all([
        prisma.projectOrder.findMany({
          where: { projectId: project.id, preorderCampaignId: campaign.id },
          select: { id: true, quantity: true, status: true, paymentStatus: true, fulfillmentStatus: true },
          orderBy: { createdAt: "asc" }
        }),
        prisma.collaborationProject.count({ where: { presaleCampaignId: campaign.id } })
      ])
    : [[], 0];

  const authorizationReady = project.designerAuthorizationStatus === ProjectDesignAuthorizationStatus.ACCEPTED;
  const unlockedLifecycleStatuses: readonly LimitedPreorderStatus[] = [
    LimitedPreorderStatus.NOT_STARTED,
    LimitedPreorderStatus.CLOSED
  ];
  const lifecycleLocked = Boolean(campaign && !unlockedLifecycleStatuses.includes(campaign.preorderStatus));
  const confirmedDemandQuantity = campaign?.intents
    .filter((intent) => intent.status === PresaleCampaignIntentStatus.CONFIRMED)
    .reduce((sum, intent) => sum + intent.quantity, 0) ?? 0;
  const resumeAdmission = campaign?.preorderStatus === LimitedPreorderStatus.PAUSED;
  const admission = campaign
    ? evaluateLimitedPreorderAdmission({
        campaignId: campaign.id,
        linkedProjectCount,
        campaignWorkId: campaign.workId,
        projectWorkId: project.workId,
        workOwnerUserId: project.work?.userId ?? null,
        publicWorkReady: Boolean(project.work && isPublicQualityWork(project.work)),
        projectStatus: project.status,
        projectVisibility: project.visibility,
        projectAuthorizationStatus: project.designerAuthorizationStatus,
        authorizationRecordStatus: project.designAuthorizations[0]?.status ?? null,
        authorizationRecordWorkId: project.designAuthorizations[0]?.workId ?? null,
        authorizationDesignerUserId: project.designAuthorizations[0]?.designerUserId ?? null,
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
        resume: resumeAdmission
      })
    : null;
  const summary = campaign
    ? summarizeLimitedPreorderOrders(orders, campaign.preorderQualificationMode)
    : { activeQuantity: 0, confirmedQuantity: 0, paidQuantity: 0, qualifiedQuantity: 0, refundPendingQuantity: 0 };

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm disabled:cursor-not-allowed disabled:bg-black/[0.03]";
  const textarea = "min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-black/[0.03]";
  const projectHref = "/projects/" + (project.slug ?? project.id);
  const lifecycleFields = campaign ? (
    <>
      <input type="hidden" name="campaignId" value={campaign.id} />
      <input type="hidden" name="projectId" value={project.id} />
    </>
  ) : null;

  const productFields = (product?: (typeof project.products)[number]) => (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="projectId" value={project.id} />
      <input name="title" required maxLength={100} defaultValue={product?.title ?? project.work?.title ?? project.title} placeholder="商品标题" className={input} disabled={lifecycleLocked} />
      <select name="status" defaultValue={product?.status ?? ProjectProductStatus.DRAFT} className={input} disabled={lifecycleLocked}>
        {Object.values(ProjectProductStatus).map((status) => <option key={status} value={status}>{PROJECT_PRODUCT_STATUS_LABELS[status]}</option>)}
      </select>
      <input name="price" required type="number" min={0} step={1} defaultValue={product?.price ?? 0} placeholder="价格（分）" className={input} disabled={lifecycleLocked} />
      <select name="currency" defaultValue={product?.currency ?? "CNY"} className={input} disabled={lifecycleLocked}>
        <option value="CNY">CNY</option><option value="USD">USD</option><option value="EUR">EUR</option>
      </select>
      <input name="targetQuantity" type="number" min={1} defaultValue={product?.targetQuantity ?? ""} placeholder="商品目标量" className={input} disabled={lifecycleLocked} />
      <input name="preorderLimit" type="number" min={1} defaultValue={product?.preorderLimit ?? ""} placeholder="商品硬限量" className={input} disabled={lifecycleLocked} />
      <input name="imageStage" maxLength={80} defaultValue={product?.imageStage ?? ""} placeholder="图片阶段说明，如：效果图" className={input} disabled={lifecycleLocked} />
      <label className="grid gap-1 text-xs font-semibold text-ink/45">预计发货日<input name="estimatedShipDate" type="date" defaultValue={dateInputValue(product?.estimatedShipDate)} className={input} disabled={lifecycleLocked} /></label>
      <input type="hidden" name="preorderDeadline" value={dateInputValue(campaign?.preorderDeadline)} />
      <textarea name="description" maxLength={1000} defaultValue={product?.description ?? ""} placeholder="商品说明（开售前至少 20 字）" className={textarea} disabled={lifecycleLocked} />
      <textarea name="materialDescription" maxLength={500} defaultValue={product?.materialDescription ?? ""} placeholder="面料与工艺说明" className={textarea} disabled={lifecycleLocked} />
      <textarea name="careInstructions" maxLength={500} defaultValue={product?.careInstructions ?? ""} placeholder="护理说明" className={textarea} disabled={lifecycleLocked} />
      <fieldset disabled={lifecycleLocked} className="contents">
        <button disabled={!authorizationReady} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:bg-ink/25 md:col-span-2">
          {!authorizationReady ? "等待设计师授权" : lifecycleLocked ? "预售生命周期中，资料已锁定" : product ? "保存商品准备" : "创建商品草稿"}
        </button>
      </fieldset>
    </>
  );

  const reasonForm = (
    action: (formData: FormData) => Promise<void>,
    label: string,
    placeholder: string,
    options?: { danger?: boolean; disabled?: boolean; extra?: React.ReactNode }
  ) => (
    <form action={action} className={"grid gap-3 rounded-[8px] border p-4 " + (options?.danger ? "border-red-200" : "border-black/8")}>
      {lifecycleFields}
      <input name="reason" required minLength={4} placeholder={`${placeholder}（仅内部审计）`} className={input} />
      <input name="publicNotice" required minLength={4} maxLength={500} placeholder="消费者可见状态说明（请勿填写身份、风控或内部敏感信息）" className={input} />
      {options?.extra}
      <button disabled={options?.disabled} className={"h-11 rounded-full px-5 text-sm font-semibold disabled:opacity-30 " + (options?.danger ? "bg-red-700 text-white" : "bg-ink text-white")}>{label}</button>
    </form>
  );

  const canSettle = campaign?.preorderStatus === LimitedPreorderStatus.OPEN || campaign?.preorderStatus === LimitedPreorderStatus.PAUSED;
  const cancellableStatuses: readonly LimitedPreorderStatus[] = [
    LimitedPreorderStatus.NOT_STARTED,
    LimitedPreorderStatus.OPEN,
    LimitedPreorderStatus.PAUSED,
    LimitedPreorderStatus.GOAL_REACHED,
    LimitedPreorderStatus.PRODUCTION
  ];
  const closableStatuses: readonly LimitedPreorderStatus[] = [
    LimitedPreorderStatus.FAILED,
    LimitedPreorderStatus.CANCELLED,
    LimitedPreorderStatus.PRODUCTION
  ];
  const canCancel = Boolean(campaign && cancellableStatuses.includes(campaign.preorderStatus));
  const canClose = Boolean(campaign && closableStatuses.includes(campaign.preorderStatus));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin · Limited Preorder V2.3 · 预订准备工作台</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">限量预售工作台</h1>
          <p className="mt-4 text-sm text-ink/58">{project.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/preorders/readiness" className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">试点准入总览</Link>
          <Link href="/admin/presale-campaigns" className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">返回需求验证</Link>
          <Link href={projectHref} className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">查看公开项目</Link>
        </div>
      </header>

      <section className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 text-sm md:grid-cols-4">
        <div><p className="text-xs font-semibold text-ink/40">设计授权</p><p className="mt-1 font-semibold">{PROJECT_AUTHORIZATION_LABELS[project.designerAuthorizationStatus]}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">项目阶段</p><p className="mt-1 font-semibold">{project.status}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">需求确认</p><p className="mt-1 font-semibold">{campaign ? `${confirmedDemandQuantity} / ${campaign.targetCount}` : "未关联活动"}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">限量预售状态</p><p className="mt-1 font-semibold">{campaign ? LIMITED_PREORDER_STATUS_LABELS[campaign.preorderStatus] : "未配置"}</p></div>
        <p className="text-xs leading-5 text-ink/48 md:col-span-4">V2.1 的未付款需求意向与 V2.3 的订单严格分开。商品资料保存不会自动创建订单、扣款、生产任务或收入。价格使用最小货币单位：CNY ¥199.00 填写 19900。</p>
      </section>

      {!authorizationReady ? (
        <section className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-semibold text-amber-950">先取得设计师授权</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900/75">项目方可以发起请求，但不能代替作品作者同意。授权接受前，商品和开售操作均不可用。</p>
          <form action={requestProjectDesignAuthorization} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input name="termsVersion" required maxLength={40} defaultValue="v1" className={input} />
            <input name="scope" required maxLength={500} defaultValue="围绕该作品推进打样、限量预售和合作沟通。" className={input} />
            <button className="min-h-11 rounded-full bg-amber-900 px-5 text-sm font-semibold text-white md:col-span-2">向作品作者发送授权请求</button>
          </form>
        </section>
      ) : null}

      {campaign ? (
        <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/35">Admission & lifecycle</p><h2 className="mt-2 text-2xl font-semibold text-ink">准入与活动生命周期</h2></div>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{LIMITED_PREORDER_STATUS_LABELS[campaign.preorderStatus]}</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["活动订单意向", summary.activeQuantity],
              ["已确认", summary.confirmedQuantity],
              ["已付款", summary.paidQuantity],
              ["成团口径数量", summary.qualifiedQuantity],
              ["退款待处理", summary.refundPendingQuantity]
            ].map(([label, value]) => <div key={String(label)} className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>

          {campaign.preorderStatus === LimitedPreorderStatus.NOT_STARTED ? (
            <form action={configureLimitedPreorderCampaign} className="mt-5 grid gap-3 rounded-[8px] bg-paper p-4 md:grid-cols-2">
              {lifecycleFields}
              <input name="preorderTargetQuantity" type="number" min={1} required defaultValue={campaign.preorderTargetQuantity ?? campaign.targetCount} placeholder="V2.3 成团目标" className={input} />
              <input name="preorderCapacity" type="number" min={1} required defaultValue={campaign.preorderCapacity ?? ""} placeholder="本期活动总限量" className={input} />
              <label className="grid gap-1 text-xs font-semibold text-ink/45">预售截止时间（UTC）<input name="preorderDeadline" type="datetime-local" required defaultValue={dateTimeInputValue(campaign.preorderDeadline)} className={input} /></label>
              <select name="preorderQualificationMode" defaultValue={campaign.preorderQualificationMode} className={input}>
                {Object.values(LimitedPreorderQualificationMode).map((mode) => <option key={mode} value={mode} disabled={mode === LimitedPreorderQualificationMode.PAID_ORDER}>{LIMITED_PREORDER_QUALIFICATION_LABELS[mode]}{mode === LimitedPreorderQualificationMode.PAID_ORDER ? "（待退款闭环）" : ""}</option>)}
              </select>
              <input name="preorderTermsVersion" required defaultValue={campaign.preorderTermsVersion} placeholder="条款版本" className={input} />
              <input name="reason" required minLength={4} placeholder="配置原因，例如：需求验证已达标" className={input} />
              <input name="publicNotice" required minLength={4} maxLength={500} defaultValue={campaign.preorderPublicNotice ?? "本期限量预售正在准备中，正式开放时间以页面状态为准。"} placeholder="消费者可见状态说明（请勿填写敏感信息）" className={input} />
              <textarea
                name="preorderTermsText"
                required
                minLength={40}
                maxLength={5000}
                defaultValue={campaign.preorderTermsText ?? "本商品为限量预售，并非现货。订单须在活动截止前达到页面所示成团目标后才进入生产；未达标或平台取消时，未付款订单将关闭，已付款订单进入退款处理，退款完成以实际退款记录为准。预计发货时间为生产计划，并非到货承诺。"}
                placeholder="完整预售条款正文"
                className={textarea + " md:col-span-2"}
              />
              <textarea
                name="preorderPaymentInstructions"
                maxLength={2000}
                defaultValue={campaign.preorderPaymentInstructions ?? ""}
                placeholder="仅按付款成团时必填：付款方式、联系路径、到账确认与锁定到期说明（至少 20 字）"
                className={textarea + " md:col-span-2"}
              />
              <button className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold md:col-span-2">保存并审计预售配置</button>
            </form>
          ) : null}

          <div className={"mt-5 rounded-[8px] border p-4 " + (admission?.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
            <p className="font-semibold">{admission?.ok ? "准入检查通过" : "准入检查未通过"}</p>
            {admission?.issues.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{admission.issues.map((item) => <li key={item.code + item.message}>{item.message}</li>)}</ul> : <p className="mt-2 text-sm leading-6">授权、需求、商品、SKU、限量、截止时间与条款版本均已满足当前操作条件。</p>}
          </div>

          <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950">
            <p className="font-semibold">法律与付款边界</p>
            <p className="mt-1">限量预售不等于现货。页面必须展示截止时间、成团口径、预计发货时间与失败处理。真实支付未开启时不得使用“已筹资”或“已付款”表述；失败或取消后的已付款订单只能进入退款待处理。</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {campaign.preorderStatus === LimitedPreorderStatus.NOT_STARTED ? reasonForm(
              openLimitedPreorderCampaign,
              preorderEnabled ? "正式开放限量预售" : "V2.3 功能开关未开启",
              "开售原因",
              {
                disabled: !preorderEnabled || !admission?.ok,
                extra: <label className="flex items-start gap-2 text-xs leading-5"><input name="confirmPreorderNotice" type="checkbox" required className="mt-1" />已确认消费者页面明确展示“预售不等于现货”及当前条款版本。</label>
              }
            ) : null}
            {campaign.preorderStatus === LimitedPreorderStatus.OPEN ? reasonForm(pauseLimitedPreorderCampaign, "暂停接单", "暂停原因") : null}
            {campaign.preorderStatus === LimitedPreorderStatus.PAUSED ? reasonForm(resumeLimitedPreorderCampaign, "恢复接单", "恢复原因", { disabled: !preorderEnabled || !admission?.ok }) : null}
            {canSettle ? reasonForm(settleLimitedPreorderCampaign, "按成团口径结算", "结算判断依据") : null}
            {campaign.preorderStatus === LimitedPreorderStatus.GOAL_REACHED ? reasonForm(startLimitedPreorderProduction, "确认进入生产", "进入生产依据") : null}
            {canCancel ? reasonForm(cancelLimitedPreorderCampaign, "取消本期预售", "取消原因（必填并写入审计）", { danger: true }) : null}
            {canClose ? reasonForm(closeLimitedPreorderCampaign, "检查订单后结束归档", "结束归档原因") : null}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">该项目尚未关联 V2.1 需求验证活动。请先在“预售活动管理”中保存项目关联，再配置 V2.3。</section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">新增商品草稿</h2>
        <form action={saveProjectProduct} className="mt-3 grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">{productFields()}</form>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-ink">商品与 SKU 限量</h2>
        {project.products.length ? project.products.map((product) => {
          const enabledSkuCapacity = product.skus.filter((sku) => sku.enabled).reduce((sum, sku) => sum + (sku.capacity ?? 0), 0);
          return (
            <article key={product.id} className="rounded-[8px] border border-black/8 bg-white p-5">
              <form action={saveProjectProduct} className="grid gap-3 md:grid-cols-2">
                <p className="text-xs font-semibold text-ink/45 md:col-span-2">当前：{PROJECT_PRODUCT_STATUS_LABELS[product.status]} · {formatMoneyCents(product.price, product.currency)} · 商品硬限量 {product.preorderLimit ?? "未设"} · 启用 SKU 容量 {enabledSkuCapacity}</p>
                {productFields(product)}
              </form>
              <div className="mt-5 border-t border-black/8 pt-5">
                <h3 className="font-semibold">SKU（尺码 / 颜色 / 容量）</h3>
                <div className="mt-3 space-y-3">
                  {product.skus.map((sku) => (
                    <form key={sku.id} action={saveProjectSku} className="grid gap-2 rounded-[6px] bg-paper p-3 md:grid-cols-6">
                      <input type="hidden" name="id" value={sku.id} /><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="productId" value={product.id} />
                      <input name="size" required defaultValue={sku.size} placeholder="尺码" className={input} disabled={lifecycleLocked} />
                      <input name="color" required defaultValue={sku.color} placeholder="颜色" className={input} disabled={lifecycleLocked} />
                      <input name="skuCode" defaultValue={sku.skuCode ?? ""} placeholder="SKU 编码" className={input} disabled={lifecycleLocked} />
                      <input name="capacity" type="number" min={1} defaultValue={sku.capacity ?? ""} placeholder="容量" className={input} disabled={lifecycleLocked} />
                      <input name="priceOverride" type="number" min={1} defaultValue={sku.priceOverride ?? ""} placeholder="覆盖价格（分，可留空）" className={input} disabled={lifecycleLocked} />
                      <label className="flex items-center gap-2 text-xs"><input name="enabled" type="checkbox" defaultChecked={sku.enabled} disabled={lifecycleLocked} />启用</label>
                      <button disabled={lifecycleLocked} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold disabled:opacity-35 md:col-span-6">保存 SKU</button>
                    </form>
                  ))}
                  <form action={saveProjectSku} className="grid gap-2 rounded-[6px] border border-dashed border-black/15 p-3 md:grid-cols-6">
                    <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="productId" value={product.id} />
                    <input name="size" required placeholder="尺码" className={input} disabled={lifecycleLocked} />
                    <input name="color" required placeholder="颜色" className={input} disabled={lifecycleLocked} />
                    <input name="skuCode" placeholder="SKU 编码" className={input} disabled={lifecycleLocked} />
                    <input name="capacity" type="number" min={1} required placeholder="容量" className={input} disabled={lifecycleLocked} />
                    <input name="priceOverride" type="number" min={1} placeholder="覆盖价格（分，可留空）" className={input} disabled={lifecycleLocked} />
                    <label className="flex items-center gap-2 text-xs"><input name="enabled" type="checkbox" defaultChecked disabled={lifecycleLocked} />启用</label>
                    <button disabled={lifecycleLocked} className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:bg-ink/25 md:col-span-6">新增 SKU</button>
                  </form>
                </div>
              </div>
            </article>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">还没有商品草稿。先完成价格、目标量、硬限量、说明、发货预期和 SKU 容量，再进入审核与开售。</div>}
      </section>
    </div>
  );
}

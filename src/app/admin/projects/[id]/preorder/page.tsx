import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectDesignAuthorizationStatus, ProjectProductStatus } from "@prisma/client";
import { saveProjectProduct } from "@/lib/commercial-collaboration-actions";
import { dateInputValue } from "@/lib/commercial-collaboration";
import { requestProjectDesignAuthorization } from "@/lib/projects/actions";
import { PROJECT_AUTHORIZATION_LABELS, PROJECT_PRODUCT_STATUS_LABELS, formatMoneyCents } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPreorderPreparationPage({ params }: PageProps) {
  const { id } = await params;
  const project = await prisma.collaborationProject.findUnique({
    where: { id },
    include: {
      work: { select: { title: true } },
      presaleCampaign: { select: { title: true, currentCount: true, targetCount: true } },
      products: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!project) notFound();
  const authorizationReady = project.designerAuthorizationStatus === ProjectDesignAuthorizationStatus.ACCEPTED;

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";
  const textarea = "min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm";
  const projectHref = "/projects/" + (project.slug ?? project.id);

  const fields = (product?: (typeof project.products)[number]) => (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="projectId" value={project.id} />
      <input name="title" required maxLength={100} defaultValue={product?.title ?? project.work?.title ?? project.title} placeholder="商品标题" className={input} />
      <select name="status" defaultValue={product?.status ?? ProjectProductStatus.DRAFT} className={input}>
        {Object.values(ProjectProductStatus).map((status) => <option key={status} value={status}>{PROJECT_PRODUCT_STATUS_LABELS[status]}</option>)}
      </select>
      <input name="price" required type="number" min={0} step={1} defaultValue={product?.price ?? 0} placeholder="价格（分）" className={input} />
      <select name="currency" defaultValue={product?.currency ?? "CNY"} className={input}>
        <option value="CNY">CNY</option><option value="USD">USD</option><option value="EUR">EUR</option>
      </select>
      <input name="targetQuantity" type="number" min={1} step={1} defaultValue={product?.targetQuantity ?? project.targetQuantity ?? ""} placeholder="目标数量" className={input} />
      <input name="imageStage" maxLength={80} defaultValue={product?.imageStage ?? ""} placeholder="图片阶段说明，如：效果图" className={input} />
      <label className="grid gap-1 text-xs font-semibold text-ink/45">预订截止日<input name="preorderDeadline" type="date" defaultValue={dateInputValue(product?.preorderDeadline)} className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-ink/45">预计发货日<input name="estimatedShipDate" type="date" defaultValue={dateInputValue(product?.estimatedShipDate)} className={input} /></label>
      <textarea name="description" maxLength={1000} defaultValue={product?.description ?? ""} placeholder="商品说明" className={textarea} />
      <textarea name="materialDescription" maxLength={500} defaultValue={product?.materialDescription ?? ""} placeholder="面料与工艺说明" className={textarea} />
      <textarea name="careInstructions" maxLength={500} defaultValue={product?.careInstructions ?? ""} placeholder="护理说明" className={textarea} />
      <button disabled={!authorizationReady} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25 md:col-span-2">{authorizationReady ? (product ? "保存商品准备" : "创建商品草稿") : "等待设计师授权"}</button>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin · Preorder preparation</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预订准备工作台</h1>
          <p className="mt-4 text-sm text-ink/58">{project.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/presale-campaigns" className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">返回预售决策</Link>
          <Link href={projectHref} className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">查看承接项目</Link>
        </div>
      </header>

      <section className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 text-sm md:grid-cols-3">
        <div><p className="text-xs font-semibold text-ink/40">设计授权</p><p className="mt-1 font-semibold">{PROJECT_AUTHORIZATION_LABELS[project.designerAuthorizationStatus]}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">项目阶段</p><p className="mt-1 font-semibold">{project.status}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">需求信号</p><p className="mt-1 font-semibold">{project.presaleCampaign ? project.presaleCampaign.currentCount + " / " + project.presaleCampaign.targetCount : "未关联预售活动"}</p></div>
        <p className="text-xs leading-5 text-ink/48 md:col-span-3">
          这里创建的是商品草稿与人工审核状态，不会自动创建订单、扣款、生产任务或收入。价格以最小货币单位填写：CNY ¥199.00 应填写 19900。
        </p>
      </section>

      {!authorizationReady ? (
        <section className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-semibold text-amber-950">先取得设计师授权</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900/75">当前状态为 {PROJECT_AUTHORIZATION_LABELS[project.designerAuthorizationStatus]}。项目方可以发起请求，但不能代替作品作者同意。授权接受前，商品保存已禁用。</p>
          <form action={requestProjectDesignAuthorization} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input name="termsVersion" required maxLength={40} defaultValue="v1" aria-label="条款版本" className={input} />
            <input name="scope" required maxLength={500} defaultValue="围绕该作品推进打样、预售验证和合作沟通。" aria-label="授权范围" className={input} />
            <button className="min-h-11 rounded-full bg-amber-900 px-5 text-sm font-semibold text-white md:col-span-2">向作品作者发送授权请求</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/me/authorizations" className="text-sm font-semibold text-amber-900 underline underline-offset-4">设计师授权中心</Link>
            <Link href={projectHref} className="text-sm font-semibold text-amber-900 underline underline-offset-4">查看公开项目</Link>
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xl font-semibold text-ink">新增商品草稿</h2>
        <form action={saveProjectProduct} className="mt-3 grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">{fields()}</form>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-ink">已有商品</h2>
        {project.products.length ? project.products.map((product) => (
          <form key={product.id} action={saveProjectProduct} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
            <p className="text-xs font-semibold text-ink/45 md:col-span-2">当前：{PROJECT_PRODUCT_STATUS_LABELS[product.status]} · {formatMoneyCents(product.price, product.currency)}</p>
            {fields(product)}
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">还没有商品草稿。先完成价格、说明和交付预期，再人工推进审核与开放预订。</div>}
      </section>
    </div>
  );
}

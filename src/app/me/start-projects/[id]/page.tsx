import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  PROJECT_INTAKE_STATUS_LABELS,
  categoryLabel,
  getProjectIntakeForViewer,
  needLabel,
  projectIntakeNextAction,
  projectIntakeTitle,
  sourceLabel
} from "@/lib/start-projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "启动草稿",
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    images: []
  }
};

type StartProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function info(label: string, value: string) {
  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function StartProjectDetailPage({ params }: StartProjectDetailPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) redirect(`/login?next=/me/start-projects/${id}`);

  const intake = await getProjectIntakeForViewer(id, user);
  if (!intake) notFound();

  const title = projectIntakeTitle(intake);
  const nextAction = projectIntakeNextAction(intake);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-12">
      <Link href="/me/projects" className="text-sm font-semibold text-ink/52 hover:text-ink">
        返回项目工作台
      </Link>

      <header className="mt-4 rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-7">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_INTAKE_STATUS_LABELS[intake.status]}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">完成度 {intake.completion}%</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
          你的项目已经开始。这里是私有启动草稿，不会进入公开作品流、排行榜或公开搜索。
        </p>
        <div className="mt-6 max-w-sm">
          <Link href="#positioning" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white">
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mt-5 grid gap-3 md:grid-cols-2">
        {info("创建来源", sourceLabel(intake.sourceType))}
        {info("产品品类", categoryLabel(intake.category, intake.categoryOther))}
        {info("当前主要需求", needLabel(intake.primaryNeed))}
        {info("创建时间", formatDate(intake.createdAt))}
      </section>

      <section className="mt-5 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">项目起点</h2>
        <p className="mt-3 rounded-[8px] bg-paper p-4 text-sm leading-7 text-ink/62">
          {intake.ideaText || "你还没有写项目想法。先用一句话描述产品，后续再补充设计图、面料和计划。"}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink/45">图片可在项目建立后补充。本轮不会把启动草稿图片写入公开 uploads。</p>
      </section>

      <section id="positioning" className="mt-5 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">唯一下一步</h2>
        <p className="mt-3 text-sm leading-7 text-ink/58">{nextAction.description}</p>
        <div className="mt-4 rounded-[8px] bg-paper p-4 text-sm leading-7 text-ink/58">
          下一批会逐步补充：目标消费者、使用场景、期望售价。现在不需要填写完整商业计划。
        </div>
      </section>

      <section className="mt-5 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">后续绑定</h2>
        <p className="mt-3 text-sm leading-7 text-ink/58">
          这个启动草稿只是入口记录。后续经过评估后，可以绑定现有作品、合作项目或孵化项目，但本轮不会自动转换。
        </p>
      </section>
    </main>
  );
}

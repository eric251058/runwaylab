import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectIntakeReviewPanel } from "@/components/admin/ProjectIntakeReviewPanel";
import { getCurrentUser } from "@/lib/auth/session";
import {
  PROJECT_INTAKE_EVENT_LABELS,
  PROJECT_INTAKE_STATUS_LABELS,
  categoryLabel,
  expectedPriceBandLabel,
  getProjectIntakeForAdmin,
  launchTimingLabel,
  needLabel,
  projectIntakeTitle,
  sourceLabel,
  useScenarioLabel
} from "@/lib/start-projects";

export const dynamic = "force-dynamic";

type AdminProjectIntakeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value?: Date | null) {
  if (!value) return "未记录";
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function item(label: string, value: string | null | undefined) {
  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-ink">{value?.trim() || "未填写"}</p>
    </div>
  );
}

export default async function AdminProjectIntakeDetailPage({ params }: AdminProjectIntakeDetailPageProps) {
  const admin = await getCurrentUser();
  const { id } = await params;

  if (!admin) redirect("/login?next=/admin/project-intakes");

  const intake = await getProjectIntakeForAdmin(id, admin);
  if (!intake) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-12">
      <Link href="/admin/project-intakes" className="text-sm font-semibold text-ink/52 hover:text-ink">
        返回评估列表
      </Link>

      <header className="mt-4 rounded-[8px] border border-black/8 bg-white p-5 md:p-7">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_INTAKE_STATUS_LABELS[intake.status]}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">完成度 {intake.completion}%</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">提交 {formatDate(intake.submittedForReviewAt)}</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink md:text-5xl">{projectIntakeTitle(intake)}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">发起人：{intake.owner.nickname}。这里只展示评估必要信息，不读取邮箱、手机号或密码字段。</p>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">项目资料</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {item("项目来源", sourceLabel(intake.sourceType))}
              {item("产品品类", categoryLabel(intake.category, intake.categoryOther))}
              {item("当前需求", needLabel(intake.primaryNeed))}
              {item("一句话想法", intake.ideaText)}
              {item("目标用户", intake.targetAudience)}
              {item("使用场景", useScenarioLabel(intake.useScenario))}
              {item("价格范围", expectedPriceBandLabel(intake.expectedPriceBand))}
              {item("启动时间", launchTimingLabel(intake.launchTiming))}
              {item("补充说明", intake.reviewMessage)}
              {item("平台反馈", intake.reviewNote)}
            </div>
          </section>

          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">评估时间线</h2>
            <div className="mt-4 space-y-3">
              {intake.events.length ? (
                intake.events.map((event) => (
                  <div key={event.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-ink">{PROJECT_INTAKE_EVENT_LABELS[event.eventType]}</p>
                      <p className="text-xs font-semibold text-ink/40">{formatDate(event.createdAt)}</p>
                    </div>
                    {event.note ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink/58">{event.note}</p> : null}
                  </div>
                ))
              ) : (
                <p className="rounded-[8px] bg-paper p-4 text-sm text-ink/55">暂无事件记录，项目创建于 {formatDate(intake.createdAt)}。</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid h-fit gap-5">
          <ProjectIntakeReviewPanel intakeId={intake.id} status={intake.status} expectedUpdatedAt={intake.updatedAt.toISOString()} />
          <section className="rounded-[8px] border border-black/8 bg-white p-5 text-sm leading-6 text-ink/58">
            <h2 className="font-semibold text-ink">处理边界</h2>
            <p className="mt-2">通过评估不会自动创建 Work、CollaborationProject 或 IncubationProject。本轮只完成平台评估结果。</p>
          </section>
        </div>
      </div>
    </main>
  );
}

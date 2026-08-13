import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getPrivateCollaborationProjectsForUser,
  getProjectExperienceStage
} from "@/lib/private-collaboration-projects";
import { getDesignerProjectWorkbench } from "@/lib/project-workbench";
import {
  categoryLabel,
  getProjectIntakesForUser,
  needLabel,
  privateCollaborationProjectHref,
  projectIntakeNextAction,
  projectIntakeTitle
} from "@/lib/start-projects";

export const dynamic = "force-dynamic";

const stageLabels = {
  IDEA: "想法",
  DEVELOPMENT: "开发",
  PRESALE: "预售",
  PRODUCTION: "生产"
} as const;

type StageKey = keyof typeof stageLabels;

function StageProgress({ stage }: { stage: StageKey }) {
  const keys = Object.keys(stageLabels) as StageKey[];
  const activeIndex = keys.indexOf(stage);

  return (
    <div className="grid grid-cols-4 items-center gap-2 text-center text-xs font-semibold text-ink/38" aria-label="项目阶段">
      {keys.map((key, index) => (
        <div key={key} className="min-w-0">
          <div className={`h-1.5 rounded-full ${index <= activeIndex ? "bg-ink" : "bg-black/10"}`} />
          <p className={`mt-2 truncate ${index === activeIndex ? "text-ink" : ""}`}>{stageLabels[key]}</p>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({
  title,
  meta,
  status,
  href,
  stage = "IDEA"
}: {
  title: string;
  meta: string;
  status: string;
  href: string;
  stage?: StageKey;
}) {
  return (
    <article className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_14px_42px_rgba(16,16,16,0.07)] md:grid-cols-[1fr_160px] md:items-center md:p-5">
      <div className="min-w-0">
        <h2 className="line-clamp-2 text-xl font-semibold text-ink">
          <Link href={href} className="hover:text-ink/70">
            {title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-1 text-sm font-semibold text-ink/48">{meta}</p>
        <div className="mt-4">
          <StageProgress stage={stage} />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink/70">{status}</p>
      </div>

      <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white">
        继续 <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default async function MeProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/projects");

  const [publishedProjects, intakes, collaborationProjects] = await Promise.all([
    getDesignerProjectWorkbench(user.id),
    getProjectIntakesForUser(user.id),
    getPrivateCollaborationProjectsForUser(user.id)
  ]);
  const totalProjectCount = publishedProjects.length + intakes.length + collaborationProjects.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink md:text-5xl">我的项目</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">从想法到第一件真实产品。</p>
        </div>
        <Link href="/start" className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          + 新建项目
        </Link>
      </header>

      {totalProjectCount ? (
        <section className="grid gap-4">
          {collaborationProjects.map((project) => {
            const experience = getProjectExperienceStage(project);
            const intake = project.projectIntake;
            return (
              <ProjectCard
                key={project.id}
                title={project.title}
                meta={`${categoryLabel(intake?.category ?? "OTHER", intake?.categoryOther)} · ${needLabel(intake?.primaryNeed ?? "UNSURE")}`}
                status={experience.headline}
                href={privateCollaborationProjectHref(project.id)}
                stage={experience.stage}
              />
            );
          })}

          {intakes.map((intake) => {
            const nextAction = projectIntakeNextAction(intake);
            return (
              <ProjectCard
                key={intake.id}
                title={projectIntakeTitle(intake)}
                meta={`${categoryLabel(intake.category, intake.categoryOther)} · ${needLabel(intake.primaryNeed)}`}
                status={intake.completion === 100 ? "需要你完成" : nextAction.description}
                href={`/me/start-projects/${intake.id}`}
              />
            );
          })}

          {publishedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              meta={project.statusDescription}
              status={project.waitingFor === "设计师" ? "需要你完成" : "开发进行中"}
              href={`/me/projects/${project.workId}`}
              stage="DEVELOPMENT"
            />
          ))}
        </section>
      ) : (
        <section className="rounded-[8px] border border-black/8 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-ink">还没有项目</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">先写下一个产品想法，我们会把它变成可以继续推进的项目。</p>
          <Link href="/start" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            新建项目
          </Link>
        </section>
      )}
    </div>
  );
}

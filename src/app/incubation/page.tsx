import Link from "next/link";
import { ArrowRight, Sparkles, SwatchBook, WandSparkles } from "lucide-react";
import { DataUnavailable } from "@/components/layout/DataUnavailable";
import { WorkCard } from "@/components/works/WorkCard";
import { visualFor } from "@/components/works/work-visuals";
import { getIncubationCandidateWorks, getIncubationProjects } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

function statusText(status: string) {
  const labels: Record<string, string> = {
    CANDIDATE: "孵化候选",
    REVIEWING: "编辑评估",
    FABRIC_MATCHING: "面料匹配",
    SAMPLE_EVALUATING: "打样评估",
    SAMPLE_MAKING: "打样中",
    COMPLETED: "已完成"
  };
  return labels[status] ?? "孵化推进中";
}

export default async function IncubationPage() {
  const data = await Promise.all([getIncubationCandidateWorks(6), getIncubationProjects(6)]).catch((error) => {
    console.error("Failed to load incubation page", error);
    return null;
  });

  if (!data) {
    return <DataUnavailable title="孵化池数据暂时没有读到" />;
  }

  const [candidateWorks, projects] = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="grid gap-6 rounded-[6px] bg-ink p-6 text-white md:grid-cols-[1fr_auto] md:items-center md:p-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <Sparkles size={14} />
            Incubation Pool
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">让有潜力的设计，被真正推进。</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 md:text-base">
            从推荐孵化开始，继续连接面料方向、版型判断、打样评估和合作机会。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:min-w-[360px]">
          <Link href="/incubation/fabric-request" className="rounded-[6px] bg-white p-5 text-ink">
            <SwatchBook size={20} />
            <p className="mt-4 text-lg font-semibold">找相似面料</p>
            <p className="mt-2 text-xs leading-5 text-ink/56">从作品风格出发匹配垂感、肌理、厚薄与颜色方向。</p>
          </Link>
          <Link href="/incubation/sample-request" className="rounded-[6px] bg-accent p-5 text-ink">
            <WandSparkles size={20} />
            <p className="mt-4 text-lg font-semibold">申请打样评估</p>
            <p className="mt-2 text-xs leading-5 text-ink/62">先判断版型、纸样、面料与预算是否适合推进。</p>
          </Link>
        </div>
      </header>

      <div className="mt-12 space-y-14">
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Candidates</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">正在被推荐进入孵化池的作品</h2>
            </div>
            <Link href="/works" className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
              查看作品库
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {candidateWorks.map((work, index) => (
              <WorkCard key={work.id} work={work} index={index} compact />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Projects</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">正式孵化项目</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {projects.map((project, index) => (
              <Link key={project.id} href={`/works/${project.work.id}`} className="overflow-hidden rounded-[6px] bg-white shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
                <img src={visualFor(index + 3, project.work.images[0]?.imageUrl)} alt={project.work.title} className="aspect-[16/11] w-full object-cover" />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="line-clamp-1 text-base font-semibold text-ink">{project.work.title}</h3>
                    <span className="shrink-0 rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/58">{statusText(project.status)}</span>
                  </div>
                  <p className="text-sm text-ink/55">{project.designer.nickname} / {project.designer.designerProfile?.school ?? project.designer.designerProfile?.city ?? "新锐设计师"}</p>
                  <p className="line-clamp-2 text-sm leading-6 text-ink/62">{project.platformComment ?? "平台正在评估这件作品的面料、版型与打样潜力。"}</p>
                  <p className="text-xs font-semibold text-ink/38">{project.nextAction ?? "等待下一步评估"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

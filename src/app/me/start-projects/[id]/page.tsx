import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectIntakeDetailsFlow, type ProjectIntakeDetailsDto } from "@/components/start/ProjectIntakeDetailsFlow";
import { getCurrentUser } from "@/lib/auth/session";
import { getProjectIntakeForViewer, projectIntakeNextAction, projectIntakeTitle } from "@/lib/start-projects";

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

function serializeIntake(intake: Awaited<ReturnType<typeof getProjectIntakeForViewer>>): ProjectIntakeDetailsDto {
  if (!intake) throw new Error("missing intake");
  return {
    id: intake.id,
    title: projectIntakeTitle(intake),
    ownerId: intake.ownerId,
    sourceType: intake.sourceType,
    category: intake.category,
    categoryOther: intake.categoryOther,
    primaryNeed: intake.primaryNeed,
    ideaText: intake.ideaText,
    projectTitle: intake.projectTitle,
    targetAudience: intake.targetAudience,
    useScenario: intake.useScenario,
    expectedPriceBand: intake.expectedPriceBand,
    launchTiming: intake.launchTiming,
    reviewMessage: intake.reviewMessage,
    reviewNote: intake.reviewNote,
    status: intake.status,
    completion: intake.completion,
    submittedForReviewAt: intake.submittedForReviewAt?.toISOString() ?? null,
    reviewedAt: intake.reviewedAt?.toISOString() ?? null,
    createdAt: intake.createdAt.toISOString(),
    updatedAt: intake.updatedAt.toISOString(),
    nextAction: projectIntakeNextAction(intake),
    events: intake.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor
        ? {
            nickname: event.actor.nickname,
            role: event.actor.role
          }
        : null
    }))
  };
}

export default async function StartProjectDetailPage({ params }: StartProjectDetailPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) redirect(`/login?next=/me/start-projects/${id}`);

  const intake = await getProjectIntakeForViewer(id, user);
  if (!intake) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-12">
      <Link href="/me/projects" className="text-sm font-semibold text-ink/52 hover:text-ink">
        返回项目工作台
      </Link>
      <div className="mt-4">
        <ProjectIntakeDetailsFlow initialIntake={serializeIntake(intake)} />
      </div>
    </main>
  );
}

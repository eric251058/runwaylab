import type { Metadata } from "next";
import { StartProjectFlow } from "@/components/start/StartProjectFlow";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { normalizeStartSourceParam } from "@/lib/start-projects/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "启动服装项目",
  description: "用约 60 秒记录你的服装产品起点。",
  robots: {
    index: false,
    follow: false
  }
};

type StartPageProps = {
  searchParams?: Promise<{
    source?: string;
  }>;
};

export default async function StartPage({ searchParams }: StartPageProps) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const initialSource = normalizeStartSourceParam(params?.source);
  const availableWorks = user
    ? await prisma.work.findMany({
        where: {
          userId: user.id,
          contentStatus: { in: ["VISIBLE", "HIDDEN"] },
          reviewStatus: { in: ["PENDING", "APPROVED", "PUBLISHED"] }
        },
        select: {
          id: true,
          title: true,
          reviewStatus: true,
          images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" }, take: 1 }
        },
        orderBy: { updatedAt: "desc" },
        take: 12
      })
    : [];

  return (
    <main className="bg-paper text-ink">
      <StartProjectFlow initialSource={initialSource} isLoggedIn={Boolean(user)} availableWorks={availableWorks} />
    </main>
  );
}

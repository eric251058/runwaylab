import type { Metadata } from "next";
import { StartProjectFlow } from "@/components/start/StartProjectFlow";
import { getCurrentUser } from "@/lib/auth/session";
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

  return (
    <main className="bg-paper text-ink">
      <StartProjectFlow initialSource={initialSource} isLoggedIn={Boolean(user)} />
    </main>
  );
}

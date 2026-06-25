import { redirect } from "next/navigation";
import { SampleRequestForm } from "@/components/incubation/SampleRequestForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publicWorkWhere } from "@/lib/works/public";

export const dynamic = "force-dynamic";

type SampleRequestPageProps = {
  searchParams?: Promise<{
    workId?: string;
  }>;
};

export default async function SampleRequestPage({ searchParams }: SampleRequestPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const selectedWorkId = params?.workId;

  if (!user) {
    const next = `/incubation/sample-request${selectedWorkId ? `?workId=${selectedWorkId}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const [ownWorks, selectedWork] = await Promise.all([
    prisma.work.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        title: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    selectedWorkId
      ? prisma.work.findFirst({
          where: {
            id: selectedWorkId,
            OR: [{ userId: user.id }, publicWorkWhere]
          },
          select: {
            id: true,
            title: true
          }
        })
      : null
  ]);

  const workMap = new Map(ownWorks.map((work) => [work.id, work]));
  if (selectedWork) {
    workMap.set(selectedWork.id, selectedWork);
  }

  return <SampleRequestForm works={[...workMap.values()]} initialWorkId={selectedWork?.id} defaultContact={user.email} />;
}

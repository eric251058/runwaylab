import Link from "next/link";
import type { Metadata } from "next";
import { teacherAvatarUrl } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "老师",
  description: "查看 RunwayLab 上的指导老师、推荐作品、课程作品展和设计挑战赛。"
};

export default async function TeachersPage() {
  const teachers = await prisma.teacher.findMany({
    where: {
      status: "ACTIVE"
    },
    include: {
      school: true,
      _count: {
        select: {
          recommendations: true
        }
      }
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Teachers</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">指导老师</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">连接服装设计课程、老师推荐作品和院校活动，让优秀学生作品获得更清晰的学术背书。</p>
      </header>

      {teachers.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Link key={teacher.id} href={`/teachers/${teacher.slug ?? teacher.id}`} className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.06)]">
              <div className="flex items-start gap-4">
                <img src={teacherAvatarUrl(teacher.avatarUrl)} alt={teacher.name} className="size-16 rounded-full object-cover" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">{teacher.name}</h2>
                    {teacher.isFeatured ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">推荐</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-ink/52">{teacher.school?.name ?? "院校合作资源"}</p>
                  <p className="mt-1 text-sm text-ink/52">{teacher.title ?? teacher.department ?? "作品指导老师"}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink/58">{teacher.bio ?? "参与学生作品推荐与课程作品展示，为优秀设计作品提供第一轮信任背书。"}</p>
              <p className="mt-4 text-xs font-semibold text-ink/45">推荐作品 {teacher._count.recommendations}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">平台正在补充老师与推荐作品信息。</div>
      )}
    </div>
  );
}

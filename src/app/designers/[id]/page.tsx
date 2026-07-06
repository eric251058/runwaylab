import Link from "next/link";
import { notFound } from "next/navigation";
import { IncubationApplicationStatus, type Prisma } from "@prisma/client";
import { ArrowLeft, Bookmark, Heart, Images, MapPin, Trophy } from "lucide-react";
import { WorkMasonry } from "@/components/works/WorkMasonry";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import { initials, normalizeImageUrl } from "@/components/works/work-visuals";

export const dynamic = "force-dynamic";

type DesignerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const designerWorkInclude = {
  images: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  user: {
    include: {
      designerProfile: true
    }
  },
  challengeEntries: {
    include: {
      challenge: true
    },
    take: 1
  },
  incubationProjects: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  },
  incubationApplications: {
    where: {
      status: {
        in: [IncubationApplicationStatus.CANDIDATE, IncubationApplicationStatus.REVIEWING]
      }
    },
    take: 1
  }
} satisfies Prisma.WorkInclude;

function stat(label: string, value: number, Icon: typeof Images) {
  return (
    <div className="rounded-[6px] bg-white p-3 shadow-[0_10px_30px_rgba(16,16,16,0.06)] md:p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink/45">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-ink md:text-2xl">{value}</p>
    </div>
  );
}

function splitStyleTags(value?: string | null) {
  return (
    value
      ?.split(/[,，/]/)
      .map((tag) => tag.trim())
      .filter(Boolean) ?? []
  );
}

export default async function DesignerPage({ params }: DesignerPageProps) {
  const { id } = await params;
  const data = await Promise.all([
    prisma.user.findUnique({
      where: {
        id
      },
      include: {
        designerProfile: true
      }
    }),
    prisma.work.findMany({
      where: {
        ...approvedVisibleWorkWhere,
        userId: id
      },
      include: designerWorkInclude,
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.challengeEntry.findMany({
      where: {
        userId: id,
        work: approvedVisibleWorkWhere
      },
      distinct: ["challengeId"],
      select: {
        challengeId: true
      }
    })
  ]).catch((error) => {
    console.error("Failed to load designer profile", error);
    return undefined;
  });

  if (data === undefined) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <p className="rounded-[6px] bg-white p-6 text-sm text-ink/55">设计师主页暂时没有读取成功，请稍后再试。</p>
      </main>
    );
  }

  if (!data) {
    notFound();
  }

  const [user, works, challengeEntries] = data;

  if (!user) {
    notFound();
  }

  const stats = {
    workCount: works.length,
    likeCount: works.reduce((total, work) => total + work.likeCount, 0),
    favoriteCount: works.reduce((total, work) => total + work.favoriteCount, 0),
    challengeCount: challengeEntries.length
  };
  const profile = user.designerProfile;
  const avatarUrl = normalizeImageUrl(user.avatarUrl);
  const location = [profile?.school, profile?.city].filter(Boolean).join(" / ") || "未填写学校和城市";
  const bio = profile?.bio?.trim() || "这个设计师还没有填写简介";
  const styleTags = Array.from(new Set([...splitStyleTags(profile?.designDirection), ...works.flatMap((work) => work.styleTags)])).slice(0, 8);

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 md:px-8 md:py-10">
      <Link href="/works" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-ink">
        <ArrowLeft size={16} />
        返回作品库
      </Link>

      <section className="rounded-[6px] bg-white p-4 shadow-[0_16px_44px_rgba(16,16,16,0.08)] md:p-7">
        <div className="flex gap-4 md:items-center md:gap-6">
          <div className="size-20 shrink-0 overflow-hidden rounded-full bg-ink text-white md:size-28">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.nickname} className="h-full w-full object-cover object-center" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold md:text-3xl">{initials(user.nickname)}</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Designer Profile</p>
            <h1 className="mt-2 truncate text-3xl font-semibold leading-tight text-ink md:text-5xl">{user.nickname}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-ink/55">
              <MapPin size={15} />
              <span className="truncate">{location}</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/62 md:max-w-3xl md:text-base">{bio}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {styleTags.length ? (
            styleTags.map((tag) => (
              <span key={tag} className="rounded-full border border-black/10 bg-paper px-3 py-1.5 text-xs font-semibold text-ink/58">
                {tag}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-black/10 bg-paper px-3 py-1.5 text-xs font-semibold text-ink/58">服装设计</span>
          )}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 md:mt-6 md:grid-cols-4 md:gap-4">
        {stat("作品数量", stats.workCount, Images)}
        {stat("总点赞", stats.likeCount, Heart)}
        {stat("总收藏", stats.favoriteCount, Bookmark)}
        {stat("参与挑战", stats.challengeCount, Trophy)}
      </section>

      <section className="mt-7 md:mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Portfolio</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">公开作品</h2>
          </div>
          <span className="text-xs font-semibold text-ink/40">{works.length} 件</span>
        </div>

        {works.length ? (
          <WorkMasonry works={works} />
        ) : (
          <div className="rounded-[6px] border border-dashed border-black/15 bg-white px-6 py-12 text-center text-sm text-ink/55">
            TA 还没有公开作品
          </div>
        )}
      </section>
    </main>
  );
}

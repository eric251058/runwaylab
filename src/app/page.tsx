import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Challenge } from "@prisma/client";
import { ChallengeHero } from "@/components/challenges/ChallengeHero";
import { RankingList } from "@/components/challenges/RankingList";
import { DesignerCard } from "@/components/designer/DesignerCard";
import { WorkCard } from "@/components/works/WorkCard";
import { WorkStatusBadge } from "@/components/works/WorkStatusBadge";
import { visualFor } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getActiveChallenge,
  getChallengeEntryCount,
  getEditorPickWorks,
  getFeaturedWorks,
  getIncubationCandidateWorks,
  getIncubationRecommendedWorks,
  getPopularWorks,
  getRecommendedDesigners,
  type RecommendedDesigner,
  type WorkCardData
} from "@/lib/works/queries";

export const dynamic = "force-dynamic";

type HomeData = {
  activeChallenge: Challenge | null;
  challengeEntryCount: number;
  featuredWorks: WorkCardData[];
  editorPickWorks: WorkCardData[];
  popularWorks: WorkCardData[];
  incubationRankWorks: WorkCardData[];
  incubationWorks: WorkCardData[];
  designers: RecommendedDesigner[];
};

function makeFallbackWork(index: number): WorkCardData {
  const id = `fallback-work-${index}`;
  const names = ["林知夏", "周以安", "许南星", "陈白露", "顾景川", "沈若棠", "叶青禾", "宋明熙"];
  const titles = ["雾线廓形实验", "城市通勤切片", "旧衣再生外套", "海盐白礼服", "纸感风衣计划", "夜行机能套装", "软甲针织系列", "蓝晕毕业设计"];

  return {
    id,
    userId: `fallback-user-${index}`,
    title: `${titles[index % titles.length]} ${String(index + 1).padStart(2, "0")}`,
    description: "从真实穿着场景出发，用廓形、材料肌理和局部结构表达新锐设计师的个人语言。",
    category: ["女装", "外套", "礼服", "实验设计"][index % 4],
    workType: ["系列设计", "毕业设计", "效果图", "成衣照片"][index % 4],
    styleTags: ["极简", "未来感", "可持续"].slice(0, 2 + (index % 2)),
    reviewStatus: "APPROVED",
    rejectReason: null,
    contentStatus: "VISIBLE",
    isOriginal: true,
    isAiAssisted: index % 4 === 0,
    isFeatured: index < 6,
    isEditorPick: index % 3 === 0,
    isOpenCoop: index % 2 === 0,
    wantsFabric: true,
    wantsSample: index % 3 === 0,
    wantsIncubation: index % 2 === 0,
    incubationStatus: index < 4 ? "CANDIDATE" : null,
    viewCount: 240 + index * 23,
    likeCount: 18 + index * 3,
    favoriteCount: 9 + index * 2,
    commentCount: 3 + (index % 4),
    shareCount: index + 1,
    incubationRecommendCount: 12 + index * 4,
    adminNote: null,
    handledAt: null,
    handledById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [
      { id: `${id}-image-1`, workId: id, imageUrl: visualFor(index), sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: `${id}-image-2`, workId: id, imageUrl: visualFor(index + 1), sortOrder: 1, createdAt: new Date(), updatedAt: new Date() }
    ],
    user: {
      id: `fallback-user-${index}`,
      email: `designer${index + 1}@runwaylab.test`,
      passwordHash: "",
      nickname: names[index % names.length],
      avatarUrl: null,
      role: index % 2 === 0 ? "STUDENT_DESIGNER" : "NEW_DESIGNER",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
      designerProfile: {
        id: `fallback-profile-${index}`,
        userId: `fallback-user-${index}`,
        school: ["东华大学", "北京服装学院", "中国美术学院", "广州美术学院"][index % 4],
        city: ["上海", "北京", "杭州", "广州"][index % 4],
        designDirection: ["廓形实验", "可持续材料", "机能日常", "礼服结构"][index % 4],
        bio: "关注年轻日常与舞台表达之间的关系。",
        cooperationStatus: "接受打样孵化",
        portfolioCoverUrl: visualFor(index + 2),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    challengeEntries: index < 6 ? [{ id: `entry-${index}`, challengeId: "fallback-challenge", workId: id, userId: `fallback-user-${index}`, popularityScore: 80, incubationScore: 60, adminWeight: 0, manualRank: null, awardLevel: null, createdAt: new Date(), updatedAt: new Date(), challenge: null as never }] : [],
    incubationProjects: index < 5 ? [{ id: `project-${index}`, workId: id, designerId: `fallback-user-${index}`, status: "CANDIDATE", platformComment: "廓形完整，适合继续做面料和版型评估。", nextAction: "等待编辑评估", adminNote: null, handledAt: null, handledById: null, createdAt: new Date(), updatedAt: new Date() }] : [],
    incubationApplications: []
  } as WorkCardData;
}

function makeFallbackDesigner(index: number): RecommendedDesigner {
  const work = makeFallbackWork(index);
  return {
    id: `fallback-profile-${index}`,
    userId: work.user.id,
    school: work.user.designerProfile?.school ?? null,
    city: work.user.designerProfile?.city ?? null,
    designDirection: work.user.designerProfile?.designDirection ?? null,
    bio: "关注服装廓形、材料肌理与年轻生活方式。",
    cooperationStatus: "接受合作",
    portfolioCoverUrl: visualFor(index + 2),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      ...work.user,
      _count: {
        works: 3 + (index % 4)
      }
    }
  } as RecommendedDesigner;
}

function fallbackChallenge(): Challenge {
  const now = new Date();
  return {
    id: "fallback-challenge",
    title: "第一届「设计上岸」新人设计挑战",
    theme: "让你的设计从作业变成机会",
    coverUrl: null,
    description: "面向服装设计学生、新人设计师和独立创作者的新人设计挑战赛。",
    requirements: "上传作品图与设计理念，确认原创或已获授权。",
    rewards: "Top 10 首页推荐，优秀作品进入孵化池。",
    startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now
  };
}

async function loadHomeData(): Promise<HomeData> {
  try {
    const [activeChallenge, featuredWorks, editorPickWorks, popularWorks, incubationRankWorks, incubationWorks, designers] = await Promise.all([
      getActiveChallenge(),
      getFeaturedWorks(9),
      getEditorPickWorks(6),
      getPopularWorks(10),
      getIncubationRecommendedWorks(10),
      getIncubationCandidateWorks(6),
      getRecommendedDesigners(8)
    ]);

    const challengeEntryCount = activeChallenge ? await getChallengeEntryCount(activeChallenge.id) : 0;

    return {
      activeChallenge,
      challengeEntryCount,
      featuredWorks,
      editorPickWorks,
      popularWorks,
      incubationRankWorks,
      incubationWorks,
      designers
    };
  } catch (error) {
    console.error("Failed to load homepage data", error);
    const fallbackWorks = Array.from({ length: 10 }, (_, index) => makeFallbackWork(index));
    return {
      activeChallenge: fallbackChallenge(),
      challengeEntryCount: 10,
      featuredWorks: fallbackWorks.slice(0, 9),
      editorPickWorks: fallbackWorks.filter((work) => work.isEditorPick).slice(0, 6),
      popularWorks: fallbackWorks.slice().sort((a, b) => b.likeCount + b.favoriteCount + b.commentCount - (a.likeCount + a.favoriteCount + a.commentCount)),
      incubationRankWorks: fallbackWorks.slice().sort((a, b) => b.incubationRecommendCount - a.incubationRecommendCount),
      incubationWorks: fallbackWorks.slice(0, 5),
      designers: Array.from({ length: 8 }, (_, index) => makeFallbackDesigner(index))
    };
  }
}

function SectionTitle({ eyebrow, title, href }: { eyebrow: string; title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
          查看全部
          <ArrowRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}

function HeroWorkStack({ works, challengeId }: { works: WorkCardData[]; challengeId?: string }) {
  const [main, second, third] = works.length ? works : Array.from({ length: 3 }, (_, index) => makeFallbackWork(index));

  return (
    <div className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr] md:min-h-[430px] md:gap-3">
      <Link href={`/works/${main.id}`} className="group relative overflow-hidden rounded-[6px] bg-zinc-200 shadow-[0_24px_80px_rgba(16,16,16,0.16)]">
        <img src={visualFor(0, main.images[0]?.imageUrl)} alt={main.title} className="h-full min-h-[260px] w-full object-cover transition duration-500 group-hover:scale-105 md:min-h-[360px]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 to-transparent p-4 text-white md:p-5">
          <div className="mb-2 flex flex-wrap gap-2 md:mb-3">
            {main.isEditorPick ? <WorkStatusBadge kind="editorPick">编辑推荐</WorkStatusBadge> : null}
            {main.challengeEntries.length ? <WorkStatusBadge kind="challenge">参赛中</WorkStatusBadge> : null}
          </div>
          <h3 className="line-clamp-2 text-lg font-semibold md:text-xl">{main.title}</h3>
          <p className="mt-2 text-sm text-white/70">{main.user.nickname} / {main.user.designerProfile?.school ?? main.user.designerProfile?.city ?? "新锐设计师"}</p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 md:gap-3">
        {[second, third].map((work, index) => (
          <Link key={work.id} href={`/works/${work.id}`} className="group relative overflow-hidden rounded-[6px] bg-zinc-200 shadow-[0_16px_50px_rgba(16,16,16,0.12)]">
            <img src={visualFor(index + 2, work.images[0]?.imageUrl)} alt={work.title} className="aspect-[4/5] h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white md:p-3">
              <p className="line-clamp-1 text-sm font-semibold">{work.title}</p>
              <p className="mt-1 text-xs text-white/65">{work.incubationRecommendCount} 人推荐孵化</p>
            </div>
          </Link>
        ))}
        <Link href={challengeId ? `/challenges/${challengeId}` : "/works"} className="hidden items-center justify-between rounded-[6px] bg-accent p-4 text-sm font-semibold text-ink sm:flex">
          查看参赛作品
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}

function IncubationCandidateStrip({ works }: { works: WorkCardData[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {works.slice(0, 5).map((work, index) => {
        const project = work.incubationProjects[0];
        return (
          <Link key={work.id} href={`/works/${work.id}`} className="overflow-hidden rounded-[6px] bg-white shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <img src={visualFor(index + 4, work.images[0]?.imageUrl)} alt={work.title} className="aspect-[4/5] w-full object-cover" />
            <div className="space-y-2 p-4">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{work.title}</h3>
              <div className="flex items-center justify-between text-xs font-semibold text-ink/48">
                <span>{work.incubationRecommendCount} 人推荐</span>
                <span>{project?.status === "CANDIDATE" || work.incubationStatus === "CANDIDATE" ? "候选中" : "评估中"}</span>
              </div>
              <p className="line-clamp-2 text-xs leading-5 text-ink/56">{project?.platformComment ?? "平台正在观察这件作品的面料、版型与打样潜力。"}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function HomePage() {
  const [data, currentUser] = await Promise.all([loadHomeData(), getCurrentUser()]);
  const challengeHref = data.activeChallenge ? `/challenges/${data.activeChallenge.id}` : "/works";

  return (
    <div className="mx-auto max-w-7xl px-3 py-3 md:px-8 md:py-7">
      <nav className="mb-2 flex items-center justify-end md:mb-4">
        <Link
          href={currentUser ? "/me" : "/login?next=/me"}
          className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white/85 px-4 text-sm font-semibold text-ink shadow-[0_10px_30px_rgba(16,16,16,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          {currentUser ? "我的" : "登录/注册"}
        </Link>
      </nav>
      <header className="grid items-center gap-4 pb-5 md:grid-cols-[0.9fr_1.1fr] md:gap-9 md:pb-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45 md:mb-3 md:text-xs">RUNWAYLAB V1.0</p>
          <h1 className="text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">让你的服装设计作品，从作业变成机会。</h1>
          <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-ink/62 md:mt-5 md:text-base md:leading-7">
            上传作品，参加新人设计挑战，获得曝光、排名、面料匹配和打样孵化机会。
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 md:mt-7 md:flex md:flex-wrap md:gap-3">
            <Link href="/works" className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-white px-3 text-xs font-semibold text-ink md:h-12 md:px-6 md:text-sm">
              看作品
            </Link>
            <Link href="/publish" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-3 text-xs font-semibold text-white shadow-[0_14px_36px_rgba(16,16,16,0.18)] md:h-12 md:px-6 md:text-sm">
              立即投稿
            </Link>
            <Link href={challengeHref} className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-accent px-3 text-xs font-semibold text-ink md:h-12 md:gap-2 md:px-6 md:text-sm">
              查看参赛作品
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-ink/55 md:mt-7 md:text-xs">
            <div className="rounded-[6px] bg-white/80 p-3">
              <p className="text-lg font-semibold text-ink">{data.challengeEntryCount}</p>
              <p className="mt-1">参赛作品</p>
            </div>
            <div className="rounded-[6px] bg-white/80 p-3">
              <p className="text-lg font-semibold text-ink">Top 10</p>
              <p className="mt-1">首页推荐</p>
            </div>
            <div className="rounded-[6px] bg-white/80 p-3">
              <p className="text-lg font-semibold text-ink">30+</p>
              <p className="mt-1">进入候选</p>
            </div>
          </div>
        </div>

        <HeroWorkStack works={data.featuredWorks.slice(0, 3)} challengeId={data.activeChallenge?.id} />
      </header>

      <div className="space-y-8 md:space-y-16">
        <ChallengeHero challenge={data.activeChallenge} entryCount={data.challengeEntryCount} />

        <section>
          <SectionTitle eyebrow="Featured Today" title="今日精选作品" href="/works" />
          <div className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3">
            {data.featuredWorks.slice(0, 6).map((work, index) => (
              <WorkCard key={work.id} work={work} index={index} compact />
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <RankingList title="本周人气榜" works={data.popularWorks} metric="popular" />
          <RankingList title="最值得孵化榜" works={data.incubationRankWorks} metric="incubation" />
        </div>

        <section>
          <SectionTitle eyebrow="Incubation" title="正在被推荐进入孵化池的作品" href="/incubation" />
          <IncubationCandidateStrip works={data.incubationWorks.length ? data.incubationWorks : data.incubationRankWorks.slice(0, 5)} />
        </section>

        <section>
          <SectionTitle eyebrow="Designers" title="新锐设计师推荐" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.designers.slice(0, 8).map((designer, index) => (
              <DesignerCard key={designer.id} designer={designer} index={index} />
            ))}
          </div>
        </section>

        <section className="rounded-[6px] bg-ink p-6 text-white md:p-8">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                <Sparkles size={14} />
                Incubation Opportunity
              </div>
              <h2 className="mt-3 text-2xl font-semibold md:text-3xl">作品被看见后，下一步是面料和打样。</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">从一件被看见的作品开始，继续推进面料方向、版型判断和打样评估。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/incubation/fabric-request" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-ink">
                找面料
              </Link>
              <Link href="/incubation/sample-request" className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-ink">
                打样评估
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

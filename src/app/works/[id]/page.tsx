import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { ActionGuide } from "@/components/ActionGuide";
import { DataUnavailable } from "@/components/layout/DataUnavailable";
import { IncubationProgress } from "@/components/incubation/IncubationProgress";
import { PresaleCampaignPanel } from "@/components/presale/PresaleCampaignPanel";
import { WorkImageCarousel } from "@/components/works/WorkImageCarousel";
import { WorkContributionPanel } from "@/components/works/WorkContributionPanel";
import { WorkInteractionBar } from "@/components/works/WorkInteractionBar";
import { WorkStatusBadge, getWorkBadges } from "@/components/works/WorkStatusBadge";
import { initials } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import { incubationStatusLabels } from "@/lib/incubation";
import { getHeatBadges, getHeatScore } from "@/lib/operation-growth";
import { canViewWorkDetail } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fabricCoverUrl, PROVIDER_PROPOSAL_STATUS_LABELS, PROVIDER_PROPOSAL_TYPE_LABELS } from "@/lib/provider-market";
import { getWorkDetailById } from "@/lib/works/queries";
import { PresaleCampaignStatus, UserPersona, WorkIncubationStatus, WorkVoteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type WorkDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function field(label: string, value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="rounded-[6px] border border-black/8 bg-white/70 p-4">
      <p className="text-xs font-semibold text-ink/35">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{typeof value === "boolean" ? (value ? "是" : "否") : value}</p>
    </div>
  );
}

function legacyIncubationLabel(value?: string | null) {
  const labels: Record<string, string> = {
    CANDIDATE: "孵化候选",
    REVIEWING: "编辑评估",
    NOT_SUITABLE: "暂不适合",
    FABRIC_MATCHING: "面料匹配中",
    SAMPLE_EVALUATING: "打样评估中",
    QUOTE_DISCUSSING: "报价沟通中",
    PATTERN_EVALUATING: "版型评估中",
    SAMPLE_MAKING: "打样中",
    COOPERATION_DISCUSSING: "合作沟通中",
    COMPLETED: "已完成"
  };

  return value ? labels[value] ?? "孵化跟进中" : "未进入孵化";
}

function crowdIncubationStatus(value?: string | null) {
  if (value === "FABRIC_MATCHING") return WorkIncubationStatus.FABRIC_MATCHING;
  if (value === "SAMPLE_EVALUATING" || value === "SAMPLE_MAKING") return WorkIncubationStatus.SAMPLE_MATCHING;
  if (value === "COMPLETED") return WorkIncubationStatus.COLLABORATION_REACHED;
  if (value === "CANDIDATE" || value === "REVIEWING") return WorkIncubationStatus.CANDIDATE;
  return WorkIncubationStatus.DISPLAYING;
}

function progressMetric(label: string, value: number) {
  return (
    <div className="rounded-[6px] border border-black/8 bg-paper p-3">
      <p className="text-xs font-semibold text-ink/42">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function summarySignal(label: string, value: string, state: "done" | "active" | "todo") {
  const className = state === "done" ? "bg-ink text-white" : state === "active" ? "bg-white text-ink" : "bg-paper text-ink/55";
  return (
    <div className={`rounded-[8px] border border-black/8 p-3 ${className}`}>
      <p className="text-xs font-semibold opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function designHighlight(description: string) {
  const text = description.replace(/\s+/g, " ").trim();
  return text.length > 88 ? `${text.slice(0, 88)}...` : text;
}

function nextActionCopy({
  isLoggedIn,
  isOwner,
  isAdmin,
  persona,
  workId,
  hasActivePresale
}: {
  isLoggedIn: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  persona?: UserPersona | null;
  workId: string;
  hasActivePresale: boolean;
}) {
  const presaleHref = hasActivePresale ? "#presale-validation" : `/presale?workId=${workId}`;

  if (!isLoggedIn) {
    return {
      title: "登录后表达意向",
      description: "点赞、收藏或提交预售意向都不会产生付款。",
      actions: [
        { label: "登录后表达意向", href: `/login?next=/works/${workId}`, primary: true },
        { label: "看预售", href: presaleHref }
      ]
    };
  }

  if (isAdmin) {
    return {
      title: "进入后台运营",
      description: "把有潜力的作品推进推荐、预售或合作项目。",
      actions: [
        { label: "后台运营", href: "/admin", primary: true },
        { label: "创建预售", href: "/admin/presale-campaigns" },
        { label: "创建项目", href: "/admin/projects" }
      ]
    };
  }

  if (isOwner) {
    return {
      title: "查看孵化进度",
      description: "跟进老师推荐、面料、方案和预售意向。",
      actions: [
        { label: "查看孵化进度", href: "/me/incubation", primary: true },
        { label: "服务商方案", href: "#provider-market" },
        { label: "预售验证", href: presaleHref }
      ]
    };
  }

  if (persona === UserPersona.TEACHER) {
    return {
      title: "推荐这个作品",
      description: "老师推荐会帮助学生作品获得第一轮信任背书。",
      note: "当前由平台运营协助完成。",
      actions: [
        { label: "推荐这个作品", href: "#teacher-recommendation-help", primary: true },
        { label: "作品展", href: "/exhibitions" }
      ]
    };
  }

  if (persona === UserPersona.FABRIC_SUPPLIER || persona === UserPersona.SAMPLE_STUDIO || persona === UserPersona.FACTORY) {
    return {
      title: "申请成为服务商",
      description: "入驻后可参与面料、打样或生产方案提交。",
      actions: [
        { label: "申请成为服务商", href: "/providers/apply", primary: true },
        { label: "服务商方案", href: "#provider-market" }
      ]
    };
  }

  if (persona === UserPersona.BUYER) {
    return {
      title: "查看预售验证",
      description: "看好作品，可以先提交预售或采购意向。",
      actions: [
        { label: "查看预售验证", href: presaleHref, primary: true },
        { label: "合作项目", href: "/projects" }
      ]
    };
  }

  return {
    title: "提交预售意向",
    description: "只表达兴趣，不需要付款。",
    actions: [
      { label: "提交预售意向", href: presaleHref, primary: true },
      { label: "点赞 / 收藏", href: "#incubation-actions" }
    ]
  };
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const work = await getWorkDetailById(id).catch((error) => {
    console.error("Failed to load work detail", error);
    return undefined;
  });

  if (work === undefined) {
    return <DataUnavailable title="作品详情暂时没有读到" />;
  }

  if (!work) {
    notFound();
  }

  if (!canViewWorkDetail(currentUser, work)) {
    notFound();
  }

  const profile = work.user.designerProfile;
  const badges = getWorkBadges(work);
  const activeChallenge = work.challengeEntries[0]?.challenge;
  const incubationProject = work.incubationProjects[0];
  const [workIncubation, presaleIntentCount, fabricProposalCount, sampleProposalCount, factoryProposalCount, buyerIntentCount, activePresaleCampaign, workVoteCount, workContributionCount] = await Promise.all([
    prisma.workIncubation.findUnique({
      where: {
        workId: work.id
      }
    }),
    prisma.presaleIntent.count({
      where: {
        workId: work.id
      }
    }),
    prisma.fabricProposal.count({
      where: {
        workId: work.id
      }
    }),
    prisma.sampleProposal.count({
      where: {
        workId: work.id
      }
    }),
    prisma.factoryProposal.count({
      where: {
        workId: work.id
      }
    }),
    prisma.buyerIntent.count({
      where: {
        workId: work.id
      }
    }),
    prisma.presaleCampaign.findFirst({
      where: {
        workId: work.id,
        status: PresaleCampaignStatus.ACTIVE
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
    }),
    prisma.workVote.count({
      where: {
        workId: work.id,
        status: WorkVoteStatus.ACTIVE
      }
    }),
    prisma.workContribution.count({
      where: {
        workId: work.id
      }
    })
  ]);
  const activityInfo = await prisma.work.findUnique({
    where: {
      id: work.id
    },
    select: {
      school: {
        select: {
          id: true,
          slug: true,
          name: true,
          city: true
        }
      },
      teacher: {
        select: {
          id: true,
          slug: true,
          name: true,
          title: true,
          school: {
            select: {
              name: true
            }
          }
        }
      },
      teacherRecommendations: {
        include: {
          teacher: {
            include: {
              school: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 3
      }
    }
  });
  const providerMarketInfo = await prisma.work.findUnique({
    where: {
      id: work.id
    },
    select: {
      fabricRecommendations: {
        include: {
          fabric: {
            include: {
              provider: true
            }
          },
          provider: true
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      providerWorkProposals: {
        include: {
          provider: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });
  const crowdStatus = workIncubation?.status ?? crowdIncubationStatus(incubationProject?.status ?? work.incubationStatus);
  const heatSignals = {
    likeCount: work.likeCount,
    favoriteCount: work.favoriteCount,
    commentCount: work.commentCount,
    presaleIntentCount,
    fabricProposalCount,
    sampleProposalCount,
    factoryProposalCount,
    buyerIntentCount
  };
  const heatScore = getHeatScore(heatSignals);
  const heatBadges = getHeatBadges(heatSignals);
  const [liked, favorited, incubationRecommended] = currentUser
    ? await Promise.all([
        prisma.like.findUnique({
          where: {
            userId_workId: {
              userId: currentUser.id,
              workId: work.id
            }
          },
          select: { id: true }
        }),
        prisma.favorite.findUnique({
          where: {
            userId_workId: {
              userId: currentUser.id,
              workId: work.id
            }
          },
          select: { id: true }
        }),
        prisma.incubationRecommendation.findUnique({
          where: {
            userId_workId: {
              userId: currentUser.id,
              workId: work.id
            }
          },
          select: { id: true }
        })
      ])
    : [null, null, null];
  const isOwner = Boolean(currentUser && currentUser.id === work.userId);
  const isAdminUser = currentUser?.role === "ADMIN";
  const actionCopy = nextActionCopy({
    isLoggedIn: Boolean(currentUser),
    isOwner,
    isAdmin: isAdminUser,
    persona: currentUser?.persona,
    workId: work.id,
    hasActivePresale: Boolean(activePresaleCampaign)
  });
  const teacherRecommendationCount = activityInfo?.teacherRecommendations.length ?? 0;
  const fabricSignalCount = fabricProposalCount + (providerMarketInfo?.fabricRecommendations.length ?? 0);
  const providerProposalSignalCount = sampleProposalCount + factoryProposalCount + (providerMarketInfo?.providerWorkProposals.length ?? 0);
  const presaleSignalCount = presaleIntentCount + (activePresaleCampaign?.currentCount ?? 0);
  const completedSignals = [
    teacherRecommendationCount ? "老师推荐" : null,
    fabricSignalCount ? "面料建议" : null,
    providerProposalSignalCount ? "服务商方案" : null,
    presaleSignalCount ? "预售意向" : null
  ].filter(Boolean);
  const nextStep = presaleSignalCount
    ? "跟进预售意向与合作资源"
    : fabricSignalCount
      ? "收集预售意向"
      : teacherRecommendationCount
        ? "补充面料建议"
        : "完善作品背书";

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-10">
      <Link href="/works" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-ink md:mb-5">
        <ArrowLeft size={16} />
        返回作品库
      </Link>

      <div className="grid gap-5 md:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <WorkImageCarousel images={work.images} title={work.title} />

        <section className="space-y-4 md:space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-2 md:mb-4">
              {badges.map((badge) => (
                <WorkStatusBadge key={badge.label} kind={badge.kind}>
                  {badge.label}
                </WorkStatusBadge>
              ))}
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-5xl">{work.title}</h1>
          </div>

          <Link href={`/designers/${work.user.id}`} className="flex items-center gap-3 rounded-[6px] bg-white p-3 shadow-[0_12px_34px_rgba(16,16,16,0.08)] md:gap-4 md:p-4 md:shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="flex size-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white md:size-14">{initials(work.user.nickname)}</div>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{work.user.nickname}</p>
              <p className="mt-1 truncate text-sm text-ink/50">
                {[profile?.school, profile?.city, profile?.designDirection].filter(Boolean).join(" / ") || "新锐设计师"}
              </p>
            </div>
          </Link>

          <section className="grid gap-3 md:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Design Highlight</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">设计亮点</h2>
              <p className="mt-3 text-sm leading-6 text-ink/62">{designHighlight(work.description)}</p>
            </div>
            <div className="rounded-[8px] border border-black/8 bg-paper p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Incubation</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">当前孵化状态</h2>
              <p className="mt-3 text-sm leading-6 text-ink/62">当前阶段：{incubationStatusLabels[crowdStatus]}</p>
              <p className="mt-1 text-sm leading-6 text-ink/62">已完成：{completedSignals.join("、") || "作品展示"}</p>
              <p className="mt-1 text-sm leading-6 text-ink/62">下一步：{nextStep}</p>
            </div>
          </section>

          <ActionGuide
            eyebrow="Next Action"
            title={actionCopy.title}
            description={actionCopy.description}
            note={"note" in actionCopy ? actionCopy.note : undefined}
            actions={actionCopy.actions}
          />

          <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <h2 className="text-xl font-semibold text-ink">作品说明</h2>
            <p className="mt-3 text-sm leading-6 text-ink/62 md:text-base md:leading-7">{work.description}</p>
          </section>

          {(activityInfo?.school || activityInfo?.teacher || activityInfo?.teacherRecommendations.length) ? (
            <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
              <h2 className="text-xl font-semibold text-ink">老师推荐</h2>
              {activityInfo.teacherRecommendations.length ? (
                <p className="mt-2 text-sm leading-6 text-ink/58">该作品已获得老师推荐，具备进一步展示和孵化价值。</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {activityInfo.teacherRecommendations.length ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">老师推荐</span> : null}
                {activityInfo.school ? (
                  <Link href={`/schools/${activityInfo.school.slug ?? activityInfo.school.id}`} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">
                    学校：{activityInfo.school.name}
                  </Link>
                ) : null}
                {activityInfo.teacher ? (
                  <Link href={`/teachers/${activityInfo.teacher.slug ?? activityInfo.teacher.id}`} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">
                    指导老师：{activityInfo.teacher.name}
                  </Link>
                ) : null}
              </div>
              {activityInfo.teacherRecommendations.length ? (
                <div className="mt-4 space-y-3">
                  {activityInfo.teacherRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className="rounded-[6px] border border-black/8 bg-paper p-3 text-sm leading-6 text-ink/62">
                      <p className="font-semibold text-ink">
                        {recommendation.teacher?.name ?? "老师推荐"}
                        {recommendation.teacher?.school?.name ? ` / ${recommendation.teacher.school.name}` : ""}
                      </p>
                      {recommendation.note ? <p className="mt-1">推荐理由：{recommendation.note}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {currentUser?.persona === UserPersona.TEACHER ? (
            <section id="teacher-recommendation-help" className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm leading-6 text-ink/58">
              <p className="font-semibold text-ink">老师推荐说明</p>
              <p className="mt-2">老师推荐会作为作品的信任背书，帮助学生作品进入课程展示、挑战赛、孵化候选和首页运营推荐。当前推荐动作由平台运营协助完成。</p>
              {isAdminUser ? (
                <Link href="/admin/recommendations" className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                  进入老师推荐后台
                </Link>
              ) : (
                <p className="mt-3 text-xs text-ink/45">如需开通老师推荐权限，请联系平台运营。</p>
              )}
            </section>
          ) : null}

          <section className="rounded-[8px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Incubation Progress</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">孵化摘要</h2>
                <p className="mt-2 text-sm leading-6 text-ink/58">当前阶段：{incubationStatusLabels[crowdStatus]}</p>
              </div>
              <span className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">{incubationStatusLabels[crowdStatus]}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              {summarySignal("老师推荐", teacherRecommendationCount ? "有" : "待完善", teacherRecommendationCount ? "done" : "todo")}
              {summarySignal("面料推荐", fabricSignalCount ? `${fabricSignalCount} 条` : "待匹配", fabricSignalCount ? "active" : "todo")}
              {summarySignal("服务商方案", providerProposalSignalCount ? `${providerProposalSignalCount} 条` : "待提交", providerProposalSignalCount ? "active" : "todo")}
              {summarySignal("预售意向", presaleSignalCount ? `${presaleSignalCount} 人` : "待验证", presaleSignalCount ? "active" : "todo")}
            </div>

            <div className="mt-5">
              <IncubationProgress status={crowdStatus} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">热度分 {heatScore}</span>
              {heatBadges.map((badge) => (
                <span key={badge} className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink/55">
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              {progressMetric("点赞数", work.likeCount)}
              {progressMetric("收藏数", work.favoriteCount)}
              {progressMetric("评论数", work.commentCount)}
              {progressMetric("预售意向", presaleIntentCount)}
            </div>
          </section>

          <WorkContributionPanel workId={work.id} hasContributionSignals={workVoteCount + workContributionCount > 0} />

          <div id="presale-validation">
            <PresaleCampaignPanel campaign={activePresaleCampaign} workTitle={work.title} source="WORK_DETAIL" />
          </div>

          <section id="provider-market" className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider Market</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">服务商方案</h2>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Link href="/providers/apply" className="inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto">
                  我是服务商，想提交方案
                </Link>
                <Link href="/providers" className="inline-flex h-10 w-full items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink sm:w-auto">
                  查看服务商
                </Link>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/58">入驻后，平台会协助服务商参与作品孵化方案提交；本阶段不涉及真实交易、订单或支付。</p>

            <div className="mt-5 space-y-6">
              <div>
                        <h3 className="mb-3 text-sm font-semibold text-ink">推荐面料</h3>
                {providerMarketInfo?.fabricRecommendations.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {providerMarketInfo.fabricRecommendations.map((recommendation) => (
                      <Link key={recommendation.id} href={`/fabrics/${recommendation.fabric.slug ?? recommendation.fabric.id}`} className="flex gap-3 rounded-[8px] border border-black/8 bg-paper p-3">
                        <img src={fabricCoverUrl(recommendation.fabric.imageUrl)} alt={recommendation.fabric.name} className="size-20 rounded-[6px] object-cover" />
                        <span className="min-w-0 text-sm">
                          <span className="block truncate font-semibold text-ink">{recommendation.fabric.name}</span>
                          <span className="mt-1 block text-ink/52">{recommendation.provider?.name ?? recommendation.fabric.provider?.name ?? "供应商待关联"}</span>
                          <span className="mt-1 block line-clamp-2 text-xs leading-5 text-ink/52">{recommendation.reason ?? "推荐理由待补充"}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm text-ink/55">暂无推荐面料。</div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-ink">服务商提交方案</h3>
                {providerMarketInfo?.providerWorkProposals.length ? (
                  <div className="space-y-3">
                    {providerMarketInfo.providerWorkProposals.map((proposal) => (
                      <article key={proposal.id} className="rounded-[8px] border border-black/8 bg-paper p-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_PROPOSAL_TYPE_LABELS[proposal.type]}</span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_PROPOSAL_STATUS_LABELS[proposal.status]}</span>
                        </div>
                        <h4 className="mt-3 font-semibold text-ink">{proposal.title}</h4>
                        <p className="mt-1 text-sm text-ink/52">{proposal.provider.name}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/58">{proposal.description ?? "方案说明待补充"}</p>
                        <p className="mt-2 text-xs font-semibold text-ink/42">
                          {[proposal.estimatedPrice && `价格 ${proposal.estimatedPrice}`, proposal.estimatedTime && `周期 ${proposal.estimatedTime}`, proposal.moq && `MOQ ${proposal.moq}`].filter(Boolean).join(" / ") || "价格与周期待补充"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm text-ink/55">暂无服务商方案。</div>
                )}
              </div>
            </div>
          </section>

          <div id="incubation-actions">
            <WorkInteractionBar
              workId={work.id}
              isLoggedIn={Boolean(currentUser)}
              initialLiked={Boolean(liked)}
              initialFavorited={Boolean(favorited)}
              initialIncubationRecommended={Boolean(incubationRecommended)}
              likeCount={work.likeCount}
              favoriteCount={work.favoriteCount}
              commentCount={work.commentCount}
              shareCount={work.shareCount}
              incubationRecommendCount={work.incubationRecommendCount}
              comments={work.comments.map((comment) => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt.toISOString(),
                user: {
                  nickname: comment.user.nickname
                }
              }))}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3">
            {field("品类", work.category)}
            {field("作品类型", work.workType)}
            {field("AI 辅助", work.isAiAssisted)}
            {field("开放合作", work.isOpenCoop)}
            {field("参赛状态", activeChallenge ? `参赛中：${activeChallenge.title}` : "未参赛")}
            {field("旧版孵化状态", legacyIncubationLabel(incubationProject?.status ?? work.incubationStatus))}
            {field("浏览量", work.viewCount)}
          </div>

          <div className="rounded-[6px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
              <Eye size={16} />
              风格标签
            </div>
            <div className="flex flex-wrap gap-2">
              {work.styleTags.map((tag) => (
                <span key={tag} className="rounded-full border border-black/10 bg-paper px-3 py-1.5 text-xs font-semibold text-ink/58">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

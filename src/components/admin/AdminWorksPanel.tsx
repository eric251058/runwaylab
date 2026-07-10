"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reviewStatusClass, reviewStatusLabel } from "@/lib/works/status";
import { visualFor } from "@/components/works/work-visuals";

export type AdminWorkItem = {
  id: string;
  title: string;
  category: string;
  workType: string;
  reviewStatus: string;
  isAiAssisted: boolean;
  isOriginal: boolean;
  isOpenCoop: boolean;
  wantsFabric: boolean;
  wantsSample: boolean;
  wantsIncubation: boolean;
  isFeatured: boolean;
  isEditorPick: boolean;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  incubationStatus: string | null;
  hasIncubationCandidate: boolean;
  heatScore: number;
  operationTags: string[];
  createdAt: string;
  user: {
    nickname: string;
    email: string;
  };
  images: Array<{ imageUrl: string }>;
  challengeEntries: Array<{ id: string }>;
};

type AdminWorksPanelProps = {
  works: AdminWorkItem[];
};

type ReviewFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "OFFLINE";
type SortMode = "newest" | "oldest" | "heat" | "likes" | "favorites";
type OperationFilter = "ALL" | "high" | "incubatable" | "presale" | "requested" | "candidate" | "featured" | "editor";

const reviewFilters: Array<{ label: string; value: ReviewFilter }> = [
  { label: "全部", value: "ALL" },
  { label: "待审核", value: "PENDING" },
  { label: "已通过", value: "APPROVED" },
  { label: "已驳回", value: "REJECTED" },
  { label: "已下架", value: "OFFLINE" }
];

const contentIssueFilters = [
  { label: "全部内容问题", value: "ALL", tag: "" },
  { label: "缺图片", value: "missing-image", tag: "缺图片" },
  { label: "缺说明", value: "missing-description", tag: "缺说明" },
  { label: "缺老师推荐", value: "missing-teacher", tag: "缺老师推荐" },
  { label: "缺面料推荐", value: "missing-fabric", tag: "缺面料推荐" },
  { label: "缺服务商方案", value: "missing-provider", tag: "缺服务商方案" },
  { label: "缺预售验证", value: "missing-presale", tag: "缺预售验证" }
];

const operationFilters: Array<{ label: string; value: OperationFilter }> = [
  { label: "全部运营标签", value: "ALL" },
  { label: "高潜力", value: "high" },
  { label: "适合孵化", value: "incubatable" },
  { label: "适合预售", value: "presale" },
  { label: "已申请孵化", value: "requested" },
  { label: "已在孵化候选", value: "candidate" },
  { label: "首页精选", value: "featured" },
  { label: "编辑推荐", value: "editor" }
];

const sortModes: Array<{ label: string; value: SortMode }> = [
  { label: "最新提交", value: "newest" },
  { label: "最早提交", value: "oldest" },
  { label: "热度最高", value: "heat" },
  { label: "点赞最多", value: "likes" },
  { label: "收藏最多", value: "favorites" }
];

const selectClass = "h-10 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm text-ink outline-none";
const compactButton = "inline-flex h-9 w-full items-center justify-center rounded-full px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function matchesOperationFilter(work: AdminWorkItem, filter: OperationFilter) {
  if (filter === "ALL") return true;
  if (filter === "featured") return work.isFeatured;
  if (filter === "editor") return work.isEditorPick;
  if (filter === "high") return work.operationTags.includes("高潜力");
  if (filter === "incubatable") return work.operationTags.includes("适合孵化");
  if (filter === "presale") return work.operationTags.includes("适合预售");
  if (filter === "requested") return work.operationTags.includes("已申请孵化");
  if (filter === "candidate") return work.hasIncubationCandidate || work.operationTags.includes("已在孵化候选");
  return true;
}

function tagClass(tag: string) {
  if (tag.startsWith("缺") || tag.includes("看不懂")) {
    return "bg-amber-50 text-amber-800";
  }
  if (tag.includes("高潜力") || tag.includes("适合") || tag.includes("买手") || tag.includes("想买")) {
    return "bg-lime-50 text-lime-800";
  }
  if (tag.includes("已")) {
    return "bg-ink text-white";
  }
  return "bg-paper text-ink/55";
}

function isFormalIncubation(work: AdminWorkItem) {
  return Boolean(work.incubationStatus && !["CANDIDATE", "REVIEWING", "NOT_SUITABLE"].includes(work.incubationStatus));
}

function visibleTags(work: AdminWorkItem) {
  const featuredTags = [
    work.isFeatured ? "首页精选" : null,
    work.isEditorPick ? "编辑推荐" : null,
    work.hasIncubationCandidate ? "已在孵化候选" : null
  ].filter((tag): tag is string => Boolean(tag));

  return Array.from(new Set([...featuredTags, ...work.operationTags]));
}

export function AdminWorksPanel({ works }: AdminWorksPanelProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("ALL");
  const [contentIssue, setContentIssue] = useState("ALL");
  const [operationFilter, setOperationFilter] = useState<OperationFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredWorks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const issueTag = contentIssueFilters.find((item) => item.value === contentIssue)?.tag ?? "";

    return works
      .filter((work) => {
        const matchesSearch =
          !normalizedQuery ||
          work.title.toLowerCase().includes(normalizedQuery) ||
          work.user.nickname.toLowerCase().includes(normalizedQuery) ||
          work.user.email.toLowerCase().includes(normalizedQuery);
        const matchesReview = reviewFilter === "ALL" || work.reviewStatus === reviewFilter;
        const matchesIssue = !issueTag || work.operationTags.includes(issueTag);
        return matchesSearch && matchesReview && matchesIssue && matchesOperationFilter(work, operationFilter);
      })
      .sort((left, right) => {
        if (sortMode === "oldest") return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        if (sortMode === "heat") return right.heatScore - left.heatScore;
        if (sortMode === "likes") return right.likeCount - left.likeCount;
        if (sortMode === "favorites") return right.favoriteCount - left.favoriteCount;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [contentIssue, operationFilter, query, reviewFilter, sortMode, works]);

  const visibleSelectedIds = selectedIds.filter((id) => filteredWorks.some((work) => work.id === id));
  const allVisibleSelected = filteredWorks.length > 0 && visibleSelectedIds.length === filteredWorks.length;

  const act = async (id: string, payload: Record<string, unknown>, successMessage: string, confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setBusyId(id);
    setNotice("");

    const response = await fetch(`/api/admin/works/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    setBusyId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setNotice(data?.message ?? "操作失败，请稍后再试。");
      return;
    }

    setNotice(successMessage);
    router.refresh();
  };

  const reject = async (id: string) => {
    const rejectReason = window.prompt("请输入驳回原因");
    if (!rejectReason) return;
    await act(id, { action: "reject", rejectReason }, "已驳回作品。");
  };

  const batchAct = async (payload: Record<string, unknown>, successMessage: string) => {
    if (!visibleSelectedIds.length) {
      setNotice("请先选择要处理的作品。");
      return;
    }

    if (!window.confirm(`确认处理 ${visibleSelectedIds.length} 件作品？`)) return;

    setBusyId("batch");
    setNotice("");

    for (const id of visibleSelectedIds) {
      const response = await fetch(`/api/admin/works/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setBusyId(null);
        setNotice(data?.message ?? "批量操作中断，请刷新后重试。");
        return;
      }
    }

    setBusyId(null);
    setSelectedIds([]);
    setNotice(successMessage);
    router.refresh();
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const visibleIds = filteredWorks.map((work) => work.id);
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  if (!works.length) {
    return (
      <div className="rounded-[6px] border border-dashed border-black/15 bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-ink">暂无需要审核的作品</p>
        <p className="mt-2 text-sm text-ink/50">用户发布作品后，会在这里按待审核优先展示。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[8px] border border-black/8 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(0,1fr))]">
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">搜索作品 / 设计师 / 邮箱</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 h-10 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm text-ink outline-none"
              placeholder="输入关键词"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">审核状态</span>
            <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ReviewFilter)} className={`mt-2 ${selectClass}`}>
              {reviewFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">内容问题</span>
            <select value={contentIssue} onChange={(event) => setContentIssue(event.target.value)} className={`mt-2 ${selectClass}`}>
              {contentIssueFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">运营标签</span>
            <select value={operationFilter} onChange={(event) => setOperationFilter(event.target.value as OperationFilter)} className={`mt-2 ${selectClass}`}>
              {operationFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">排序</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className={`mt-2 ${selectClass}`}>
              {sortModes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 md:flex-row md:items-center md:justify-between">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink/62">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="size-4 rounded border-black/20" />
            全选当前筛选结果
          </label>
          <p className="text-sm text-ink/45">
            当前显示 {filteredWorks.length} / {works.length} 件，已选 {visibleSelectedIds.length} 件
          </p>
        </div>

        {visibleSelectedIds.length ? (
          <div className="mt-3 grid gap-2 rounded-[8px] bg-paper p-3 sm:grid-cols-3">
            <button
              type="button"
              disabled={busyId === "batch"}
              onClick={() => batchAct({ action: "approve" }, "批量审核通过完成。")}
              className={`${compactButton} bg-ink text-white`}
            >
              批量审核通过
            </button>
            <button
              type="button"
              disabled={busyId === "batch"}
              onClick={() => batchAct({ action: "editorPick", value: true }, "批量设为编辑推荐完成。")}
              className={`${compactButton} border border-black/10 bg-white text-ink`}
            >
              批量编辑推荐
            </button>
            <button
              type="button"
              disabled={busyId === "batch"}
              onClick={() => batchAct({ action: "incubationCandidate", adminNote: "后台批量加入孵化候选。" }, "批量加入孵化候选完成。")}
              className={`${compactButton} bg-accent text-ink`}
            >
              批量加入孵化
            </button>
          </div>
        ) : null}
      </section>

      {notice ? (
        <div className="rounded-[6px] border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">
          {notice}
        </div>
      ) : null}

      {!filteredWorks.length ? (
        <div className="rounded-[8px] border border-dashed border-black/15 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-ink">当前筛选下没有作品</p>
          <p className="mt-2 text-sm text-ink/50">可以清空搜索或切换筛选条件。</p>
        </div>
      ) : null}

      {filteredWorks.map((work, index) => {
        const isPending = work.reviewStatus === "PENDING";
        const isApproved = work.reviewStatus === "APPROVED";
        const isOffline = work.reviewStatus === "OFFLINE";
        const isBusy = busyId === work.id;
        const inFormalIncubation = isFormalIncubation(work);
        const canJoinIncubation = !work.hasIncubationCandidate && !inFormalIncubation;
        const tags = visibleTags(work);
        const displayedTags = tags.slice(0, 6);

        return (
          <article key={work.id} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-3 shadow-[0_10px_30px_rgba(16,16,16,0.06)] lg:grid-cols-[112px_minmax(0,1fr)_220px]">
            <div className="flex gap-3 lg:block">
              <label className="mt-1 flex size-5 shrink-0 items-center justify-center lg:mb-2 lg:mt-0">
                <input type="checkbox" checked={selectedIds.includes(work.id)} onChange={() => toggleSelected(work.id)} className="size-4 rounded border-black/20" />
              </label>
              <img src={visualFor(index, work.images[0]?.imageUrl)} alt={work.title} className="h-24 w-24 shrink-0 rounded-[6px] object-cover lg:h-28 lg:w-full" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${reviewStatusClass(work.reviewStatus)}`}>
                  {reviewStatusLabel(work.reviewStatus)}
                </span>
                {work.challengeEntries.length ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900">参加挑战</span> : null}
                {work.isFeatured ? <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">首页精选</span> : null}
                {work.isEditorPick ? <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-ink">编辑推荐</span> : null}
              </div>

              <Link href={`/works/${work.id}`} className="mt-2 block truncate text-base font-semibold text-ink hover:text-ink/70">
                {work.title}
              </Link>
              <p className="mt-1 truncate text-sm text-ink/55">
                {work.user.nickname} / {work.user.email}
              </p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/48">
                <span>{work.workType}</span>
                <span>{work.category}</span>
                <span>提交 {formatDate(work.createdAt)}</span>
                <span>热度 {work.heatScore}</span>
                <span>赞 {work.likeCount}</span>
                <span>藏 {work.favoriteCount}</span>
                <span>评 {work.commentCount}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {displayedTags.map((tag) => (
                  <span key={tag} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tagClass(tag)}`}>
                    {tag}
                  </span>
                ))}
                {tags.length > displayedTags.length ? <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/45">+{tags.length - displayedTags.length}</span> : null}
              </div>
            </div>

            <div className="grid content-start gap-2">
              {isApproved ? (
                <Link href={`/works/${work.id}`} className={`${compactButton} bg-ink text-white`}>
                  查看作品
                </Link>
              ) : isOffline ? (
                <button disabled={isBusy} onClick={() => act(work.id, { action: "approve" }, "作品已重新上架。")} className={`${compactButton} bg-ink text-white`}>
                  恢复上架
                </button>
              ) : (
                <button disabled={isBusy} onClick={() => act(work.id, { action: "approve" }, "审核通过，作品已发布。")} className={`${compactButton} bg-ink text-white`}>
                  审核通过
                </button>
              )}

              {isPending || work.reviewStatus === "REJECTED" ? (
                <button disabled={isBusy} onClick={() => reject(work.id)} className={`${compactButton} border border-red-200 bg-red-50 text-red-700`}>
                  驳回
                </button>
              ) : null}

              <details className="rounded-[8px] border border-black/10 bg-white">
                <summary className="cursor-pointer list-none px-3 py-2 text-center text-sm font-semibold text-ink/65">更多操作</summary>
                <div className="grid gap-2 border-t border-black/5 p-2">
                  {!isOffline ? (
                    <button
                      disabled={isBusy}
                      onClick={() => act(work.id, { action: "offline" }, "作品已下架。", "确认下架这件作品？")}
                      className={`${compactButton} border border-black/10 bg-white text-ink`}
                    >
                      下架
                    </button>
                  ) : null}

                  <button
                    disabled={isBusy}
                    onClick={() => act(work.id, { action: "feature", value: !work.isFeatured }, work.isFeatured ? "已取消首页精选。" : "已设为首页精选。")}
                    className={`${compactButton} border border-black/10 bg-white text-ink`}
                  >
                    {work.isFeatured ? "取消首页精选" : "设为首页精选"}
                  </button>

                  <button
                    disabled={isBusy}
                    onClick={() => act(work.id, { action: "editorPick", value: !work.isEditorPick }, work.isEditorPick ? "已取消编辑推荐。" : "已设为编辑推荐。")}
                    className={`${compactButton} border border-black/10 bg-white text-ink`}
                  >
                    {work.isEditorPick ? "取消编辑推荐" : "设为编辑推荐"}
                  </button>

                  {inFormalIncubation ? (
                    <Link href="/admin/incubation" className={`${compactButton} border border-black/10 bg-paper text-ink`}>
                      查看孵化项目
                    </Link>
                  ) : (
                    <button
                      disabled={isBusy || !canJoinIncubation}
                      onClick={() => act(work.id, { action: "incubationCandidate", adminNote: "后台加入孵化候选。" }, "已加入孵化候选。")}
                      className={`${compactButton} ${canJoinIncubation ? "bg-accent text-ink" : "bg-paper text-ink/45"}`}
                    >
                      {canJoinIncubation ? "加入孵化候选" : "已在孵化候选"}
                    </button>
                  )}
                </div>
              </details>
            </div>
          </article>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { reviewStatusClass, reviewStatusLabel } from "@/lib/works/status";
import { getWorkImageUrl } from "@/components/works/work-visuals";

export type MyWorkItem = {
  id: string;
  title: string;
  reviewStatus: string;
  contentStatus: string;
  rejectReason: string | null;
  createdAt: string;
  isOpenCoop: boolean;
  wantsFabric: boolean;
  wantsSample: boolean;
  wantsIncubation: boolean;
  images: Array<{ imageUrl?: string | null; url?: string | null; src?: string | null; sortOrder?: number | null }>;
  challengeEntries: Array<{ id: string }>;
};

type MyWorksListProps = {
  works: MyWorkItem[];
  emptyText?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
};

export function MyWorksList({ works, emptyText = "你还没有发布作品。", emptyActionHref = "/publish", emptyActionLabel = "发布我的设计" }: MyWorksListProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<null | {
    id: string;
    title: string;
    action: "delete" | "offline" | "resubmit";
    label: string;
    description: string;
    destructive: boolean;
  }>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runLifecycleAction = async () => {
    if (!pendingAction) return;
    setIsSubmitting(true);
    const response = await fetch(`/api/works/${pendingAction.id}`, {
      method: pendingAction.action === "delete" ? "DELETE" : "PATCH",
      headers: pendingAction.action === "delete" ? undefined : { "Content-Type": "application/json" },
      body: pendingAction.action === "delete" ? undefined : JSON.stringify({ action: pendingAction.action })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(payload?.message ?? "操作失败，请稍后再试。");
      setIsSubmitting(false);
      return;
    }
    setFeedback(payload?.action === "offline" ? "作品已下架，历史记录已保留。" : payload?.action === "restored" ? "作品已重新提交审核。" : "作品草稿已删除。");
    setPendingAction(null);
    setIsSubmitting(false);
    router.refresh();
  };

  if (!works.length) {
    return (
      <div className="rounded-[6px] border border-dashed border-black/15 bg-white px-6 py-12 text-center">
        <p className="text-sm text-ink/55">{emptyText}</p>
        <Link href={emptyActionHref} className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          {emptyActionLabel}
        </Link>
      </div>
    );
  }

  return (
    <>
      {feedback ? <div className="mb-4 rounded-[6px] border border-black/8 bg-white p-3 text-sm text-ink/62">{feedback}</div> : null}
      <div className="grid gap-3 md:gap-4">
      {works.map((work) => {
        const canDelete = ["PENDING", "REJECTED"].includes(work.reviewStatus);
        const canOffline = work.reviewStatus === "APPROVED" && work.contentStatus === "VISIBLE";
        const canResubmit = work.reviewStatus === "OFFLINE" || work.contentStatus === "OFFLINE";

        return (
        <article key={work.id} className="grid grid-cols-[96px_1fr] gap-3 rounded-[6px] bg-white p-3 shadow-[0_12px_34px_rgba(16,16,16,0.08)] md:grid-cols-[140px_1fr_auto] md:items-center md:gap-4 md:p-4 md:shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
          <div className="aspect-square overflow-hidden rounded-[4px] bg-zinc-200 md:aspect-[4/3]">
            <img src={getWorkImageUrl(work.images[0])} alt={work.title} className="h-full w-full object-cover object-center" />
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${reviewStatusClass(work.reviewStatus)}`}>{reviewStatusLabel(work.reviewStatus)}</span>
              {work.challengeEntries.length ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">参赛中</span> : null}
              {work.isOpenCoop ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">开放合作</span> : null}
              {work.wantsFabric ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">需要面料</span> : null}
              {work.wantsSample ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">申请打样</span> : null}
              {work.wantsIncubation ? <span className="rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-800">申请孵化</span> : null}
            </div>
            <h3 className="line-clamp-2 text-base font-semibold text-ink md:text-lg">{work.title}</h3>
            <p className="mt-2 text-xs text-ink/42">提交时间：{new Intl.DateTimeFormat("zh-CN").format(new Date(work.createdAt))}</p>
            {work.rejectReason ? <p className="mt-3 rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">驳回原因：{work.rejectReason}</p> : null}
          </div>
          <div className="col-span-2 flex gap-2 border-t border-black/5 pt-3 md:col-auto md:flex-col md:border-t-0 md:pt-0">
            <Link href={`/works/${work.id}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white md:flex-none">
              查看
            </Link>
            {canDelete ? (
              <>
                <Link href={`/publish?edit=${work.id}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-ink md:flex-none">
                  编辑
                </Link>
                <button onClick={() => setPendingAction({ id: work.id, title: work.title, action: "delete", label: "删除草稿", description: "这件作品尚未公开或已被驳回，系统会先检查是否存在评论、收藏、推荐、询盘、孵化或交易记录。", destructive: true })} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 md:flex-none">
                  <Trash2 size={14} />
                  删除草稿
                </button>
              </>
            ) : null}
            {canOffline ? (
              <button onClick={() => setPendingAction({ id: work.id, title: work.title, action: "offline", label: "下架作品", description: "下架后作品不会出现在公开作品流，历史推荐、询盘和孵化记录会保留。", destructive: false })} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink md:flex-none">
                <EyeOff size={14} />
                下架作品
              </button>
            ) : null}
            {canResubmit ? (
              <button onClick={() => setPendingAction({ id: work.id, title: work.title, action: "resubmit", label: "重新提交", description: "当前 schema 无法安全恢复到原发布状态；重新提交会回到待审核流程。", destructive: false })} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink md:flex-none">
                <RotateCcw size={14} />
                重新提交
              </button>
            ) : null}
          </div>
        </article>
        );
      })}
      </div>
      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-[0_24px_70px_rgba(16,16,16,0.22)]">
            <h2 className="text-xl font-semibold text-ink">{pendingAction.label}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/62">对象：{pendingAction.title}</p>
            <p className="mt-3 rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/58">{pendingAction.description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingAction(null)} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">取消</button>
              <button type="button" disabled={isSubmitting} onClick={runLifecycleAction} className={`h-10 rounded-full px-4 text-sm font-semibold disabled:opacity-45 ${pendingAction.destructive ? "bg-red-600 text-white" : "bg-ink text-white"}`}>
                {isSubmitting ? "处理中" : pendingAction.label}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

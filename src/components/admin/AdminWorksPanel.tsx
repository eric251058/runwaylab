"use client";

import { useState } from "react";
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

function booleanLabel(value: boolean) {
  return value ? "是" : "否";
}

export function AdminWorksPanel({ works }: AdminWorksPanelProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const act = async (id: string, payload: Record<string, unknown>, successMessage: string) => {
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
      {notice ? (
        <div className="rounded-[6px] border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">
          {notice}
        </div>
      ) : null}

      {works.map((work, index) => {
        const isPending = work.reviewStatus === "PENDING";
        const isApproved = work.reviewStatus === "APPROVED";
        const isOffline = work.reviewStatus === "OFFLINE";
        const isBusy = busyId === work.id;

        return (
          <article key={work.id} className="grid gap-4 rounded-[6px] bg-white p-4 shadow-[0_18px_50px_rgba(16,16,16,0.08)] lg:grid-cols-[150px_1fr_260px]">
            <img src={visualFor(index, work.images[0]?.imageUrl)} alt={work.title} className="aspect-[4/3] w-full rounded-[4px] object-cover lg:aspect-square" />
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${reviewStatusClass(work.reviewStatus)}`}>
                  {reviewStatusLabel(work.reviewStatus)}
                </span>
                {work.challengeEntries.length ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">参加挑战</span> : null}
                {work.isFeatured ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">首页精选</span> : null}
                {work.isEditorPick ? <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-ink">编辑推荐</span> : null}
              </div>
              <h3 className="text-lg font-semibold text-ink">{work.title}</h3>
              <p className="mt-2 text-sm text-ink/55">
                {work.user.nickname} / {work.user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">热度 {work.heatScore}</span>
                {work.operationTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-2 text-xs text-ink/55 sm:grid-cols-2">
                <span>作品类型：{work.workType}</span>
                <span>品类：{work.category}</span>
                <span>AI 辅助：{booleanLabel(work.isAiAssisted)}</span>
                <span>原创声明：{booleanLabel(work.isOriginal)}</span>
                <span>参加挑战：{booleanLabel(work.challengeEntries.length > 0)}</span>
                <span>开放合作：{booleanLabel(work.isOpenCoop)}</span>
                <span>需要面料：{booleanLabel(work.wantsFabric)}</span>
                <span>申请打样：{booleanLabel(work.wantsSample)}</span>
                <span>申请孵化：{booleanLabel(work.wantsIncubation)}</span>
                <span>提交时间：{new Intl.DateTimeFormat("zh-CN").format(new Date(work.createdAt))}</span>
              </div>
            </div>
            <div className="grid content-start gap-2">
              {isPending ? (
                <>
                  <button disabled={isBusy} onClick={() => act(work.id, { action: "approve" }, "审核通过，作品已发布。")} className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">
                    审核通过
                  </button>
                  <button disabled={isBusy} onClick={() => reject(work.id)} className="h-10 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:opacity-40">
                    驳回
                  </button>
                </>
              ) : null}

              {isApproved ? (
                <div className="rounded-[6px] bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">
                  已发布
                </div>
              ) : null}

              {isOffline ? (
                <button disabled={isBusy} onClick={() => act(work.id, { action: "approve" }, "作品已重新上架。")} className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">
                  重新上架
                </button>
              ) : null}

              {!isOffline ? (
                <button disabled={isBusy} onClick={() => act(work.id, { action: "offline" }, "作品已下架。")} className="h-10 rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-ink disabled:opacity-40">
                  下架
                </button>
              ) : null}

              <button disabled={isBusy} onClick={() => act(work.id, { action: "feature", value: !work.isFeatured }, work.isFeatured ? "已取消首页精选。" : "已设为首页精选。")} className="h-10 rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-ink disabled:opacity-40">
                {work.isFeatured ? "取消首页精选" : "设为首页精选"}
              </button>
              <button disabled={isBusy} onClick={() => act(work.id, { action: "editorPick", value: !work.isEditorPick }, work.isEditorPick ? "已取消编辑推荐。" : "已设为编辑推荐。")} className="h-10 rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-ink disabled:opacity-40">
                {work.isEditorPick ? "取消编辑推荐" : "设为编辑推荐"}
              </button>
              <button disabled={isBusy} onClick={() => act(work.id, { action: "incubationCandidate", adminNote: "后台加入孵化候选。" }, "已加入孵化候选。")} className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40">
                加入孵化候选
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

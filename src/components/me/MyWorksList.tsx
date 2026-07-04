"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { reviewStatusClass, reviewStatusLabel } from "@/lib/works/status";
import { getWorkImageUrl } from "@/components/works/work-visuals";

export type MyWorkItem = {
  id: string;
  title: string;
  reviewStatus: string;
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
};

export function MyWorksList({ works }: MyWorksListProps) {
  const router = useRouter();

  const remove = async (id: string) => {
    if (!window.confirm("确认删除这件作品吗？")) return;
    const response = await fetch(`/api/works/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("删除失败，只有待审核或已驳回作品可删除。");
      return;
    }
    router.refresh();
  };

  if (!works.length) {
    return (
      <div className="rounded-[6px] border border-dashed border-black/15 bg-white px-6 py-12 text-center">
        <p className="text-sm text-ink/55">你还没有发布作品。</p>
        <Link href="/publish" className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          发布我的设计
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:gap-4">
      {works.map((work, index) => (
        <article key={work.id} className="grid grid-cols-[96px_1fr] gap-3 rounded-[6px] bg-white p-3 shadow-[0_12px_34px_rgba(16,16,16,0.08)] md:grid-cols-[140px_1fr_auto] md:items-center md:gap-4 md:p-4 md:shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
          <img src={getWorkImageUrl(work.images[0])} alt={work.title} className="aspect-square w-full rounded-[4px] object-cover" />
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
            {["PENDING", "REJECTED"].includes(work.reviewStatus) ? (
              <>
                <Link href={`/publish?edit=${work.id}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-ink md:flex-none">
                  编辑
                </Link>
                <button onClick={() => remove(work.id)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 md:flex-none">
                  <Trash2 size={14} />
                  删除
                </button>
              </>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

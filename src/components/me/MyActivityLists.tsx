import Link from "next/link";
import { requestStatusClass, requestStatusLabel } from "@/lib/requests/status";
import { visualFor } from "@/components/works/work-visuals";

export type MyActivityTab = "favorites" | "fabric" | "sample" | "incubation";

type WorkSummary = {
  id: string;
  title: string;
  imageUrl?: string | null;
};

export type MyFavoriteItem = {
  id: string;
  createdAt: string;
  work: WorkSummary & {
    authorName: string;
  };
};

export type MyRequestItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  adminNote?: string | null;
  work?: WorkSummary | null;
};

type MyActivityListsProps = {
  activeTab?: MyActivityTab;
  favorites: MyFavoriteItem[];
  fabricRequests: MyRequestItem[];
  sampleRequests: MyRequestItem[];
  cooperationRequests?: MyRequestItem[];
  incubationApplications: MyRequestItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN").format(new Date(value));
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[6px] border border-dashed border-black/15 bg-white px-6 py-12 text-center">
      <p className="text-sm text-ink/55">{text}</p>
    </div>
  );
}

function FavoriteList({ items }: { items: MyFavoriteItem[] }) {
  if (!items.length) {
    return <Empty text="你还没有收藏作品" />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((favorite, index) => (
        <article key={favorite.id} className="grid grid-cols-[88px_1fr] gap-3 rounded-[6px] bg-white p-3 shadow-[0_14px_40px_rgba(16,16,16,0.06)]">
          <img src={visualFor(index, favorite.work.imageUrl)} alt="" className="aspect-square rounded-[4px] object-cover" />
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold text-ink">{favorite.work.title}</h3>
            <p className="mt-1 text-xs text-ink/45">{favorite.work.authorName}</p>
            <p className="mt-2 text-xs text-ink/35">收藏于 {formatDate(favorite.createdAt)}</p>
            <Link href={`/works/${favorite.work.id}`} className="mt-3 inline-flex h-9 items-center rounded-full bg-ink px-4 text-xs font-semibold text-white">
              查看作品
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function RequestList({ items, emptyText }: { items: MyRequestItem[]; emptyText: string }) {
  if (!items.length) {
    return <Empty text={emptyText} />;
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <article key={item.id} className="grid gap-3 rounded-[6px] bg-white p-4 shadow-[0_14px_40px_rgba(16,16,16,0.06)] md:grid-cols-[88px_1fr]">
          <img src={visualFor(index, item.work?.imageUrl)} alt="" className="aspect-square w-full rounded-[4px] object-cover" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${requestStatusClass(item.status)}`}>{requestStatusLabel(item.status)}</span>
              <span className="text-xs text-ink/40">{formatDate(item.createdAt)}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-ink">{item.title}</h3>
            {item.work ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-xs text-ink/45">关联作品：{item.work.title}</p>
                <Link href={`/works/${item.work.id}`} className="inline-flex h-8 items-center rounded-full bg-ink px-3 text-xs font-semibold text-white">
                  查看作品
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink/35">未关联作品</p>
            )}
            {item.adminNote ? <p className="mt-3 rounded-[6px] bg-paper px-3 py-2 text-xs text-ink/55">后台备注：{item.adminNote}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function MyActivityLists({ activeTab = "favorites", favorites, fabricRequests, sampleRequests, incubationApplications }: MyActivityListsProps) {
  if (activeTab === "favorites") {
    return <FavoriteList items={favorites} />;
  }

  if (activeTab === "fabric") {
    return <RequestList items={fabricRequests} emptyText="你还没有提交面料需求" />;
  }

  if (activeTab === "sample") {
    return <RequestList items={sampleRequests} emptyText="你还没有提交打样需求" />;
  }

  return <RequestList items={incubationApplications} emptyText="你还没有孵化申请" />;
}

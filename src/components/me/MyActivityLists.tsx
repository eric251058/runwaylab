import Link from "next/link";
import { requestStatusClass, requestStatusLabel } from "@/lib/requests/status";
import { visualFor } from "@/components/works/work-visuals";

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
  favorites: MyFavoriteItem[];
  fabricRequests: MyRequestItem[];
  sampleRequests: MyRequestItem[];
  cooperationRequests: MyRequestItem[];
  incubationApplications: MyRequestItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN").format(new Date(value));
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[6px] border border-dashed border-black/10 bg-white px-4 py-6 text-sm text-ink/45">{text}</p>;
}

function RequestList({ items }: { items: MyRequestItem[] }) {
  if (!items.length) {
    return <Empty text="暂无记录。" />;
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <article key={item.id} className="grid gap-3 rounded-[6px] bg-white p-4 shadow-[0_14px_40px_rgba(16,16,16,0.06)] md:grid-cols-[88px_1fr]">
          <img src={visualFor(index, item.work?.imageUrl)} alt="" className="aspect-square w-full rounded-[4px] object-cover" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${requestStatusClass(item.status)}`}>{requestStatusLabel(item.status)}</span>
              <span className="text-xs text-ink/40">{formatDate(item.createdAt)}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-ink">{item.title}</h3>
            {item.work ? (
              <Link href={`/works/${item.work.id}`} className="mt-1 inline-flex text-xs font-semibold text-ink/45 hover:text-ink">
                关联作品：{item.work.title}
              </Link>
            ) : (
              <p className="mt-1 text-xs text-ink/35">未关联作品</p>
            )}
            {item.adminNote ? <p className="mt-2 rounded-[6px] bg-paper px-3 py-2 text-xs text-ink/55">后台备注：{item.adminNote}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function MyActivityLists({
  favorites,
  fabricRequests,
  sampleRequests,
  cooperationRequests,
  incubationApplications
}: MyActivityListsProps) {
  return (
    <div className="mt-10 space-y-10">
      <section>
        <h2 className="mb-4 text-2xl font-semibold text-ink">我的收藏</h2>
        {favorites.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {favorites.map((favorite, index) => (
              <Link key={favorite.id} href={`/works/${favorite.work.id}`} className="grid grid-cols-[88px_1fr] gap-3 rounded-[6px] bg-white p-3 shadow-[0_14px_40px_rgba(16,16,16,0.06)]">
                <img src={visualFor(index, favorite.work.imageUrl)} alt="" className="aspect-square rounded-[4px] object-cover" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">{favorite.work.title}</h3>
                  <p className="mt-1 text-xs text-ink/45">{favorite.work.authorName}</p>
                  <p className="mt-2 text-xs text-ink/35">收藏于 {formatDate(favorite.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="还没有收藏作品。" />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-ink">我的面料需求</h2>
        <RequestList items={fabricRequests} />
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-ink">我的打样需求</h2>
        <RequestList items={sampleRequests} />
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-ink">我的合作意向</h2>
        <RequestList items={cooperationRequests} />
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-ink">我的孵化申请</h2>
        <RequestList items={incubationApplications} />
      </section>
    </div>
  );
}

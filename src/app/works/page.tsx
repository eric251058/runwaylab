import Link from "next/link";
import { DataUnavailable } from "@/components/layout/DataUnavailable";
import { WorkMasonry } from "@/components/works/WorkMasonry";
import { getApprovedWorks, type WorkFilter, type WorkSort } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

const filterControls: Array<
  | {
      label: string;
      href: string;
      sort: WorkSort;
      filter?: never;
    }
  | {
      label: string;
      href: string;
      filter: WorkFilter;
      sort?: never;
    }
> = [
  { label: "最新", href: "/works?sort=latest", sort: "latest" },
  { label: "热门", href: "/works?sort=popular", sort: "popular" },
  { label: "新人", href: "/works?filter=newcomer", filter: "newcomer" },
  { label: "编辑推荐", href: "/works?filter=editor", filter: "editor" },
  { label: "可孵化", href: "/works?filter=incubatable", filter: "incubatable" },
  { label: "开放合作", href: "/works?filter=cooperation", filter: "cooperation" },
  { label: "AI 辅助", href: "/works?filter=ai", filter: "ai" },
  { label: "毕业设计", href: "/works?filter=graduation", filter: "graduation" }
];

const filterValues = new Set<WorkFilter>(["newcomer", "editor", "incubatable", "cooperation", "ai", "graduation"]);

type WorksPageProps = {
  searchParams?: Promise<{
    sort?: string;
    filter?: string;
  }>;
};

function getFilter(value?: string): WorkFilter | undefined {
  return value && filterValues.has(value as WorkFilter) ? (value as WorkFilter) : undefined;
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const params = await searchParams;
  const sort: WorkSort = params?.sort === "popular" ? "popular" : "latest";
  const filter = getFilter(params?.filter);
  const works = await getApprovedWorks({ take: 36, sort, filter }).catch((error) => {
    console.error("Failed to load works", error);
    return null;
  });

  if (!works) {
    return <DataUnavailable title="作品库数据暂时没有读到" />;
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 md:px-8 md:py-12">
      <header className="mb-5 md:mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Gallery</p>
        <div className="mt-2 flex flex-col gap-4 md:mt-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-6xl">线上作品展</h1>
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-ink/58 md:mt-4 md:line-clamp-none md:text-base">
              从课堂作业、毕业设计到独立系列，发现正在被看见的新锐服装设计作品。
            </p>
          </div>
          <div className="flex w-full rounded-full border border-black/10 bg-white/70 p-1 text-sm font-semibold sm:w-fit">
            <Link href="/works?sort=latest" className={`flex-1 rounded-full px-4 py-2 text-center sm:flex-none ${!filter && sort === "latest" ? "bg-ink text-white" : "text-ink/55"}`}>
              最新
            </Link>
            <Link href="/works?sort=popular" className={`flex-1 rounded-full px-4 py-2 text-center sm:flex-none ${!filter && sort === "popular" ? "bg-ink text-white" : "text-ink/55"}`}>
              热门
            </Link>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 -mx-3 mb-4 flex gap-2 overflow-x-auto bg-paper/95 px-3 py-2 backdrop-blur md:static md:mx-0 md:mb-7 md:bg-transparent md:px-0 md:pb-2">
        {filterControls.map((control) => {
          const active = control.filter ? filter === control.filter : !filter && sort === control.sort;

          return (
            <Link
              key={control.label}
              href={control.href}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                active ? "border-ink bg-ink text-white" : "border-black/10 bg-white/70 text-ink/58 hover:border-ink/40 hover:text-ink"
              }`}
            >
              {control.label}
            </Link>
          );
        })}
      </div>

      {works.length ? (
        <WorkMasonry works={works} />
      ) : (
        <div className="rounded-[6px] border border-dashed border-black/15 bg-white px-6 py-12 text-center md:py-16">
          <p className="text-base font-semibold text-ink">这个筛选下暂时没有作品</p>
          <p className="mt-2 text-sm text-ink/50">可以切换到最新或热门继续浏览。</p>
          <Link href="/works?sort=latest" className="mt-5 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            查看最新作品
          </Link>
        </div>
      )}
    </div>
  );
}

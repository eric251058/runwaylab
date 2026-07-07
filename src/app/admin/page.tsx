import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/admin/works", title: "作品审核" },
  { href: "/admin/comments", title: "评论管理" },
  { href: "/admin/incubation", title: "孵化管理" },
  { href: "/admin/editorial", title: "运营推荐" },
  { href: "/admin/users", title: "用户管理" },
  { href: "/admin/fabric-requests", title: "面料需求" },
  { href: "/admin/sample-requests", title: "打样需求" },
  { href: "/admin/cooperation-requests", title: "合作请求" }
];

function stat(label: string, value: number) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  const [workCount, pendingWorkCount, userCount, presaleCount, proposalCounts] = await Promise.all([
    prisma.work.count({ where: approvedVisibleWorkWhere }),
    prisma.work.count({ where: { reviewStatus: "PENDING" } }),
    prisma.user.count(),
    prisma.presaleIntent.count(),
    Promise.all([prisma.fabricProposal.count(), prisma.sampleProposal.count(), prisma.factoryProposal.count(), prisma.buyerIntent.count()])
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">后台控制台</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">
          管理作品审核、孵化池、运营推荐、需求和合作方案，维护平台秩序。
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stat("可见作品", workCount)}
        {stat("待审核作品", pendingWorkCount)}
        {stat("用户数量", userCount)}
        {stat("预售意向", presaleCount)}
        {stat("合作方案", proposalCounts.reduce((sum, value) => sum + value, 0))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {adminLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-[8px] border border-black/8 bg-white p-5 text-lg font-semibold text-ink transition hover:border-ink/35">
            {item.title}
          </Link>
        ))}
      </section>
    </div>
  );
}

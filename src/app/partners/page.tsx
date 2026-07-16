import Link from "next/link";
import { CrowdSubmissionForm, type CrowdSubmissionKind } from "@/components/incubation/CrowdSubmissionForm";
import { prisma } from "@/lib/prisma";
import { getPublicQualityWorkIds } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

type PartnersPageProps = {
  searchParams?: Promise<{
    workId?: string;
    type?: string;
  }>;
};

const partnerTypes: Array<{
  key: CrowdSubmissionKind;
  title: string;
  description: string;
}> = [
  {
    key: "fabric",
    title: "面料商",
    description: "围绕作品风格推荐合适面料，提供成分、克重、门幅、价格区间和推荐理由。"
  },
  {
    key: "sample",
    title: "打样工作室",
    description: "提交纸样、样衣、工艺评估等打样方案，让设计师判断是否推进。"
  },
  {
    key: "factory",
    title: "服装工厂",
    description: "提交生产能力、起订量、周期和参考价格，帮助作品找到小批量生产可能。"
  },
  {
    key: "buyer",
    title: "买手 / 采购商",
    description: "提交采购意向、渠道类型、数量和合作方式，让设计师看到市场反馈。"
  }
];

function isPartnerKind(value?: string): value is CrowdSubmissionKind {
  return value === "fabric" || value === "sample" || value === "factory" || value === "buyer";
}

export default async function PartnersPage({ searchParams }: PartnersPageProps) {
  const params = await searchParams;
  const activeKind = isPartnerKind(params?.type) ? params.type : undefined;
  const qualityWorkIds = params?.workId ? await getPublicQualityWorkIds() : [];
  const work = params?.workId && qualityWorkIds.includes(params.workId)
    ? await prisma.work.findFirst({
        where: {
          id: params.workId
        },
        select: {
          id: true,
          title: true
        }
      })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Partners</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">合作方入口</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60 md:text-base">
          面料商、打样工作室、服装工厂和采购方可以围绕具体作品提交方案。平台只收集信息，不做支付、订单或物流。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {partnerTypes.map((type) => (
          <Link
            key={type.key}
            href={work ? `/partners?workId=${work.id}&type=${type.key}` : "/works"}
            className={`rounded-[8px] border p-4 transition ${
              activeKind === type.key ? "border-ink bg-ink text-white" : "border-black/8 bg-white text-ink hover:border-ink/40"
            }`}
          >
            <h2 className="text-lg font-semibold">{type.title}</h2>
            <p className={`mt-3 text-sm leading-6 ${activeKind === type.key ? "text-white/65" : "text-ink/55"}`}>{type.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        {work && activeKind ? (
          <CrowdSubmissionForm kind={activeKind} workId={work.id} workTitle={work.title} />
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6">
            <h2 className="text-xl font-semibold text-ink">先选择一个作品</h2>
            <p className="mt-3 text-sm leading-6 text-ink/58">
              请从作品详情页点击“我来推荐面料 / 我可以打样 / 我可以生产 / 我想采购”，系统会自动带上作品信息。
            </p>
            <Link href="/works" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
              查看作品库
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

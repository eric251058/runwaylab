import { ContentStatus, PrismaClient } from "@prisma/client";
import { isPublicQualityWork } from "@/lib/works/rules";

const prisma = new PrismaClient();
const shouldHide = process.argv.includes("--hide-approved-test-works");

function reasonFor(work: {
  title: string;
  description: string;
  reviewStatus: string;
  contentStatus: string;
  images: Array<{ imageUrl: string }>;
}) {
  const reasons: string[] = [];
  if (work.reviewStatus !== "APPROVED") reasons.push("未审核通过");
  if (work.contentStatus !== "VISIBLE") reasons.push("不可见");
  if (!work.images.length) reasons.push("无封面");
  if (work.title.trim().length < 2) reasons.push("标题过短");
  if (/^\d+$/.test(work.title.trim())) reasons.push("纯数字标题");
  if (work.title.trim().length >= 3 && new Set(work.title.trim().split("")).size === 1) reasons.push("重复字符标题");
  if (work.description.trim().length < 16) reasons.push("描述过短");
  return reasons.join("、") || "未达到公开质量条件";
}

async function main() {
  const works = await prisma.work.findMany({
    where: {
      reviewStatus: "APPROVED",
      contentStatus: "VISIBLE"
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      user: { select: { email: true, nickname: true, role: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const candidates = works.filter((work) => !isPublicQualityWork(work));
  console.log(`公开低质量作品候选：${candidates.length}`);
  for (const work of candidates) {
    console.log(`${work.id} | ${work.title} | ${work.user.nickname} | ${reasonFor(work)}`);
  }

  if (!shouldHide) {
    console.log("默认只读。确认后可追加 --hide-approved-test-works 将候选作品 contentStatus 改为 HIDDEN。");
    return;
  }

  if (!candidates.length) return;
  await prisma.work.updateMany({
    where: {
      id: { in: candidates.map((work) => work.id) }
    },
    data: {
      contentStatus: ContentStatus.HIDDEN
    }
  });
  console.log(`已隐藏候选作品：${candidates.length}`);
}

main()
  .catch((error) => {
    console.error("Public work quality audit failed", { errorType: error instanceof Error ? error.name : typeof error });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

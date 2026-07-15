import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function printSection(title: string) {
  console.log(`\n## ${title}`);
}

async function main() {
  printSection("重复服务商名称");
  const providers = await prisma.provider.findMany({
    select: { id: true, name: true, status: true, isVerified: true, ownerId: true, fabrics: { select: { id: true } } },
    orderBy: { name: "asc" }
  });
  const providerGroups = new Map<string, typeof providers>();

  for (const provider of providers) {
    const key = provider.name.trim().toLowerCase();
    providerGroups.set(key, [...(providerGroups.get(key) ?? []), provider]);
  }

  for (const items of providerGroups.values()) {
    if (items.length > 1) {
      console.log(items.map((item) => `${item.name}(${item.id}, ${item.status}, 面料 ${item.fabrics.length})`).join(" | "));
    }
  }

  printSection("疑似测试作品标题");
  const testWorks = await prisma.work.findMany({
    where: {
      OR: [
        { title: { contains: "test", mode: "insensitive" } },
        { title: { contains: "测试" } },
        { title: { contains: "demo", mode: "insensitive" } },
        { description: { contains: "平台示例" } },
        { description: { contains: "演示数据" } }
      ]
    },
    select: { id: true, title: true, reviewStatus: true, contentStatus: true },
    take: 100
  });
  testWorks.forEach((work) => console.log(`${work.id} | ${work.title} | ${work.reviewStatus}/${work.contentStatus}`));

  printSection("示例学校和老师");
  const [schools, teachers] = await Promise.all([
    prisma.school.findMany({ where: { OR: [{ name: { contains: "示例" } }, { description: { contains: "演示" } }] }, select: { id: true, name: true, status: true } }),
    prisma.teacher.findMany({ where: { OR: [{ name: { contains: "示例" } }, { bio: { contains: "演示" } }] }, select: { id: true, name: true, status: true, school: { select: { name: true } } } })
  ]);
  schools.forEach((school) => console.log(`学校 ${school.id} | ${school.name} | ${school.status}`));
  teachers.forEach((teacher) => console.log(`老师 ${teacher.id} | ${teacher.name} | ${teacher.school?.name ?? "未关联学校"} | ${teacher.status}`));

  printSection("预售数字异常");
  const campaigns = await prisma.presaleCampaign.findMany({
    where: {
      OR: [
        { currentCount: { gt: 100000 } },
        { targetCount: { gt: 100000 } },
        { currentCount: { lt: 0 } },
        { targetCount: { lt: 0 } }
      ]
    },
    select: { id: true, title: true, currentCount: true, targetCount: true, status: true },
    take: 100
  });
  campaigns.forEach((campaign) => console.log(`${campaign.id} | ${campaign.title} | ${campaign.currentCount}/${campaign.targetCount} | ${campaign.status}`));

  printSection("已认证但资料不完整的服务商");
  providers
    .filter((provider) => provider.isVerified && (!provider.ownerId || provider.fabrics.length === 0))
    .forEach((provider) => console.log(`${provider.id} | ${provider.name} | owner=${provider.ownerId ? "有" : "无"} | 面料 ${provider.fabrics.length}`));

  printSection("示例面料");
  const fabrics = await prisma.fabric.findMany({
    where: {
      OR: [
        { name: { contains: "测试" } },
        { name: { contains: "示例" } },
        { description: { contains: "演示" } },
        { description: { contains: "平台示例" } }
      ]
    },
    select: { id: true, name: true, status: true, provider: { select: { name: true } } },
    take: 100
  });
  fabrics.forEach((fabric) => console.log(`${fabric.id} | ${fabric.name} | ${fabric.status} | ${fabric.provider?.name ?? "未关联服务商"}`));
}

main()
  .catch((error) => {
    console.error("Audit failed", { errorType: error instanceof Error ? error.name : typeof error });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

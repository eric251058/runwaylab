import { PrismaClient } from "@prisma/client";
import { normalizeProviderEmail, normalizeProviderName } from "@/lib/provider-duplicates";

const prisma = new PrismaClient();

function groupBy<T>(items: T[], keyOf: (item: T) => string | null | undefined) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1);
}

function providerLine(provider: { id: string; name: string; city: string | null; contactName: string | null; contactEmail: string | null; ownerId: string | null }) {
  return `${provider.id} | ${provider.name} | ${provider.city ?? "未填城市"} | ${provider.contactName ?? "未填联系人"} | ${normalizeProviderEmail(provider.contactEmail) ?? "未填邮箱"} | owner=${provider.ownerId ?? "未绑定"}`;
}

async function main() {
  const providers = await prisma.provider.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      contactName: true,
      contactEmail: true,
      ownerId: true
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }]
  });

  console.log("## 相同 ownerId");
  for (const [ownerId, group] of groupBy(providers, (provider) => provider.ownerId)) {
    console.log(`ownerId=${ownerId}`);
    group.forEach((provider) => console.log(`  ${providerLine(provider)}`));
  }

  console.log("\n## 相同 contactEmail");
  for (const [email, group] of groupBy(providers, (provider) => normalizeProviderEmail(provider.contactEmail))) {
    console.log(`contactEmail=${email}`);
    group.forEach((provider) => console.log(`  ${providerLine(provider)}`));
  }

  console.log("\n## 规范化名称相同");
  for (const [nameKey, group] of groupBy(providers, (provider) => normalizeProviderName(provider.name))) {
    console.log(`nameKey=${nameKey}`);
    group.forEach((provider) => console.log(`  ${providerLine(provider)}`));
  }

  console.log("\n## 名称相似但联系人或城市不同");
  const nameGroups = groupBy(providers, (provider) => normalizeProviderName(provider.name).slice(0, 6));
  for (const [nameKey, group] of nameGroups) {
    const cities = new Set(group.map((provider) => provider.city ?? ""));
    const contacts = new Set(group.map((provider) => provider.contactName ?? ""));
    if (cities.size > 1 || contacts.size > 1) {
      console.log(`similarNameKey=${nameKey}`);
      group.forEach((provider) => console.log(`  ${providerLine(provider)}`));
    }
  }

  console.log("\n只读脚本：未修改任何 Provider 数据。");
}

main()
  .catch((error) => {
    console.error("Duplicate provider audit failed", { errorType: error instanceof Error ? error.name : typeof error });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

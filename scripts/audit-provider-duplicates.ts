import { PrismaClient, ProviderApplicationStatus, ProviderStatus } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "").replace(/[（）()·,，.。-]/g, "");
}

function printSection(title: string) {
  console.log(`\n## ${title}`);
}

async function main() {
  const providers = await prisma.provider.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      ownerId: true,
      opportunityVisible: true,
      fabrics: { select: { id: true } }
    },
    orderBy: { name: "asc" }
  });

  printSection("同名 Provider");
  const exactGroups = new Map<string, typeof providers>();
  providers.forEach((provider) => {
    const key = provider.name.trim().toLowerCase();
    exactGroups.set(key, [...(exactGroups.get(key) ?? []), provider]);
  });
  for (const items of exactGroups.values()) {
    if (items.length > 1) console.log(items.map((item) => `${item.name}(${item.id})`).join(" | "));
  }

  printSection("相似名称 Provider");
  const fuzzyGroups = new Map<string, typeof providers>();
  providers.forEach((provider) => {
    const key = normalizeName(provider.name);
    fuzzyGroups.set(key, [...(fuzzyGroups.get(key) ?? []), provider]);
  });
  for (const items of fuzzyGroups.values()) {
    if (items.length > 1) console.log(items.map((item) => `${item.name}(${item.id})`).join(" | "));
  }

  printSection("同 ownerId 多 Provider");
  const ownerGroups = new Map<string, typeof providers>();
  providers.filter((provider) => provider.ownerId).forEach((provider) => {
    ownerGroups.set(provider.ownerId!, [...(ownerGroups.get(provider.ownerId!) ?? []), provider]);
  });
  for (const [ownerId, items] of ownerGroups.entries()) {
    if (items.length > 1) console.log(`${ownerId}: ${items.map((item) => `${item.name}(${item.id})`).join(" | ")}`);
  }

  printSection("无 ownerId Provider");
  providers.filter((provider) => !provider.ownerId).forEach((provider) => console.log(`${provider.id} | ${provider.name} | ${provider.status}`));

  printSection("ProviderApplication 已通过但无 Provider");
  const approvedApplications = await prisma.providerApplication.findMany({
    where: { status: ProviderApplicationStatus.APPROVED },
    select: { id: true, userId: true, companyName: true, providerType: true }
  });
  for (const application of approvedApplications) {
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { ownerId: application.userId },
          { name: application.companyName, type: application.providerType }
        ]
      },
      select: { id: true }
    });
    if (!provider) console.log(`${application.id} | ${application.companyName} | ${application.providerType}`);
  }

  printSection("Provider 有面料但无 owner");
  providers
    .filter((provider) => provider.fabrics.length > 0 && !provider.ownerId)
    .forEach((provider) => console.log(`${provider.id} | ${provider.name} | 面料 ${provider.fabrics.length}`));

  printSection("Provider 状态与公开状态矛盾");
  providers
    .filter((provider) => provider.status !== ProviderStatus.ACTIVE && provider.opportunityVisible)
    .forEach((provider) => console.log(`${provider.id} | ${provider.name} | ${provider.status} / opportunityVisible=true`));
}

main()
  .catch((error) => {
    console.error("Provider duplicate audit failed", { errorType: error instanceof Error ? error.name : typeof error });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

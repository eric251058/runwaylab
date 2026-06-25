import { AdminRequestsPanel, type AdminRequestItem } from "@/components/admin/AdminRequestsPanel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const requestStatusOptions = [
  { value: "PENDING", label: "待处理" },
  { value: "CONTACTED", label: "已联系" },
  { value: "EVALUATED", label: "已评估" },
  { value: "QUOTED", label: "已报价" },
  { value: "CLOSED", label: "已关闭" },
  { value: "COMPLETED", label: "已完成" }
];

export default async function AdminSampleRequestsPage() {
  const requests = await prisma.sampleRequest.findMany({
    include: {
      user: true,
      work: true
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  const items: AdminRequestItem[] = requests.map((request) => ({
    id: request.id,
    title: request.garmentCategory ? `打样：${request.garmentCategory}` : "打样申请",
    subtitle: [request.hasPattern ? "已有纸样" : "无纸样", request.hasFabric ? "已有面料" : "无面料", request.needsFabricHelp ? "需要推荐面料" : null].filter(Boolean).join(" / "),
    status: request.status,
    adminNote: request.adminNote,
    createdAt: request.createdAt.toISOString(),
    workTitle: request.work?.title,
    userName: request.user.nickname,
    contact: request.contact,
    detail: [request.quantity ? `数量：${request.quantity}` : null, request.expectedDate ? `期望时间：${new Intl.DateTimeFormat("zh-CN").format(request.expectedDate)}` : null, request.budgetRange ? `预算：${request.budgetRange}` : null, request.remark].filter(Boolean).join("；")
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-6 text-4xl font-semibold text-ink md:text-6xl">打样需求</h1>
      <AdminRequestsPanel items={items} endpointBase="/api/admin/sample-requests" statusOptions={requestStatusOptions} emptyText="暂无打样需求。" />
    </div>
  );
}

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

export default async function AdminFabricRequestsPage() {
  const requests = await prisma.fabricRequest.findMany({
    include: {
      user: true,
      work: true
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  const items: AdminRequestItem[] = requests.map((request) => ({
    id: request.id,
    title: request.category ? `找面料：${request.category}` : "找面料申请",
    subtitle: request.desiredFeeling.length ? `感觉：${request.desiredFeeling.join(" / ")}` : "未填写面料感觉",
    status: request.status,
    adminNote: request.adminNote,
    createdAt: request.createdAt.toISOString(),
    workTitle: request.work?.title,
    userName: request.user.nickname,
    contact: request.contact,
    detail: [request.colorDirection ? `颜色：${request.colorDirection}` : null, request.budgetRange ? `预算：${request.budgetRange}` : null, request.remark].filter(Boolean).join("；")
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-6 text-4xl font-semibold text-ink md:text-6xl">面料需求</h1>
      <AdminRequestsPanel items={items} endpointBase="/api/admin/fabric-requests" statusOptions={requestStatusOptions} emptyText="暂无面料需求。" />
    </div>
  );
}

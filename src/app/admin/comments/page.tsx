import { AdminRequestsPanel, type AdminRequestItem } from "@/components/admin/AdminRequestsPanel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const commentStatusOptions = [
  { value: "VISIBLE", label: "可见" },
  { value: "HIDDEN", label: "隐藏" },
  { value: "DELETED", label: "删除" },
  { value: "OFFLINE", label: "下架" }
];

export default async function AdminCommentsPage() {
  const comments = await prisma.comment.findMany({
    include: {
      user: true,
      work: true
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  const items: AdminRequestItem[] = comments.map((comment) => ({
    id: comment.id,
    title: "评论管理",
    subtitle: comment.content,
    status: comment.status,
    adminNote: comment.adminNote,
    createdAt: comment.createdAt.toISOString(),
    workTitle: comment.work.title,
    userName: comment.user.nickname,
    detail: `评论 ID：${comment.id}`
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-6 text-4xl font-semibold text-ink md:text-6xl">评论管理</h1>
      <AdminRequestsPanel items={items} endpointBase="/api/admin/comments" statusOptions={commentStatusOptions} emptyText="暂无评论。" />
    </div>
  );
}

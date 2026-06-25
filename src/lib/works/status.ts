export function reviewStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待审核",
    APPROVED: "已发布",
    REJECTED: "已驳回",
    OFFLINE: "已下架"
  };

  return labels[status] ?? status;
}

export function reviewStatusClass(status: string) {
  const classes: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-800 border-amber-200",
    APPROVED: "bg-lime-50 text-lime-800 border-lime-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    OFFLINE: "bg-zinc-100 text-zinc-600 border-zinc-200"
  };

  return classes[status] ?? "bg-white text-ink/60 border-black/10";
}

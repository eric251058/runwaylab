export function requestStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待处理",
    CONTACTED: "已联系",
    EVALUATED: "已评估",
    QUOTED: "已报价",
    CLOSED: "已关闭",
    COMPLETED: "已完成",
    CANDIDATE: "候选中",
    REVIEWING: "评估中",
    NOT_SUITABLE: "暂不适合",
    ACCEPTED: "已接受",
    VISIBLE: "可见",
    HIDDEN: "已隐藏",
    DELETED: "已删除",
    OFFLINE: "已下架"
  };

  return labels[status] ?? status;
}

export function requestStatusClass(status: string) {
  const classes: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-800 border-amber-200",
    CONTACTED: "bg-blue-50 text-blue-800 border-blue-200",
    EVALUATED: "bg-indigo-50 text-indigo-800 border-indigo-200",
    QUOTED: "bg-purple-50 text-purple-800 border-purple-200",
    CLOSED: "bg-zinc-100 text-zinc-600 border-zinc-200",
    COMPLETED: "bg-lime-50 text-lime-800 border-lime-200",
    CANDIDATE: "bg-lime-50 text-lime-800 border-lime-200",
    REVIEWING: "bg-indigo-50 text-indigo-800 border-indigo-200",
    NOT_SUITABLE: "bg-zinc-100 text-zinc-600 border-zinc-200",
    ACCEPTED: "bg-lime-50 text-lime-800 border-lime-200",
    VISIBLE: "bg-lime-50 text-lime-800 border-lime-200",
    HIDDEN: "bg-amber-50 text-amber-800 border-amber-200",
    DELETED: "bg-red-50 text-red-700 border-red-200",
    OFFLINE: "bg-zinc-100 text-zinc-600 border-zinc-200"
  };

  return classes[status] ?? "bg-white text-ink/60 border-black/10";
}

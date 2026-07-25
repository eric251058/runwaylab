"use client";

import Link from "next/link";
import { Bell, Check, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { NOTIFICATION_CATEGORIES, type NotificationCategory, type NotificationDto } from "@/lib/notifications";

type NotificationCenterClientProps = {
  initialItems: NotificationDto[];
  initialUnreadCount: number;
  activeCategory: NotificationCategory;
};

const categoryLabels: Record<NotificationCategory, string> = {
  ALL: "全部",
  SOCIAL: "互动",
  WORK: "作品",
  INQUIRY: "合作",
  PROVIDER: "服务",
  INCUBATION: "孵化",
  SYSTEM: "系统",
  MODERATION: "审核"
};

const visibleCategories = NOTIFICATION_CATEGORIES.filter((category) => category !== "MODERATION");

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 8) return `${days} 天前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(value));
}

export function NotificationCenterClient({
  initialItems,
  initialUnreadCount,
  activeCategory
}: NotificationCenterClientProps) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasUnread = unreadCount > 0;
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const filteredItems = useMemo(
    () => items.filter((item) => activeCategory === "ALL" || item.category === activeCategory),
    [activeCategory, items]
  );

  async function markRead(id: string) {
    setPendingId(id);
    setError("");
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!response.ok) throw new Error("read failed");
      setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      setError("通知状态暂时没有更新，请稍后再试。");
    } finally {
      setPendingId(null);
    }
  }

  async function openNotification(item: NotificationDto) {
    if (!item.isRead) {
      await markRead(item.id);
    }
    window.location.assign(item.targetUrl);
  }

  function markAllRead() {
    startTransition(async () => {
      setError("");
      try {
        const response = await fetch("/api/notifications/read-all", { method: "POST" });
        if (!response.ok) throw new Error("read all failed");
        setItems((current) => current.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
      } catch {
        setError("全部已读暂时没有完成，请稍后再试。");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-semibold text-ink md:text-5xl">消息中心</h1>
          </div>
          <p className="mt-3 text-sm text-ink/58">
            {hasUnread ? `还有 ${unreadLabel} 条未读消息。` : "所有消息都已读。"}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!hasUnread || isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/30 disabled:pointer-events-none disabled:text-ink/35"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          全部已读
        </button>
      </header>

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {visibleCategories.map((category) => (
          <Link
            key={category}
            href={category === "ALL" ? "/notifications" : `/notifications?category=${category}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeCategory === category ? "bg-ink text-white" : "bg-white text-ink/55 hover:text-ink"
            }`}
          >
            {categoryLabels[category]}
          </Link>
        ))}
      </div>

      {error ? <p className="mb-4 rounded-[8px] bg-white px-4 py-3 text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/25 md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!item.isRead ? <span className="h-2.5 w-2.5 rounded-full bg-ink" aria-label="未读" /> : null}
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/55">{categoryLabels[item.category]}</span>
                    <span className="text-xs font-semibold text-ink/35">{relativeTime(item.createdAt)}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/58">{item.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openNotification(item)}
                  disabled={pendingId === item.id}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink transition hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-45"
                  aria-label="打开通知"
                  title="打开通知"
                >
                  {pendingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
              {!item.isRead ? (
                <button
                  type="button"
                  onClick={() => markRead(item.id)}
                  disabled={pendingId === item.id}
                  className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-xs font-semibold text-ink/65 transition hover:border-ink/30 disabled:pointer-events-none disabled:text-ink/35"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  标为已读
                </button>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-ink/25" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-ink">暂无消息</h2>
            <p className="mt-2 text-sm text-ink/50">新的审核、合作和孵化进展会出现在这里。</p>
          </div>
        )}
      </section>
    </div>
  );
}

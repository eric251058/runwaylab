"use client";

import { useState } from "react";
import { Bookmark, Heart, Share2, ShoppingBag } from "lucide-react";
import { WorkSharePanel } from "@/components/works/WorkSharePanel";
import type { WorkShareInfo } from "@/lib/work-share";

type WorkQuickActionsProps = {
  workId: string;
  title: string;
  description?: string | null;
  designerName: string;
  schoolName?: string | null;
  imageUrl?: string | null;
  styleTags?: string[] | null;
  category?: string | null;
  initialLikeCount: number;
  initialFavoriteCount: number;
  initialLiked?: boolean;
  initialFavorited?: boolean;
};

type BusyAction = "like" | "favorite" | "want-buy" | "share" | null;

function countText(value: number) {
  return value > 999 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

function currentNextUrl() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function redirectToLogin() {
  window.location.href = `/login?next=${encodeURIComponent(currentNextUrl())}`;
}

function buttonClass(active: boolean, tone: "like" | "favorite" | "want-buy" | "plain" = "plain") {
  const activeClass =
    tone === "like"
      ? "bg-red-50 text-red-700"
      : tone === "favorite"
        ? "bg-amber-50 text-amber-800"
        : tone === "want-buy"
          ? "bg-ink text-white"
          : "bg-white text-ink";

  return `inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-55 ${
    active ? activeClass : "text-ink/62"
  }`;
}

export function WorkQuickActions({
  workId,
  title,
  description,
  designerName,
  schoolName,
  imageUrl,
  styleTags,
  category,
  initialLikeCount,
  initialFavoriteCount,
  initialLiked = false,
  initialFavorited = false
}: WorkQuickActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [wantBuy, setWantBuy] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const toggleLike = async () => {
    if (busy) return;

    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    setBusy("like");
    setMessage("");

    const response = await fetch(`/api/works/${workId}/like`, { method: "POST" });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (response.status === 401) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setMessage(data?.message ?? "点赞失败，请稍后再试。");
      return;
    }

    setLiked(Boolean(data?.liked));
    setLikeCount(typeof data?.likeCount === "number" ? data.likeCount : previousCount);
  };

  const toggleFavorite = async () => {
    if (busy) return;

    const previousFavorited = favorited;
    const previousCount = favoriteCount;
    const nextFavorited = !favorited;
    setFavorited(nextFavorited);
    setFavoriteCount((current) => Math.max(0, current + (nextFavorited ? 1 : -1)));
    setBusy("favorite");
    setMessage("");

    const response = await fetch(`/api/works/${workId}/favorite`, { method: "POST" });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (response.status === 401) {
      setFavorited(previousFavorited);
      setFavoriteCount(previousCount);
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      setFavorited(previousFavorited);
      setFavoriteCount(previousCount);
      setMessage(data?.message ?? "收藏失败，请稍后再试。");
      return;
    }

    setFavorited(Boolean(data?.favorited));
    setFavoriteCount(typeof data?.favoriteCount === "number" ? data.favoriteCount : previousCount);
  };

  const markWantBuy = async () => {
    if (busy || wantBuy) return;

    setBusy("want-buy");
    setMessage("");
    const response = await fetch(`/api/works/${workId}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "WANT_BUY" })
    });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setMessage(data?.message ?? "暂时没有记录成功，请稍后再试。");
      return;
    }

    setWantBuy(true);
    setMessage("已记录你的购买兴趣。");
  };

  const shareWork = async () => {
    if (busy) return;
    setMessage("");
    setShareOpen(true);
  };

  const shareInfo: WorkShareInfo = {
    id: workId,
    title,
    description,
    designerName,
    schoolName,
    imageUrl,
    styleTags,
    category
  };

  return (
    <div className="border-t border-black/5">
      <div className="grid min-h-[52px] grid-cols-4 gap-1 px-2 py-2 text-xs">
        <button type="button" disabled={busy === "like"} onClick={toggleLike} className={buttonClass(liked, "like")} aria-pressed={liked} aria-label={liked ? "取消点赞" : "点赞"}>
          <Heart size={15} fill={liked ? "currentColor" : "none"} />
          <span className="max-w-full truncate">{liked ? "已赞" : "点赞"} {countText(likeCount)}</span>
        </button>
        <button type="button" disabled={busy === "favorite"} onClick={toggleFavorite} className={buttonClass(favorited, "favorite")} aria-pressed={favorited} aria-label={favorited ? "取消收藏" : "收藏"}>
          <Bookmark size={15} fill={favorited ? "currentColor" : "none"} />
          <span className="max-w-full truncate">{favorited ? "已藏" : "收藏"} {countText(favoriteCount)}</span>
        </button>
        <button type="button" disabled={busy === "want-buy" || wantBuy} onClick={markWantBuy} className={buttonClass(wantBuy, "want-buy")} aria-pressed={wantBuy} aria-label={wantBuy ? "已想买" : "想买"}>
          <ShoppingBag size={15} />
          <span className="max-w-full truncate">{wantBuy ? "已想买" : "想买"}</span>
        </button>
        <button type="button" disabled={busy === "share"} onClick={shareWork} className={buttonClass(false)} aria-label="分享作品">
          <Share2 size={15} />
          <span className="max-w-full truncate">分享</span>
        </button>
      </div>
      {message ? <p className="border-t border-black/5 bg-paper px-3 py-2 text-xs leading-5 text-ink/62">{message}</p> : null}
      <WorkSharePanel work={shareInfo} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

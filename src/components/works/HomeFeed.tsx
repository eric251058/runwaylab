"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Heart, MessageCircle, Share2, ShoppingBag } from "lucide-react";
import { WorkSharePanel } from "@/components/works/WorkSharePanel";
import { initials, visualFor, type WorkImageLike } from "@/components/works/work-visuals";
import { truncateShareText, type WorkShareInfo } from "@/lib/work-share";

export type FeedCommentPreview = {
  id: string;
  workId: string;
  content: string;
  createdAt: string;
  user: {
    nickname: string;
  };
};

export type HomeFeedWork = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  styleTags: string[];
  images: WorkImageLike[];
  user: {
    nickname: string;
    designerProfile?: {
      school?: string | null;
      city?: string | null;
    } | null;
  };
  school?: {
    name: string;
    city?: string | null;
  } | null;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  isEditorPick: boolean;
  likedByCurrentUser?: boolean;
  favoritedByCurrentUser?: boolean;
};

type HomeFeedProps = {
  works: HomeFeedWork[];
  commentPreviews: Record<string, FeedCommentPreview[]>;
  mode: "inspiration" | "activity";
  isLoggedIn: boolean;
};

type Busy = `${string}:like` | `${string}:favorite` | `${string}:want` | `${string}:comment` | "";

function countText(value: number) {
  return value > 999 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

function profileLine(work: HomeFeedWork) {
  return work.school?.name ?? work.user.designerProfile?.school ?? work.user.designerProfile?.city ?? "新锐设计师";
}

function shareInfo(work: HomeFeedWork): WorkShareInfo {
  return {
    id: work.id,
    title: work.title,
    description: work.description,
    designerName: work.user.nickname,
    schoolName: profileLine(work),
    city: work.school?.city ?? work.user.designerProfile?.city ?? null,
    imageUrl: typeof work.images[0] === "string" ? work.images[0] : work.images[0]?.imageUrl,
    styleTags: work.styleTags,
    category: work.category
  };
}

export function HomeFeed({ works, commentPreviews, mode, isLoggedIn }: HomeFeedProps) {
  const [items, setItems] = useState(() => works.map((work) => ({ ...work })));
  const [comments, setComments] = useState(commentPreviews);
  const [activeCommentWorkId, setActiveCommentWorkId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Busy>("");
  const [shareWork, setShareWork] = useState<HomeFeedWork | null>(null);

  async function toggle(workId: string, type: "like" | "favorite") {
    setBusy(`${workId}:${type}`);
    setMessage((current) => ({ ...current, [workId]: "" }));
    const response = await fetch(`/api/works/${workId}/${type}`, { method: "POST" });
    const data = await response.json().catch(() => null);
    setBusy("");
    if (response.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/?view=activity#work-${workId}`)}`;
      return;
    }
    if (!response.ok) {
      setMessage((current) => ({ ...current, [workId]: data?.message ?? "操作失败，请稍后再试。" }));
      return;
    }
    setItems((current) =>
      current.map((work) =>
        work.id === workId
          ? {
              ...work,
              likedByCurrentUser: type === "like" ? Boolean(data.liked) : work.likedByCurrentUser,
              favoritedByCurrentUser: type === "favorite" ? Boolean(data.favorited) : work.favoritedByCurrentUser,
              likeCount: type === "like" && typeof data.likeCount === "number" ? data.likeCount : work.likeCount,
              favoriteCount: type === "favorite" && typeof data.favoriteCount === "number" ? data.favoriteCount : work.favoriteCount
            }
          : work
      )
    );
  }

  async function wantBuy(workId: string) {
    setBusy(`${workId}:want`);
    setMessage((current) => ({ ...current, [workId]: "" }));
    const response = await fetch(`/api/works/${workId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "WANT_BUY" })
    });
    const data = await response.json().catch(() => null);
    setBusy("");
    if (response.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/?view=activity#work-${workId}`)}`;
      return;
    }
    setMessage((current) => ({ ...current, [workId]: response.ok ? "已记录你的购买兴趣。" : data?.message ?? "暂时没有记录成功。" }));
  }

  async function submitComment(workId: string) {
    if (!isLoggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(`/?view=activity#work-${workId}`)}`;
      return;
    }
    const content = (commentDrafts[workId] ?? "").trim();
    if (!content) {
      setMessage((current) => ({ ...current, [workId]: "评论内容不能为空。" }));
      return;
    }
    setBusy(`${workId}:comment`);
    const response = await fetch(`/api/works/${workId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const data = await response.json().catch(() => null);
    setBusy("");
    if (!response.ok) {
      setMessage((current) => ({ ...current, [workId]: data?.message ?? "评论发布失败。" }));
      return;
    }
    setCommentDrafts((current) => ({ ...current, [workId]: "" }));
    setComments((current) => ({ ...current, [workId]: [data.comment, ...(current[workId] ?? [])].slice(0, 2) }));
    setItems((current) => current.map((work) => (work.id === workId ? { ...work, commentCount: data.commentCount } : work)));
    setMessage((current) => ({ ...current, [workId]: "评论已发布。" }));
  }

  if (!items.length) {
    return <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">平台正在筛选首批高质量作品。</div>;
  }

  if (mode === "inspiration") {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {items.map((work, index) => (
          <Link key={work.id} href={`/works/${work.id}`} className="group overflow-hidden rounded-[8px] bg-white shadow-[0_10px_28px_rgba(16,16,16,0.08)]" id={`work-${work.id}`}>
            <div className="relative aspect-[3/4] bg-paper">
              <img src={visualFor(index, work.images[0])} alt={`${work.title} 作品封面`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 280px" loading="lazy" />
            </div>
            <div className="p-2.5 md:p-3">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{work.title}</h3>
              <p className="mt-1 truncate text-xs text-ink/50">{work.user.nickname} · {profileLine(work)}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink/45">
                <span>赞 {countText(work.likeCount)}</span>
                <span>藏 {countText(work.favoriteCount)}</span>
                <span>评 {countText(work.commentCount)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[700px] space-y-5">
      {items.map((work, index) => {
        const preview = comments[work.id] ?? [];
        return (
          <article key={work.id} id={`work-${work.id}`} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_50px_rgba(16,16,16,0.10)]">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials(work.user.nickname)}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{work.user.nickname}</p>
                <p className="truncate text-xs text-ink/45">{profileLine(work)}</p>
              </div>
            </div>
            <Link href={`/works/${work.id}`} className="block">
              <div className="relative aspect-[4/5] bg-paper sm:aspect-[3/4]">
                <img src={visualFor(index, work.images[0])} alt={`${work.title} 作品封面`} className="h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 700px" loading="lazy" />
              </div>
            </Link>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" aria-label={work.likedByCurrentUser ? "取消点赞" : "点赞"} aria-pressed={Boolean(work.likedByCurrentUser)} disabled={busy === `${work.id}:like`} onClick={() => toggle(work.id, "like")} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/65 hover:bg-paper disabled:opacity-50">
                  <Heart className="h-4 w-4" fill={work.likedByCurrentUser ? "currentColor" : "none"} /> 点赞 {countText(work.likeCount)}
                </button>
                <button type="button" aria-label={work.favoritedByCurrentUser ? "取消收藏" : "收藏"} aria-pressed={Boolean(work.favoritedByCurrentUser)} disabled={busy === `${work.id}:favorite`} onClick={() => toggle(work.id, "favorite")} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/65 hover:bg-paper disabled:opacity-50">
                  <Bookmark className="h-4 w-4" fill={work.favoritedByCurrentUser ? "currentColor" : "none"} /> 收藏 {countText(work.favoriteCount)}
                </button>
                <button type="button" aria-label="想买" disabled={busy === `${work.id}:want`} onClick={() => wantBuy(work.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/65 hover:bg-paper disabled:opacity-50">
                  <ShoppingBag className="h-4 w-4" /> 想买
                </button>
                <button type="button" aria-label="分享作品" onClick={() => setShareWork(work)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/65 hover:bg-paper">
                  <Share2 className="h-4 w-4" /> 分享
                </button>
              </div>
              <Link href={`/works/${work.id}`} className="mt-2 block">
                <h3 className="text-lg font-semibold text-ink">{work.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">{truncateShareText(work.description, 96)}</p>
              </Link>
              <div className="mt-4 rounded-[8px] bg-paper p-3">
                {preview.length ? (
                  <div className="space-y-2">
                    {preview.slice(0, 2).map((comment) => (
                      <p key={comment.id} className="text-sm leading-6 text-ink/65">
                        <span className="font-semibold text-ink">{comment.user.nickname}：</span>
                        {truncateShareText(comment.content, 80)}
                      </p>
                    ))}
                    <Link href={`/works/${work.id}#comments`} className="inline-flex text-sm font-semibold text-ink/55 hover:text-ink">
                      查看全部 {work.commentCount} 条评论
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-ink/48">还没有评论，说说你最喜欢的细节。</p>
                )}
              </div>
              <div className="mt-3">
                {activeCommentWorkId === work.id ? (
                  <div className="flex gap-2">
                    <input autoFocus value={commentDrafts[work.id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [work.id]: event.target.value }))} placeholder="说说你最喜欢的细节……" className="min-h-11 min-w-0 flex-1 rounded-full border border-black/10 px-4 text-sm outline-none focus:border-ink" />
                    <button type="button" disabled={busy === `${work.id}:comment`} onClick={() => submitComment(work.id)} className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">发布</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => (isLoggedIn ? setActiveCommentWorkId(work.id) : (window.location.href = `/login?next=${encodeURIComponent(`/?view=activity#work-${work.id}`)}`))} className="inline-flex min-h-11 w-full items-center gap-2 rounded-full border border-black/10 px-4 text-left text-sm text-ink/45 hover:border-ink/30">
                    <MessageCircle className="h-4 w-4" /> 说说你最喜欢的细节……
                  </button>
                )}
                {message[work.id] ? <p className="mt-2 text-sm text-ink/55" aria-live="polite">{message[work.id]}</p> : null}
              </div>
            </div>
          </article>
        );
      })}
      {shareWork ? <WorkSharePanel work={shareInfo(shareWork)} open onClose={() => setShareWork(null)} /> : null}
    </div>
  );
}

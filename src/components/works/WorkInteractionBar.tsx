"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, MessageCircle, Share2, Sparkles, SwatchBook, WandSparkles } from "lucide-react";
import { WorkSharePanel } from "@/components/works/WorkSharePanel";
import type { WorkShareInfo } from "@/lib/work-share";

type WorkComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    nickname: string;
  };
};

type WorkInteractionBarProps = {
  workId: string;
  isLoggedIn: boolean;
  initialLiked: boolean;
  initialFavorited: boolean;
  initialIncubationRecommended: boolean;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  shareCount: number;
  incubationRecommendCount: number;
  comments: WorkComment[];
  shareInfo: WorkShareInfo;
};

const cooperationTypes = [
  { value: "OPEN_COOP", label: "开放合作" },
  { value: "COPYRIGHT", label: "版权合作" },
  { value: "BRAND_COLLAB", label: "品牌联名" },
  { value: "SAMPLE_INCUBATION", label: "打样孵化" },
  { value: "INTERNSHIP", label: "实习机会" }
];

function countText(value: number) {
  return value > 999 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

export function WorkInteractionBar({
  workId,
  isLoggedIn,
  initialLiked,
  initialFavorited,
  initialIncubationRecommended,
  likeCount,
  favoriteCount,
  commentCount,
  shareCount,
  incubationRecommendCount,
  comments: initialComments,
  shareInfo
}: WorkInteractionBarProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [incubationRecommended, setIncubationRecommended] = useState(initialIncubationRecommended);
  const [counts, setCounts] = useState({
    likeCount,
    favoriteCount,
    commentCount,
    shareCount,
    incubationRecommendCount
  });
  const [comments, setComments] = useState(initialComments);
  const [commentContent, setCommentContent] = useState("");
  const [cooperationOpen, setCooperationOpen] = useState(false);
  const [cooperation, setCooperation] = useState({
    type: "OPEN_COOP",
    contact: "",
    message: "",
    budgetRange: ""
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const loginUrl = useMemo(() => `/login?next=/works/${workId}`, [workId]);

  const requireLogin = () => {
    if (!isLoggedIn) {
      router.push(loginUrl);
      return false;
    }
    return true;
  };

  const postAction = async (key: string, url: string) => {
    if (!requireLogin()) return null;
    setBusy(key);
    setMessage("");
    const response = await fetch(url, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setMessage(data?.message ?? "操作失败，请稍后再试。");
      return null;
    }

    return data;
  };

  const toggleLike = async () => {
    const data = await postAction("like", `/api/works/${workId}/like`);
    if (!data) return;
    setLiked(data.liked);
    setCounts((current) => ({ ...current, likeCount: data.likeCount }));
  };

  const toggleFavorite = async () => {
    const data = await postAction("favorite", `/api/works/${workId}/favorite`);
    if (!data) return;
    setFavorited(data.favorited);
    setCounts((current) => ({ ...current, favoriteCount: data.favoriteCount }));
  };

  const recommendIncubation = async () => {
    if (incubationRecommended) return;
    const data = await postAction("incubation", `/api/works/${workId}/incubation-recommend`);
    if (!data) return;
    setIncubationRecommended(true);
    setCounts((current) => ({ ...current, incubationRecommendCount: data.incubationRecommendCount }));
    setMessage(data.alreadyRecommended ? "你已经推荐过这件作品。" : "已推荐进入孵化池。");
  };

  const submitComment = async () => {
    if (!requireLogin()) return;
    const content = commentContent.trim();
    if (!content) {
      setMessage("评论内容不能为空。");
      return;
    }

    setBusy("comment");
    setMessage("");
    const response = await fetch(`/api/works/${workId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setMessage(data?.message ?? "评论发布失败。");
      return;
    }

    setComments((current) => [data.comment, ...current]);
    setCounts((current) => ({ ...current, commentCount: data.commentCount }));
    setCommentContent("");
  };

  const submitCooperation = async () => {
    if (!requireLogin()) return;
    if (!cooperation.contact.trim() || !cooperation.message.trim()) {
      setMessage("请填写联系方式和合作说明。");
      return;
    }

    setBusy("cooperation");
    setMessage("");
    const response = await fetch("/api/cooperation-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workId,
        ...cooperation
      })
    });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setMessage(data?.message ?? "合作意向提交失败。");
      return;
    }

    setMessage("合作意向已提交，平台会在后台跟进。");
    setCooperationOpen(false);
    setCooperation({ type: "OPEN_COOP", contact: "", message: "", budgetRange: "" });
  };

  return (
    <aside className="space-y-3 rounded-[6px] bg-white p-3 shadow-[0_12px_34px_rgba(16,16,16,0.08)] md:space-y-4 md:p-4 md:shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy === "like"}
          onClick={toggleLike}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition disabled:opacity-50 ${
            liked ? "bg-red-50 text-red-700" : "text-ink/65 hover:bg-paper"
          }`}
          aria-label={liked ? "取消点赞" : "点赞"}
          aria-pressed={liked}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
          <span>{liked ? "已点赞" : "点赞"} {countText(counts.likeCount)}</span>
        </button>

        <button
          type="button"
          disabled={busy === "favorite"}
          onClick={toggleFavorite}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition disabled:opacity-50 ${
            favorited ? "bg-amber-50 text-amber-800" : "text-ink/65 hover:bg-paper"
          }`}
          aria-label={favorited ? "取消收藏" : "收藏"}
          aria-pressed={favorited}
        >
          <Bookmark size={17} fill={favorited ? "currentColor" : "none"} />
          <span>{favorited ? "已收藏" : "收藏"} {countText(counts.favoriteCount)}</span>
        </button>

        <a
          href="#comments"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/65 transition hover:bg-paper"
          aria-label="查看评论"
        >
          <MessageCircle size={17} />
          <span>评论 {countText(counts.commentCount)}</span>
        </a>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/65 transition hover:bg-paper"
          aria-label="分享作品"
        >
          <Share2 size={17} />
          <span>分享 {countText(counts.shareCount)}</span>
        </button>

        <button
          type="button"
          disabled={busy === "incubation" || incubationRecommended}
          onClick={recommendIncubation}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition disabled:opacity-75 ${
            incubationRecommended ? "bg-lime-50 text-lime-800" : "text-ink/65 hover:bg-paper"
          }`}
          aria-label={incubationRecommended ? "已推荐孵化" : "推荐孵化"}
          aria-pressed={incubationRecommended}
        >
          <Sparkles size={17} />
          <span>{incubationRecommended ? "已推荐孵化" : "推荐孵化"} {countText(counts.incubationRecommendCount)}</span>
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link href={`/incubation/fabric-request?workId=${workId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white">
          <SwatchBook size={16} />
          找相似面料
        </Link>
        <Link href={`/incubation/sample-request?workId=${workId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-ink">
          <WandSparkles size={16} />
          申请打样评估
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!requireLogin()) return;
            setCooperationOpen((current) => !current);
          }}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-ink"
        >
          开放合作意向
        </button>
      </div>

      {cooperationOpen ? (
        <div className="rounded-[6px] border border-black/8 bg-paper p-3 md:p-4">
          <h3 className="text-sm font-semibold text-ink">提交合作意向</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-ink/45">合作类型</span>
              <select
                value={cooperation.type}
                onChange={(event) => setCooperation((current) => ({ ...current, type: event.target.value }))}
                className="mt-2 h-10 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm outline-none"
              >
                {cooperationTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink/45">联系方式</span>
              <input
                value={cooperation.contact}
                onChange={(event) => setCooperation((current) => ({ ...current, contact: event.target.value }))}
                className="mt-2 h-10 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm outline-none"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-ink/45">合作说明</span>
              <textarea
                value={cooperation.message}
                onChange={(event) => setCooperation((current) => ({ ...current, message: event.target.value }))}
                className="mt-2 min-h-24 w-full rounded-[6px] border border-black/10 bg-white p-3 text-sm outline-none"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-ink/45">预算范围，可选</span>
              <input
                value={cooperation.budgetRange}
                onChange={(event) => setCooperation((current) => ({ ...current, budgetRange: event.target.value }))}
                className="mt-2 h-10 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm outline-none"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy === "cooperation"}
            onClick={submitCooperation}
            className="mt-3 h-10 w-full rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            {busy === "cooperation" ? "提交中..." : "提交合作意向"}
          </button>
        </div>
      ) : null}

      {message ? <p className="rounded-[6px] bg-paper px-4 py-3 text-sm text-ink/68">{message}</p> : null}

      <section id="comments" className="rounded-[6px] border border-black/8 bg-paper p-4">
        <h2 className="text-base font-semibold text-ink">评论</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={commentContent}
            onChange={(event) => setCommentContent(event.target.value)}
            placeholder={isLoggedIn ? "写下你对这件作品的看法" : "登录后可以评论"}
            className="min-h-10 min-w-0 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-ink"
          />
          <button
            type="button"
            disabled={busy === "comment"}
            onClick={submitComment}
            className="h-10 w-full rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            发布
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {comments.length ? (
            comments.map((comment) => (
              <div key={comment.id} className="border-t border-black/8 pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm leading-6 text-ink/66">{comment.content}</p>
                <p className="mt-2 text-xs font-semibold text-ink/40">
                  {comment.user.nickname} · {new Intl.DateTimeFormat("zh-CN").format(new Date(comment.createdAt))}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink/45">还没有评论，成为第一个给出反馈的人。</p>
          )}
        </div>
      </section>
      <WorkSharePanel work={shareInfo} open={shareOpen} onClose={() => setShareOpen(false)} />
    </aside>
  );
}

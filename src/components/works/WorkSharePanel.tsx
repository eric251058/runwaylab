"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Copy, Download, Image as ImageIcon, Share2, X } from "lucide-react";
import {
  safeWorkImageUrl,
  systemShareText,
  workCanonicalUrl,
  type WorkShareInfo,
  xiaohongshuCopy
} from "@/lib/work-share";

type WorkSharePanelProps = {
  work: WorkShareInfo;
  open: boolean;
  onClose: () => void;
};

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyText(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  fallbackCopy(text);
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = text.split("");
  let line = "";
  let lines = 0;
  for (const char of chars) {
    const test = `${line}${char}`;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = char;
      lines += 1;
      if (lines >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

async function loadPosterImage(src?: string | null) {
  const safeSrc = safeWorkImageUrl(src);
  if (!safeSrc) return null;
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = safeSrc;
  });
}

async function createPoster(work: WorkShareInfo) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#f6f4ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const image = await loadPosterImage(work.imageUrl);
  if (image) {
    const target = { x: 72, y: 84, w: 936, h: 900 };
    const scale = Math.max(target.w / image.width, target.h / image.height);
    const sw = target.w / scale;
    const sh = target.h / scale;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, target.x, target.y, target.w, target.h);
  } else {
    ctx.fillStyle = "#dedbd2";
    ctx.fillRect(72, 84, 936, 900);
    ctx.fillStyle = "#555047";
    ctx.font = "600 42px sans-serif";
    ctx.fillText("RunwayLab", 392, 520);
  }

  ctx.fillStyle = "rgba(17,17,17,0.72)";
  ctx.fillRect(72, 884, 936, 100);
  ctx.fillStyle = "#fff";
  ctx.font = "600 34px sans-serif";
  ctx.fillText("RunwayLab", 108, 946);
  ctx.font = "28px sans-serif";
  ctx.fillText("让好设计，不再停留在作品集里", 320, 946);

  ctx.fillStyle = "#111";
  ctx.font = "700 52px sans-serif";
  drawWrappedText(ctx, work.title, 72, 1074, 936, 66, 2);
  ctx.font = "32px sans-serif";
  const profile = [work.designerName, work.schoolName].filter(Boolean).join(" / ");
  drawWrappedText(ctx, profile, 72, 1224, 936, 44, 2);
  ctx.font = "26px sans-serif";
  const tags = [...(work.styleTags ?? []), work.category].filter(Boolean).slice(0, 3).join(" · ");
  if (tags) ctx.fillText(tags, 72, 1344);
  ctx.fillStyle = "#666";
  ctx.font = "24px sans-serif";
  ctx.fillText(workCanonicalUrl(work.id), 72, 1392);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Poster export failed"))), "image/png", 0.92);
  });
}

export function WorkSharePanel({ work, open, onClose }: WorkSharePanelProps) {
  const [message, setMessage] = useState("");
  const [copy, setCopy] = useState(() => xiaohongshuCopy(work));
  const [posterUrl, setPosterUrl] = useState("");
  const [busy, setBusy] = useState("");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const url = workCanonicalUrl(work.id);

  useEffect(() => {
    if (!open) return;
    setCopy(xiaohongshuCopy(work));
    setMessage("");
    closeRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, work]);

  useEffect(() => () => {
    if (posterUrl) URL.revokeObjectURL(posterUrl);
  }, [posterUrl]);

  if (!open) return null;

  async function shareWork() {
    setBusy("share");
    setMessage("");
    try {
      if (navigator.share) {
        await navigator.share({ title: work.title, text: systemShareText(work), url });
      } else {
        await copyText(url);
        setMessage("当前浏览器不支持系统分享，作品链接已复制。");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("分享没有完成，你可以复制链接继续分享。");
    } finally {
      setBusy("");
    }
  }

  async function generatePoster() {
    setBusy("poster");
    setMessage("");
    try {
      const blob = await createPoster(work);
      if (posterUrl) URL.revokeObjectURL(posterUrl);
      const nextPosterUrl = URL.createObjectURL(blob);
      setPosterUrl(nextPosterUrl);
      await copyText(copy);
      const file = new File([blob], `${work.id}-runwaylab-share.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: work.title, text: copy, url });
      } else {
        setMessage("分享图片已生成，文案已复制。请打开小红书选择图片发布。");
      }
    } catch {
      setMessage("分享图暂时没有生成，文案和链接仍可复制。");
    } finally {
      setBusy("");
    }
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusables = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, textarea, a[href]")).filter((item) => !item.hasAttribute("disabled"));
    const first = focusables[0];
    const last = focusables.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-10 md:items-center md:justify-center" role="dialog" aria-modal="true" aria-labelledby="work-share-title" onKeyDown={trapFocus}>
      <div className="w-full max-w-lg rounded-[8px] bg-white p-4 shadow-[0_28px_90px_rgba(0,0,0,0.25)] md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="work-share-title" className="text-xl font-semibold text-ink">分享这个设计</h2>
            <p className="mt-1 line-clamp-1 text-sm text-ink/52">{work.title}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink" aria-label="关闭分享面板">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy === "share"} onClick={shareWork} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">
            <Share2 className="h-4 w-4" aria-hidden="true" /> 分享作品
          </button>
          <button type="button" disabled={busy === "poster"} onClick={generatePoster} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink disabled:opacity-50">
            <ImageIcon className="h-4 w-4" aria-hidden="true" /> 生成小红书分享图
          </button>
          <button type="button" onClick={() => copyText(copy).then(() => setMessage("分享文案已复制。"))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
            <Copy className="h-4 w-4" aria-hidden="true" /> 复制分享文案
          </button>
          <button type="button" onClick={() => copyText(url).then(() => setMessage("作品链接已复制。"))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
            <Copy className="h-4 w-4" aria-hidden="true" /> 复制作品链接
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-ink/45">小红书分享文案</span>
          <textarea value={copy} onChange={(event) => setCopy(event.target.value)} className="mt-2 min-h-40 w-full rounded-[8px] border border-black/10 p-3 text-sm leading-6 text-ink outline-none focus:border-ink" />
        </label>

        {posterUrl ? (
          <a href={posterUrl} download={`${work.id}-runwaylab-share.png`} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-paper px-4 text-sm font-semibold text-ink">
            <Download className="h-4 w-4" aria-hidden="true" /> 保存分享图片
          </a>
        ) : null}
        {message ? <p className="mt-3 rounded-[8px] bg-paper px-3 py-2 text-sm leading-6 text-ink/65" aria-live="polite">{message}</p> : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { SafeImage } from "@/components/media/SafeImage";
import { uploadRules, type UploadKind } from "@/lib/storage";

type ImageUploaderProps = {
  name: string;
  value?: string | null;
  label: string;
  description?: string;
  aspectRatio?: "4/3" | "1/1" | "16/9";
  disabled?: boolean;
  uploadType?: UploadKind;
  onChange?: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

const aspectClasses = {
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "16/9": "aspect-video"
};

function formatMaxBytes(value: number) {
  return `${Math.round(value / 1024 / 1024)}MB`;
}

function readableError(message?: string | null) {
  if (message && /Unsupported image format/i.test(message)) return "图片格式暂不支持，请上传 JPG、PNG 或 WebP。";
  if (message && /too large/i.test(message)) return "图片太大，请压缩后重新上传。";
  return message || "图片上传失败，请重新上传。";
}

function isUsableImageUrl(value?: string | null) {
  const text = value?.trim();
  return text && /^(https?:\/\/|\/)/i.test(text) ? text : null;
}

export function ImageUploader({
  name,
  value,
  label,
  description,
  aspectRatio = "4/3",
  disabled = false,
  uploadType = "work",
  onChange,
  onUploadingChange
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastUploadedUrlRef = useRef<string | null>(null);
  const [imageUrl, setImageUrl] = useState(value ?? "");
  const [previewUrl, setPreviewUrl] = useState(value ?? "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error" | "preview-error">("idle");
  const [uploading, setUploading] = useState(false);
  const rule = uploadRules[uploadType];
  const accept = rule.allowedMimeTypes.join(",");
  const isBusy = disabled || uploading;

  function setUploadingState(nextUploading: boolean) {
    setUploading(nextUploading);
    onUploadingChange?.(nextUploading);
  }

  function clearFileInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function revokeObjectUrl(url = objectUrlRef.current) {
    if (url) {
      URL.revokeObjectURL(url);
      if (url === objectUrlRef.current) objectUrlRef.current = null;
    }
  }

  function update(nextValue: string) {
    setImageUrl(nextValue);
    onChange?.(nextValue);
  }

  useEffect(() => {
    if (!objectUrlRef.current) {
      const nextValue = value ?? "";
      setImageUrl(nextValue);
      setPreviewUrl(nextValue);
    }
  }, [value]);

  useEffect(() => {
    return () => revokeObjectUrl();
  }, []);

  async function upload(file?: File) {
    if (!file || disabled || uploading) {
      clearFileInput();
      return;
    }

    revokeObjectUrl();
    const localPreviewUrl = URL.createObjectURL(file);
    objectUrlRef.current = localPreviewUrl;
    lastUploadedUrlRef.current = null;
    setPreviewUrl(localPreviewUrl);
    setMessage("正在上传图片…");
    setStatus("uploading");
    setUploadingState(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", uploadType);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readableError(result?.message));
      }

      const uploadedUrl = isUsableImageUrl(result?.imageUrl ?? result?.url);
      if (!uploadedUrl) {
        throw new Error("图片上传失败，请重新上传。");
      }

      update(uploadedUrl);
      setPreviewUrl(uploadedUrl);
      lastUploadedUrlRef.current = uploadedUrl;
      setMessage("上传成功");
      setStatus("success");
      window.setTimeout(() => revokeObjectUrl(localPreviewUrl), 0);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? readableError(error.message) : "上传失败，请重新上传");
    } finally {
      setUploadingState(false);
      clearFileInput();
    }
  }

  function openFilePicker() {
    if (!isBusy) inputRef.current?.click();
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isBusy) return;
    void upload(event.dataTransfer.files?.[0]);
  }

  function removeImage() {
    revokeObjectUrl();
    lastUploadedUrlRef.current = null;
    update("");
    setPreviewUrl("");
    setMessage("");
    setStatus("idle");
    clearFileInput();
  }

  function handlePreviewLoad(src: string) {
    if (src === lastUploadedUrlRef.current && status !== "uploading") {
      setStatus("success");
      setMessage("上传成功");
    } else if (status === "preview-error") {
      setStatus("idle");
      setMessage("");
    }
  }

  function handlePreviewError(src: string) {
    if (src === lastUploadedUrlRef.current && status === "success") {
      setStatus("preview-error");
      setMessage("图片已上传，但预览暂时不可用");
      return;
    }

    if (!src.startsWith("blob:") && status !== "uploading") {
      setStatus("preview-error");
      setMessage("图片暂时无法显示，请重新选择图片");
    }
  }

  const isUploadedPreview = Boolean(previewUrl && previewUrl === lastUploadedUrlRef.current);

  return (
    <div className="w-full max-w-[640px]">
      <input type="hidden" name={name} value={imageUrl} />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={isBusy}
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <div
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-label={label}
        aria-busy={uploading}
        onDragOver={(event) => {
          if (!isBusy) event.preventDefault();
        }}
        onDrop={onDrop}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !isBusy) {
            event.preventDefault();
            openFilePicker();
          }
        }}
        className={`relative flex ${aspectClasses[aspectRatio]} w-full flex-col items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-black/12 bg-white text-center transition hover:border-ink/35 ${isBusy ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
      >
        {previewUrl ? (
          <SafeImage
            key={previewUrl}
            src={previewUrl}
            alt={label}
            className="h-full w-full object-cover"
            onLoad={() => handlePreviewLoad(previewUrl)}
            onError={() => handlePreviewError(previewUrl)}
            placeholder={
              <span className="px-5 text-center">
                <span className="block text-sm font-semibold text-ink/55">
                  {isUploadedPreview ? "图片已上传，但预览暂时不可用" : "图片暂时无法显示"}
                </span>
                <span className="mt-2 block text-xs text-ink/38">重新选择图片</span>
              </span>
            }
          />
        ) : (
          <span className="px-5">
            <span className="block text-base font-semibold text-ink">{label}</span>
            <span className="mt-2 block text-sm leading-6 text-ink/52">
              {description ?? `JPG、PNG、WebP，最大 ${formatMaxBytes(rule.maxBytes)}`}
            </span>
            <span className="mt-2 block text-xs text-ink/38">JPG、PNG、WebP，最大 {formatMaxBytes(rule.maxBytes)}</span>
          </span>
        )}
        {uploading ? (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold text-ink shadow-sm">
            正在上传图片…
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          disabled={isBusy}
          onClick={openFilePicker}
          className="font-semibold text-ink underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-45"
        >
          {previewUrl ? "更换图片" : "选择图片"}
        </button>
        {previewUrl ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={removeImage}
            className="text-ink/48 underline-offset-4 hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-45"
          >
            删除当前图片
          </button>
        ) : null}
        {message ? (
          <span className={status === "error" ? "text-red-600" : "text-ink/45"}>
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

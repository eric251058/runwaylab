"use client";

import { useRef, useState, type DragEvent } from "react";
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
};

const aspectClasses = {
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "16/9": "aspect-video"
};

function formatMaxBytes(value: number) {
  return `${Math.round(value / 1024 / 1024)}MB`;
}

function readableError(message: string) {
  if (/Unsupported image format/i.test(message)) return "图片格式暂不支持，请上传 JPG、PNG 或 WebP。";
  if (/too large/i.test(message)) return "图片太大，请压缩后重新上传。";
  return message || "图片上传失败，请重新上传。";
}

export function ImageUploader({
  name,
  value,
  label,
  description,
  aspectRatio = "4/3",
  disabled = false,
  uploadType = "work",
  onChange
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState(value ?? "");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const rule = uploadRules[uploadType];
  const accept = rule.allowedMimeTypes.join(",");

  function update(nextValue: string) {
    setImageUrl(nextValue);
    onChange?.(nextValue);
  }

  async function upload(file?: File) {
    if (!file || disabled) return;
    setMessage("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", uploadType);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const result = await response.json().catch(() => null);
    setUploading(false);

    if (!response.ok) {
      setMessage(readableError(result?.message));
      return;
    }

    update(result?.imageUrl ?? result?.url ?? "");
    setMessage("上传成功。");
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void upload(event.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <input type="hidden" name={name} value={imageUrl} />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={`flex ${aspectClasses[aspectRatio]} cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-black/12 bg-white text-center transition hover:border-ink/35 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="px-5">
            <span className="block text-base font-semibold text-ink">{uploading ? "正在上传..." : label}</span>
            <span className="mt-2 block text-sm leading-6 text-ink/52">{description ?? "点击上传，电脑端也可以拖拽图片到这里。"}</span>
            <span className="mt-2 block text-xs text-ink/38">JPG、PNG、WebP，最大 {formatMaxBytes(rule.maxBytes)}</span>
          </span>
        )}
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="font-semibold text-ink underline-offset-4 hover:underline disabled:opacity-45"
        >
          {imageUrl ? "更换图片" : "选择图片"}
        </button>
        {imageUrl ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => {
              update("");
              setMessage("已移除当前图片。");
            }}
            className="text-ink/48 underline-offset-4 hover:text-ink hover:underline disabled:opacity-45"
          >
            删除当前图片
          </button>
        ) : null}
        {message ? <span className={message.includes("失败") || message.includes("不支持") || message.includes("太大") ? "text-red-600" : "text-ink/45"}>{message}</span> : null}
      </div>
    </div>
  );
}

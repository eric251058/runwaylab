"use client";

import { useEffect, useState, type ReactNode } from "react";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  placeholder?: ReactNode;
};

function isVisibleImage(value?: string | null) {
  const text = value?.trim();
  return text && /^(https?:\/\/|\/|blob:)/i.test(text) ? text : null;
}

export function SafeImage({ src, alt, className, placeholder = "暂无产品图片" }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const image = isVisibleImage(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!image || failed) {
    return (
      <div className={`flex items-center justify-center bg-paper text-sm font-semibold text-ink/38 ${className ?? ""}`}>
        {placeholder}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

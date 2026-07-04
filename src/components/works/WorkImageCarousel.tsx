"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getWorkImageUrl, visualFor } from "@/components/works/work-visuals";

type WorkImageCarouselProps = {
  images: Array<{
    id?: string;
    imageUrl?: string | null;
    url?: string | null;
    src?: string | null;
    sortOrder?: number | null;
  }>;
  title: string;
};

export function WorkImageCarousel({ images, title }: WorkImageCarouselProps) {
  const slides = useMemo(
    () =>
      images.length
        ? images.map((image, index) => ({
            id: image.id ?? `${getWorkImageUrl(image)}-${index}`,
            src: visualFor(index, image)
          }))
        : [{ id: "fallback", src: visualFor(0) }],
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const active = slides[activeIndex] ?? slides[0];

  const go = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section className="-mx-4 space-y-3 md:mx-0">
      <div className="relative overflow-hidden bg-zinc-200 md:rounded-[6px]">
        <img src={active.src} alt={title} className="aspect-[4/5] w-full object-cover md:aspect-[16/11]" />
        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="上一张"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-lg backdrop-blur md:size-10"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-lg backdrop-blur md:size-10"
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-5 md:px-0">
          {slides.slice(0, 5).map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`w-16 shrink-0 overflow-hidden rounded-[4px] border md:w-auto ${activeIndex === index ? "border-ink" : "border-transparent"}`}
              aria-label={`查看第 ${index + 1} 张作品图`}
            >
              <img src={slide.src} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

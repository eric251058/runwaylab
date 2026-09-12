// Only resize uploads served by this application; never proxy arbitrary remote URLs.
export function uploadImageSrcSet(src: string) {
  if (!/^\/uploads\/[^?#]+\.(?:jpe?g|png|webp)$/i.test(src)) return undefined;
  return [256, 384, 640, 828, 1080, 1920]
    .map((width) => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75 ${width}w`)
    .join(", ");
}

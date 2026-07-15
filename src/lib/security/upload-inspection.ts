import type { UploadKind } from "@/lib/storage";
import { uploadRules } from "@/lib/storage";

const MAX_IMAGE_SIDE = 12000;

type ImageInspection = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function inspectJpeg(buffer: Buffer): ImageInspection | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        mimeType: "image/jpeg",
        extension: "jpg",
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + length;
  }

  return null;
}

function inspectPng(buffer: Buffer): ImageInspection | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;

  return {
    mimeType: "image/png",
    extension: "png",
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function inspectWebp(buffer: Buffer): ImageInspection | null {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1
    };
  }

  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + ((b3 << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    };
  }

  return null;
}

function detectImage(buffer: Buffer) {
  return inspectJpeg(buffer) ?? inspectPng(buffer) ?? inspectWebp(buffer);
}

function declaredTypeMatches(declaredType: string, actualType: ImageInspection["mimeType"]) {
  const normalized = declaredType.toLowerCase();
  if (!normalized) return true;
  if (normalized === actualType) return true;
  return normalized === "image/jpg" && actualType === "image/jpeg";
}

export async function inspectUploadImage(file: File, kind: UploadKind) {
  const rule = uploadRules[kind];

  if (!rule) {
    throw new Error("上传类型不正确。");
  }

  if (file.size > rule.maxBytes) {
    throw new Error("图片太大，请压缩后重新上传。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = detectImage(buffer);

  if (!image || !rule.allowedMimeTypes.includes(image.mimeType)) {
    throw new Error("文件不是有效的 JPG、PNG 或 WebP 图片。");
  }

  if (!declaredTypeMatches(file.type, image.mimeType)) {
    throw new Error("文件不是有效的 JPG、PNG 或 WebP 图片。");
  }

  if (!image.width || !image.height || image.width > MAX_IMAGE_SIDE || image.height > MAX_IMAGE_SIDE) {
    throw new Error("图片尺寸过大，请压缩后重新上传。");
  }

  return image;
}

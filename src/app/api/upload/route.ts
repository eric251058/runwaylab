import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, tooManyRequests, unauthenticated } from "@/lib/security/api-response";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";
import { getStorageService } from "@/lib/storage/service";
import type { UploadKind } from "@/lib/storage";

function readableUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Unsupported image format") || message.includes("有效的 JPG")) {
    return "文件不是有效的 JPG、PNG 或 WebP 图片。";
  }

  if (message.includes("too large") || message.includes("太大") || message.includes("尺寸过大")) {
    return message.includes("尺寸过大") ? "图片尺寸过大，请压缩后重新上传。" : "图片太大，请压缩后重新上传。";
  }

  return "图片上传失败，请重新上传。";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthenticated("请先登录后再上传图片。");
  }

  const ip = getClientIp(request);
  const uploadLimit = checkRateLimits([`upload:user:${user.id}`, `upload:ip:${ip}`], [
    { windowMs: 60 * 1000, limit: 10 },
    { windowMs: 60 * 60 * 1000, limit: 60 }
  ]);

  if (uploadLimit.limited) {
    return tooManyRequests("上传过于频繁，请稍后再试。", uploadLimit.retryAfter);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = (formData.get("kind")?.toString() || "work") as UploadKind;

  if (!(file instanceof File)) {
    return apiError("请选择要上传的图片。", 400);
  }

  try {
    const stored = await getStorageService().put(file, kind);

    return NextResponse.json({
      url: stored.url,
      imageUrl: stored.url,
      filename: file.name,
      size: file.size,
      mimeType: file.type
    });
  } catch (error) {
    console.error("Upload failed", {
      userId: user.id,
      route: "/api/upload",
      errorType: error instanceof Error ? error.name : typeof error,
      status: 400
    });
    return apiError(readableUploadError(error), 400);
  }
}

export async function DELETE() {
  return NextResponse.json({ message: "暂不支持直接删除上传文件。" }, { status: 405 });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorageService } from "@/lib/storage/service";
import type { UploadKind } from "@/lib/storage";

function keyFromUrl(imageUrl: string) {
  const prefix = process.env.PUBLIC_UPLOAD_BASE_URL ?? "/uploads";
  return imageUrl.startsWith(`${prefix}/`) ? imageUrl.slice(prefix.length + 1) : imageUrl;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录后再上传图片。" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = (formData.get("kind")?.toString() || "work") as UploadKind;

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "请选择要上传的图片。" }, { status: 400 });
  }

  try {
    const stored = await getStorageService().put(file, kind);

    return NextResponse.json({
      url: stored.url,
      imageUrl: stored.url,
      key: stored.key,
      filename: file.name,
      size: file.size,
      mimeType: file.type
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "图片上传失败。" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const key = body?.key || (body?.imageUrl ? keyFromUrl(String(body.imageUrl)) : null);

  if (!key) {
    return NextResponse.json({ message: "缺少要删除的图片。" }, { status: 400 });
  }

  await getStorageService().delete(key);
  return NextResponse.json({ ok: true });
}

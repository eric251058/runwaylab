import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { StorageService, UploadKind } from "@/lib/storage";
import { validateUpload } from "@/lib/storage";

const uploadDir = process.env.LOCAL_UPLOAD_DIR ?? "public/uploads";
const publicBaseUrl = process.env.PUBLIC_UPLOAD_BASE_URL ?? "/uploads";

export class LocalStorageService implements StorageService {
  async put(file: File, kind: UploadKind) {
    validateUpload(file, kind);

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "webp";
    const key = `${kind}/${randomUUID()}.${extension}`;
    const absoluteDir = path.join(process.cwd(), uploadDir, kind);
    const absolutePath = path.join(process.cwd(), uploadDir, key);

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

    return {
      key,
      url: `${publicBaseUrl}/${key.replaceAll("\\", "/")}`
    };
  }

  async delete(key: string) {
    const absolutePath = path.join(process.cwd(), uploadDir, key);
    await unlink(absolutePath).catch(() => undefined);
  }
}

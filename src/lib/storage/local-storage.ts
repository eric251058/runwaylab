import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { StorageService, UploadKind } from "@/lib/storage";
import { inspectUploadImage } from "@/lib/security/upload-inspection";

const uploadDir = process.env.LOCAL_UPLOAD_DIR ?? "public/uploads";
const publicBaseUrl = process.env.PUBLIC_UPLOAD_BASE_URL ?? "/uploads";

function getAppRoot() {
  if (process.env.APP_ROOT) {
    return path.resolve(process.env.APP_ROOT);
  }

  const cwd = process.cwd();
  const normalizedCwd = cwd.replaceAll("\\", "/");

  if (normalizedCwd.endsWith("/.next/standalone")) {
    return path.resolve(cwd, "../..");
  }

  return cwd;
}

function getUploadRoot() {
  return path.isAbsolute(uploadDir) ? path.resolve(uploadDir) : path.resolve(getAppRoot(), uploadDir);
}

function normalizeKey(key: string) {
  return key.replaceAll("\\", "/").replace(/^\/+/, "");
}

function getUploadPath(key: string) {
  const uploadRoot = getUploadRoot();
  const absolutePath = path.resolve(uploadRoot, normalizeKey(key));
  const relativePath = path.relative(uploadRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid upload path.");
  }

  return absolutePath;
}

export class LocalStorageService implements StorageService {
  async put(file: File, kind: UploadKind) {
    const inspection = await inspectUploadImage(file, kind);

    const key = `${kind}/${randomUUID()}.${inspection.extension}`;
    const absolutePath = getUploadPath(key);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

    return {
      key,
      url: `${publicBaseUrl}/${key.replaceAll("\\", "/")}`
    };
  }

  async delete(key: string) {
    const absolutePath = getUploadPath(key);
    await unlink(absolutePath).catch(() => undefined);
  }
}

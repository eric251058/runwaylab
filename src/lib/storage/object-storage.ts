import type { StoredFile, StorageService, UploadKind } from "@/lib/storage";

export class ObjectStorageService implements StorageService {
  async put(_file: File, _kind: UploadKind): Promise<StoredFile> {
    throw new Error("Object storage is not configured yet. Wire OSS, S3, or Cloudflare R2 here for production.");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("Object storage is not configured yet. Wire OSS, S3, or Cloudflare R2 here for production.");
  }
}

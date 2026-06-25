import type { StorageService } from "@/lib/storage";
import { LocalStorageService } from "@/lib/storage/local-storage";
import { ObjectStorageService } from "@/lib/storage/object-storage";

export function getStorageService(): StorageService {
  if (process.env.STORAGE_DRIVER === "object") {
    return new ObjectStorageService();
  }

  return new LocalStorageService();
}

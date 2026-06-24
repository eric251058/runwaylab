export type UploadKind = "work" | "avatar" | "challenge-cover" | "designer-cover";

export type UploadValidation = {
  maxBytes: number;
  allowedMimeTypes: string[];
};

export type StoredFile = {
  url: string;
  key: string;
};

export interface StorageService {
  put(file: File, kind: UploadKind): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export const uploadRules: Record<UploadKind, UploadValidation> = {
  work: {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  },
  avatar: {
    maxBytes: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  },
  "challenge-cover": {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  },
  "designer-cover": {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  }
};

export function validateUpload(file: File, kind: UploadKind) {
  const rule = uploadRules[kind];

  if (!rule.allowedMimeTypes.includes(file.type)) {
    throw new Error("Unsupported image format. Use jpg, jpeg, png, or webp.");
  }

  if (file.size > rule.maxBytes) {
    throw new Error("Image is too large for this upload type.");
  }
}

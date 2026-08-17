type JsonObject = Record<string, unknown>;

function jsonObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function textField(value: JsonObject | null, key: string) {
  const field = value?.[key];
  return typeof field === "string" && field.trim() ? field : null;
}

function textArrayField(value: JsonObject | null, key: string) {
  const field = value?.[key];
  return Array.isArray(field) ? field.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

export function readProjectOrderProductSnapshot(value: unknown) {
  const snapshot = jsonObject(value);
  return {
    title: textField(snapshot, "title"),
    projectTitle: textField(snapshot, "projectTitle"),
    workTitle: textField(snapshot, "workTitle"),
    campaignTitle: textField(snapshot, "campaignTitle"),
    submissionOfferHash: textField(snapshot, "submissionOfferHash"),
    description: textField(snapshot, "description"),
    materialDescription: textField(snapshot, "materialDescription"),
    careInstructions: textField(snapshot, "careInstructions"),
    imageStage: textField(snapshot, "imageStage"),
    displayImageUrls: textArrayField(snapshot, "displayImageUrls")
  };
}

export function readProjectOrderSkuSnapshot(value: unknown) {
  const snapshot = jsonObject(value);
  return {
    size: textField(snapshot, "size"),
    color: textField(snapshot, "color"),
    skuCode: textField(snapshot, "skuCode")
  };
}

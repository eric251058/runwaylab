type JsonObject = Record<string, unknown>;

function jsonObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function textField(value: JsonObject | null, key: string) {
  const field = value?.[key];
  return typeof field === "string" && field.trim() ? field : null;
}

export function readProjectOrderProductSnapshot(value: unknown) {
  const snapshot = jsonObject(value);
  return {
    title: textField(snapshot, "title"),
    description: textField(snapshot, "description"),
    materialDescription: textField(snapshot, "materialDescription"),
    careInstructions: textField(snapshot, "careInstructions")
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

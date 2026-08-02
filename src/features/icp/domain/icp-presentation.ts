function cleanText(value: string): string {
  return value.replace(/^\[mock\]\s*/, "");
}

function summarizeObject(value: Record<string, unknown>): string {
  for (const preferredKey of ["name", "title", "label"]) {
    const preferred = value[preferredKey];
    if (typeof preferred === "string" && preferred.trim()) return cleanText(preferred);
  }

  const visibleFields = Object.entries(value)
    .filter(([, field]) => ["string", "number", "boolean"].includes(typeof field))
    .map(([key, field]) => `${formatIcpLabel(key)}: ${cleanText(String(field))}`);
  return visibleFields.length > 0 ? visibleFields.join(" · ") : "Structured data";
}

export function formatIcpLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

export function formatIcpDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value
      .map((item) =>
        item && typeof item === "object"
          ? summarizeObject(item as Record<string, unknown>)
          : cleanText(String(item)),
      )
      .join(", ");
  }
  if (typeof value === "object") return summarizeObject(value as Record<string, unknown>);
  return "None";
}

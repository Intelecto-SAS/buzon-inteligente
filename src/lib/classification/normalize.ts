/** Normaliza tildes, mayúsculas y espacios para comparaciones configurables. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function prepareText(value: string, options: { normalize: boolean; caseSensitive: boolean }): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (options.normalize) return normalizeText(collapsed);
  if (!options.caseSensitive) return collapsed.toLowerCase();
  return collapsed;
}

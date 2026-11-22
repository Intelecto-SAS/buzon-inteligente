const ALLOWED = new Set(["remitente", "asunto", "fecha_recepcion", "codigo_caso", "codigo_tarea", "categoria", "organizacion", "dependencia"]);

export function renderTemplate(source: string, variables: Record<string, string | null | undefined>): { text: string; unknown: string[] } {
  const unknown: string[] = [];
  const text = source.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, raw: string) => {
    const key = raw.toLowerCase() === "codigo_tarea" ? "codigo_caso" : raw.toLowerCase();
    if (!ALLOWED.has(key)) {
      unknown.push(key);
      return "";
    }
    return escapeHtml(variables[key] ?? "");
  });
  return { text, unknown };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

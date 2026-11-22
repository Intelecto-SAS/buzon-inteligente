import fs from "fs";
import path from "path";
import { buildWorkspace, LOCAL_USER } from "./seed";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const FILE = path.join(process.cwd(), ".data", "workspace.json");
const VERSION = 3;

const ONE: Record<string, Record<string, string>> = {
  messages: { categories: "category_id", mailboxes: "mailbox_id" },
  cases: { categories: "category_id" },
  memberships: { profiles: "user_id", organizations: "org_id" },
  holidays: { calendars: "calendar_id" },
};

const MANY: Record<string, Record<string, string>> = {
  categories: { category_expressions: "category_id" },
  automation_rules: { automation_runs: "rule_id" },
  templates: { template_versions: "template_id" },
  cases: { case_notes: "case_id", case_transitions: "case_id", drafts: "case_id" },
  messages: { classification_results: "message_id", message_participants: "message_id", attachments: "message_id", ai_analyses: "message_id" },
};

let memory: { version: number; tables: Tables } | null = null;

function load(): Tables {
  if (memory?.version === VERSION) return memory.tables;
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as { version: number; tables: Tables };
      if (parsed.version === VERSION) {
        memory = parsed;
        return parsed.tables;
      }
    }
  } catch {
    // Se reconstruye el registro si el archivo no se puede leer.
  }
  const tables = buildWorkspace();
  memory = { version: VERSION, tables };
  persist();
  return tables;
}

function persist() {
  if (!memory) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(memory));
  } catch {
    // En Vercel el disco es de solo lectura. El registro queda en memoria del proceso.
  }
}

function pick(row: Row, fields: string[]): Row {
  if (fields.includes("*") || fields.length === 0) return { ...row };
  const out: Row = {};
  for (const field of fields) if (field in row) out[field] = row[field];
  return out;
}

function splitSelect(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

type Filter = { kind: "eq" | "is" | "in" | "gte" | "lte" | "ilike" | "not-in"; column: string; value: unknown };

class LocalQuery implements PromiseLike<{ data: unknown; error: { message: string } | null; count: number | null }> {
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row | Row[] | null = null;
  private selection = "*";
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private fromIndex = 0;
  private toIndex: number | null = null;
  private max: number | null = null;
  private wantCount = false;
  private head = false;
  private cardinality: "none" | "one" | "maybe" = "none";
  private onConflict: string | null = null;
  private ignoreDuplicates = false;

  constructor(private readonly table: string) {}

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selection = columns;
    if (options?.count) this.wantCount = true;
    if (options?.head) this.head = true;
    if (this.operation === "select") this.operation = "select";
    return this;
  }

  insert(payload: Row | Row[]) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.operation = "upsert";
    this.payload = payload;
    this.onConflict = options?.onConflict || null;
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates);
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ kind: "is", column, value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ kind: "in", column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ kind: "gte", column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ kind: "lte", column, value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ kind: "lte", column, value });
    return this;
  }

  not(column: string, operator: string, value: string) {
    if (operator === "in") {
      const list = value.replace(/[()]/g, "").split(",").map((item) => item.trim()).filter(Boolean);
      this.filters.push({ kind: "not-in", column, value: list });
    }
    return this;
  }

  or(expression: string) {
    const parts = expression.split(",").map((part) => part.trim());
    const needle = (parts[0]?.split(".ilike.")[1] || "").replace(/%/g, "");
    this.filters.push({ kind: "ilike", column: parts.map((part) => part.split(".ilike.")[0]).join("|"), value: needle });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.max = count;
    return this;
  }

  range(from: number, to: number) {
    this.fromIndex = from;
    this.toIndex = to;
    return this;
  }

  maybeSingle() {
    this.cardinality = "maybe";
    return this;
  }

  single() {
    this.cardinality = "one";
    return this;
  }

  then<TResult1 = { data: unknown; error: { message: string } | null; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      const value = this.execute();
      return Promise.resolve(onfulfilled ? onfulfilled(value) : (value as TResult1));
    } catch (error) {
      if (onrejected) return Promise.resolve(onrejected(error));
      return Promise.reject(error);
    }
  }

  private execute(): { data: unknown; error: { message: string } | null; count: number | null } {
    const tables = load();
    const rows = tables[this.table] || (tables[this.table] = []);
    if (this.operation === "insert" || this.operation === "upsert") return this.write(rows);
    if (this.operation === "update") {
      const matched = rows.filter((row) => this.matches(row));
      for (const row of matched) Object.assign(row, this.payload);
      persist();
      return { data: this.cardinality === "none" ? matched : matched[0] ?? null, error: null, count: matched.length };
    }
    if (this.operation === "delete") {
      const keep = rows.filter((row) => !this.matches(row));
      tables[this.table] = keep;
      persist();
      return { data: null, error: null, count: rows.length - keep.length };
    }
    let matched = rows.filter((row) => this.matches(row));
    for (const order of this.orders) {
      matched = [...matched].sort((left, right) => {
        const a = String(left[order.column] ?? "");
        const b = String(right[order.column] ?? "");
        return order.ascending ? a.localeCompare(b) : b.localeCompare(a);
      });
    }
    const count = matched.length;
    if (this.head) return { data: null, error: null, count };
    const end = this.toIndex !== null ? this.toIndex + 1 : matched.length;
    const start = this.fromIndex;
    matched = matched.slice(start, this.max !== null ? start + this.max : end);
    const shaped = matched.map((row) => this.shape(row, tables));
    if (this.cardinality === "one") return { data: shaped[0] ?? null, error: shaped[0] ? null : { message: "No hay registro." }, count };
    if (this.cardinality === "maybe") return { data: shaped[0] ?? null, error: null, count };
    return { data: shaped, error: null, count: this.wantCount ? count : null };
  }

  private write(rows: Row[]): { data: unknown; error: { message: string } | null; count: number | null } {
    const incoming = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
    const stored: Row[] = [];
    for (const item of incoming) {
      const row = { ...item };
      if (!row.id) row.id = crypto.randomUUID();
      if (this.operation === "upsert" && this.onConflict) {
        const keys = this.onConflict.split(",").map((key) => key.trim());
        const index = rows.findIndex((current) => keys.every((key) => current[key] === row[key]));
        if (index >= 0) {
          if (!this.ignoreDuplicates) Object.assign(rows[index], row);
          stored.push(rows[index]);
          continue;
        }
      }
      rows.push(row);
      stored.push(row);
    }
    persist();
    if (this.cardinality === "one" || this.cardinality === "maybe") return { data: stored[0] ?? null, error: null, count: stored.length };
    return { data: stored, error: null, count: stored.length };
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => {
      if (filter.kind === "ilike" && filter.column.includes("|")) {
        const columns = filter.column.split("|");
        const expected = String(filter.value).toLowerCase();
        return columns.some((column) => String(row[column] ?? "").toLowerCase().includes(expected));
      }
      if (filter.column.includes(".")) {
        const [relation, field] = filter.column.split(".");
        const joined = this.relatedOne(row, relation);
        return joined ? joined[field] === filter.value : false;
      }
      const value = row[filter.column];
      if (filter.kind === "eq") return value === filter.value;
      if (filter.kind === "is") return filter.value === null ? value === null || value === undefined : value === filter.value;
      if (filter.kind === "in") return (filter.value as unknown[]).includes(value);
      if (filter.kind === "not-in") return !(filter.value as unknown[]).includes(value);
      if (filter.kind === "gte") return String(value ?? "") >= String(filter.value ?? "");
      if (filter.kind === "lte") return String(value ?? "") <= String(filter.value ?? "");
      return true;
    });
  }

  private relatedOne(row: Row, relation: string): Row | null {
    const fk = ONE[this.table]?.[relation];
    if (!fk) return null;
    const tables = load();
    return (tables[relation] || []).find((item) => item.id === row[fk]) || null;
  }

  private shape(row: Row, tables: Tables): Row {
    const parts = splitSelect(this.selection);
    const scalar = parts.filter((part) => !part.includes("("));
    const base = scalar.includes("*") || scalar.length === 0 ? { ...row } : pick(row, scalar);
    for (const part of parts) {
      const match = part.match(/^([\w!]+)\((.+)\)$/);
      if (!match) continue;
      const name = match[1].replace("!inner", "");
      const fields = splitSelect(match[2]);
      const oneFk = ONE[this.table]?.[name];
      if (oneFk) {
        const found = (tables[name] || []).find((item) => item.id === row[oneFk]);
        base[name] = found ? pick(found, fields.includes("*") ? ["*"] : fields) : null;
        continue;
      }
      const manyFk = MANY[this.table]?.[name];
      if (manyFk) {
        base[name] = (tables[name] || []).filter((item) => item[manyFk] === row.id).map((item) => pick(item, fields.includes("*") ? ["*"] : fields));
      }
    }
    return base;
  }
}

export function createLocalClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: LOCAL_USER }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
    from(table: string) {
      return new LocalQuery(table);
    },
    async rpc() {
      return { data: null, error: { message: "RPC no disponible en el registro local." } };
    },
  };
}

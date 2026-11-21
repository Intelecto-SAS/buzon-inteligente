import { createUserClient } from "./supabase/server";
import type { AppSession } from "./session";

export async function db() {
  return createUserClient();
}

export async function inboxMessages(session: AppSession, filters: Record<string, string | undefined>, page: number) {
  const supabase = await db();
  if (!supabase || !session.orgId) return { rows: [], total: 0 };
  const size = 25;
  let query = supabase.from("messages").select("id, subject, snippet, from_address, from_name, received_at, priority, management_status, has_attachments, needs_reply, category_id, assignee_id, due_at, due_status, mailbox_id, classification_source, categories(name), mailboxes(display_name, email_address)", { count: "exact" }).eq("org_id", session.orgId).order("received_at", { ascending: false });
  if (filters.q) query = query.or(`subject.ilike.%${filters.q}%,from_address.ilike.%${filters.q}%`);
  if (filters.categoria && filters.categoria !== "todos" && filters.categoria !== "criticos" && filters.categoria !== "sin") query = query.eq("category_id", filters.categoria);
  if (filters.categoria === "criticos") query = query.eq("priority", "critica");
  if (filters.categoria === "sin") query = query.is("category_id", null);
  if (filters.prioridad) query = query.eq("priority", filters.prioridad);
  if (filters.estado) query = query.eq("management_status", filters.estado);
  if (filters.buzon) query = query.eq("mailbox_id", filters.buzon);
  if (filters.responsable) query = query.eq("assignee_id", filters.responsable);
  if (filters.sinAsignar === "1") query = query.is("assignee_id", null);
  if (filters.sinRespuesta === "1") query = query.eq("needs_reply", true);
  if (filters.adjuntos === "1") query = query.eq("has_attachments", true);
  if (filters.origen) query = query.eq("classification_source", filters.origen);
  if (filters.desde) query = query.gte("received_at", filters.desde);
  if (filters.hasta) query = query.lte("received_at", filters.hasta);
  const { data, count } = await query.range(page * size, page * size + size - 1);
  return { rows: data || [], total: count || 0, size };
}

export async function categories(orgId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("categories").select("*").eq("org_id", orgId).order("sort_order");
  return data || [];
}

export async function tabCounts(orgId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("messages").select("id, category_id, priority, management_status").eq("org_id", orgId).not("management_status", "in", "(cerrado)");
  return data || [];
}

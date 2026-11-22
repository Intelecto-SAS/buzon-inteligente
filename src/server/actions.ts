"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserClient, createServiceClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { assertTransition, canApprove, canDowngradeCritical, canManageConfiguration, canMutateModule, type CaseStatus } from "@/lib/security/permissions";
import { classifyMessage, type CategoryDefinition, type Expression } from "@/lib/classification/engine";
import { planAutomations, type AutomationRule } from "@/lib/automations/engine";
import { sha256 } from "@/lib/security/crypto";
import { renderTemplate } from "@/lib/templates/render";
import { randomBytes } from "crypto";
import { z } from "zod";

async function requireSession() {
  const session = await getSession();
  if (!session.userId || !session.orgId || !session.role) throw new Error("Sesión no autorizada.");
  return session;
}

export async function createOrganization(formData: FormData) {
  if (process.env.BOOTSTRAP_ENABLED !== "true") throw new Error("BOOTSTRAP_ENABLED no está activo.");
  const supabase = await createUserClient();
  const service = createServiceClient();
  if (!supabase || !service) throw new Error("Supabase no está configurado.");
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Debe iniciar sesión.");
  const { count } = await service.from("organizations").select("id", { count: "exact", head: true });
  if ((count || 0) > 0) throw new Error("Ya existe una organización. El alta siguiente es por invitación.");
  const name = String(formData.get("name") || "").trim();
  if (name.length < 3) throw new Error("Indique el nombre de la organización.");
  const { data: org, error } = await service.from("organizations").insert({ name }).select("id").single();
  if (error || !org) throw new Error(error?.message || "No se creó la organización.");
  await service.from("profiles").upsert({ id: data.user.id, full_name: String(formData.get("fullName") || data.user.email) });
  await service.from("memberships").insert({ org_id: org.id, user_id: data.user.id, role: "administrador", status: "active" });
  await service.from("calendars").insert({ org_id: org.id, name: "Calendario principal", timezone: "America/Bogota", is_default: true });
  for (const policy of [
    { priority: "critica", first_response_hours: 4, reminder_hours: 1, escalate_after_hours: 4 },
    { priority: "alta", first_response_hours: 24, reminder_hours: 8, escalate_after_hours: 24 },
    { priority: "normal", first_response_hours: 72, reminder_hours: 24, escalate_after_hours: 72 },
    { priority: "baja", first_response_hours: 120, reminder_hours: 48, escalate_after_hours: 120 },
  ]) {
    await service.from("attention_policies").insert({ org_id: org.id, ...policy });
  }
  await service.from("audit_events").insert({ org_id: org.id, actor_id: data.user.id, action: "organization.created", resource_type: "organization", resource_id: org.id });
  redirect("/dashboard");
}

const categorySchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  defaultPriority: z.enum(["critica", "alta", "normal", "baja"]),
  sensitiveLegal: z.boolean(),
  internalHours: z.number().int().positive().nullable(),
  minScore: z.number().positive(),
  operator: z.enum(["and", "or"]),
});

export async function saveCategory(formData: FormData) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso para categorías.");
  const supabase = await createUserClient();
  if (!supabase) throw new Error("Supabase no configurado.");
  const parsed = categorySchema.parse({
    name: String(formData.get("name") || ""),
    description: String(formData.get("description") || ""),
    defaultPriority: String(formData.get("priority") || "normal"),
    sensitiveLegal: formData.get("sensitive") === "on",
    internalHours: formData.get("hours") ? Number(formData.get("hours")) : null,
    minScore: Number(formData.get("minScore") || 1),
    operator: String(formData.get("operator") || "or"),
  });
  const id = String(formData.get("id") || "");
  const payload = {
    org_id: session.orgId,
    name: parsed.name,
    description: parsed.description || "",
    default_priority: parsed.defaultPriority,
    sensitive_legal: parsed.sensitiveLegal,
    internal_response_hours: parsed.internalHours,
    min_score: parsed.minScore,
    root_operator: parsed.operator,
  };
  const query = id
    ? supabase.from("categories").update(payload).eq("id", id).eq("org_id", session.orgId).select("id").single()
    : supabase.from("categories").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error || !data) throw new Error(error?.message || "No se guardó la categoría.");
  const lines = String(formData.get("expressions") || "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length) {
    await supabase.from("category_expressions").delete().eq("category_id", data.id);
    await supabase.from("category_expressions").insert(lines.map((line, index) => parseExpression(line, data.id, session.orgId!, index)));
  }
  await supabase.from("audit_events").insert({ org_id: session.orgId, actor_id: session.userId, action: id ? "category.updated" : "category.created", resource_type: "category", resource_id: data.id, after_data: payload });
  revalidatePath("/categorias");
  revalidatePath("/bandeja");
}

function parseExpression(line: string, categoryId: string, orgId: string, index: number) {
  const [polarity, field, mode, weight, ...rest] = line.split("|");
  return {
    category_id: categoryId,
    org_id: orgId,
    polarity: polarity === "exclude" ? "exclude" : "include",
    field: field || "body",
    match_mode: mode || "phrase",
    weight: Number(weight || 1),
    text: rest.join("|"),
    normalize: true,
    case_sensitive: false,
    active: true,
    sort_order: index,
  };
}

export async function setCategoryActive(id: string, active: boolean) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  await supabase!.from("categories").update({ active }).eq("id", id).eq("org_id", session.orgId);
  revalidatePath("/bandeja");
  revalidatePath("/categorias");
}

export async function evaluateSample(formData: FormData) {
  const session = await requireSession();
  const supabase = await createUserClient();
  if (!supabase) throw new Error("Supabase no configurado.");
  const { data: categories } = await supabase.from("categories").select("*").eq("org_id", session.orgId).eq("active", true);
  const { data: expressions } = await supabase.from("category_expressions").select("*").eq("org_id", session.orgId);
  const defs: CategoryDefinition[] = (categories || []).map((category) => ({
    id: category.id,
    name: category.name,
    active: true,
    priorityOrder: category.sort_order,
    defaultPriority: category.default_priority,
    sensitiveLegal: category.sensitive_legal,
    minScore: Number(category.min_score),
    mailboxIds: null,
    root: {
      id: category.id,
      operator: category.root_operator,
      groups: [],
      expressions: (expressions || []).filter((item) => item.category_id === category.id).map(toExpression),
    },
  }));
  const decision = classifyMessage({
    subject: String(formData.get("subject") || ""),
    body: String(formData.get("body") || ""),
    sender: String(formData.get("sender") || ""),
    recipients: "",
    attachmentNames: [],
    attachmentText: "",
    headers: "",
    mailboxId: "sample",
  }, defs);
  return decision;
}

function toExpression(item: { id: string; text: string; field: Expression["field"]; match_mode: Expression["matchMode"]; polarity: Expression["polarity"]; case_sensitive: boolean; normalize: boolean; weight: number; active: boolean }): Expression {
  return { id: item.id, text: item.text, field: item.field, matchMode: item.match_mode, polarity: item.polarity, caseSensitive: item.case_sensitive, normalize: item.normalize, weight: Number(item.weight), active: item.active };
}

export async function saveRule(formData: FormData) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const definition = JSON.parse(String(formData.get("definition") || "{}"));
  const rule = {
    org_id: session.orgId,
    name: String(formData.get("name") || "Regla"),
    description: String(formData.get("description") || ""),
    owner_id: session.userId,
    priority: Number(formData.get("priority") || 100),
    active: false,
    sensitive_authorized: formData.get("sensitive") === "on",
    definition,
  };
  const { data, error } = await supabase!.from("automation_rules").insert(rule).select("id, version").single();
  if (error) throw new Error(error.message);
  await supabase!.from("automation_rule_versions").insert({ rule_id: data.id, version: 1, definition, created_by: session.userId });
  await supabase!.from("audit_events").insert({ org_id: session.orgId, actor_id: session.userId, action: "automation.created", resource_type: "automation_rule", resource_id: data.id });
  revalidatePath("/automatizaciones");
}

export async function setRuleActive(id: string, active: boolean) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  await supabase!.from("automation_rules").update({ active }).eq("id", id).eq("org_id", session.orgId);
  revalidatePath("/automatizaciones");
}

export async function simulateRule(formData: FormData) {
  const definition = JSON.parse(String(formData.get("definition") || "{}")) as AutomationRule["definition"];
  const context = JSON.parse(String(formData.get("context") || "{}"));
  return planAutomations({
    rules: [{ id: "simulacion", name: "Simulación", active: true, priority: 1, version: 1, definition }],
    trigger: definition.trigger,
    context,
    sensitiveAuthorizedRuleIds: [],
  });
}

export async function inviteUser(formData: FormData) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const token = randomBytes(24).toString("hex");
  const { error } = await supabase!.from("invitations").insert({
    org_id: session.orgId,
    email: String(formData.get("email") || "").toLowerCase(),
    role: String(formData.get("role") || "usuario"),
    token_hash: sha256(token),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    invited_by: session.userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
  return { token };
}

export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") || "");
  const supabase = await createUserClient();
  const service = createServiceClient();
  if (!supabase || !service) throw new Error("Supabase no configurado.");
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) throw new Error("Inicie sesión con el correo invitado.");
  const { data: invitation } = await service.from("invitations").select("*").eq("token_hash", sha256(token)).is("accepted_at", null).maybeSingle();
  if (!invitation || new Date(invitation.expires_at) < new Date()) throw new Error("La invitación no es válida.");
  if (invitation.email !== data.user.email.toLowerCase()) throw new Error("La invitación corresponde a otro correo.");
  await service.from("profiles").upsert({ id: data.user.id, full_name: data.user.email });
  await service.from("memberships").upsert({ org_id: invitation.org_id, user_id: data.user.id, role: invitation.role, status: "active" });
  await service.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);
  redirect("/dashboard");
}

export async function updateMemberRole(formData: FormData) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "");
  if (!["administrador", "supervisor", "usuario", "auditor"].includes(role)) throw new Error("Rol no válido.");
  const supabase = await createUserClient();
  await supabase!.from("memberships").update({ role }).eq("user_id", userId).eq("org_id", session.orgId);
  const service = createServiceClient();
  const admin = (service as { auth?: { admin?: { updateUserById: (id: string, attrs: { app_metadata: Record<string, string> }) => Promise<unknown> } } }).auth?.admin;
  if (admin) {
    try {
      await admin.updateUserById(userId, { app_metadata: { org_role: role } });
    } catch {
      // El rol queda en el registro de la organización aunque Auth no acepte el identificador local.
    }
  }
  revalidatePath("/usuarios");
  revalidatePath("/dashboard");
}

export async function createTeam(formData: FormData) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  await supabase!.from("teams").insert({ org_id: session.orgId, name: String(formData.get("name") || "") });
  revalidatePath("/usuarios");
}

export async function addNote(formData: FormData) {
  const session = await requireSession();
  if (!canMutateModule(session.role!, "casos")) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const caseId = String(formData.get("caseId"));
  await supabase!.from("case_notes").insert({ case_id: caseId, org_id: session.orgId, author_id: session.userId, body: String(formData.get("body") || "") });
  revalidatePath(`/casos/${caseId}`);
}

export async function transitionCase(formData: FormData) {
  const session = await requireSession();
  const supabase = await createUserClient();
  const caseId = String(formData.get("caseId"));
  const to = String(formData.get("to")) as CaseStatus;
  const { data: current } = await supabase!.from("cases").select("status").eq("id", caseId).eq("org_id", session.orgId).single();
  if (!current) throw new Error("Caso no encontrado.");
  assertTransition(current.status as CaseStatus, to, session.role!);
  const reason = String(formData.get("reason") || "");
  if (to === "cerrado" && reason.trim().length < 3) throw new Error("El cierre exige un motivo.");
  await supabase!.from("cases").update({ status: to, close_reason: to === "cerrado" ? reason : null, closed_at: to === "cerrado" ? new Date().toISOString() : null }).eq("id", caseId);
  await supabase!.from("case_transitions").insert({ case_id: caseId, org_id: session.orgId, from_status: current.status, to_status: to, actor_id: session.userId, reason });
  await supabase!.from("audit_events").insert({ org_id: session.orgId, actor_id: session.userId, action: "case.transition", resource_type: "case", resource_id: caseId, before_data: { status: current.status }, after_data: { status: to } });
  revalidatePath(`/casos/${caseId}`);
  revalidatePath("/casos");
}

export async function assignCase(formData: FormData) {
  const session = await requireSession();
  if (!canMutateModule(session.role!, "casos")) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const caseId = String(formData.get("caseId"));
  const assignee = String(formData.get("assignee") || "") || null;
  await supabase!.from("case_assignments").update({ ended_at: new Date().toISOString() }).eq("case_id", caseId).is("ended_at", null);
  await supabase!.from("cases").update({ assignee_id: assignee, status: assignee ? "asignado" : "sin_asignar" }).eq("id", caseId).eq("org_id", session.orgId);
  await supabase!.from("case_assignments").insert({ case_id: caseId, org_id: session.orgId, assignee_id: assignee, assigned_by: session.userId, reason: String(formData.get("reason") || "") });
  await supabase!.from("audit_events").insert({ org_id: session.orgId, actor_id: session.userId, action: "case.assigned", resource_type: "case", resource_id: caseId, after_data: { assignee } });
  revalidatePath(`/casos/${caseId}`);
}

export async function changePriority(formData: FormData) {
  const session = await requireSession();
  const supabase = await createUserClient();
  const caseId = String(formData.get("caseId"));
  const priority = String(formData.get("priority"));
  const reason = String(formData.get("reason") || "");
  const { data: current } = await supabase!.from("cases").select("priority").eq("id", caseId).single();
  if (current?.priority === "critica" && priority !== "critica") {
    if (!canDowngradeCritical(session.role!)) throw new Error("No puede reducir una prioridad crítica.");
    if (reason.trim().length < 8) throw new Error("La reducción de prioridad crítica exige justificación.");
  }
  await supabase!.from("cases").update({ priority }).eq("id", caseId).eq("org_id", session.orgId);
  await supabase!.from("audit_events").insert({ org_id: session.orgId, actor_id: session.userId, action: "case.priority", resource_type: "case", resource_id: caseId, before_data: current, after_data: { priority, reason } });
  revalidatePath(`/casos/${caseId}`);
}

export async function saveTemplate(formData: FormData) {
  const session = await requireSession();
  if (!canMutateModule(session.role!, "plantillas") && !canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const { data, error } = await supabase!.from("templates").insert({
    org_id: session.orgId,
    name: String(formData.get("name")),
    kind: String(formData.get("kind")),
    requires_approval: formData.get("approval") === "on" || formData.get("kind") !== "acuse",
  }).select("id").single();
  if (error || !data) throw new Error(error?.message || "No se guardó.");
  await supabase!.from("template_versions").insert({
    template_id: data.id,
    version: 1,
    subject: String(formData.get("subject") || ""),
    body: String(formData.get("body") || ""),
    created_by: session.userId,
  });
  revalidatePath("/plantillas");
}

export async function createDraft(formData: FormData) {
  const session = await requireSession();
  if (!canMutateModule(session.role!, "casos")) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const caseId = String(formData.get("caseId"));
  const { data: item } = await supabase!.from("cases").select("public_code, subject, categories(name)").eq("id", caseId).single();
  const rendered = renderTemplate(String(formData.get("body") || ""), {
    codigo_caso: item?.public_code,
    asunto: item?.subject,
    categoria: (item?.categories as { name?: string } | null)?.name,
    organizacion: session.orgName,
  });
  if (rendered.unknown.length) throw new Error(`Variables no permitidas: ${rendered.unknown.join(", ")}`);
  const sensitive = formData.get("sensitive") === "1";
  const { error } = await supabase!.from("drafts").insert({
    org_id: session.orgId,
    case_id: caseId,
    subject: String(formData.get("subject") || item?.subject || ""),
    body: rendered.text,
    status: sensitive ? "pending_approval" : "draft",
    author_id: session.userId,
    source: "manual",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/casos/${caseId}`);
}

export async function decideApproval(formData: FormData) {
  const session = await requireSession();
  if (!canApprove(session.role!)) throw new Error("Sin permiso de aprobación.");
  const supabase = await createUserClient();
  const draftId = String(formData.get("draftId"));
  const status = String(formData.get("status"));
  await supabase!.from("approvals").insert({ draft_id: draftId, org_id: session.orgId, reviewer_id: session.userId, status, comment: String(formData.get("comment") || ""), decided_at: new Date().toISOString() });
  await supabase!.from("drafts").update({ status: status === "approved" ? "approved" : "rejected" }).eq("id", draftId).eq("org_id", session.orgId);
  revalidatePath("/casos");
}

export async function acknowledgeAlert(id: string) {
  const session = await requireSession();
  const supabase = await createUserClient();
  await supabase!.from("alerts").update({ status: "acknowledged" }).eq("id", id).eq("org_id", session.orgId);
  await supabase!.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", session.userId).eq("alert_id", id);
  revalidatePath("/alertas");
}

export async function markRead(messageId: string, read: boolean) {
  const session = await requireSession();
  const supabase = await createUserClient();
  if (read) await supabase!.from("read_states").upsert({ message_id: messageId, user_id: session.userId, read_at: new Date().toISOString() });
  else await supabase!.from("read_states").delete().eq("message_id", messageId).eq("user_id", session.userId);
  revalidatePath("/bandeja");
}

export async function classifyManually(formData: FormData) {
  const session = await requireSession();
  if (!canMutateModule(session.role!, "bandeja")) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const messageId = String(formData.get("messageId"));
  const categoryId = String(formData.get("categoryId"));
  await supabase!.from("messages").update({ category_id: categoryId, classification_source: "manual", classification_locked: true, classification_explanation: "Clasificación manual." }).eq("id", messageId).eq("org_id", session.orgId);
  await supabase!.from("classification_results").insert({ message_id: messageId, org_id: session.orgId, category_id: categoryId, is_primary: true, explanation: "Clasificación manual.", engine_version: "manual", source: "manual", detail: {} });
  await supabase!.from("audit_events").insert({ org_id: session.orgId, actor_id: session.userId, action: "classification.manual", resource_type: "message", resource_id: messageId, after_data: { categoryId } });
  revalidatePath("/bandeja");
}

export async function saveHoliday(formData: FormData) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  const { data: calendar } = await supabase!.from("calendars").select("id").eq("org_id", session.orgId).eq("is_default", true).maybeSingle();
  if (!calendar) throw new Error("No hay calendario.");
  await supabase!.from("holidays").insert({ calendar_id: calendar.id, day: String(formData.get("day")), name: String(formData.get("name")) });
  revalidatePath("/configuracion");
}

export async function grantMailbox(formData: FormData) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  await supabase!.from("mailbox_access").upsert({
    org_id: session.orgId,
    mailbox_id: String(formData.get("mailboxId")),
    user_id: String(formData.get("userId")),
    can_read: true,
    can_reply: formData.get("reply") === "on",
    can_forward: formData.get("forward") === "on",
  }, { onConflict: "mailbox_id,user_id" });
  revalidatePath("/buzones");
}

export async function pauseMailbox(id: string, paused: boolean) {
  const session = await requireSession();
  if (!canManageConfiguration(session.role!)) throw new Error("Sin permiso.");
  const supabase = await createUserClient();
  await supabase!.from("mailboxes").update({ status: paused ? "paused" : "connected", processing_enabled: !paused }).eq("id", id).eq("org_id", session.orgId);
  revalidatePath("/buzones");
}

export async function saveView(formData: FormData) {
  const session = await requireSession();
  const supabase = await createUserClient();
  await supabase!.from("saved_views").insert({
    org_id: session.orgId,
    user_id: session.userId,
    name: String(formData.get("name")),
    module: "bandeja",
    query: Object.fromEntries(formData.entries()),
  });
  revalidatePath("/bandeja");
}

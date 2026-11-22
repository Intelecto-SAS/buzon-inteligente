import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryDefinition, Expression } from "@/lib/classification/engine";
import type { AutomationRule } from "@/lib/automations/engine";
import type { NormalizedMessage } from "@/lib/mail/types";
import { sanitizeEmailHtml, htmlToText } from "@/lib/security/html";
import { processInboundMessage, type ProcessRepository } from "./process-message";
import { analyzeMessage } from "@/lib/ai/analyze";

type MailboxRow = { id: string; org_id: string; provider: "microsoft" | "google" };

export async function ingestNormalizedMessage(supabase: SupabaseClient, mailbox: MailboxRow, message: NormalizedMessage) {
  const [{ data: categories }, { data: expressions }, { data: rules }, { data: org }, { data: holidays }] = await Promise.all([
    supabase.from("categories").select("*").eq("org_id", mailbox.org_id).eq("active", true),
    supabase.from("category_expressions").select("*").eq("org_id", mailbox.org_id).eq("active", true),
    supabase.from("automation_rules").select("*").eq("org_id", mailbox.org_id).eq("active", true),
    supabase.from("organizations").select("timezone").eq("id", mailbox.org_id).single(),
    supabase.from("holidays").select("day, calendars!inner(org_id)").eq("calendars.org_id", mailbox.org_id),
  ]);

  const defs: CategoryDefinition[] = (categories || []).map((category) => {
    const own = (expressions || []).filter((item) => item.category_id === category.id);
    const mapped: Expression[] = own.map((item) => ({
      id: item.id,
      text: item.text,
      field: item.field,
      matchMode: item.match_mode,
      polarity: item.polarity,
      caseSensitive: item.case_sensitive,
      normalize: item.normalize,
      weight: Number(item.weight),
      active: item.active,
    }));
    return {
      id: category.id,
      name: category.name,
      active: category.active,
      priorityOrder: category.sort_order,
      defaultPriority: category.default_priority,
      sensitiveLegal: category.sensitive_legal,
      minScore: Number(category.min_score),
      mailboxIds: null,
      root: { id: category.id, operator: category.root_operator, expressions: mapped, groups: [] },
    };
  });

  const automationRules: AutomationRule[] = (rules || []).map((rule) => ({
    id: rule.id,
    name: rule.name,
    active: rule.active,
    priority: rule.priority,
    version: rule.version,
    definition: rule.definition,
  }));

  const html = sanitizeEmailHtml(message.bodyHtml || "");
  const text = message.bodyText || htmlToText(html);
  const repo = supabaseRepository(supabase);

  const result = await processInboundMessage(
    repo,
    {
      orgId: mailbox.org_id,
      mailboxId: mailbox.id,
      provider: mailbox.provider,
      providerMessageId: message.providerMessageId,
      providerThreadId: message.providerThreadId,
      internetMessageId: message.internetMessageId,
      fromName: message.fromName,
      receivedAt: message.receivedAt,
      subject: message.subject,
      body: text,
      bodyHtml: html,
      sender: message.fromAddress,
      recipients: message.participants.filter((item) => item.kind !== "from").map((item) => item.address).join(", "),
      attachmentNames: message.attachments.map((item) => item.filename),
      attachmentText: "",
      headers: message.headers,
      hasAttachments: message.attachments.length > 0,
      rawParticipants: message.participants,
    },
    {
      categories: defs,
      rules: automationRules,
      sensitiveAuthorizedRuleIds: (rules || []).filter((rule) => rule.sensitive_authorized).map((rule) => rule.id),
      holidays: (holidays || []).map((item) => ({ day: String(item.day) })),
      timeZone: org?.timezone || "America/Bogota",
      createCaseOnInbound: true,
    },
  );

  if (!result.duplicate) {
    const ai = await analyzeMessage({ subject: message.subject, body: text });
    await supabase.from("ai_analyses").insert({
      message_id: result.messageId,
      org_id: mailbox.org_id,
      model: ai.model,
      available: ai.available,
      result: ai,
    });
    for (const attachment of message.attachments) {
      await supabase.from("attachments").insert({
        org_id: mailbox.org_id,
        message_id: result.messageId,
        filename: attachment.filename,
        content_type: attachment.contentType,
        size_bytes: attachment.sizeBytes,
      });
    }
  }
  return result;
}

function supabaseRepository(supabase: SupabaseClient): ProcessRepository {
  return {
    async findMessage(mailboxId, providerMessageId) {
      const { data } = await supabase.from("messages").select("id, case_id, classification_locked").eq("mailbox_id", mailboxId).eq("provider_message_id", providerMessageId).maybeSingle();
      if (!data) return null;
      return { id: data.id, caseId: data.case_id, classificationLocked: data.classification_locked, inserted: false };
    },
    async insertMessage(input) {
      let conversationId: string | null = null;
      if (input.providerThreadId) {
        const { data: conversation } = await supabase
          .from("conversations")
          .upsert({ org_id: input.orgId, mailbox_id: input.mailboxId, provider_thread_id: input.providerThreadId, subject: input.subject }, { onConflict: "mailbox_id,provider_thread_id" })
          .select("id")
          .single();
        conversationId = conversation?.id ?? null;
      }
      const { data, error } = await supabase
        .from("messages")
        .insert({
          org_id: input.orgId,
          mailbox_id: input.mailboxId,
          conversation_id: conversationId,
          provider_message_id: input.providerMessageId,
          internet_message_id: input.internetMessageId,
          subject: input.subject,
          snippet: input.body.slice(0, 240),
          body_text: input.body,
          body_html_sanitized: input.bodyHtml,
          from_address: input.sender,
          from_name: input.fromName,
          received_at: input.receivedAt,
          has_attachments: input.hasAttachments,
          category_id: input.decision.primaryCategoryId,
          priority: input.decision.priority,
          management_status: input.decision.unclassified ? "pendiente_clasificacion" : "recibido",
          classification_source: "automatic",
          classification_locked: false,
          classification_explanation: input.decision.explanation,
          due_at: input.due.legalDueAt,
          due_status: input.due.legalStatus,
          internal_due_at: input.due.internalDueAt,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message || "No se pudo guardar el mensaje.");
      if (input.rawParticipants.length) {
        await supabase.from("message_participants").insert(input.rawParticipants.map((item) => ({ message_id: data.id, ...item })));
      }
      return { id: data.id, caseId: null, classificationLocked: false, inserted: true };
    },
    async createCase(input) {
      const { data: code, error: codeError } = await supabase.rpc("next_case_code", { p_org: input.orgId });
      if (codeError) throw new Error(codeError.message);
      const { data, error } = await supabase
        .from("cases")
        .insert({
          org_id: input.orgId,
          public_code: code,
          mailbox_id: input.mailboxId,
          category_id: input.categoryId,
          priority: input.priority,
          status: input.assigneeId ? "asignado" : input.categoryId ? "sin_asignar" : "pendiente_clasificacion",
          assignee_id: input.assigneeId,
          subject: input.subject,
          received_at: input.receivedAt,
          due_at: input.due.legalDueAt,
          due_status: input.due.legalStatus,
          internal_due_at: input.due.internalDueAt,
          sensitive_legal: input.sensitiveLegal,
        })
        .select("id, public_code")
        .single();
      if (error || !data) throw new Error(error?.message || "No se pudo crear la tarea.");
      await supabase.from("case_transitions").insert({
        case_id: data.id,
        org_id: input.orgId,
        from_status: null,
        to_status: input.assigneeId ? "asignado" : "sin_asignar",
        reason: "Apertura automática al recibir la comunicación.",
      });
      return { id: data.id, publicCode: data.public_code };
    },
    async linkMessageToCase(messageId, caseId) {
      await supabase.from("case_messages").insert({ message_id: messageId, case_id: caseId });
      await supabase.from("messages").update({ case_id: caseId }).eq("id", messageId);
    },
    async raiseAlert(input) {
      const { data: alert } = await supabase
        .from("alerts")
        .upsert(
          {
            org_id: input.orgId,
            kind: input.kind,
            severity: input.severity,
            title: input.title,
            body: input.body,
            dedupe_key: input.dedupeKey,
            message_id: input.messageId,
            case_id: input.caseId,
            status: "open",
          },
          { onConflict: "org_id,dedupe_key", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();
      if (!alert) return;
      const { data: members } = await supabase.from("memberships").select("user_id, role").eq("org_id", input.orgId).eq("status", "active").in("role", ["administrador", "supervisor"]);
      if (members?.length) {
        await supabase.from("notifications").insert(
          members.map((member) => ({
            org_id: input.orgId,
            alert_id: alert.id,
            user_id: member.user_id,
            channel: "in_app",
            title: input.title,
            body: input.body,
            href: input.caseId ? `/casos/${input.caseId}` : `/bandeja/${input.messageId}`,
          })),
        );
      }
    },
    async recordClassification(messageId, decision) {
      const { data: message } = await supabase.from("messages").select("org_id").eq("id", messageId).single();
      if (!message) throw new Error("El mensaje no existe.");
      await supabase.from("classification_results").insert({
        message_id: messageId,
        org_id: message.org_id,
        category_id: decision.primaryCategoryId,
        is_primary: true,
        score: decision.scores.find((item) => item.categoryId === decision.primaryCategoryId)?.score ?? 0,
        conflict: decision.conflict,
        needs_review: decision.needsHumanReview,
        explanation: decision.explanation,
        detail: decision,
        engine_version: decision.engineVersion,
        source: "automatic",
      });
      const labels = [
        ...(decision.primaryCategoryId ? [{ message_id: messageId, category_id: decision.primaryCategoryId, kind: "primary" }] : []),
        ...decision.secondaryCategoryIds.map((categoryId) => ({ message_id: messageId, category_id: categoryId, kind: "secondary" })),
      ];
      if (labels.length) await supabase.from("message_labels").upsert(labels);
    },
    async recordAutomation(input) {
      const { error } = await supabase.from("automation_runs").insert({
        org_id: input.orgId,
        rule_id: input.ruleId,
        rule_version: input.version,
        event_key: input.eventKey,
        status: input.blocked.length ? "partial" : "planned",
        result: { actions: input.actions, blocked: input.blocked },
      });
      return !error;
    },
    async audit(input) {
      await supabase.from("audit_events").insert({
        org_id: input.orgId,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        after_data: input.after,
      });
    },
    async pickAssignee(input) {
      const { data: access } = await supabase.from("mailbox_access").select("user_id").eq("mailbox_id", input.mailboxId).eq("can_read", true);
      const allowed = new Set((access || []).map((item) => item.user_id as string));
      const { data: people } = await supabase.from("user_availability").select("user_id, capacity, status").eq("org_id", input.orgId).eq("status", "available");
      const candidates = (people || []).filter((item) => allowed.has(item.user_id));
      if (!candidates.length) return null;
      const { data: openCases } = await supabase.from("cases").select("assignee_id").eq("org_id", input.orgId).not("status", "in", "(cerrado)");
      const load = new Map<string, number>();
      for (const row of openCases || []) {
        if (row.assignee_id) load.set(row.assignee_id, (load.get(row.assignee_id) || 0) + 1);
      }
      const ranked = candidates
        .filter((item) => (load.get(item.user_id) || 0) < item.capacity)
        .sort((a, b) => (load.get(a.user_id) || 0) - (load.get(b.user_id) || 0) || a.user_id.localeCompare(b.user_id));
      return ranked[0]?.user_id ?? null;
    },
  };
}

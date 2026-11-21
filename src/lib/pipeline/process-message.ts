import { classifyMessage, type CategoryDefinition, type ClassifiableMessage, type ClassificationDecision } from "@/lib/classification/engine";
import { planAutomations, type AutomationRule, type PlannedRun } from "@/lib/automations/engine";
import { assessDeadlines, type Holiday } from "@/lib/sla/deadlines";

export type InboundMessage = ClassifiableMessage & {
  orgId: string;
  provider: "microsoft" | "google";
  providerMessageId: string;
  providerThreadId: string | null;
  internetMessageId: string | null;
  fromName: string | null;
  receivedAt: string;
  bodyHtml: string;
  hasAttachments: boolean;
  rawParticipants: { kind: "from" | "to" | "cc" | "bcc"; address: string; name: string | null }[];
};

export type StoredMessage = {
  id: string;
  caseId: string | null;
  classificationLocked: boolean;
  inserted: boolean;
};

export type ProcessRepository = {
  findMessage(mailboxId: string, providerMessageId: string): Promise<StoredMessage | null>;
  insertMessage(input: InboundMessage & { decision: ClassificationDecision; due: ReturnType<typeof assessDeadlines> }): Promise<StoredMessage>;
  createCase(input: {
    orgId: string;
    mailboxId: string;
    messageId: string;
    subject: string;
    categoryId: string | null;
    priority: string;
    receivedAt: string;
    due: ReturnType<typeof assessDeadlines>;
    sensitiveLegal: boolean;
    assigneeId: string | null;
    teamId: string | null;
  }): Promise<{ id: string; publicCode: string }>;
  linkMessageToCase(messageId: string, caseId: string): Promise<void>;
  raiseAlert(input: { orgId: string; dedupeKey: string; kind: string; severity: string; title: string; body: string; messageId: string; caseId: string | null }): Promise<void>;
  recordClassification(messageId: string, decision: ClassificationDecision): Promise<void>;
  recordAutomation(input: { orgId: string; ruleId: string; version: number; eventKey: string; actions: PlannedRun["actions"]; blocked: PlannedRun["blockedSensitive"] }): Promise<boolean>;
  audit(input: { orgId: string; action: string; resourceType: string; resourceId: string; after: unknown }): Promise<void>;
  pickAssignee(input: { orgId: string; teamId: string | null; mailboxId: string }): Promise<string | null>;
};

export type ProcessResult = {
  duplicate: boolean;
  messageId: string;
  caseId: string | null;
  decision: ClassificationDecision;
};

export async function processInboundMessage(
  repo: ProcessRepository,
  input: InboundMessage,
  options: {
    categories: CategoryDefinition[];
    rules: AutomationRule[];
    sensitiveAuthorizedRuleIds: string[];
    holidays: Holiday[];
    timeZone: string;
    createCaseOnInbound: boolean;
  },
): Promise<ProcessResult> {
  const existing = await repo.findMessage(input.mailboxId, input.providerMessageId);
  if (existing) {
    return {
      duplicate: true,
      messageId: existing.id,
      caseId: existing.caseId,
      decision: {
        engineVersion: "existing",
        primaryCategoryId: null,
        primaryCategoryName: null,
        secondaryCategoryIds: [],
        priority: null,
        sensitiveLegal: false,
        needsHumanReview: false,
        conflict: false,
        unclassified: false,
        explanation: "El mensaje ya estaba registrado. No se creó otro caso ni se reenvió.",
        scores: [],
      },
    };
  }

  const decision = classifyMessage(input, options.categories);
  const due = assessDeadlines({
    receivedAt: new Date(input.receivedAt),
    timeZone: options.timeZone,
    holidays: options.holidays,
    internalResponseHours: null,
    confirmedLegalDueAt: null,
    businessDayMode: true,
  });

  const stored = await repo.insertMessage({ ...input, decision, due });
  await repo.recordClassification(stored.id, decision);
  await repo.audit({
    orgId: input.orgId,
    action: decision.unclassified ? "classification.unclassified" : "classification.automatic",
    resourceType: "message",
    resourceId: stored.id,
    after: { decision },
  });

  let caseId: string | null = null;
  const shouldCase = options.createCaseOnInbound || decision.sensitiveLegal || decision.priority === "critica";
  let assigneeId: string | null = null;
  if (shouldCase) {
    assigneeId = await repo.pickAssignee({ orgId: input.orgId, teamId: null, mailboxId: input.mailboxId });
    const created = await repo.createCase({
      orgId: input.orgId,
      mailboxId: input.mailboxId,
      messageId: stored.id,
      subject: input.subject,
      categoryId: decision.primaryCategoryId,
      priority: decision.priority ?? "normal",
      receivedAt: input.receivedAt,
      due,
      sensitiveLegal: decision.sensitiveLegal,
      assigneeId,
      teamId: null,
    });
    caseId = created.id;
    await repo.linkMessageToCase(stored.id, created.id);
  }

  if (decision.sensitiveLegal || decision.priority === "critica") {
    await repo.raiseAlert({
      orgId: input.orgId,
      dedupeKey: `critical:${stored.id}`,
      kind: decision.sensitiveLegal ? "posible_tutela" : "correo_critico",
      severity: "critica",
      title: decision.sensitiveLegal ? "Posible comunicación jurídica sensible" : "Comunicación crítica",
      body: decision.explanation,
      messageId: stored.id,
      caseId,
    });
  }
  if (caseId && !assigneeId) {
    await repo.raiseAlert({
      orgId: input.orgId,
      dedupeKey: `unassigned:${caseId}`,
      kind: "sin_responsable",
      severity: decision.priority === "critica" || decision.sensitiveLegal ? "critica" : "alta",
      title: "Caso sin responsable",
      body: "El caso permanece sin responsable autorizado.",
      messageId: stored.id,
      caseId,
    });
  }

  const plans = planAutomations({
    rules: options.rules,
    trigger: "message.received",
    context: {
      categoryId: decision.primaryCategoryId,
      priority: decision.priority,
      mailboxId: input.mailboxId,
      sender: input.sender,
      hasAttachments: input.hasAttachments,
      unclassified: decision.unclassified,
      sensitiveLegal: decision.sensitiveLegal,
    },
    sensitiveAuthorizedRuleIds: options.sensitiveAuthorizedRuleIds,
  });

  for (const plan of plans) {
    await repo.recordAutomation({
      orgId: input.orgId,
      ruleId: plan.ruleId,
      version: plan.version,
      eventKey: `${plan.ruleId}:${input.mailboxId}:${input.providerMessageId}`,
      actions: plan.actions,
      blocked: plan.blockedSensitive,
    });
  }

  return { duplicate: false, messageId: stored.id, caseId, decision };
}

/** La reclasificación no pisa decisiones manuales ni vencimientos confirmados. */
export function shouldPreserveManual(input: { classificationLocked: boolean; overrideManual: boolean }): boolean {
  return input.classificationLocked && !input.overrideManual;
}

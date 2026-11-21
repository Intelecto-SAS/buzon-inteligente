import assert from "node:assert/strict";
import test from "node:test";
import { processInboundMessage, shouldPreserveManual, type ProcessRepository } from "../src/lib/pipeline/process-message.ts";
import { buildRootFromExpressions, type CategoryDefinition } from "../src/lib/classification/engine.ts";
import { addBusinessDays, assessDeadlines } from "../src/lib/sla/deadlines.ts";
import { planAutomations } from "../src/lib/automations/engine.ts";
import { canTransition, canViewModule } from "../src/lib/security/permissions.ts";
import { sanitizeEmailHtml } from "../src/lib/security/html.ts";
import { renderTemplate } from "../src/lib/templates/render.ts";
import { readOAuthState, createOAuthState } from "../src/lib/mail/oauth-state.ts";

test("día hábil salta fin de semana en America/Bogota", () => {
  const friday = new Date("2026-03-06T15:00:00.000Z");
  const next = addBusinessDays(friday, 1, "America/Bogota", []);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", weekday: "short" }).format(next);
  assert.equal(weekday, "Mon");
});

test("no inventa plazo legal", () => {
  const due = assessDeadlines({
    receivedAt: new Date("2026-03-02T15:00:00.000Z"),
    timeZone: "America/Bogota",
    holidays: [{ day: "2026-03-23" }],
    internalResponseHours: 24,
    confirmedLegalDueAt: null,
    businessDayMode: true,
  });
  assert.equal(due.legalDueAt, null);
  assert.equal(due.legalStatus, "pending_validation");
  assert.ok(due.internalDueAt);
});

test("ingesta duplicada no crea otro caso", async () => {
  const store = new Map<string, { id: string; caseId: string | null }>();
  let cases = 0;
  const repo: ProcessRepository = {
    async findMessage(mailboxId, providerMessageId) {
      const found = store.get(`${mailboxId}:${providerMessageId}`);
      return found ? { ...found, classificationLocked: false, inserted: false } : null;
    },
    async insertMessage(input) {
      const row = { id: "m1", caseId: null };
      store.set(`${input.mailboxId}:${input.providerMessageId}`, row);
      return { ...row, classificationLocked: false, inserted: true };
    },
    async createCase() {
      cases += 1;
      return { id: "c1", publicCode: "COM-2026-000001" };
    },
    async linkMessageToCase() {},
    async raiseAlert() {},
    async recordClassification() {},
    async recordAutomation() {
      return true;
    },
    async audit() {},
    async pickAssignee() {
      return null;
    },
  };
  const category: CategoryDefinition = {
    id: "t",
    name: "Tutelas",
    active: true,
    priorityOrder: 1,
    defaultPriority: "critica",
    sensitiveLegal: true,
    minScore: 1,
    mailboxIds: null,
    root: buildRootFromExpressions([{ id: "e", text: "tutela", field: "subject", matchMode: "word", polarity: "include", caseSensitive: false, normalize: true, weight: 2, active: true }]),
  };
  const input = {
    orgId: "o",
    mailboxId: "b",
    provider: "microsoft" as const,
    providerMessageId: "graph-1",
    providerThreadId: null,
    internetMessageId: null,
    fromName: null,
    receivedAt: new Date().toISOString(),
    subject: "Tutela",
    body: "contenido",
    bodyHtml: "<p>contenido</p>",
    sender: "a@b.co",
    recipients: "",
    attachmentNames: [],
    attachmentText: "",
    headers: "",
    hasAttachments: false,
    rawParticipants: [],
  };
  const first = await processInboundMessage(repo, input, { categories: [category], rules: [], sensitiveAuthorizedRuleIds: [], holidays: [], timeZone: "America/Bogota", createCaseOnInbound: true });
  const second = await processInboundMessage(repo, input, { categories: [category], rules: [], sensitiveAuthorizedRuleIds: [], holidays: [], timeZone: "America/Bogota", createCaseOnInbound: true });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(cases, 1);
});

test("conserva clasificación manual", () => {
  assert.equal(shouldPreserveManual({ classificationLocked: true, overrideManual: false }), true);
  assert.equal(shouldPreserveManual({ classificationLocked: true, overrideManual: true }), false);
});

test("auditor no cierra ni ve buzones", () => {
  assert.equal(canTransition("respondido", "cerrado", "auditor"), false);
  assert.equal(canViewModule("auditor", "buzones"), false);
  assert.equal(canViewModule("usuario", "auditoria"), false);
  assert.equal(canTransition("respondido", "cerrado", "supervisor"), true);
});

test("acción sensible no se planifica sin autorización", () => {
  const plans = planAutomations({
    rules: [{
      id: "r",
      name: "Envío",
      active: true,
      priority: 1,
      version: 1,
      definition: {
        trigger: "message.received",
        stopOnMatch: true,
        root: { op: "and", conditions: [{ field: "priority", op: "eq", value: "critica" }], groups: [] },
        actions: [{ type: "send_authorized_reply", params: {} }, { type: "raise_alert", params: {} }],
      },
    }],
    trigger: "message.received",
    context: { priority: "critica" },
    sensitiveAuthorizedRuleIds: [],
  });
  assert.equal(plans[0].actions.some((item) => item.type === "send_authorized_reply"), false);
  assert.equal(plans[0].blockedSensitive.length, 1);
  assert.equal(plans[0].actions[0].type, "raise_alert");
});

test("sanitiza html de correo", () => {
  const clean = sanitizeEmailHtml('<p>Hola</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>');
  assert.equal(clean.includes("script"), false);
  assert.equal(clean.includes("javascript:"), false);
});

test("rechaza variables de plantilla no permitidas", () => {
  const rendered = renderTemplate("{{codigo_caso}} {{secreto}}", { codigo_caso: "COM-1" });
  assert.deepEqual(rendered.unknown, ["secreto"]);
  assert.equal(rendered.text.includes("COM-1"), true);
});

test("estado oauth firmado", () => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = "test-key";
  const state = createOAuthState({ orgId: "o" });
  assert.equal(readOAuthState(state)?.orgId, "o");
  assert.equal(readOAuthState(`${state}x`), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildRootFromExpressions, classifyMessage, type CategoryDefinition, type Expression } from "../src/lib/classification/engine.ts";
import { normalizeText } from "../src/lib/classification/normalize.ts";

function category(partial: Partial<CategoryDefinition> & { expressions: Expression[] }): CategoryDefinition {
  return {
    id: partial.id || "cat",
    name: partial.name || "Categoría",
    active: partial.active ?? true,
    priorityOrder: partial.priorityOrder ?? 10,
    defaultPriority: partial.defaultPriority || "normal",
    sensitiveLegal: partial.sensitiveLegal ?? false,
    minScore: partial.minScore ?? 1,
    mailboxIds: partial.mailboxIds ?? null,
    root: buildRootFromExpressions(partial.expressions, "or"),
  };
}

const message = {
  subject: "ACCIÓN DE TUTELA",
  body: "Se remite acción de tutela y se menciona factura de servicios.",
  sender: "juzgado@example.gov.co",
  recipients: "archivo@entidad.gov.co",
  attachmentNames: ["auto.pdf"],
  attachmentText: "",
  headers: "",
  mailboxId: "box",
};

test("normaliza tildes y mayúsculas", () => {
  assert.equal(normalizeText("ACCIÓN DE TUTELA"), "accion de tutela");
});

test("encuentra frase con tildes en asunto", () => {
  const decision = classifyMessage(message, [
    category({
      id: "tutela",
      name: "Tutelas",
      sensitiveLegal: true,
      defaultPriority: "critica",
      expressions: [{ id: "e1", text: "accion de tutela", field: "subject", matchMode: "phrase", polarity: "include", caseSensitive: false, normalize: true, weight: 2, active: true }],
    }),
  ]);
  assert.equal(decision.primaryCategoryId, "tutela");
  assert.equal(decision.unclassified, false);
  assert.match(decision.explanation, /Tutelas/);
});

test("una mención incidental no gana si hay exclusión", () => {
  const decision = classifyMessage(
    { ...message, subject: "Revista", body: "La revista cita la palabra tutela en un artículo." },
    [
      category({
        id: "tutela",
        name: "Tutelas",
        expressions: [
          { id: "e1", text: "tutela", field: "body", matchMode: "word", polarity: "include", caseSensitive: false, normalize: true, weight: 1, active: true },
          { id: "e2", text: "revista", field: "body", matchMode: "word", polarity: "exclude", caseSensitive: false, normalize: true, weight: 1, active: true },
        ],
      }),
    ],
  );
  assert.equal(decision.unclassified, true);
});

test("desempata por orden y no al azar", () => {
  const shared = { ...message, subject: "tutela y factura", body: "tutela factura" };
  const decision = classifyMessage(shared, [
    category({ id: "b", name: "Facturación", priorityOrder: 20, expressions: [{ id: "f", text: "factura", field: "body", matchMode: "word", polarity: "include", caseSensitive: false, normalize: true, weight: 5, active: true }] }),
    category({ id: "a", name: "Tutelas", priorityOrder: 1, expressions: [{ id: "t", text: "tutela", field: "subject", matchMode: "word", polarity: "include", caseSensitive: false, normalize: true, weight: 1, active: true }] }),
  ]);
  assert.equal(decision.primaryCategoryId, "a");
  assert.deepEqual(decision.secondaryCategoryIds, ["b"]);
});

test("sin coincidencia queda sin clasificar", () => {
  const decision = classifyMessage({ ...message, subject: "Hola", body: "Buen día" }, [
    category({ expressions: [{ id: "e", text: "tutela", field: "subject", matchMode: "word", polarity: "include", caseSensitive: false, normalize: true, weight: 1, active: true }] }),
  ]);
  assert.equal(decision.unclassified, true);
  assert.equal(decision.needsHumanReview, true);
});

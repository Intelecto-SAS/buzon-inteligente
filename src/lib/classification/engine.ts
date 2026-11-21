import { prepareText } from "./normalize";

export const ENGINE_VERSION = "1.0.0";

export type MatchField =
  | "subject"
  | "body"
  | "sender"
  | "recipients"
  | "domain"
  | "attachment_names"
  | "attachment_text"
  | "headers";

export type MatchMode = "partial" | "exact" | "word" | "phrase";
export type Polarity = "include" | "exclude";
export type GroupOperator = "and" | "or";

export type Expression = {
  id: string;
  text: string;
  field: MatchField;
  matchMode: MatchMode;
  polarity: Polarity;
  caseSensitive: boolean;
  normalize: boolean;
  weight: number;
  active: boolean;
};

export type ConditionGroup = {
  id: string;
  operator: GroupOperator;
  expressions: Expression[];
  groups: ConditionGroup[];
};

export type CategoryDefinition = {
  id: string;
  name: string;
  active: boolean;
  /** Menor número = mayor prioridad de desempate. */
  priorityOrder: number;
  defaultPriority: "critica" | "alta" | "normal" | "baja";
  sensitiveLegal: boolean;
  minScore: number;
  root: ConditionGroup;
  mailboxIds: string[] | null;
};

export type ClassifiableMessage = {
  subject: string;
  body: string;
  sender: string;
  recipients: string;
  attachmentNames: string[];
  attachmentText: string;
  headers: string;
  mailboxId: string;
};

export type ExpressionHit = {
  expressionId: string;
  text: string;
  field: MatchField;
  polarity: Polarity;
  weight: number;
};

export type CategoryScore = {
  categoryId: string;
  categoryName: string;
  score: number;
  matched: boolean;
  hits: ExpressionHit[];
  defaultPriority: CategoryDefinition["defaultPriority"];
  sensitiveLegal: boolean;
  priorityOrder: number;
};

export type ClassificationDecision = {
  engineVersion: string;
  primaryCategoryId: string | null;
  primaryCategoryName: string | null;
  secondaryCategoryIds: string[];
  priority: "critica" | "alta" | "normal" | "baja" | null;
  sensitiveLegal: boolean;
  needsHumanReview: boolean;
  conflict: boolean;
  unclassified: boolean;
  explanation: string;
  scores: CategoryScore[];
};

function fieldValue(message: ClassifiableMessage, field: MatchField): string {
  switch (field) {
    case "subject":
      return message.subject;
    case "body":
      return message.body;
    case "sender":
      return message.sender;
    case "recipients":
      return message.recipients;
    case "domain": {
      const match = message.sender.match(/@([^>\s]+)/);
      return match?.[1] ?? "";
    }
    case "attachment_names":
      return message.attachmentNames.join(" ");
    case "attachment_text":
      return message.attachmentText;
    case "headers":
      return message.headers;
    default:
      return "";
  }
}

export function expressionMatches(expression: Expression, message: ClassifiableMessage): boolean {
  if (!expression.active || expression.text.trim() === "") return false;
  const haystack = prepareText(fieldValue(message, expression.field), expression);
  const needle = prepareText(expression.text, expression);
  if (!needle || !haystack) return false;

  switch (expression.matchMode) {
    case "exact":
      return haystack === needle;
    case "partial":
      return haystack.includes(needle);
    case "phrase":
      return haystack.includes(needle);
    case "word": {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "u").test(haystack);
    }
    default:
      return false;
  }
}

type GroupEval = { passed: boolean; score: number; hits: ExpressionHit[] };

function evaluateGroup(group: ConditionGroup, message: ClassifiableMessage): GroupEval {
  const includeExpressions = group.expressions.filter((item) => item.active && item.polarity === "include");
  const excludeExpressions = group.expressions.filter((item) => item.active && item.polarity === "exclude");
  const childEvals = group.groups.map((child) => evaluateGroup(child, message));

  const veto = excludeExpressions.some((item) => expressionMatches(item, message));
  if (veto) {
    const hits = excludeExpressions
      .filter((item) => expressionMatches(item, message))
      .map((item) => ({
        expressionId: item.id,
        text: item.text,
        field: item.field,
        polarity: item.polarity,
        weight: item.weight,
      }));
    return { passed: false, score: 0, hits };
  }

  const includeHits: ExpressionHit[] = [];
  const includeResults = includeExpressions.map((item) => {
    const matched = expressionMatches(item, message);
    if (matched) {
      includeHits.push({
        expressionId: item.id,
        text: item.text,
        field: item.field,
        polarity: item.polarity,
        weight: item.weight,
      });
    }
    return matched;
  });

  const parts = [...includeResults, ...childEvals.map((child) => child.passed)];
  const passed =
    parts.length === 0
      ? false
      : group.operator === "and"
        ? parts.every(Boolean)
        : parts.some(Boolean);

  const score =
    includeHits.reduce((total, hit) => total + hit.weight, 0) +
    childEvals.reduce((total, child) => total + (child.passed ? child.score : 0), 0);

  const hits = [
    ...includeHits,
    ...childEvals.flatMap((child) => child.hits),
  ];

  if (!passed) return { passed: false, score: 0, hits };
  return { passed: true, score, hits };
}

function compareScores(left: CategoryScore, right: CategoryScore): number {
  if (left.priorityOrder !== right.priorityOrder) return left.priorityOrder - right.priorityOrder;
  if (left.score !== right.score) return right.score - left.score;
  return left.categoryId.localeCompare(right.categoryId);
}

export function classifyMessage(
  message: ClassifiableMessage,
  categories: CategoryDefinition[],
): ClassificationDecision {
  const scores: CategoryScore[] = [];

  for (const category of categories) {
    if (!category.active) continue;
    if (category.mailboxIds && category.mailboxIds.length > 0 && !category.mailboxIds.includes(message.mailboxId)) {
      continue;
    }
    const evaluation = evaluateGroup(category.root, message);
    const matched = evaluation.passed && evaluation.score >= category.minScore;
    scores.push({
      categoryId: category.id,
      categoryName: category.name,
      score: matched ? evaluation.score : 0,
      matched,
      hits: evaluation.hits,
      defaultPriority: category.defaultPriority,
      sensitiveLegal: category.sensitiveLegal,
      priorityOrder: category.priorityOrder,
    });
  }

  const winners = scores.filter((item) => item.matched).sort(compareScores);

  if (winners.length === 0) {
    return {
      engineVersion: ENGINE_VERSION,
      primaryCategoryId: null,
      primaryCategoryName: null,
      secondaryCategoryIds: [],
      priority: null,
      sensitiveLegal: false,
      needsHumanReview: true,
      conflict: false,
      unclassified: true,
      explanation: "Ninguna regla activa alcanzó el puntaje mínimo. La comunicación queda sin clasificar.",
      scores,
    };
  }

  const primary = winners[0];
  const tied = winners.filter(
    (item) => item.priorityOrder === primary.priorityOrder && item.score === primary.score && item.categoryId !== primary.categoryId,
  );
  const conflict = tied.length > 0;
  const sensitive = winners.some((item) => item.sensitiveLegal);

  const hitSummary = primary.hits
    .filter((hit) => hit.polarity === "include")
    .map((hit) => `«${hit.text}» en ${hit.field} (peso ${hit.weight})`)
    .join("; ");

  const explanation = conflict
    ? `Conflicto determinista resuelto por orden de prioridad y puntaje. Categoría principal: ${primary.categoryName}. Coincidencias: ${hitSummary || "grupo combinado"}.`
    : `Categoría principal ${primary.categoryName} por ${hitSummary || "condiciones combinadas"}.`;

  return {
    engineVersion: ENGINE_VERSION,
    primaryCategoryId: primary.categoryId,
    primaryCategoryName: primary.categoryName,
    secondaryCategoryIds: winners.slice(1).map((item) => item.categoryId),
    priority: primary.defaultPriority,
    sensitiveLegal: sensitive,
    needsHumanReview: conflict || (winners.length > 1 && sensitive),
    conflict,
    unclassified: false,
    explanation,
    scores,
  };
}

export function buildRootFromExpressions(expressions: Expression[], operator: GroupOperator = "or"): ConditionGroup {
  return {
    id: "root",
    operator,
    expressions,
    groups: [],
  };
}

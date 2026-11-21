export type ConditionOperator = "eq" | "neq" | "contains" | "not_contains" | "in" | "gt" | "lt" | "exists" | "not_exists";

export type AutoCondition = {
  field: string;
  op: ConditionOperator;
  value?: string | number | boolean | string[];
};

export type AutoGroup = {
  op: "and" | "or";
  conditions: AutoCondition[];
  groups: AutoGroup[];
};

export type AutoActionType =
  | "classify"
  | "label"
  | "set_priority"
  | "assign_user"
  | "assign_team"
  | "assign_least_loaded"
  | "create_case"
  | "raise_alert"
  | "notify"
  | "create_draft"
  | "send_authorized_reply"
  | "forward"
  | "request_approval"
  | "escalate"
  | "audit"
  | "external_integration";

export type AutoAction = {
  type: AutoActionType;
  params: Record<string, string>;
};

export type AutomationRule = {
  id: string;
  name: string;
  active: boolean;
  priority: number;
  version: number;
  definition: {
    trigger: string;
    root: AutoGroup;
    actions: AutoAction[];
    stopOnMatch: boolean;
  };
};

export type AutomationContext = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE_ACTIONS = new Set<AutoActionType>(["send_authorized_reply", "forward", "external_integration"]);

export function isSensitiveAction(type: AutoActionType): boolean {
  return SENSITIVE_ACTIONS.has(type);
}

function compare(actual: unknown, condition: AutoCondition): boolean {
  const value = condition.value;
  switch (condition.op) {
    case "exists":
      return actual !== null && actual !== undefined && actual !== "";
    case "not_exists":
      return actual === null || actual === undefined || actual === "";
    case "eq":
      return String(actual ?? "") === String(value ?? "");
    case "neq":
      return String(actual ?? "") !== String(value ?? "");
    case "contains":
      return String(actual ?? "").toLowerCase().includes(String(value ?? "").toLowerCase());
    case "not_contains":
      return !String(actual ?? "").toLowerCase().includes(String(value ?? "").toLowerCase());
    case "in":
      return Array.isArray(value) && value.map(String).includes(String(actual ?? ""));
    case "gt":
      return Number(actual) > Number(value);
    case "lt":
      return Number(actual) < Number(value);
    default:
      return false;
  }
}

export function evaluateGroup(group: AutoGroup, context: AutomationContext): boolean {
  const conditionResults = group.conditions.map((condition) => compare(context[condition.field], condition));
  const groupResults = group.groups.map((child) => evaluateGroup(child, context));
  const parts = [...conditionResults, ...groupResults];
  if (parts.length === 0) return false;
  return group.op === "and" ? parts.every(Boolean) : parts.some(Boolean);
}

export type PlannedRun = {
  ruleId: string;
  ruleName: string;
  version: number;
  actions: AutoAction[];
  blockedSensitive: AutoAction[];
};

export function planAutomations(input: {
  rules: AutomationRule[];
  trigger: string;
  context: AutomationContext;
  /** Las acciones sensibles solo se planifican si la regla fue autorizada expresamente. */
  sensitiveAuthorizedRuleIds: string[];
}): PlannedRun[] {
  const ordered = [...input.rules].filter((rule) => rule.active).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const plans: PlannedRun[] = [];

  for (const rule of ordered) {
    if (rule.definition.trigger !== input.trigger && rule.definition.trigger !== "any") continue;
    if (!evaluateGroup(rule.definition.root, input.context)) continue;
    const allowed = input.sensitiveAuthorizedRuleIds.includes(rule.id);
    const actions: AutoAction[] = [];
    const blockedSensitive: AutoAction[] = [];
    for (const action of rule.definition.actions) {
      if (isSensitiveAction(action.type) && !allowed) blockedSensitive.push(action);
      else actions.push(action);
    }
    plans.push({
      ruleId: rule.id,
      ruleName: rule.name,
      version: rule.version,
      actions,
      blockedSensitive,
    });
    if (rule.definition.stopOnMatch) break;
  }

  return plans;
}

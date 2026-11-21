export const ROLES = ["administrador", "supervisor", "usuario", "auditor"] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = [
  "dashboard",
  "bandeja",
  "casos",
  "alertas",
  "automatizaciones",
  "categorias",
  "plantillas",
  "reportes",
  "auditoria",
  "usuarios",
  "buzones",
  "configuracion",
] as const;
export type ModuleKey = (typeof MODULES)[number];

const ACCESS: Record<Role, { view: ModuleKey[]; mutate: ModuleKey[] }> = {
  administrador: {
    view: [...MODULES],
    mutate: [...MODULES],
  },
  supervisor: {
    view: ["dashboard", "bandeja", "casos", "alertas", "automatizaciones", "categorias", "plantillas", "reportes", "usuarios"],
    mutate: ["bandeja", "casos", "alertas", "plantillas"],
  },
  usuario: {
    view: ["dashboard", "bandeja", "casos", "alertas", "plantillas"],
    mutate: ["bandeja", "casos"],
  },
  auditor: {
    view: ["dashboard", "bandeja", "casos", "alertas", "reportes", "auditoria", "categorias", "automatizaciones"],
    mutate: [],
  },
};

export function canViewModule(role: Role, module: ModuleKey): boolean {
  return ACCESS[role]?.view.includes(module) ?? false;
}

export function canMutateModule(role: Role, module: ModuleKey): boolean {
  return ACCESS[role]?.mutate.includes(module) ?? false;
}

export function canDowngradeCritical(role: Role): boolean {
  return role === "administrador" || role === "supervisor";
}

export function canSendExternal(role: Role): boolean {
  return role === "administrador" || role === "supervisor" || role === "usuario";
}

export function canApprove(role: Role): boolean {
  return role === "administrador" || role === "supervisor";
}

export function canManageConfiguration(role: Role): boolean {
  return role === "administrador";
}

export function canReadAudit(role: Role): boolean {
  return role === "administrador" || role === "auditor";
}

export const CASE_STATUSES = [
  "recibido",
  "pendiente_clasificacion",
  "sin_asignar",
  "asignado",
  "en_gestion",
  "pendiente_informacion",
  "pendiente_aprobacion",
  "respondido",
  "cerrado",
  "reabierto",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  recibido: ["pendiente_clasificacion", "sin_asignar", "asignado"],
  pendiente_clasificacion: ["sin_asignar", "asignado", "en_gestion"],
  sin_asignar: ["asignado", "pendiente_clasificacion"],
  asignado: ["en_gestion", "sin_asignar", "pendiente_informacion", "pendiente_aprobacion"],
  en_gestion: ["pendiente_informacion", "pendiente_aprobacion", "respondido", "asignado"],
  pendiente_informacion: ["en_gestion", "pendiente_aprobacion", "respondido"],
  pendiente_aprobacion: ["en_gestion", "respondido"],
  respondido: ["cerrado", "en_gestion", "reabierto"],
  cerrado: ["reabierto"],
  reabierto: ["en_gestion", "asignado", "pendiente_aprobacion"],
};

export function canTransition(from: CaseStatus, to: CaseStatus, role: Role): boolean {
  if (role === "auditor") return false;
  if (to === "cerrado" && role === "usuario") return false;
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: CaseStatus, to: CaseStatus, role: Role): void {
  if (!canTransition(from, to, role)) {
    throw new Error(`Transición no permitida de ${from} a ${to}.`);
  }
}

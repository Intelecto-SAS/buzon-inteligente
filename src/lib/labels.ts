const LABELS: Record<string, string> = {
  recibo: "Recibido",
  recibido: "Recibido",
  pendiente_clasificacion: "Pendiente de clasificación",
  sin_asignar: "Sin asignar",
  asignado: "Asignado",
  en_gestion: "En gestión",
  pendiente_informacion: "Pendiente de información",
  pendiente_aprobacion: "Pendiente de aprobación",
  respondido: "Respondido",
  cerrado: "Cerrado",
  reabierto: "Reabierto",
  critica: "Crítica",
  alta: "Alta",
  normal: "Normal",
  baja: "Baja",
  administrador: "Administrador",
  supervisor: "Supervisor",
  usuario: "Usuario",
  auditor: "Auditor",
  active: "Activo",
  invited: "Invitado",
  disabled: "Inactivo",
  open: "Abierta",
  acknowledged: "Confirmada",
  resolved: "Resuelta",
  connected: "Conectado",
  syncing: "Sincronizando",
  error: "Error",
  paused: "En pausa",
  authorization_required: "Pendiente de autorización",
  disconnected: "Desconectado",
  vencimiento: "Vencimiento",
  tutela: "Tutela",
  sin_responsable: "Sin responsable",
  approved: "Aprobado",
  rejected: "Rechazado",
  pending: "Pendiente",
  draft: "Borrador",
  microsoft: "Microsoft 365",
  gmail: "Gmail",
  google: "Google",
};

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  if (LABELS[value]) return LABELS[value];
  const words = value.split("_").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(" ");
}

export const TASK_STATUSES = [
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

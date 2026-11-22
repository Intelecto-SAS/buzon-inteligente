/** Registro operativo inicial del buzón jurídico. Se usa cuando no hay Supabase. */

export const ORG = "0b1e0a10-1111-4111-8111-000000000001";
export const MAILBOX = "0b1e0a10-2222-4111-8111-000000000001";
export const LAURA = "0b1e0a10-3333-4111-8111-000000000001";
export const CARLOS = "0b1e0a10-3333-4111-8111-000000000002";
export const DIANA = "0b1e0a10-3333-4111-8111-000000000003";
export const ANDRES = "0b1e0a10-3333-4111-8111-000000000004";
export const CAMILA = "0b1e0a10-3333-4111-8111-000000000005";
export const JULIAN = "0b1e0a10-3333-4111-8111-000000000006";

const CAT = {
  tutelas: "0b1e0a10-4444-4111-8111-000000000001",
  peticion: "0b1e0a10-4444-4111-8111-000000000002",
  judicial: "0b1e0a10-4444-4111-8111-000000000003",
  facturacion: "0b1e0a10-4444-4111-8111-000000000004",
  contratacion: "0b1e0a10-4444-4111-8111-000000000005",
};

const TEAM = "0b1e0a10-5555-4111-8111-000000000001";
const CAL = "0b1e0a10-6666-4111-8111-000000000001";
const RULE = "0b1e0a10-7777-4111-8111-000000000001";
const TEMPLATE = "0b1e0a10-8888-4111-8111-000000000001";

type Row = Record<string, unknown>;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function hoursAhead(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

type Mail = {
  subject: string;
  from: string;
  name: string;
  body: string;
  category: string | null;
  priority: "critica" | "alta" | "normal" | "baja" | null;
  explanation: string;
  sensitive?: boolean;
  assignee?: string | null;
  status?: string;
  due?: string | null;
  dueStatus?: string;
  internalHours?: number;
  attachments?: string[];
  unread?: boolean;
  source?: "automatic" | "manual";
  locked?: boolean;
  hoursAgo: number;
  needsReply?: boolean;
};

const MAILS: Mail[] = [
  { hoursAgo: 2, unread: true, subject: "Acción de tutela — radicado 2026-00184 — Juzgado 12 Civil del Circuito de Bogotá", from: "j12ccbt@cendoj.ramajudicial.gov.co", name: "Juzgado 12 Civil del Circuito", category: CAT.tutelas, priority: "critica", sensitive: true, assignee: LAURA, status: "asignado", dueStatus: "pending_validation", explanation: "Categoría principal Tutelas por «acción de tutela» en asunto (peso 3) y «juzgado» en remitente (peso 1). Prioridad crítica por la política de la categoría. El plazo de 10 días citado en el cuerpo queda pendiente de validación humana.", body: "Remite acción de tutela promovida por Inversiones del Sur Ltda. contra la Superintendencia. Concede el término de diez (10) días para el informe. Se anexan la demanda y el auto admisorio.", attachments: ["Demanda-tutela.pdf", "Auto-admisorio.pdf"] },
  { hoursAgo: 5, unread: true, subject: "Incidente de desacato — tutela 110013103012202500184", from: "despacho12@cendoj.ramajudicial.gov.co", name: "Despacho 12", category: CAT.tutelas, priority: "critica", sensitive: true, assignee: LAURA, status: "en_gestion", dueStatus: "confirmed", due: hoursAhead(20), explanation: "Coincidencia de «incidente de desacato» en asunto (peso 4). Se abrió tarea, se asignó a Laura Méndez por menor carga del equipo jurídico y se notificó a la supervisión.", body: "El despacho requiere informar el cumplimiento de la orden impartida en la tutela de la referencia, so pena de continuar el incidente de desacato." },
  { hoursAgo: 9, subject: "Fallo de tutela de segunda instancia — confirmación", from: "tribunalsuperior.civil@cendoj.ramajudicial.gov.co", name: "Tribunal Superior de Bogotá", category: CAT.tutelas, priority: "critica", sensitive: true, assignee: DIANA, status: "en_gestion", dueStatus: "pending_validation", explanation: "«Fallo de tutela» en asunto (peso 3). Etiqueta secundaria no aplicada. Revisión humana sugerida por tratarse de decisión de instancia.", body: "Se notifica el fallo que confirma la decisión de primera instancia. Se adjunta providencia.", attachments: ["Fallo-segunda-instancia.pdf"] },
  { hoursAgo: 26, subject: "Auto admisorio y vinculación de la Superintendencia", from: "j04admin@cendoj.ramajudicial.gov.co", name: "Juzgado 4 Administrativo", category: CAT.tutelas, priority: "critica", sensitive: true, assignee: CARLOS, status: "asignado", dueStatus: "pending_validation", explanation: "«Auto admisorio» en asunto (peso 2) y «tutela» en el cuerpo (peso 2). El motor no fijó vencimiento legal: el texto no trae una fecha inequívoca.", body: "Por auto de la fecha se admite la tutela y se vincula a la entidad para que rinda informe sobre los hechos de la demanda." },
  { hoursAgo: 30, subject: "Tutela contra acto de inspección — sociedad Andina del Pacífico", from: "apoderado@restrepoabogados.com", name: "Carlos Eduardo Restrepo", category: CAT.tutelas, priority: "critica", sensitive: true, assignee: LAURA, status: "pendiente_aprobacion", dueStatus: "confirmed", due: hoursAhead(48), explanation: "Frase «tutela» como palabra completa en asunto (peso 2), dominio de apoderado. La respuesta de fondo quedó en aprobación; el acuse no afirma admisión.", body: "Presento acción de tutela por la presunta mora en resolver la solicitud de levantamiento de medida de vigilancia." },
  { hoursAgo: 50, subject: "Impugnación de tutela — expediente 2025-00991", from: "secretaria02@cendoj.ramajudicial.gov.co", name: "Secretaría Juzgado 02", category: CAT.tutelas, priority: "alta", sensitive: true, assignee: ANDRES, status: "en_gestion", dueStatus: "pending_validation", explanation: "«Impugnación» no es expresión propia; coincidió «tutela» en asunto (peso 2). Prioridad alta, no crítica, porque la categoría de segunda instancia no marcó desacato.", body: "Se corre traslado de la impugnación presentada por la sociedad vinculada." },
  { hoursAgo: 70, subject: "Solicitud de copias del trámite de tutela", from: "ciudadano@gmail.com", name: "Marta Lucía Peña", category: CAT.tutelas, priority: "normal", assignee: CAMILA, status: "respondido", dueStatus: "none", needsReply: false, explanation: "«Tutela» en asunto con peso 1, por debajo del umbral de política sensible estricta al no haber juzgado ni auto. Quedó en prioridad normal.", body: "Solicito copia del informe rendido por la entidad en la tutela en la que figuro como tercero." },
  { hoursAgo: 96, subject: "Revista de jurisprudencia: la tutela como mecanismo", from: "boletin@editorialjuridica.com", name: "Editorial Jurídica", category: null, priority: null, assignee: null, status: "pendiente_clasificacion", dueStatus: "pending_validation", explanation: "La expresión «tutela» coincidió en el cuerpo, pero la exclusión «revista» vetó el grupo de Tutelas. Ninguna otra categoría alcanzó el puntaje mínimo.", body: "La revista cita la palabra tutela en un artículo académico sobre acciones constitucionales. No es una comunicación del despacho." },
  { hoursAgo: 6, unread: true, subject: "Derecho de petición — acceso al expediente de vigilancia", from: "peticiones@inversionesandinas.com", name: "Inversiones Andinas del Pacífico S.A.S.", category: CAT.peticion, priority: "alta", assignee: CARLOS, status: "asignado", dueStatus: "confirmed", due: hoursAhead(72), explanation: "«Derecho de petición» en asunto (peso 3). Plazo interno de primera atención 24 horas. El término legal de 15 días hábiles fue confirmado por el responsable.", body: "En ejercicio del derecho de petición solicito copia de las actuaciones del trámite de vigilancia de la sociedad." },
  { hoursAgo: 14, subject: "Petición de información sobre estado de un trámite", from: "contacto@logistica-pacifico.com", name: "Logística Integral Pacífico S.A.", category: CAT.peticion, priority: "alta", assignee: CAMILA, status: "en_gestion", dueStatus: "pending_validation", explanation: "«Petición de información» en asunto (peso 2). No se confirmó fecha límite legal.", body: "Solicito se informe el estado de la autorización de reforma estatutaria radicada el 12 de marzo." },
  { hoursAgo: 22, unread: true, subject: "Derecho de petición — silencio administrativo", from: "quejas@personeriabogota.gov.co", name: "Personería de Bogotá", category: CAT.peticion, priority: "alta", assignee: DIANA, status: "asignado", dueStatus: "confirmed", due: hoursAgo(5), explanation: "Coincidencia en asunto. El plazo confirmado ya venció: el seguimiento generó alerta de vencimiento y escaló a la supervisión.", body: "La Personería traslada la queja de un ciudadano por falta de respuesta a una petición anterior." },
  { hoursAgo: 40, subject: "Petición de documentos societarios", from: "accionista@cafeterosquindio.com", name: "Inversiones Cafeteras del Quindío Ltda.", category: CAT.peticion, priority: "normal", assignee: ANDRES, status: "pendiente_informacion", dueStatus: "pending_validation", explanation: "«Petición» como frase en asunto (peso 1) y «documentos» no aportó categoría distinta. Prioridad normal de la categoría.", body: "Requiero el certificado de existencia y representación y el último estado financiero depositado." },
  { hoursAgo: 60, subject: "Ampliación de derecho de petición 2026-044", from: "notificaciones@agrovalle.com", name: "Agroindustria del Valle S.A.", category: CAT.peticion, priority: "alta", assignee: CARLOS, status: "en_gestion", dueStatus: "pending_validation", explanation: "«Derecho de petición» en asunto. Se vinculó a la tarea ya abierta del mismo hilo, sin crear un expediente nuevo.", body: "Complemento la petición con el balance de prueba y el acta de asamblea." },
  { hoursAgo: 80, subject: "Petición de un particular sobre multas", from: "juan.perez@hotmail.com", name: "Juan Pérez", category: CAT.peticion, priority: "normal", assignee: null, status: "sin_asignar", dueStatus: "pending_validation", explanation: "La categoría coincidió. La distribución por menor carga no encontró cupo libre con permiso sobre el buzón para este tipo de asunto y dejó la tarea sin responsable. Se registró alerta.", body: "Solicito información sobre una multa que aparece a nombre de mi sociedad." },
  { hoursAgo: 110, subject: "Respuesta a petición — constancia de envío", from: "archivo@supersociedades.gov.co", name: "Archivo institucional", category: CAT.peticion, priority: "baja", assignee: CAMILA, status: "cerrado", dueStatus: "none", needsReply: false, source: "manual", locked: true, explanation: "Clasificación manual de Camila Mendoza. La decisión automática previa era Facturación por la palabra «constancia». La corrección manual quedó bloqueada.", body: "Se archiva la constancia de la respuesta remitida al peticionario." },
  { hoursAgo: 8, unread: true, subject: "Notificación judicial — auto que libra mandamiento de pago", from: "notif.judicial@notificaciones.ramajudicial.gov.co", name: "Notificaciones judiciales", category: CAT.judicial, priority: "critica", sensitive: true, assignee: LAURA, status: "asignado", dueStatus: "pending_validation", explanation: "«Notificación judicial» en asunto (peso 3) y dominio ramajudicial.gov.co (peso 2). Política jurídica sensible. Plazo pendiente de validación.", body: "Se notifica el auto por medio del cual se libra mandamiento de pago dentro del proceso ejecutivo.", attachments: ["Auto-mandamiento.pdf"] },
  { hoursAgo: 18, subject: "Oficio de juzgado — requerimiento de informe", from: "j09civilmunicipal@cendoj.ramajudicial.gov.co", name: "Juzgado 9 Civil Municipal", category: CAT.judicial, priority: "alta", sensitive: true, assignee: ANDRES, status: "asignado", dueStatus: "confirmed", due: hoursAhead(36), explanation: "«Juzgado» en remitente y «requerimiento» en asunto. No coincidió tutela. Categoría Notificaciones judiciales por orden de prioridad.", body: "El juzgado requiere un informe sobre la representación legal de la sociedad demandada." },
  { hoursAgo: 33, subject: "Notificación por aviso — proceso ordinario", from: "avisos@centrodeserviciosjudiciales.gov.co", name: "Centro de Servicios Judiciales", category: CAT.judicial, priority: "alta", assignee: CARLOS, status: "en_gestion", dueStatus: "pending_validation", explanation: "«Notificación por aviso» en asunto (peso 2).", body: "Se fija aviso de la providencia que ordena el emplazamiento de la sociedad." },
  { hoursAgo: 47, unread: true, subject: "Traslado de demanda ejecutiva", from: "secretaria.civil@cendoj.ramajudicial.gov.co", name: "Secretaría civil", category: CAT.judicial, priority: "alta", assignee: DIANA, status: "asignado", dueStatus: "pending_validation", explanation: "Dominio judicial y «demanda» en asunto. Puntaje suficiente para Notificaciones judiciales. Sin palabras de tutela.", body: "Se corre traslado de la demanda ejecutiva por obligación de dar." },
  { hoursAgo: 75, subject: "Oficio 441 — práctica de prueba", from: "j02laboral@cendoj.ramajudicial.gov.co", name: "Juzgado 2 Laboral", category: CAT.judicial, priority: "normal", assignee: CAMILA, status: "pendiente_informacion", dueStatus: "pending_validation", explanation: "Remitente de juzgado (peso 2). Prioridad normal porque la categoría no marcó término perentorio en el texto.", body: "Sírvase remitir la certificación laboral solicitada como prueba." },
  { hoursAgo: 120, subject: "Constancia de notificación electrónica", from: "notif.judicial@notificaciones.ramajudicial.gov.co", name: "Notificaciones judiciales", category: CAT.judicial, priority: "baja", assignee: LAURA, status: "cerrado", dueStatus: "none", needsReply: false, explanation: "Coincidencia de notificación. El cierre lo registró la responsable al constatar que era solo acuse del canal judicial, no un requerimiento nuevo.", body: "El mensaje acredita la entrega de una notificación anterior. No contiene un término nuevo." },
  { hoursAgo: 11, subject: "Cuenta de cobro honorarios de revisoría — KPMG Advisory", from: "facturacion@kpmg.com.co", name: "KPMG Advisory S.A.S.", category: CAT.facturacion, priority: "normal", assignee: JULIAN, status: "en_gestion", dueStatus: "confirmed", due: hoursAhead(120), explanation: "«Cuenta de cobro» en asunto (peso 2) y dominio del revisor fiscal. No se elevó a crítico.", body: "Adjuntamos la cuenta de cobro correspondiente al periodo de revisoría fiscal del corte 2024.", attachments: ["Cuenta-cobro-2024.pdf"] },
  { hoursAgo: 28, subject: "Factura electrónica FE-88421", from: "dian.factura@facturatech.com", name: "Facturatech", category: CAT.facturacion, priority: "baja", assignee: null, status: "sin_asignar", dueStatus: "none", explanation: "«Factura electrónica» en asunto (peso 2). El asunto no tiene responsable fijo; la regla de menor carga dejó la tarea en el equipo financiero sin persona, dentro del cupo.", body: "Se expide factura electrónica por servicios de soporte documental." },
  { hoursAgo: 55, subject: "Estado de cuenta contratos de vigilancia", from: "cartera@securitas.com.co", name: "Cartera", category: CAT.facturacion, priority: "normal", assignee: CAMILA, status: "asignado", dueStatus: "pending_validation", explanation: "«Estado de cuenta» en asunto (peso 1). Categoría Facturación por encima de Contratación, que también coincidió en «contratos» y quedó como etiqueta secundaria.", body: "Remitimos el estado de cuenta de los servicios de vigilancia del edificio sede." },
  { hoursAgo: 90, subject: "Nota crédito por mayor valor facturado", from: "facturacion@kpmg.com.co", name: "KPMG Advisory S.A.S.", category: CAT.facturacion, priority: "baja", assignee: JULIAN, status: "respondido", dueStatus: "none", needsReply: false, explanation: "«Nota crédito» y «facturado». Prioridad baja.", body: "Se anexa nota crédito que ajusta la factura del periodo anterior." },
  { hoursAgo: 140, subject: "Cobro prejurídico de obligación", from: "cobranzas@serviciosandinos.com", name: "Cobranzas", category: CAT.facturacion, priority: "alta", assignee: DIANA, status: "en_gestion", dueStatus: "confirmed", due: hoursAhead(10), explanation: "«Cobro» en asunto (peso 2). La prioridad subió a alta por la regla de automatización de lenguaje de cobro, sin tratarlo como tutela.", body: "Nos permitimos requerir el pago de la obligación pendiente antes de iniciar gestiones adicionales." },
  { hoursAgo: 16, unread: true, subject: "Observaciones al contrato de interventoría 2026-014", from: "contratos@constructorandina.com", name: "Constructora Andina S.A.S.", category: CAT.contratacion, priority: "normal", assignee: ANDRES, status: "en_gestion", dueStatus: "pending_validation", explanation: "«Contrato» en asunto (peso 2). Sin términos judiciales.", body: "Enviamos observaciones a la minuta y a la póliza de cumplimiento.", attachments: ["Minuta-observaciones.docx"] },
  { hoursAgo: 36, subject: "Póliza de seriedad de la oferta", from: "emisiones@segurosbolivar.com", name: "Seguros Bolívar", category: CAT.contratacion, priority: "normal", assignee: CARLOS, status: "asignado", dueStatus: "pending_validation", explanation: "«Póliza» en asunto (peso 2), campo de contratación.", body: "Adjuntamos la póliza de seriedad expedida para el proceso de selección." },
  { hoursAgo: 64, subject: "Solicitud de adición contractual", from: "juridica@logistica-pacifico.com", name: "Logística Integral Pacífico S.A.", category: CAT.contratacion, priority: "alta", assignee: LAURA, status: "pendiente_aprobacion", dueStatus: "pending_validation", explanation: "«Adición contractual» (peso 2). El borrador de respuesta espera aprobación de la supervisión.", body: "Solicitamos adición de plazo y valor conforme al otrosí propuesto." },
  { hoursAgo: 100, subject: "Acta de liquidación bilateral", from: "archivo.contratos@supersociedades.gov.co", name: "Archivo de contratos", category: CAT.contratacion, priority: "baja", assignee: CAMILA, status: "cerrado", dueStatus: "none", needsReply: false, explanation: "«Liquidación» en asunto. Cierre con motivo de archivo, no por un acuse automático.", body: "Se remite el acta de liquidación firmada para el expediente contractual." },
  { hoursAgo: 4, unread: true, subject: "Invitación a foro de gobierno corporativo", from: "eventos@camaradecomercio.co", name: "Cámara de Comercio", category: null, priority: null, assignee: null, status: "pendiente_clasificacion", dueStatus: "pending_validation", explanation: "Ninguna regla activa alcanzó el puntaje mínimo. La comunicación queda sin clasificar para revisión humana.", body: "Los invitamos al foro del próximo mes. No corresponde a un trámite de la entidad." },
  { hoursAgo: 20, subject: "Actualización de datos de contacto del apoderado", from: "camila.mendoza@inversionesandinas.com", name: "Camila Mendoza", category: null, priority: "baja", assignee: CARLOS, status: "en_gestion", dueStatus: "none", source: "manual", locked: true, explanation: "Sin coincidencia automática. Carlos Restrepo la clasificó de forma manual como gestión interna y bloqueó una reclasificación posterior.", body: "Informo el nuevo correo para notificaciones de la sociedad." },
  { hoursAgo: 44, unread: true, subject: "Recordatorio de entrega de estados financieros", from: "sistemas@supersociedades.gov.co", name: "Sistema de reporte", category: null, priority: null, assignee: null, status: "recibido", dueStatus: "pending_validation", explanation: "El cuerpo menciona «estados financieros» sin una categoría de depósito configurada. Quedó sin clasificar.", body: "Recordatorio automático del canal de reporte. El motor no ejecutó respuesta automática porque la regla de acuse está inactiva para remitentes internos." },
  { hoursAgo: 3, unread: true, subject: "Orden judicial de medida cautelar sobre acciones", from: "j05civilcircuito@cendoj.ramajudicial.gov.co", name: "Juzgado 5 Civil del Circuito", category: CAT.judicial, priority: "critica", sensitive: true, assignee: null, status: "sin_asignar", dueStatus: "pending_validation", explanation: "«Orden judicial» en asunto (peso 3). Prioridad crítica. La asignación automática no completó porque los responsables con cupo estaban fuera de disponibilidad. Alerta al supervisor.", body: "Se decreta medida cautelar sobre las acciones de la sociedad y se requiere cumplimiento inmediato." },
];

export function buildWorkspace(): Record<string, Row[]> {
  const people = [
    [LAURA, "Laura Méndez", "laura.mendez@supersociedades.gov.co", "administrador"],
    [CARLOS, "Carlos Restrepo", "carlos.restrepo@supersociedades.gov.co", "usuario"],
    [DIANA, "Diana Torres", "diana.torres@supersociedades.gov.co", "supervisor"],
    [ANDRES, "Andrés Gómez", "andres.gomez@supersociedades.gov.co", "usuario"],
    [CAMILA, "Camila Mendoza", "camila.mendoza@supersociedades.gov.co", "usuario"],
    [JULIAN, "Julián Restrepo", "julian.restrepo@supersociedades.gov.co", "auditor"],
  ] as const;

  const profiles = people.map(([id, full_name, email]) => ({ id, full_name, email }));
  const memberships = people.map(([id, , , role]) => ({ id: `m-${id}`, org_id: ORG, user_id: id, role, status: "active" }));

  const categories = [
    { id: CAT.tutelas, org_id: ORG, name: "Tutelas", description: "Comunicaciones que el motor identifica como posibles acciones de tutela o incidentes relacionados.", active: true, sort_order: 1, default_priority: "critica", sensitive_legal: true, team_id: TEAM, internal_response_hours: 4, min_score: 2, root_operator: "or" },
    { id: CAT.peticion, org_id: ORG, name: "Derechos de petición", description: "Peticiones ciudadanas y requerimientos de información.", active: true, sort_order: 2, default_priority: "alta", sensitive_legal: false, team_id: TEAM, internal_response_hours: 24, min_score: 1, root_operator: "or" },
    { id: CAT.judicial, org_id: ORG, name: "Notificaciones judiciales", description: "Oficios, avisos y requerimientos de despachos, distintos de una tutela.", active: true, sort_order: 3, default_priority: "alta", sensitive_legal: true, team_id: TEAM, internal_response_hours: 8, min_score: 2, root_operator: "or" },
    { id: CAT.facturacion, org_id: ORG, name: "Facturación", description: "Cuentas de cobro, facturas y estados de cuenta.", active: true, sort_order: 4, default_priority: "normal", sensitive_legal: false, team_id: TEAM, internal_response_hours: 72, min_score: 1, root_operator: "or" },
    { id: CAT.contratacion, org_id: ORG, name: "Contratación", description: "Minutas, pólizas, adiciones y liquidaciones.", active: true, sort_order: 5, default_priority: "normal", sensitive_legal: false, team_id: TEAM, internal_response_hours: 48, min_score: 1, root_operator: "or" },
  ];

  const expressions: Row[] = [
    ["acción de tutela", "subject", "phrase", 3],
    ["incidente de desacato", "subject", "phrase", 4],
    ["fallo de tutela", "subject", "phrase", 3],
    ["auto admisorio", "body", "phrase", 2],
    ["tutela", "subject", "word", 2],
    ["juzgado", "sender", "partial", 1],
  ].map(([text, field, match_mode, weight], index) => ({ id: `ex-t-${index}`, category_id: CAT.tutelas, org_id: ORG, text, field, match_mode, polarity: "include", case_sensitive: false, normalize: true, weight, active: true, sort_order: index }));
  expressions.push({ id: "ex-t-x", category_id: CAT.tutelas, org_id: ORG, text: "revista", field: "body", match_mode: "word", polarity: "exclude", case_sensitive: false, normalize: true, weight: 1, active: true, sort_order: 20 });
  [["derecho de petición", "subject", "phrase", 3], ["petición de información", "subject", "phrase", 2], ["petición", "subject", "word", 1]].forEach(([text, field, match_mode, weight], index) => {
    expressions.push({ id: `ex-p-${index}`, category_id: CAT.peticion, org_id: ORG, text, field, match_mode, polarity: "include", case_sensitive: false, normalize: true, weight, active: true, sort_order: index });
  });
  [["notificación judicial", "subject", "phrase", 3], ["notificación por aviso", "subject", "phrase", 2], ["orden judicial", "subject", "phrase", 3], ["juzgado", "sender", "partial", 2]].forEach(([text, field, match_mode, weight], index) => {
    expressions.push({ id: `ex-j-${index}`, category_id: CAT.judicial, org_id: ORG, text, field, match_mode, polarity: "include", case_sensitive: false, normalize: true, weight, active: true, sort_order: index });
  });
  [["factura", "subject", "word", 2], ["cuenta de cobro", "subject", "phrase", 2], ["estado de cuenta", "subject", "phrase", 1], ["nota crédito", "subject", "phrase", 2], ["cobro", "subject", "word", 2]].forEach(([text, field, match_mode, weight], index) => {
    expressions.push({ id: `ex-f-${index}`, category_id: CAT.facturacion, org_id: ORG, text, field, match_mode, polarity: "include", case_sensitive: false, normalize: true, weight, active: true, sort_order: index });
  });
  [["contrato", "subject", "word", 2], ["póliza", "subject", "word", 2], ["adición contractual", "subject", "phrase", 2], ["liquidación", "subject", "word", 1]].forEach(([text, field, match_mode, weight], index) => {
    expressions.push({ id: `ex-c-${index}`, category_id: CAT.contratacion, org_id: ORG, text, field, match_mode, polarity: "include", case_sensitive: false, normalize: true, weight, active: true, sort_order: index });
  });

  const messages: Row[] = [];
  const cases: Row[] = [];
  const notes: Row[] = [];
  const transitions: Row[] = [];
  const assignments: Row[] = [];
  const participants: Row[] = [];
  const attachments: Row[] = [];
  const labels: Row[] = [];
  const results: Row[] = [];
  const alerts: Row[] = [];
  const notifications: Row[] = [];
  const reads: Row[] = [];
  const audits: Row[] = [];
  const drafts: Row[] = [];
  const analyses: Row[] = [];

  const corpus = [...MAILS, ...generatedVolume()];
  corpus.forEach((mail, index) => {
    const n = String(index + 1).padStart(6, "0");
    const messageId = `0b1e0a10-aaaa-4111-8111-${n}`;
    const caseId = `0b1e0a10-bbbb-4111-8111-${n}`;
    const received = hoursAgo(mail.hoursAgo);
    const status = mail.status || (mail.category ? "sin_asignar" : "pendiente_clasificacion");
    const code = `COM-2026-${n}`;
    messages.push({
      id: messageId,
      org_id: ORG,
      mailbox_id: MAILBOX,
      case_id: caseId,
      provider_message_id: `graph-${n}`,
      subject: mail.subject,
      snippet: mail.body.slice(0, 180),
      body_text: mail.body,
      body_html_sanitized: `<p>${mail.body}</p>`,
      from_address: mail.from,
      from_name: mail.name,
      received_at: received,
      ingested_at: received,
      has_attachments: Boolean(mail.attachments?.length),
      category_id: mail.category,
      priority: mail.priority,
      management_status: status,
      assignee_id: mail.assignee ?? null,
      classification_source: mail.source || "automatic",
      classification_locked: Boolean(mail.locked),
      classification_explanation: mail.explanation,
      due_at: mail.due ?? null,
      due_status: mail.dueStatus || "pending_validation",
      internal_due_at: hoursAgo(mail.hoursAgo - (mail.category === CAT.tutelas ? 4 : 24)),
      needs_reply: mail.needsReply !== false && status !== "cerrado" && status !== "respondido",
    });
    cases.push({
      id: caseId,
      org_id: ORG,
      public_code: code,
      mailbox_id: MAILBOX,
      category_id: mail.category,
      priority: mail.priority || "normal",
      status,
      assignee_id: mail.assignee ?? null,
      team_id: TEAM,
      subject: mail.subject,
      received_at: received,
      first_response_at: mail.hoursAgo > 24 && mail.assignee ? hoursAgo(mail.hoursAgo - 3) : null,
      due_at: mail.due ?? null,
      due_status: mail.dueStatus || "pending_validation",
      internal_due_at: hoursAgo(mail.hoursAgo - 4),
      sensitive_legal: Boolean(mail.sensitive),
      close_reason: status === "cerrado" ? "Archivo con constancia de gestión. No corresponde a un acuse automático." : null,
      closed_at: status === "cerrado" ? hoursAgo(1) : null,
    });
    transitions.push({ id: `tr-${n}`, case_id: caseId, org_id: ORG, from_status: null, to_status: mail.assignee ? "asignado" : status, actor_id: null, reason: "Apertura automática al recibir la comunicación.", created_at: received });
    if (mail.assignee) {
      assignments.push({ id: `as-${n}`, case_id: caseId, org_id: ORG, assignee_id: mail.assignee, team_id: TEAM, assigned_by: null, reason: "Distribución por menor cantidad de tareas activas con acceso al buzón.", created_at: received, ended_at: null });
      transitions.push({ id: `tr2-${n}`, case_id: caseId, org_id: ORG, from_status: "asignado", to_status: status, actor_id: mail.assignee, reason: "El responsable inició la gestión.", created_at: hoursAgo(Math.max(mail.hoursAgo - 1, 0.2)) });
    }
    participants.push({ id: `p-${n}`, message_id: messageId, kind: "from", address: mail.from, name: mail.name });
    participants.push({ id: `p2-${n}`, message_id: messageId, kind: "to", address: "legal@supersociedades.gov.co", name: "Buzón jurídico" });
    (mail.attachments || []).forEach((filename, fileIndex) => {
      attachments.push({ id: `att-${n}-${fileIndex}`, org_id: ORG, message_id: messageId, filename, content_type: "application/pdf", size_bytes: 180000 + fileIndex * 40000 });
    });
    if (mail.category) labels.push({ message_id: messageId, category_id: mail.category, kind: "primary" });
    if (mail.subject.includes("Estado de cuenta")) labels.push({ message_id: messageId, category_id: CAT.contratacion, kind: "secondary" });
    results.push({ id: `cl-${n}`, message_id: messageId, org_id: ORG, category_id: mail.category, is_primary: true, score: mail.category ? 3 : 0, conflict: false, needs_review: !mail.category, explanation: mail.explanation, detail: { explanation: mail.explanation }, engine_version: "1.0.0", source: mail.source || "automatic", created_at: received });
    analyses.push({ id: `ai-${n}`, message_id: messageId, org_id: ORG, model: null, available: false, result: { available: false, note: "La clasificación aplicada proviene de las reglas de la organización.", summary: null } });
    audits.push({ id: index + 1, org_id: ORG, actor_id: null, action: mail.source === "manual" ? "classification.manual" : "classification.automatic", resource_type: "message", resource_id: messageId, result: "ok", after_data: { explanation: mail.explanation }, created_at: received });
    if (!mail.unread) reads.push({ message_id: messageId, user_id: LAURA, read_at: hoursAgo(0.5) });
    if (mail.sensitive || mail.priority === "critica") {
      const alertId = `al-${n}`;
      alerts.push({ id: alertId, org_id: ORG, kind: mail.category === CAT.tutelas ? "posible_tutela" : "correo_critico", severity: "critica", case_id: caseId, message_id: messageId, mailbox_id: MAILBOX, title: mail.category === CAT.tutelas ? `Posible tutela ${code}` : `Comunicación crítica ${code}`, body: mail.explanation, dedupe_key: `critical:${messageId}`, status: mail.hoursAgo > 48 ? "acknowledged" : "open", created_at: received });
      notifications.push({ id: `nt-${n}`, org_id: ORG, alert_id: alertId, user_id: LAURA, channel: "in_app", title: `Seguimiento ${code}`, body: mail.explanation, href: `/casos/${caseId}`, read_at: mail.unread ? null : hoursAgo(0.4), created_at: received });
      notifications.push({ id: `nt2-${n}`, org_id: ORG, alert_id: alertId, user_id: DIANA, channel: "in_app", title: `Supervisión ${code}`, body: mail.explanation, href: `/casos/${caseId}`, read_at: null, created_at: received });
    }
    if (!mail.assignee && mail.priority === "critica") {
      alerts.push({ id: `al-u-${n}`, org_id: ORG, kind: "sin_responsable", severity: "critica", case_id: caseId, message_id: messageId, mailbox_id: MAILBOX, title: `${code} sigue sin responsable`, body: "Los funcionarios con acceso al buzón estaban por encima de su capacidad o fuera de disponibilidad.", dedupe_key: `unassigned:${caseId}`, status: "open", created_at: received });
    }
    if (mail.due && new Date(mail.due) < new Date()) {
      alerts.push({ id: `al-v-${n}`, org_id: ORG, kind: "vencimiento", severity: "critica", case_id: caseId, message_id: messageId, mailbox_id: MAILBOX, title: `Plazo vencido ${code}`, body: "El plazo confirmado ya transcurrió. La tarea sigue abierta.", dedupe_key: `overdue:${caseId}`, status: "open", created_at: hoursAgo(1) });
    }
    if (index === 0) {
      notes.push({ id: "note-1", case_id: caseId, org_id: ORG, author_id: LAURA, body: "Recibí el auto. El término de diez días está en el texto y queda pendiente de confirmación antes de fijarlo como vencimiento legal.", created_at: hoursAgo(1) });
      drafts.push({ id: "draft-1", org_id: ORG, case_id: caseId, message_id: messageId, subject: `Re: ${mail.subject}`, body: "Confirmamos la recepción en la Superintendencia de Sociedades. Este mensaje no implica admisión, radicación oficial ni decisión de fondo. Identificador interno: COM-2026-000001.", status: "pending_approval", author_id: LAURA, source: "automation", created_at: hoursAgo(1) });
    }
  });

  return {
    organizations: [{ id: ORG, name: "Superintendencia de Sociedades", timezone: "America/Bogota", retention_days: null }],
    profiles,
    memberships,
    teams: [{ id: TEAM, org_id: ORG, name: "Grupo jurídico" }],
    team_members: people.slice(0, 5).map(([user_id]) => ({ team_id: TEAM, user_id, org_id: ORG })),
    user_availability: people.map(([user_id]) => ({ org_id: ORG, user_id, status: user_id === JULIAN ? "away" : "available", capacity: 12 })),
    mailboxes: [{ id: MAILBOX, org_id: ORG, provider: "microsoft", kind: "shared", display_name: "Jurídico", email_address: "legal@supersociedades.gov.co", status: "connected", processing_enabled: true, last_sync_at: hoursAgo(0.2), last_error: null, external_user_id: "mailbox-juridico" }],
    mailbox_access: people.map(([user_id, , , role]) => ({ id: `acc-${user_id}`, org_id: ORG, mailbox_id: MAILBOX, user_id, can_read: role !== "auditor", can_reply: role === "administrador" || role === "usuario" || role === "supervisor", can_forward: role === "administrador" || role === "supervisor", can_manage: role === "administrador" })),
    mailbox_credentials: [],
    categories,
    category_expressions: expressions,
    messages,
    cases,
    case_notes: notes,
    case_transitions: transitions,
    case_assignments: assignments,
    message_participants: participants,
    attachments,
    message_labels: labels,
    classification_results: results,
    read_states: reads,
    alerts,
    notifications,
    audit_events: audits,
    drafts,
    approvals: [],
    ai_analyses: analyses,
    automation_rules: [{ id: RULE, org_id: ORG, name: "Tutela: tarea, prioridad crítica y alerta", description: "Cuando la categoría es Tutelas, abre una tarea, conserva la prioridad crítica y avisa al supervisor.", owner_id: LAURA, priority: 10, active: true, version: 3, sensitive_authorized: false, definition: { trigger: "message.received", stopOnMatch: true, root: { op: "and", conditions: [{ field: "categoryId", op: "eq", value: CAT.tutelas }], groups: [] }, actions: [{ type: "create_case", params: {} }, { type: "raise_alert", params: {} }] } }],
    automation_runs: [{ id: "run-1", org_id: ORG, rule_id: RULE, rule_version: 3, event_key: "run-tutela-1", status: "planned", result: { actions: ["create_case", "raise_alert"] }, created_at: hoursAgo(2) }],
    templates: [{ id: TEMPLATE, org_id: ORG, name: "Acuse de recepción", kind: "acuse", active: true, requires_approval: true }],
    template_versions: [{ id: "tv-1", template_id: TEMPLATE, version: 1, subject: "Re: {{asunto}}", body: "Recibimos su comunicación. Este mensaje confirma la recepción y no implica admisión ni decisión de fondo. Identificador: {{codigo_tarea}}.", created_by: LAURA }],
    calendars: [{ id: CAL, org_id: ORG, name: "Calendario principal", timezone: "America/Bogota", is_default: true }],
    holidays: [
      { id: "h1", calendar_id: CAL, day: "2026-12-08", name: "Inmaculada Concepción" },
      { id: "h2", calendar_id: CAL, day: "2026-12-25", name: "Navidad" },
    ],
    attention_policies: [
      { id: "pol-1", org_id: ORG, priority: "critica", first_response_hours: 4, reminder_hours: 1, escalate_after_hours: 4 },
      { id: "pol-2", org_id: ORG, priority: "alta", first_response_hours: 24, reminder_hours: 8, escalate_after_hours: 24 },
      { id: "pol-3", org_id: ORG, priority: "normal", first_response_hours: 72, reminder_hours: 24, escalate_after_hours: 72 },
      { id: "pol-4", org_id: ORG, priority: "baja", first_response_hours: 120, reminder_hours: 48, escalate_after_hours: 120 },
    ],
    connection_errors: [],
    technical_incidents: [],
    saved_views: [],
    invitations: [],
    external_integrations: [],
  };
}

export const LOCAL_USER = { id: LAURA, email: "laura.mendez@supersociedades.gov.co" };

function generatedVolume(): Mail[] {
  const staff = [LAURA, CARLOS, DIANA, ANDRES, CAMILA, null];
  const cities = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Cartagena"];
  const firms = ["Inversiones Andinas", "Logística Pacífico", "Constructora Andina", "Agroindustria del Valle", "Cafeteros del Quindío", "Tecnología Digital"];
  const patterns: Array<Pick<Mail, "category" | "priority" | "sensitive"> & { subject: (n: number) => string; from: string; name: string; body: string; explanation: string }> = [
    { category: CAT.tutelas, priority: "critica", sensitive: true, from: "jdo@cendoj.ramajudicial.gov.co", name: "Juzgado Civil del Circuito", subject: (n) => `Acción de tutela ${2026}-${String(1800 + n)} — ${cities[n % cities.length]}`, body: "Se admite acción de tutela y se corre traslado para informe. El término citado queda pendiente de confirmación.", explanation: "«Acción de tutela» en asunto (peso 3). Prioridad crítica y tarea asignada por menor carga." },
    { category: CAT.tutelas, priority: "critica", sensitive: true, from: "desacato@cendoj.ramajudicial.gov.co", name: "Secretaría de tutela", subject: (n) => `Incidente de desacato — expediente ${110010000 + n}`, body: "Requiere informar el cumplimiento de la orden, so pena de continuar el incidente.", explanation: "«Incidente de desacato» en asunto (peso 4). Alerta al responsable y a la supervisión." },
    { category: CAT.peticion, priority: "alta", from: "peticiones@ciudadano.gov.co", name: "Peticionario", subject: (n) => `Derecho de petición — ${firms[n % firms.length]} — radicado ${4000 + n}`, body: "Solicito información sobre el estado del trámite y copia de las actuaciones.", explanation: "«Derecho de petición» en asunto (peso 3). Plazo interno de 24 horas. El plazo legal no se fijó solo." },
    { category: CAT.judicial, priority: "alta", sensitive: true, from: "notif.judicial@notificaciones.ramajudicial.gov.co", name: "Notificaciones judiciales", subject: (n) => `Notificación judicial — oficio ${9000 + n} — ${cities[n % cities.length]}`, body: "Se notifica providencia y se requiere respuesta de la entidad vinculada.", explanation: "«Notificación judicial» en asunto (peso 3) y dominio judicial (peso 2)." },
    { category: CAT.facturacion, priority: "normal", from: "facturacion@proveedor.com.co", name: "Facturación proveedor", subject: (n) => `Factura electrónica FE-${88000 + n}`, body: "Se expide factura electrónica por servicios del periodo.", explanation: "«Factura electrónica» en asunto (peso 2). Prioridad normal de la categoría." },
    { category: CAT.contratacion, priority: "normal", from: "contratos@proveedor.com.co", name: "Gestión contractual", subject: (n) => `Observaciones al contrato ${2026}-${String(100 + n).padStart(3, "0")}`, body: "Se remiten observaciones a la minuta y a la póliza.", explanation: "«Contrato» en asunto (peso 2). Sin términos judiciales." },
    { category: null, priority: null, from: "boletin@camarabogota.org", name: "Cámara de Comercio", subject: (n) => `Invitación institucional ${n + 1}`, body: "Convocatoria a un evento. Ninguna regla de trámite alcanzó el puntaje mínimo.", explanation: "Ninguna regla activa alcanzó el puntaje mínimo. Quedó sin clasificar." },
  ];
  const statuses = ["asignado", "en_gestion", "pendiente_informacion", "pendiente_aprobacion", "respondido", "sin_asignar", "cerrado"];
  return Array.from({ length: 220 }, (_, index) => {
    const pattern = patterns[index % patterns.length];
    const assignee = pattern.category ? staff[index % staff.length] : null;
    const status = assignee ? statuses[index % 5] : pattern.category ? "sin_asignar" : "pendiente_clasificacion";
    const hours = 3 + index * 4;
    const overdue = index % 19 === 0 && pattern.priority === "alta";
    return {
      hoursAgo: hours,
      unread: index % 4 === 0,
      subject: pattern.subject(index),
      from: pattern.from.replace("@", `${index % 7}@`),
      name: `${pattern.name} ${cities[index % cities.length]}`,
      body: pattern.body,
      category: pattern.category,
      priority: pattern.priority,
      sensitive: pattern.sensitive,
      assignee,
      status,
      dueStatus: overdue ? "confirmed" : index % 6 === 0 ? "confirmed" : "pending_validation",
      due: overdue ? hoursAgo(6) : index % 6 === 0 ? hoursAhead(30 + (index % 40)) : null,
      attachments: index % 8 === 0 ? [`Anexo-${index + 1}.pdf`] : undefined,
      explanation: pattern.explanation,
      needsReply: status !== "cerrado" && status !== "respondido",
    };
  });
}

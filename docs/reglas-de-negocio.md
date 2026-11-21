# Reglas de negocio

## Correo y caso

El mensaje conserva los identificadores del proveedor. El caso es el expediente interno (`COM-AÑO-######`). Un caso puede reunir varios mensajes de la misma conversación ya vinculada. No se fusionan asuntos distintos por compartir remitente.

El acuse no cierra el caso ni afirma radicación, admisión o decisión de fondo.

## Clasificación

Las categorías y expresiones viven en la base. El motor `src/lib/classification/engine.ts` es determinista.

- Normalización opcional de tildes, espacios y mayúsculas.
- Modos: parcial, exacta, palabra completa y frase.
- Inclusión suma peso. Una exclusión que coincide veta el grupo.
- Los grupos se combinan con Y / O.
- La categoría principal es la de menor `sort_order`. Si empatan, gana el mayor puntaje y, si persiste el empate, el identificador ordenado.
- Si ninguna regla alcanza `min_score`, el mensaje queda sin clasificar y en revisión.
- Una categoría marcada como jurídica sensible eleva la prioridad configurada, abre alerta y exige aprobación para una respuesta de fondo.
- La palabra aislada no confirma la naturaleza jurídica: use frases, peso y exclusiones. La prueba de reglas no envía correos ni escribe casos.

La reclasificación histórica debe respetar `classification_locked`. `shouldPreserveManual` cubre esa regla. La ejecución masiva sobre mensajes ya guardados queda como operación explícita de administrador y no está automatizada al guardar una expresión.

## Plazos

Se distinguen la recepción del proveedor, el ingreso a la aplicación, el plazo interno de primera atención y el plazo legal confirmado. Sin confirmación humana, `due_status` permanece `pending_validation` y el vencimiento legal no se calcula. La zona inicial es `America/Bogota`. Los festivos solo cuentan si están en el calendario de la organización.

## Envío

Las variables de plantilla están en una lista cerrada. Una respuesta jurídica sensible nace en `pending_approval`. El envío al proveedor, cuando se incorpore el botón de despacho sobre un borrador aprobado, debe insertar antes `outbound_attempts` con clave de idempotencia. El estado `accepted` significa que el proveedor aceptó el mensaje, no que el destinatario lo leyó.

## Automatizaciones

Se evalúan en el servidor. Envío, reenvío e integración externa no se ejecutan si la regla no tiene `sensitive_authorized`. La simulación usa el mismo evaluador y no persiste efectos.

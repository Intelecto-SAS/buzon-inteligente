# Inngest

El procesamiento no depende de un temporizador en memoria de una función serverless.

Funciones registradas en `src/inngest/functions.ts` y servidas en `/api/inngest`:

- `process-provider-event`: lee el evento ya guardado, trae el mensaje por la API del proveedor, clasifica, abre caso y registra alertas. Reintenta. La clave única `(provider, external_id)` evita otro caso si la notificación se repite.
- `recover-mailboxes`: cada 15 minutos recorre buzones con procesamiento activo usando delta de Graph o historial de Gmail.
- `renew-subscriptions`: cada 6 horas renueva suscripciones próximas a vencer.
- `scan-deadlines`: cada 30 minutos abre una alerta de vencimiento solo si el plazo legal está confirmado. La clave `overdue:{caso}:{fecha}` evita duplicados.

En el panel de Inngest sincronice la aplicación con la URL de producción y copie `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY`.

En local puede usar `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`.

Sin esas claves, la recepción por webhook puede guardar el evento, pero el envío a Inngest falla y el trabajo periódico no corre. La pantalla de buzones lo indica.

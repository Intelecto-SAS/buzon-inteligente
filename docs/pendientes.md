# Pendientes externos y limitaciones

Estas piezas no se simulan en la interfaz.

- Proyecto Supabase, migraciones aplicadas y usuario inicial. Sin eso la aplicación muestra la lista de variables faltantes.
- Consentimiento de administrador en Entra ID y, para buzones compartidos, permiso de aplicación con Application Access Policy.
- Verificación de Google si el producto sale del modo de prueba. Publicación del tema Pub/Sub.
- Claves de Inngest en el entorno desplegado. Sin ellas no hay cron de recuperación ni de vencimientos.
- SMTP (`SMTP_HOST`, `SMTP_FROM`) para el canal de correo de alertas. Hoy la alerta interna se guarda en `notifications`. El envío SMTP no está cableado: no se afirma que un correo de alerta salió.
- Proveedor de IA (`AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL`). Si faltan, la clasificación por reglas sigue.
- Bucket privado y descarga de binarios de adjuntos. Se guarda nombre, tipo y tamaño cuando el proveedor los entrega en el mensaje.
- Envío desde la ficha del caso hacia Graph o Gmail después de la aprobación. El borrador, la aprobación y la tabla `outbound_attempts` existen; el botón que llama a `sendGraphMail` o `sendGmail` con la clave de idempotencia todavía no está en la ficha, para no mostrar un envío que la pantalla no ejecuta.
- Reclasificación masiva con vista previa sobre el histórico. La regla de no pisar decisiones manuales está cubierta por prueba unitaria.
- Texto extraído de PDF u Office. El campo de regla existe; el extractor no.
- GeDeSS, radicación, gestión documental, Teams y SharePoint. La configuración los nombra como no disponibles.
- Borrado por política de retención y exportación firmada de auditoría.
- Pruebas de carga frente a 1.500 correos diarios. Las consultas de bandeja están paginadas de 25 en 25; no hay una medición de producción.
- Pruebas de interfaz en navegador con sesión real. En este entorno no hay proyecto Supabase, así que no se recorrió un buzón conectado. `npm test` cubre clasificación, plazos, idempotencia de ingesta, permisos, plantillas, saneamiento y firma OAuth.

## Verificaciones de este repositorio

Ejecutadas en este entorno: `npm test` (14 pruebas), `npx tsc --noEmit` y `npx next build`. No hay proyecto Supabase en el entorno, así que no se recorrió un buzón real en el navegador.

# Google Cloud y Gmail

1. Cree un proyecto y active la API de Gmail.
2. Pantalla de consentimiento. Para uso externo Google exige verificación del alcance `gmail.modify`. Mientras la aplicación esté en prueba, solo entran los usuarios de prueba.
3. Credencial OAuth de tipo aplicación web. Redirect: `{APP_URL}/api/mailboxes/google/callback`.
4. Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
5. Cree un tema Pub/Sub y una suscripción push hacia `{APP_URL}/api/webhooks/google`. Conceda a `gmail-api-push@system.gserviceaccount.com` el rol de publicador del tema.
6. `GOOGLE_PUBSUB_TOPIC` tiene la forma `projects/ID/topics/NOMBRE`.
7. `GOOGLE_PUBSUB_AUDIENCE` es la URL exacta del webhook. Si está definida, el JWT de la petición se verifica contra los certificados de Google. Si no está definida, el endpoint rechaza la petición sin token, pero no puede confirmar la audiencia: no lo deje vacío en producción.
8. `users.watch` caduca en torno a siete días. El trabajo `renew-subscriptions` lo renueva. Si Gmail responde que el historial expiró, el buzón pasa a error y hace falta una sincronización completa; no se inventan mensajes.

# Supabase

1. Cree un proyecto.
2. Copie la URL y la clave `anon` a `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copie la clave `service_role` a `SUPABASE_SERVICE_ROLE_KEY`. Solo la usa el servidor: webhooks, Inngest y el alta inicial. No llega al navegador.
4. Ejecute las migraciones `0001_schema.sql` y `0002_rls.sql`.
5. El trigger `on_auth_user_created` crea la fila de `profiles`.
6. Active confirmación de correo si la política de la entidad lo exige.
7. Cree un bucket privado `adjuntos` cuando vaya a guardar binarios. La metadata del adjunto ya se registra; la descarga del binario queda pendiente de esa carga.
8. Genere `CREDENTIALS_ENCRYPTION_KEY` con `openssl rand -base64 32`. Los tokens OAuth se guardan cifrados con AES-256-GCM en `mailbox_credentials`. Las políticas impiden que el rol `authenticated` lea esa tabla.

La clave de servicio omite RLS. El código de interfaz usa la sesión del usuario, de modo que un buzón sin fila en `mailbox_access` no entrega mensajes aunque el rol sea administrador.

# Producción

1. Importe el repositorio en Vercel. El archivo `vercel.json` declara Next.js.
2. Defina todas las variables de `.env.example` en el entorno de producción. `APP_URL` es el origen HTTPS.
3. Aplique las migraciones en Supabase de producción antes del primer ingreso.
4. `BOOTSTRAP_ENABLED=true` únicamente mientras crea la primera organización. Después, `false`.
5. Registre las URLs de callback y de webhook con el dominio definitivo.
6. Sincronice Inngest contra `https://DOMINIO/api/inngest`.
7. Compruebe `GET /api/health`. Lista qué integración tiene variables, no si el proveedor aceptó la conexión.
8. Conecte un buzón de prueba, envíe un correo real y confirme que aparece una sola vez, con la explicación de clasificación.
9. Revise que `mailbox_credentials` no sea legible con la clave anónima.

HTTPS lo termina Vercel. Las cabeceras de `next.config.ts` añaden `nosniff`, `frame-ancestors` y denegación de marco.

No hay copia de seguridad dentro de la aplicación. Active las copias de Supabase (Point in Time Recovery según el plan) y documente el responsable de la restauración. La conservación de mensajes se puede limitar con `organizations.retention_days`; el borrado programado todavía no recorre los registros.

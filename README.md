# Buzón Inteligente

Plataforma de gestión de comunicaciones institucionales. El correo vive en el buzón conectado. El estado de gestión, la clasificación y la auditoría viven en PostgreSQL.

No hay correos, contadores ni categorías precargados. Si un módulo no tiene registros, la pantalla lo dice y ofrece el siguiente paso de configuración.

## Requisitos

- Node.js 22
- Proyecto Supabase (Auth, Postgres y Storage)
- Aplicación en Microsoft Entra ID y/o Google Cloud, si se van a conectar buzones
- Aplicación Inngest, para procesar con la aplicación cerrada

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
```

Aplique `supabase/migrations/0001_schema.sql` y `supabase/migrations/0002_rls.sql` en el SQL editor del proyecto, en ese orden.

En Authentication de Supabase desactive el alta pública si solo van a entrar personas invitadas. Para el primer administrador:

1. Cree el usuario desde la pantalla de acceso o desde el panel de Supabase.
2. Ponga `BOOTSTRAP_ENABLED=true` solo durante el alta.
3. Entre y cree la organización. Esa persona queda como administrador.
4. Vuelva a dejar `BOOTSTRAP_ENABLED=false`.

```bash
npm run dev
```

## Comprobaciones

```bash
npm test
npm run typecheck
npm run build
```

## Documentación

- [Supabase](docs/supabase.md)
- [Microsoft Entra ID](docs/entra-id.md)
- [Google Cloud](docs/google-cloud.md)
- [Inngest](docs/inngest.md)
- [Reglas de negocio](docs/reglas-de-negocio.md)
- [Permisos](docs/permisos.md)
- [Producción](docs/produccion.md)
- [Pendientes externos](docs/pendientes.md)

## Identidad visual

Los colores, la tipografía Nunito Sans y la densidad de las tablas siguen el sistema de la Superintendencia de Sociedades entregado con el diseño: burdeos `#962D46`, lienzo `#F8F9FB`, borde `#E4E4E7`. Las variables están en `src/app/globals.css`.

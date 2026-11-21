# Microsoft Entra ID y Graph

1. Registre una aplicación en Entra ID.
2. Tipo de cuenta: el directorio de la entidad, o multiinquilino si va a atender varias organizaciones. `MICROSOFT_TENANT_ID` puede quedar en `common` solo si ese es el caso.
3. Redirect URI web: `{APP_URL}/api/mailboxes/microsoft/callback`.
4. Permisos delegados mínimos de esta versión: `User.Read`, `Mail.Read`, `Mail.Send`, `offline_access`. Conceda consentimiento de administrador.
5. Cree un secreto de cliente. Guárdelo en `MICROSOFT_CLIENT_SECRET`. El identificador va en `MICROSOFT_CLIENT_ID`.
6. Genere `MICROSOFT_WEBHOOK_SECRET`. Se envía como `clientState` y la notificación se rechaza si no coincide.
7. La URL de notificación `{APP_URL}/api/webhooks/microsoft` debe ser HTTPS público. Graph exige responder el `validationToken` en texto plano; esa respuesta ya está implementada.
8. Los buzones compartidos con permisos de aplicación y políticas de acceso a la aplicación (Application Access Policy) no están en el flujo delegado actual. El conector personal usa `/me`. Documente el buzón compartido como pendiente hasta registrar el permiso de aplicación y limitar los buzones con `New-ApplicationAccessPolicy`.

La pantalla de buzones no marca la conexión como exitosa hasta que Graph responde `/me`.

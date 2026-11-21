# Permisos

Los cuatro roles son `administrador`, `supervisor`, `usuario` y `auditor`.

| Módulo | Administrador | Supervisor | Usuario | Auditor |
| --- | --- | --- | --- | --- |
| Dashboard | sí | sí | sí | sí |
| Bandeja | sí | sí | sí | consulta |
| Casos | sí | sí | sí | consulta |
| Alertas | sí | sí | sí | consulta |
| Automatizaciones | sí | consulta | no | consulta |
| Categorías | sí | consulta | no | consulta |
| Plantillas | sí | sí | consulta | no |
| Reportes | sí | sí | no | sí |
| Auditoría | sí | no | no | sí |
| Usuarios | sí | consulta | no | no |
| Buzones | sí | no | no | no |
| Configuración | sí | no | no | no |

Además del rol:

- La lectura de mensajes exige `mailbox_access.can_read`. El administrador no la recibe sola por ser administrador.
- Reenviar exige `can_forward`.
- Bajar una prioridad crítica exige administrador o supervisor y una justificación.
- El auditor no cambia estados ni envía.
- Cerrar un caso no está permitido al rol usuario.
- Las políticas RLS de `0002_rls.sql` repiten estos límites. La interfaz que oculta un módulo no es el control.

Las alertas de severidad crítica no se apagan desde preferencias personales: el insert de notificación a supervisores no consulta esa preferencia.

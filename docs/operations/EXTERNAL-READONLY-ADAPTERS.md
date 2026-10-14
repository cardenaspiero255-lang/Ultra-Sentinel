# Adaptadores Sentry y JARVIS — lectura acotada y privacidad

Este PR implementa funciones **ejecutables de solo lectura**, no un servicio desplegado ni un monitor 24/7. Ningún secret, DSN, token o dato privado se guarda en Git.

## Sentry — `adapters/sentry/sentry-readonly.cjs`

- API oficial: `GET https://sentry.io/api/0/organizations/{org}/issues/?project={numeric_project_id}&query=is%3Aunresolved&statsPeriod=24h&limit=25`.
- Token bearer **event:read** suministrado por un secret manager al proceso confiable; se requiere slug de organización y project ID autorizados.
- El adaptador devuelve **solamente**: ID de issue/proyecto, severidad, estado, contador y `lastSeen`. Excluye title, culpable, stacktrace, correo, audio, breadcrumbs, adjuntos, UID e información del dispositivo.
- Solicita 25 issues como máximo y marca `sampleOnly:true`, `completeIssueInventory:false`; esta muestra NO es un inventario exhaustivo. No paginar con URL proporcionada por datos externos.
- Respuesta HTTP anómala, JSON, tipo MIME, contenido o identidad del proyecto no verificables: **fail-closed**.
- Antes de QA real: definir proyecto/entorno, retención, consentimiento y tratamiento de datos; repetir con token revocable de lectura. No crear incidentes, alertas ni cambiar estados sin autorización específica.
- Documentación de API: https://docs.sentry.io/api/events/list-an-organizations-issues/ y https://docs.sentry.io/api/auth/.

## JARVIS — `adapters/jarvis/jarvis-readonly.cjs`

- Repositorio concreto verificado: `cardenaspiero255-lang/JARVIS`, GitHub repo ID **1349889592**, owner ID **322222186**.
- `GET /repos/cardenaspiero255-lang/JARVIS` para verificar repo, propietario, `main` y estado activo.
- `GET /repos/cardenaspiero255-lang/JARVIS/pulls?state=open&per_page=30&page=1` para snapshot de PR abiertos. En página llena, **INCOMPLETE**, no inventar cobertura total.
- Token con permiso de solo lectura, sin `contents:write`, sin `pull-requests:write`, sin ejecutar código ni recolectar conversaciones/audio.
- Salida: número PR, HEAD SHA y flag de borrador; no contenidos de PR, correo ni campos de usuario.

## Pruebas y gates

`npm run check` ejecuta regresiones que comprueban token, identidad fija de repo/proyecto, paginación, datos privados y restricciones de solo lectura.

**Estado operativo pendiente:** Sentry necesita el token real `event:read`, slug y project ID; JARVIS necesita una ejecución real de la consulta desde runner confiable; se requieren E2E con autorización y supervisión para un monitor en producción.

No desplegar, configurar secrets, activar scheduler ni modificar GameHub/JARVIS desde este PR. El pipeline 24/7 y notificaciones pertenece al bloque 5, con checkpoint/idempotencia/supervisor externo.

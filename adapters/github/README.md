# Adaptador GitHub

**Pendiente.** Usará GitHub App de instalación con permisos mínimos y scopes por repositorio para leer PR, diff, HEAD, comentarios, revisiones, checks, artefactos y estado de políticas.

Separar `read-only collector` (identidad sin escritura), `authorized repair writer` y `deployment identity`. Verificar payloads/webhooks, procedencia, TOCTOU, revisión del último intento CI y origen del SHA. Nunca ejecutar HEAD de PR en `pull_request_target` privilegiado. Preferir endpoints autenticados, límites de paginación, rate limiting y fail-closed.

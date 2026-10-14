# Supervisor Ultra Sentinel — contrato de vigilancia sin despliegue implícito

## Estado
`apps/watchdog/watchdog-state.cjs` evalúa cambios entre muestras confiables. `apps/watchdog/watchdog-run-once.cjs` ejecuta **una iteración** que consulta Sentry/JARVIS en lectura y persiste un checkpoint privado. **No es un demonio 24/7 desplegado, no envía notificaciones ni concede escritura GitHub.**

## Requisitos para una iteración

- Node.js 22+; equipo/servidor autorizado, secreto Sentry con permiso mínimo para consultar issues y token GitHub de solo lectura para JARVIS, inyectados desde secret manager, nunca en Git.
- `ULTRA_SENTINEL_WATCHDOG_STATE_FILE`: ruta absoluta del checkpoint en directorio privado (0700), volumen persistente y fuera del checkout Git.
- `ULTRA_SENTINEL_SENTRY_ORG` y `ULTRA_SENTINEL_SENTRY_PROJECT_ID`: organización y proyecto reales; no se asume ni inventa su identidad.
- `ULTRA_SENTINEL_SENTRY_TOKEN`, `ULTRA_SENTINEL_READONLY_GITHUB_TOKEN`: secretos revocables, fuera de logs/artifacts.
- Ejecución única: `node apps/watchdog/watchdog-run-once.cjs`.

El primer ciclo emite `BASELINE_INITIALIZED_NO_ALERT` para evitar notificaciones falsas. Las observaciones siguientes emiten eventos `NEW_SENTRY_ISSUE`, `JARVIS_PR_OPENED`, `JARVIS_PR_HEAD_CHANGED` o `JARVIS_PR_NO_LONGER_OPEN_IN_SNAPSHOT`. El último **NO significa necesariamente PR cerrado**: la API puede devolver una ventana de hasta 30 PR, sin garantía de exhaustividad.

## Persistencia y entrega de eventos

- Estado de almacenamiento JSON privado, con escritura temporal exclusiva, `fsync`, renombrado atómico y bloqueo exclusivo `.lock`. Fallos y archivos no confiables detienen el ciclo sin sobrescribir el checkpoint.
- Al detectar cambios se almacena una **outbox** de alertas. Un nuevo ciclo se bloquea con `PENDING_ALERT_DELIVERY_REQUIRED` hasta que un supervisor externo confirme que las entregó.
- El comando `node apps/watchdog/watchdog-outbox.cjs inspect` permite recuperar la outbox tras una caída usando el mismo `ULTRA_SENTINEL_WATCHDOG_STATE_FILE` (sin secretos). Tras una entrega **real confirmada por un sistema externo**, ejecutar `node apps/watchdog/watchdog-outbox.cjs ack <digest-hex>` con el digest obtenido del comando `inspect`. **No ejecutar `ack` sin comprobante externo de entrega.**
- La función `acknowledgeDelivery(filename,pendingDigest(alerts))` permite al sistema de entrega borrar la outbox **solamente tras confirmación externa**. El digest evita confirmar una tanda diferente, pero **no autentica al supervisor**: el host debe controlar permisos del proceso y el canal de reconocimiento. Nunca generar un ack automáticamente.
- Se requiere un receptor de alertas duradero, con reintentos, deduplicación por evento, confirmación autentificada y supervisión externa antes de afirmar entrega o disponibilidad 24/7. Si el proceso cae antes de emitir la salida JSON, un operador debe consultar el checkpoint y entregar la outbox, no borrarla.
- Locks huérfanos exigen intervención operacional explícita; no eliminar `.lock` sin comprobar que el anterior proceso terminó.

## Bloque 5 pendiente para producción

1. Elegir host con supervisor de procesos y volumen duradero, sin credenciales en workflows de PR.
2. Configurar alertas (correo/webhook/mensajería) en un gestor de secretos y un trabajador de outbox con entrega verificable.
3. Configurar scheduler, umbrales, backoff, límites de gasto, alertas de fallo del propio monitor y pruebas de reinicio/red/credenciales caducadas.
4. E2E con Sentry QA y JARVIS real, consentimiento, retención y certificación independiente de eventos antes de promocionar la monitorización.
5. No retirar automatizaciones anteriores de GameHub hasta validar compatibilidad y cutover reversible.

**CI verde valida solamente el algoritmo y la persistencia local, no la disponibilidad operativa.**

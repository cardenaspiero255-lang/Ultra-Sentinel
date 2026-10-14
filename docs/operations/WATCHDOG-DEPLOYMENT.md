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

## Implementación elegida: VPS Linux + systemd (cada cinco minutos)

Se elige un **VPS con almacenamiento persistente y systemd** en vez de GitHub Actions para el proceso de producción. Las ejecuciones programadas de Actions no son un proceso siempre activo, y la persistencia de estado y el canal privado de alertas requieren un host controlado. **Los archivos listos para instalar no significan que exista un servidor contratado o un despliegue funcionando.**

Archivos:
- `deploy/systemd/ultra-sentinel-watchdog.service`: usuario no privilegiado, sistema de archivos de solo lectura salvo `/var/lib/ultra-sentinel`, secretos externos y orden de tareas `entregar outbox → observar → entregar nuevas alertas`.
- `deploy/systemd/ultra-sentinel-watchdog.timer`: cada cinco minutos, con recuperación de ciclos tras reinicio.
- `deploy/systemd/watchdog.env.example`: nombres de parámetros **ficticios**; nunca copiar las cadenas de ejemplo como secretos reales.
- `apps/watchdog/watchdog-deliver.cjs`: emite lote minimizado a un webhook HTTPS configurado por el operador. Firma HMAC, identificador de idempotencia y `POST` sin redirecciones. Una respuesta HTTP 2xx **solo acredita aceptación HTTP**, no entrega humana. Un error conserva la outbox y el timer reintenta con la misma clave.

### Instalación que debe ejecutar un administrador del VPS

Antes de activar, desplegar **un commit auditado y fijado por SHA** de este repositorio en `/opt/ultra-sentinel`, con directorio/código inmutables para el usuario de ejecución, e instalar Node.js 22+ en `/usr/bin/node`. No ejecutar `git pull` automático ni scripts de PR.

```sh
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin ultra-sentinel
sudo install -d -o root -g root -m 0700 /etc/ultra-sentinel
sudo install -d -o ultra-sentinel -g ultra-sentinel -m 0700 /var/lib/ultra-sentinel
sudo install -o root -g root -m 0600 deploy/systemd/watchdog.env.example /etc/ultra-sentinel/watchdog.env
# Sustituir en el editor root TODOS los placeholders por valores reales autorizados.
sudo install -o root -g root -m 0644 deploy/systemd/ultra-sentinel-watchdog.service /etc/systemd/system/
sudo install -o root -g root -m 0644 deploy/systemd/ultra-sentinel-watchdog.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ultra-sentinel-watchdog.timer
```

**No activar el timer con los placeholders.** Antes del último comando, comprobar la ruta de `node`, las ACL sobre `/opt/ultra-sentinel`, las identidades de proyecto Sentry/JARVIS, el alcance del token GitHub (`metadata:read`, `pull_requests:read`) y el permiso Sentry `event:read` aplicable. La URL de webhook debe ser un dominio HTTPS controlado por el operador, sin credenciales en query ni enlaces a direcciones privadas. El receptor debe verificar `X-Ultra-Sentinel-Signature` con el secreto HMAC y deduplicar la cabecera `Idempotency-Key` por 24 horas o más. No permitir que un PR defina la URL o el secreto.

Prueba manual previa: `sudo systemctl start ultra-sentinel-watchdog.service`, seguido de `sudo systemctl status ultra-sentinel-watchdog.service`, `sudo journalctl -u ultra-sentinel-watchdog.service -n 100 --no-pager` y `sudo systemctl list-timers ultra-sentinel-watchdog.timer`. No mostrar el contenido de `watchdog.env` ni copiar tokens al chat.

**Prevención de caída silenciosa:** configurar un *monitor externo* que compruebe que la unidad ha ejecutado correctamente en los últimos 10–15 minutos y que el receptor de alertas sigue respondiendo. Ejecutar una campaña QA controlada: primer baseline, nuevo issue Sentry de prueba, PR JARVIS de prueba, pérdida de red, token vencido, reinicio del VPS, outbox pendiente, respuesta HTTP 5xx y entrega duplicada. Registrar evidencias antes de afirmar operación 24/7.

Para detener sin borrar estados: `sudo systemctl disable --now ultra-sentinel-watchdog.timer`. Retener respaldo cifrado y comprobar rollback de binario/servicio, no borrar `watchdog.json` ni su outbox salvo instrucción del propietario tras exportación verificable.

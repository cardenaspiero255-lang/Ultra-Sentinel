# SSS+ — auditoría externa de latidos GitHub Actions

## Propósito
Este módulo **no** certifica disponibilidad 24/7. Detecta evidencias insuficientes, atrasos y huecos entre ejecuciones reales del workflow `serverless-github-monitor.yml`. No permite ignorar `failure`, `skipped`, ejecuciones manuales o carreras contra otro SHA. Tampoco consulta GitHub por sí mismo ni necesita claves de escritura.

## Uso de solo lectura
Obtener el listado directamente desde GitHub con una identidad autorizada, fuera de un pull request no confiable:

```sh
gh api '/repos/cardenaspiero255-lang/Ultra-Sentinel/actions/runs?per_page=100' > /tmp/ultra-sentinel-runs.json
HEAD_SHA="$(gh api /repos/cardenaspiero255-lang/Ultra-Sentinel/commits/main --jq .sha)"
node scripts/audit-scheduled-heartbeat.cjs /tmp/ultra-sentinel-runs.json "$HEAD_SHA"
```

El comando devuelve JSON con esquema `ultra-sentinel-scheduled-heartbeat-audit/v1`; sale con código 2 ante evidencia insuficiente o irregular. No exportar tokens ni detalles Sentry. Para reproducibilidad se puede pasar una hora UTC como tercer argumento.

Compara exclusivamente ejecuciones `schedule`, del archivo workflow esperado y `main`, concluidas y con SHA hexadecimal. Exige tres muestras completadas en las últimas 24 horas; considera el SHA de la ejecución más reciente y rechaza duplicados/futuros y registra `latestAgeMinutes`, `maxGapMinutes` y `failedCount`. Un intervalo superior a 120 minutos es bloqueo de puntualidad. Un job rojo por cambio de PR se considera **ejecución observada pero no exitosa** hasta revisar el log; tampoco concede puntualidad verde.

## Limitaciones y acción correctiva
- La autenticidad del origen de los JSON de entrada debe verificarse aparte; `sourceAuthenticityVerified=false` siempre.
- Una ejecución exitosa del comando significa solo **puntualidad observada de una muestra**, no supervisión ininterrumpida ni prueba de cobertura completa de PR.
- Los jobs GitHub Actions no pueden detectar por sí mismos que dejaron de ejecutarse. Mantener observador **externo**, con notificación de ausencia de `schedule` después de dos horas, sin permisos de escritura.
- GitHub puede atrasar u omitir cron. Un incidente real exige investigación del workflow, logs, checkpoint y retención. No reinicializar silenciosamente el histórico.
- No habilitar autorreparación ni auto-merge mediante este informe.

El requisito de continuidad del [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50) sigue pendiente hasta acumular evidencia temporal suficiente y verificar la notificación externa.

## Observador independiente con outbox persistente

`apps/watchdog/heartbeat-monitor.cjs` es una iteración preparada para ejecutarse en un **host distinto de GitHub Actions**. Lee el SHA de `main`, consulta las ejecuciones programadas de las últimas 24 horas desde la API GitHub y vuelve a comprobar el SHA. Una respuesta incompleta, error de acceso o cambio de SHA produce `SCHEDULE_EVIDENCE_UNAVAILABLE`, no un estado saludable. El token necesita acceso de lectura al repositorio y a Actions. La consulta está limitada a 500 ejecuciones en ese periodo; si supera el límite, informa evidencia no disponible.

Ante un resultado distinto de `PUNCTUALITY_OBSERVED_NOT_24X7`, el observador guarda `SCHEDULE_HEARTBEAT` en el outbox privado antes de entregarlo. Un fallo de red o HTTP conserva el lote; el siguiente ciclo vuelve a enviarlo con la misma clave de idempotencia antes de consultar nuevas muestras. Cuando el estado se mantiene igual después de una aceptación HTTP, no repite la misma alerta; al recuperarse y volver a fallar, genera otra. La confirmación automática compara tanto el digest como la secuencia del lote: una respuesta tardía no puede borrar una incidencia posterior idéntica. El receptor debe autenticar HMAC, deduplicar `Idempotency-Key` y reenviar al destino del propietario. HTTP 2xx demuestra aceptación por el receptor, no lectura ni entrega al teléfono.

El observador usa `ULTRA_SENTINEL_HEARTBEAT_STATE_FILE` **distinto** del checkpoint Sentry/JARVIS o del checkpoint público de Actions. Requiere directorio 0700 y archivo persistente; el mecanismo de lock, escritura atómica y validación del outbox es compartido. Los resultados procedentes de GitHub y el mensaje entregado no incluyen el token. Si el propio host cae, el proceso no puede avisar de su propia caída: hace falta otra vigilancia independiente. Un cierre abrupto durante una escritura puede dejar un archivo `.lock` huérfano; el servicio se bloquea de forma segura. Solo un administrador debe retirarlo después de verificar que ningún proceso anterior sigue activo y que el checkpoint está íntegro; no se borra automáticamente.

Se incluyen `deploy/systemd/ultra-sentinel-heartbeat.service`, `ultra-sentinel-heartbeat.timer` y `heartbeat.env.example`, sin activación automática. En un host autorizado con Node 22+, instalar el código revisado en `/opt/ultra-sentinel` y configurar fuera de Git, en `/etc/ultra-sentinel/heartbeat.env` protegido por root: `ULTRA_SENTINEL_READONLY_GITHUB_TOKEN`, `ULTRA_SENTINEL_ALERT_WEBHOOK_URL`, `ULTRA_SENTINEL_ALERT_AUTH_TOKEN` y `ULTRA_SENTINEL_ALERT_SIGNING_SECRET`. El endpoint debe ser HTTPS controlado por el operador y sin secretos en la URL. **No activar el ejemplo con placeholders.**

Después de instalar las unidades y ejecutar `systemctl daemon-reload`, habilitar `ultra-sentinel-heartbeat.timer`. El servicio devuelve 0 solo con puntualidad observada, 2 ante alerta o evidencia insuficiente y 1 ante fallo de configuración o entrega. Revisar `journalctl -u ultra-sentinel-heartbeat.service` sin mostrar variables. Probar en un entorno controlado: corte de red, API no disponible, atraso de muestras, fallo del receptor, reinicio y aceptación de alerta. La URL y el token nunca deben venir de datos del PR. Aplicar firewall/egress allowlist y bloquear redes internas/IMDS, pues validar el nombre DNS no impide DNS rebinding.

**Estado:** código y unidades preparados; no implican host instalado, recepción real ni disponibilidad 24/7. La automatización externa ya creada es un canal separado y no sustituye una prueba de recepción del webhook.

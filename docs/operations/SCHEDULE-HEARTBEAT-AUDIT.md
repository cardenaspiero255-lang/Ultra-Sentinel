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

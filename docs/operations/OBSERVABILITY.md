# Observabilidad y SLOs futuros

Métricas planificadas: tasa de eventos/errores por producto, latencia p50/p95 para detección/diagnóstico, falso positivo/falso negativo calibrado, incidentes abiertos, estado de heartbeats, disponibilidad del monitor, pruebas fallidas, reintentos/colas, cuota de GitHub, tiempo de cierre y rollback.

## Identificadores y privacidad
Propagar `sourceRepo`, `service`, `incidentId`, `eventType`, `headSha`, versión de release y correlationId sin payload de voz ni PII. Información no autenticada conserva clasificación `UNVERIFIED`.

## Alarmas
- Error grave verificado, repetición de ANR/crash o pérdida confirmada de servicio.
- Heartbeat ausente durante umbral definido por producto, con controles contra falsos positivos.
- Fallo de CI obligatorio sobre SHA actual.
- Fallo de autenticación, rate limit prolongado y anomalía en eventos duplicados.
- Caída del monitor mediante un sistema **externo** a Sentinel.

No inventar porcentajes de disponibilidad ni prometer 24/7 hasta contratar/desplegar infraestructura y medirla.

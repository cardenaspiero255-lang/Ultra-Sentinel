# Modelo de amenazas inicial

## Activos protegidos
Código de `main` de tres productos, credenciales GitHub/Sentry, identidad del propietario, autoría de checks, estado CI, permisos del micrófono/datos de voz, historial de reparaciones y capacidad de despliegue.

## Límites y actores
- PR/forks, issues, comentarios, CodeRabbit/Qodo/Codex y outputs LLM: **origen no confiable**.
- Recolector en `main` de lectura: puede **observar** fuentes GitHub autenticadas, pero no cambiar repos.
- Auditor independiente: decide si evidencia es suficiente, no da permiso para desplegar.
- Autorizador: identidad y consentimiento del propietario.
- Writer/deployer: identidad separada, scopes mínimos, acciones registradas.
- App Android/voz: permisos y restricciones del SO; Sentinel jamás puede eludirlos.

## Principales amenazas y mitigaciones
| Amenaza | Control propuesto |
|---|---|
| Inyección de prompts/README/PR | Tratar entradas como datos; nunca instrucciones; bounded parsers y tests adversariales |
| `pull_request_target` + checkout PR malicioso | Checkout únicamente de `main` confiable, leer diff remotamente, permisos de solo lectura |
| Checks falsificados/desactualizados | Correlación por repo, PR, HEAD, base, workflow, run-id/attempt; reread terminal |
| Envenenamiento de memoria | Atestación por contenido inmutable y RED/GREEN independiente, cuarentena, expiración |
| Autorización falsificada y replay | Token/nonce verificables, scope PR+SHA, expiración, storage transaccional y veto por cambio de HEAD |
| Tormenta de reparaciones y consumo de API | Idempotencia, cooldown, límite de reintentos, presupuesto y circuit breaker |
| Fuga de secretos/audio/PII | Sanitización previa, consentimiento, retención corta, separación de credentials |
| Dependencia o GitHub App comprometida | Auditoría de supply-chain, action pin SHA, revisión de privilegios y rotación |
| Caída de Sentinel/monitor | Watchdog fuera de Sentinel y alertas; no depender de Jarvis |
| Falsa seguridad por benchmark sintético | Corpus oculto independiente, casos benignos y resultados no comparables explícitos |

## Revisión requerida
Revaluar antes de crear cualquier ejecutor de commits o desplegar un monitor. Las medidas descritas son **diseño**, no controles productivos acreditados por este scaffold.

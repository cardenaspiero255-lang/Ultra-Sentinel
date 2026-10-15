# SSS+ — Endurecimiento API, Family Hunter y benchmark

## 1. Presupuesto API
El lector autenticado utiliza github-api-budget.cjs. Mantiene la segunda consulta de metadatos PR para detectar HEAD/base cambiados y no cachea recursos mutables. Solo memoiza contenido SHA-pinned inmutable, con límite 308 lecturas por sesión. GitHub 429 o 403 con cuota agotada falla cerrado con GITHUB_RATE_LIMITED, sin reintentos ni logs secretos.

Esta caché por ejecución no resuelve por sí sola los límites compartidos entre jobs independientes. Nunca cachear tokens ni checks vivos.

## 2. Familias entre SHA
family-delta.cjs compara las familias de dos snapshots válidos. Movimiento, cambios de fingerprint y desapariciones son hipótesis sin prueba de corrección; las instantáneas incompletas bloquean la comparación. No ejecuta PR ni autoriza reparación.

## 3. Benchmark estratificado
stratified-benchmark.cjs calcula TP/FP/FN/TN y P/R/F1 por regla; exige >=2 positivos, >=2 negativos y >=2 PR por regla, P/R/F1 >=95%, sin regresión, y 0 falsos negativos críticos. Es ahora una condición obligatoria del prescreen numérico SSS+.

Las reglas no prueban parentesco semántico. El origen de las etiquetas y de CI sigue sin verificación independiente. Ningún score interno autoriza merge o certificación.

## Bloqueos externos abiertos
Corregir los checks del PR #163 de GameHub, obtener etiquetas ciegas verificables, demostrar autorización y rollback E2E, conectar Sentry con opt-in privado, corroborar continuidad de heartbeat y ejecutar QA Android y auditoría adversarial de release.

No prometer disponibilidad 24/7 ni Triple S+ hasta completar todas las evidencias.
# Triple S+ — criterio interno medible y certificación pendiente

El término **Triple S+** es una clasificación interna del proyecto, **no** una certificación profesional o estándar industrial. Ningún fixture sintético, porcentaje de CI, autocalificación del autor ni salida de este repositorio otorga por sí solo la clasificación.

## Dos niveles de evidencia

**Nivel A — Tests internos** (automatizable): el Core detecta mutaciones sintéticas conocidas, sus controles benignos no activan la regla, el contador de precisión/recall/F1 no regresa frente al baseline en un conjunto etiquetado, los test de seguridad pasan y GitHub registra el SHA exacto. Implementado parcialmente.

**Nivel B — Validación externa** (todavía pendiente): diffs reales de GameHub, salidas completas del revisor heredado y Ultra Sentinel a idéntico SHA, etiquetas revisadas por una fuente no generada por el candidato, origen de CI verificado directamente con API y resultados repetidos. Requiere auditar sesgos de muestreo y definir hallazgos semánticamente equivalentes aunque las líneas difieran. No se presume ni se inventa.

## Scorecard reproducible

Módulo `packages/quality-gates/sssplus-pre-screen.cjs`, comando
`node scripts/evaluate-sssplus-pre-screen.cjs /ruta/absoluta/campana.json`.

Reutiliza el parser existente de `shadow-parity-metrics.cjs`; **no implementa un lector paralelo de GitHub**. El esquema de entrada es `ultra-sentinel-parity-campaign/v1`: cohortes identificadas por `repository,pr,headSha,baseSha,sourceCheckState,labels,baseline,candidate`. Cada identidad de hallazgo es `rule,path,line`, y cada etiqueta incluye `positive:boolean`. Las predicciones no etiquetadas bloquean la evaluación.

Los umbrales propuestos, internos y sujetos a validación contra muestras reales, son:

| Criterio | Umbral |
|---|---|
| PR distintos | al menos 4 |
| Etiquetas | al menos 120 |
| Positivos y negativos | al menos 48 de cada clase |
| Reglas distintas | al menos 6 |
| Rutas distintas | al menos 4 |
| Precision, recall y F1 | cada una ≥ 0,95 (micro promedio) |
| Regresión por PR | 0 regresiones frente al baseline en TP, FN y FP |
| Falsos negativos críticos definidos | 0 |
| Etiquetas críticas positivas verificables | ≥12 |
| Controles críticos negativos | ≥12 |
| Reglas críticas distintas con positivos | ≥3 |
| Estados de CI de origen | todos declarados `SUCCESS`; requieren verificación externa adicional |

Las reglas críticas incluidas ahora son `PRIVILEGED_UNTRUSTED_CHECKOUT`, `POTENTIAL_HARDCODED_SECRET`, `SPEECH_REENTRANT_RETRY`, `UNSCOPED_COROUTINE`, `POTENTIAL_PRIVATE_LOG`. Su conjunto es conservador, no una taxonomía exhaustiva de vulnerabilidades.

El resultado `NUMERICAL_PRESCREEN_ONLY` **no significa S+ aprobado**: `tripleSPlusCertified=false`, `independentLabelsVerified=false`, `liveSourceCiIndependentlyVerified=false`, `mergeAllowed=false` siempre. Fijar esos campos en un JSON de entrada tampoco concede autoridad. No usar el exit code cero de este comando para habilitar auto-merge.

## Mutation Lab

`node scripts/run-mutation-lab.cjs` ejecuta el Core real sobre ocho variantes sintéticas peligrosas y sus ocho controles benignos: coroutine fuera de ciclo de vida, espera bloqueante, GC forzado, loop sin cancelación, retry de reconocimiento síncrono, fuga por log, secreto literal y checkout privilegiado de PR no confiable.

La mutación se limita a datos de diff en memoria, sin ejecutar código de PR, red ni escritura en GitHub. Un resultado 8/8 prueba **solo esos fixtures**. No equivale a mutation score real sobre GameHub, test de Android en hardware ni robustez universal.

## Requisitos de cierre S+

Para solicitar evaluación Triple S+: (1) dos ciclos consecutivos con artifacts verificables en Actions y datos minimizados; (2) observaciones realistas sobre GameHub/JARVIS con validación del SHA; (3) campaña paridad con etiquetas congeladas y auditadas de forma independiente; (4) repetición con nuevas familias desconocidas y sin filtraciones entre entrenamiento/evaluación; (5) autorización y aislamiento comprobados en host de ensayo para cualquier reparación; (6) medición de recall crítico y falsos positivos; (7) plan de rollback y resultados reproducibles. **Hasta tener estas evidencias, la clasificación permanece NOT_CERTIFIED**.

Ver además `docs/migration/C2-PARITY-CAMPAIGN.md` y `docs/quality/TESTING.md`.

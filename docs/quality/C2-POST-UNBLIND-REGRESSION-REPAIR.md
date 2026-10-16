# C2 — reparación de tres omisiones confirmadas (solo regresiones conocidas)

**Estado de referencia anterior:** [GitHub Actions #38846108148](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38846108148): Core congelado `bb38bb77983339301cafe8a7594e258e0c2924a6`, tres archivos objetivo de GameHub congelados, **0/3 detecciones exactas**. Sus tres comportamientos defectuosos ya fueron revelados al desarrollador del motor. **A partir de ahora son TRAINING/REGRESSION, NO holdout nuevo.**

## Cambios y condiciones de prueba

Se añaden tres *reglas conservadoras de hipótesis técnica*, importadas desde `packages/core/c2-known-defect-regressions.cjs` hacia `c2-semantic-patterns.cjs`, siempre con archivo Kotlin completo recuperado a un HEAD original y diff alineado línea por línea. Todas las alertas son `NEEDS_VERIFICATION`; no aprueban una reparación ni ejecutan código del PR.

1. `CLAIM_VALUE_UNIT_CASE_COLLISION` en `UltraFrontierV2.kt:318` (#205). Solo alertar si el ID de investigación conserva case, pero tanto `record` como `snapshot` pasan el valor por el helper original `normalize` que aplica `lowercase(Locale.ROOT)`, pudiendo convertir los valores incompatibles `8 GB`/`8 Gb` en un mismo valor. La línea ancla puede ser contexto previo al cambio, pero una modificación ejecutable relacionada debe existir en el mismo `record`. **No atribuir falsamente el defecto al autor del PR**, solo reportar que la versión congelada lo contiene.
2. `TTS_UTF16_SURROGATE_SPLIT` en `UltraSpeechChunker.kt:26` (#206). Requiere una asignación explícita de frontera por `maxChars` y un `substring(0, boundary)` añadido dentro del bucle, sin protección de pares surrogate en el tramo. Control negativo: fragmentación segura que ajusta la frontera, o corte por puntos de código, no alerta.
3. `STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED` en `ContinuousVoiceController.kt:52` (#208). Identifica la ruta `setEnabled(true)` que retorna `PERMISSION_REQUIRED` sin limpiar el estado ni detener el servicio en ese bloque, cuando también hay cambios ejecutables relacionados dentro del método. Separa `resumeIfEnabled()` y `setEnabled(false)`, que sí realizan saneamiento. **No es prueba de captura física de audio** tras revocación Android.

## Controles adversariales

La nueva batería de tests exige variantes corregidas, ausencia de guardas insuficientes, cambio de archivo, ausencia de líneas añadidas ejecutables y rechazo de fuente manipulada. Los 3 fallos anteriormente reproducidos sirven exclusivamente como **regresiones de desarrollo** después del 0/3 inicial; los tests no cuentan como casos ciegos, positivos del benchmark global ni verdaderos negativos estadísticos.

La ejecución de GitHub `c2-known-regression-replay.yml` debe obtener los mismos tres archivos a través de SHA `base...head`, comprobar el sello previo, ejecutar el Core actualizado sin tokens de GitHub y publicar **solo los contadores de detección de las tres regresiones conocidas**, con el SHA del motor actualizado. Se considera un éxito técnico si pasa **3/3**, pero el baseline histórico sigue 0/3 y **precision, recall, F1 y no-regresión FP global permanecen sin demostrar**. No reemplazar el antiguo benchmark inicial ni los hashes de los artefactos antiguos.

## Secuencia posterior obligatoria

A continuación congelar otro conjunto **no usado para diseñar estas tres reglas**, construir oráculos de comportamiento técnico y controles negativos realmente puntuables a nivel `rule/path/line` antes de consultar las nuevas predicciones; comparar el detector nuevo y el baseline anterior sobre idénticos commits y todas las alertas verificadas. Meta interna: al menos 120 identidades, ≥48 positivas, ≥48 negativas, ≥6 reglas y ≥4 rutas y PR diferentes; precisión/recall/F1 ≥95%, sin aumentar FP y cero FN críticos.

**No anticipar la conclusión:** el 95% no se acredita por aprobar CI, detectar los 3 casos conocidos ni bajar las alertas artificialmente. Hasta cumplir ese benchmark y luego los gates de autorización/rollback, Sentry privado, continuidad del cron y auditoría final, el veredicto es `NOT_CERTIFIED`. El único humano necesario es el propietario.

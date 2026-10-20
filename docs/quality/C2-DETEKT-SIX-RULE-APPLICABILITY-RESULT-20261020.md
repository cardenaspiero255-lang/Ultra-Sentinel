# Ultra Sentinel C2 — resultado real de aplicabilidad en seis PR Detekt conocidos

**Fecha del expediente:** 20-oct-2026. **Ejecución real:** [GitHub Actions 39366806394](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39366806394), SUCCESS, commit exacto de Ultra Sentinel f2b8b08043e7b0767ec081c10f2f07a62dcd0ebd. **Artefacto original:** c2-detekt-six-rule-applicability-source-evidence, ID 12239891541, JSON verificado (retención declarada de 14 días). Sin alteraciones del Core congelado. Parches y blobs obtenidos en GitHub público del upstream detekt/detekt, con comparaciones por commits y hashes SHA-1 de archivos originales.

## Resultado por caso

| PR upstream | Fuente HEAD Git verificada | Archivo cambiado escaneado por Core | Alertas Core emitidas en el parche HEAD | Testigo estructural BEFORE/AFTER | Estado |
| --- | --- | --- | --- | --- | --- |
| [7625](https://github.com/detekt/detekt/pull/7625) | Sí | 1 | 0 | No ejecutado aquí | Sin ruleId aplicable acreditado |
| [7635](https://github.com/detekt/detekt/pull/7635) | Sí | 1 | 0 | No ejecutado aquí | Sin ruleId aplicable acreditado |
| [7667](https://github.com/detekt/detekt/pull/7667) | Sí | **0** | 0, **NO puntuable** | No ejecutado aquí | DELETION_ONLY_NO_ADDED_LINES: 0 añadidas, 9 eliminadas |
| [7715](https://github.com/detekt/detekt/pull/7715) | Sí | 1 | 0 | **Sí, contraste estático**: ignoreCase=true antes vs igualdad exacta después | Sin regla Sentinel equivalente demostrada |
| [7718](https://github.com/detekt/detekt/pull/7718) | Sí | 1 | 0 | No ejecutado aquí | Sin ruleId aplicable acreditado |
| [7888](https://github.com/detekt/detekt/pull/7888) | Sí | 1 | 0 | **Sí, contraste estático**: operadores adicionales hardcoded antes vs configuración después | Sin regla Sentinel equivalente demostrada |

**Totales medidos:** 6/6 archivos HEAD de los PR autenticados mediante Git blobs; **5/6 targets con líneas añadidas analizados**, 1/6 no escaneado (#7667), **0 alertas efectivamente emitidas sobre estos cinco parches corregidos** y **0 correspondencias de ruleId/archivo/línea causal certificadas**. #7667 no cuenta como un hallazgo limpio, un verdadero negativo, ni evidencia de cobertura. Comparaciones con historia divergente: #7667, #7718, #7888; no se convierten en historia lineal ni se equiparan al fix.patch exacto del benchmark.

## Qué se comprobó y qué no

El workflow congeló el Core con Git blob 836f9400f42f269b80f446e89601744c59c73073 y sus dos módulos de patrones, obtuvo exactamente seis comparaciones base...head y los blobs fuente originales, cotejó SHA-1, rutas, hunks de código cambiado y resultados reales del método analyze() en modo KOTLIN_JVM_V3_EXPERIMENTAL. Las pruebas CI de la implementación terminaron en [run 39366069249](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39366069249) con **711/711 pruebas aprobadas**. El control de los diff de solo eliminaciones se corrigió mediante [PR #160](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/160), CI [39366680906](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39366680906), **712/712 aprobadas**.

Los dos testigos #7715/#7888 compararon **código fuente completo real** de los SHA base y HEAD; sus negativos ilustrativos aseguran que no se acepta un cambio que ya estaba corregido, código comentado o una configuración no equivalente. Son testigos estáticos de cambio y NO ejecutan semántica del compilador Kotlin ni evalúan la efectividad de reglas del Core. Las transiciones JUnit originales provinieron de otros seis contenedores upstream y son evidencia histórica **conocida**, no nuevo holdout ciego.

**Muy importante:** no encontrar alertas en un diff que contiene el **arreglo** NO demuestra que el detector habría fallado en el código vulnerable original. Esta ejecución tampoco proporciona TP/FP/TN/FN ni precision/recall/F1; el Core examina principalmente líneas añadidas de diffs, no una auditoría general del estado BEFORE. Se requiere un contrato de detección válido para la fuente original y negativo corregido/benigno, sobre hashes fijados, para hablar de sensibilidad del detector.

## Decisión de desarrollo

- **#7715:** primero obtener un oráculo semántico ejecutable que distinga excepciones/constructores de funciones llamadas con variaciones de mayúsculas. Solo si ello encaja en el alcance deseado de Ultra Sentinel, diseñar un ruleId propio y probar positivos/negativos sin falsas alarmas. La regla ThrowingExceptionsWithoutMessageOrCause es de Detekt y su regresión por falsos positivos no se convierte por sí sola en un defecto del detector Sentinel.
- **#7888:** el defecto original era configuración del conjunto de operadores adicionales, NO ausencia absoluta de operadores. Un detector propio requeriría resolución semántica de imports/operadores con contexto de configuración. Rechazar heurísticas de texto como equivalentes a Kotlin PSI.
- **#7625, #7667, #7718:** defectos de serialización XML/SARIF en Detekt. No convertirlos artificialmente en objetivos de reglas de vulnerabilidades de Kotlin. #7667 ilustra además una limitación arquitectónica: Core no puntúa parches de solo eliminaciones.
- **#7635:** configuración de documentación de companion objects; alcance semántico de otra herramienta de lint, no una etiqueta de vulnerabilidad automáticamente relevante.

La admisión requiere cuatro evidencias independientes: causa original y oráculos ejecutables, regla de Ultra Sentinel realmente existente con ruleId/path/line en fuente vulnerable, controles benignos/contrafactuales y huella causal disjunta del histórico. Ninguna de estas seis fuentes se admite por estos resultados.

**Estado inalterado:** históricos 23/120 (97 pendientes), nuevas GOLD 0, benchmark ciego no ejecutado, precisión/recall/F1 nulos, SSS+ NOT_CERTIFIED. La automatización SSS+ sigue pausada.

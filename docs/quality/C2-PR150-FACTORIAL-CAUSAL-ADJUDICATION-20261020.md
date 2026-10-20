# C2 — GameHub #150, adjudicación causal mediante intervención factorial

**Fecha:** 2026-10-20. PR #174. Clasificación **de desarrollo**, no benchmark ni nuevas etiquetas. Regla estricta: ninguna prueba sintética ni mutante es por sí misma otra etiqueta original.

## Procedencia y ejecución

Se obtuvo `SmartRecommendationExplanation.kt` directamente de GameHub commit `4c6912d7ca17df0669f8a0d9667f34d2f2b205a9`, blob Git `37866fd3dbfcd19d9daaf29a5e1e426391c723d4`, tras verificar la ejecución propietaria [#38982855937](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38982855937). Se compiló el código original y tres copias descartables con **una** reparación del predicado de historial, **una** reparación del predicado de evidencia externa y **ambas** correcciones. Cada compilación usó el mismo oráculo Kotlin independiente del detector y la ABI de prueba fijada; cada JAR se ejecutó en Bubblewrap + AppArmor, sin red ni credenciales.

Workflow [#39507652290](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39507652290): `SUCCESS`; evidencia `c2-pr150-source-causal-cross-interventions` y **754 pruebas unitarias verdes**. El workflow exige hashes originales exactos, que las transformaciones afecten únicamente sus guardas fijadas, que la matriz 2×2 cierre y que no se omitan controles benignos.

## Resultado observado en Kotlin auténtico

| Código | Historial solo negativo (#150:251) | Fuente fresca/autoritativa opuesta (#150:252) |
| --- | --- | --- |
| Original | `HIGH` **incorrecto** | `HIGH` **incorrecto** |
| Solo historial corregido | `MEDIUM` | `HIGH` |
| Solo evidencia externa corregida | `HIGH` | `MEDIUM` |
| Ambas correcciones | `MEDIUM` | `MEDIUM` |

Controles positivos/negativos en las cuatro versiones: fuente externa débil `MEDIUM`, fuente fiable afirmativa `HIGH`, historial medido positivo `HIGH` y contexto vacío `MEDIUM`. Esto acredita **dos rutas de código separables** y reparaciones ortogonales en los predicados originales.

## Adjudicación de familia de causa

- Línea 251: `historicalObservations.isNotEmpty()` no distingue observaciones negativas de soporte favorable.
- Línea 252: `externalEvidence.any { it.fresh && it.authoritative }` no comprueba que la evidencia *respalde* la recomendación.
- Línea 250: `weakExternalEvidence || unavailable.isNotEmpty()` es un **control negativo benigno** que evita `HIGH` ante datos externos débiles. No es un defecto positivo.
- Ambas rutas son instancias de la **familia** `RECOMMENDATION_CONFIDENCE_CALIBRATION`. Aunque cada guarda pueda repararse de manera independiente, compartir archivo, resultado afectado y política de confianza impide declarar sin revisión dos **familias causales independientes** para las cuotas de diversidad.
- Se trata como **una familia causal conservadora con dos defectos de guarda**. Las identidades históricas se preservan; no se reescribe Run23, no se eliminan etiquetas históricas sin adjudicación independiente y tampoco se incrementan los contadores por la nueva evidencia.

El resultado estructurado es `TWO_SEPARABLE_SOURCE_GUARDS_ONE_CONSERVATIVE_CAUSAL_FAMILY`, `independentRootCausesCertified=false`, `independentGroupsCounted=1`, `corpusNewLabels=0`, `precision/recall/F1=null` y `tripleSPlusCertified=false`.

## Trabajo siguiente

Registrar el grupo provisional para los defectos de líneas 251/252, manteniendo la regla de la línea 250 como control negativo diferenciado. A continuación, adjudicar las otras identidades históricas sin derivar automáticamente huellas desde `ruleId` o línea. Solo un nuevo workflow con causa original y evidencia cruzada podrá reducir los **21 grupos causales sin acreditar** del inventario anterior. La cohorte ciega permanece sin congelar y `BASELINE_INCOMPLETE` sigue pendiente.

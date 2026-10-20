# C2 — PR #173: recuperación auténtica de diez recibos históricos

**Fecha:** 2026-10-20. **Estado:** evidencia original recuperada, causas independientes **NO** acreditadas. No son nuevas etiquetas ni muestra ciega.

## Resultados originales de GitHub Actions

Workflow [run #39504873407](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39504873407): `SUCCESS`, verificación estructural **750/750** y siete ejecuciones anteriores con sus identidades de propietario, repositorio, workflow, código y digest de artifact contrastados. Los siete archivos originales se descargan sin ejecutar su contenido, y se validan contra los predicados Kotlin declarados.

| Registros históricos | Ejecución original | Oráculo | Evidencia |
|---|---:|---|---|
| GameHub #150, línea 251, `NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE` | [38988102205](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38988102205) | Historial únicamente negativo eleva confianza a HIGH | Un recibo original |
| GameHub #150, líneas 250 y 252, `WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE` / `ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION` | [38982855937](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38982855937) | Control de fuente externa débil y desacuerdo autoritativo | **Un mismo recibo cubre dos reglas** |
| GameHub #151, línea 264, `NONFINITE_THERMAL_HEADROOM_ACCEPTED` | [38968765586](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38968765586) | Valores no finitos y control finito | Un recibo |
| GameHub #152, línea 207, `SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY` | [38930244332](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38930244332) | Prioridad de candidatos de perfil válidos | Un recibo |
| GameHub #153, línea 71, `PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE` | [38889693623](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38889693623) | Divergencia de rollback bajo fallo inyectado | Un recibo |
| GameHub #154, línea 22 y #155, línea 47 | [38969804193](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38969804193) | Prevención térmica / frontera de carga | Dos testimonios Kotlin en un artefacto |
| GameHub #157, línea 32 y #158, línea 60 | [38946358219](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38946358219) | Autorización de herramientas / retención acotada | Dos testimonios Kotlin en un artefacto |

**Diez identidades original-source**, **nueve testimonios Kotlin serializados diferentes**, **siete artefactos**. El workflow comprueba los metadatos de artifact y los SHA-256 publicados por GitHub; el campo `originalWitnessSha256` del informe derivado es el digest de `JSON.stringify` del testimonio analizado, **no** una afirmación de haber reproducido el SHA-256 de los bytes ZIP originales.

## Causas compartidas del PR #150: análisis no concluido

El mismo archivo original `SmartRecommendationExplanation.kt`, commit `4c6912d7ca17df0669f8a0d9667f34d2f2b205a9`, blob Git `37866fd3dbfcd19d9daaf29a5e1e426391c723d4`, contiene:

- Línea 250: prioridad de la rama `weakExternalEvidence` que degrada a `MEDIUM`. Es un **control negativo**, no un tercer defecto.
- Línea 251: `historicalObservations.isNotEmpty()` puede elevar a `HIGH` cuando el historial solo recoge experiencias negativas.
- Línea 252: `externalEvidence.any { it.fresh && it.authoritative }` puede elevar a `HIGH` aun si la evidencia autoritativa contradice la recomendación.

El control benigno de línea 250 y los defectos potenciales de 251/252 deben someterse a **adjudicación causal independiente**: el hecho de que haya líneas distintas, tests o mutantes independientes no demuestra que existan tres causas raíz separadas. Los dos positivos podrían compartir la misma causa amplia de confianza mal calibrada. `causalClusters[0].independence="UNRESOLVED"`.

## Resultado y obligaciones pendientes

- **23** etiquetas históricas de desarrollo, 11 positivas y 12 negativas, sin modificar el sello inmutable Run23.
- Los **10 huecos de recibo histórico** ahora tienen un testimonio original recuperado y enlazado a su artefacto. Ello **no** prueba aún la admisión original de cada etiqueta a un corpus benchmark.
- Siguen pendientes **21 grupos causales**; la comparación de 13 recibos históricos restantes dentro de la cadena anterior tampoco queda automáticamente acreditada por este PR.
- No se actualiza TRAIN, no se congela HOLDOUT, `precision/recall/F1=null`, `newLabels=0`, `SSS+ NOT_CERTIFIED`.
- Próximo trabajo: separar clases de equivalencia causal por comportamiento/corrección en #150 y extenderlo a las restantes entradas P1, luego ampliar etiquetas legítimas de candidatos Kotlin originales y resolver `BASELINE_INCOMPLETE` antes de cualquier benchmark ciego.

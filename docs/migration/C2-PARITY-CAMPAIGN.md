# Campaña C2 — Paridad medible sin duplicar el observador

**Estado:** infraestructura de métricas implementada en `packages/quality-gates/shadow-parity-metrics.cjs` y `scripts/evaluate-shadow-parity.cjs`; comparación real y certificación **PENDIENTES**. Un resultado de unit tests con fixtures sintéticos no demuestra calidad en PR reales.

## PR abiertos y HEADs observados (2026-10-14)

| Familia | GameHub PR | HEAD observado | Límite |
|---|---|---|---|
| Voz y errores STT | [#132](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/132) | `06289e42b6ecb1f6fa75d49a1bdd383df9b51422` | 21 archivos, HEAD mutable |
| Frontier / agente | [#158](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/158) | `1f9e525d54e0407f91e2ea6db74e98d0aa0646dd` | 23 archivos, borrador |
| Diagnóstico de red | [#161](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/161) | `6a2b2a2b1249dcdebf91013b42a3c4510938a5dc` | 12 archivos |
| Historial y Nano | [#163](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/163) | `692c7e143e94fd727ec98a181b818ecd42e10aca` | 36 archivos, borrador |

Los estados de abierto/borrador se verificaron mediante GitHub, pero **no** se ha recopilado una verdad etiquetada de hallazgos ni los informes completos anteriores/nuevos. Antes de comparar, fijar de nuevo HEAD/base SHA exactos y comprobar que siguen abiertos y que los checks están completos. El #201 antiguo **solo es evidencia histórica negativa**, no muestra actual representativa.

## Procedimiento reproducible

1. Capturar snapshot autenticado de cada PR desde el lector existente `packages/orchestrator/gamehub-live-reader.cjs` y checks/observador de proveedores. Fijar SHA de HEAD y base y rechazar cambios de SHA durante la captura.
2. Obtener findings del Core **actual** y del revisor **heredado**, para esos mismos diffs completos. No tratar el nombre de un check como lista de findings.
3. Construir un corpus JSON etiquetado con evidencia independiente, incluyendo casos positivos y negativos por regla/ruta/línea. No aceptar etiquetas producidas automáticamente por el candidato que se evalúa. Mantener un manifiesto por SHA firmado fuera del PR.
4. Para cada muestra introducir `repository,pr,headSha,baseSha,sourceCheckState,labels,baseline,candidate`; los findings utilizan `{rule,path,line}` y las etiquetas añaden `positive:boolean`. Se exige anotación de **todos** los hallazgos del baseline y candidato; las omisiones invalidan la muestra.
5. Ejecutar localmente: `node scripts/evaluate-shadow-parity.cjs /ruta/absoluta/campana.json`.
6. Registrar TP, FP, FN, TN, precision, recall, F1, revisión manual de discrepancias y latencia de los revisores desde logs **confiables**; repetir cuando cambie HEAD. Reportar incertidumbre y cobertura.
7. No promover `semanticEquivalenceCertified`: el evaluador lo fija a **false** y `sourceChecksIndependentlyVerified` permanece **false** incluso ante la cadena `SUCCESS` entregada como input.

## Política de CI y cutover

- Si cualquier check de origen falla: `BLOCKED_SOURCE_CI`; si hay información incompleta, detener certificación.
- Jamás ejecuta código del PR, tokens, pushes, autofusión o autorreparación.
- Los resultados de fixtures sintéticos solo validan el calculador, **no** acreditan paridad del motor.
- No retirar scripts o workflows viejos hasta tener cohortes representativas, falsos positivos y falsos negativos resueltos, revisión externa de etiquetas y capacidad de rollback.

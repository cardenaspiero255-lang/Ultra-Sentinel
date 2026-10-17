# C2 — 106 tareas Kotlin originales de JetBrains: cola externa sin etiquetas inventadas

## Fuente fijada y verificada

Repositorio primario: [Kotlin/kotlin-swe-bench](https://github.com/Kotlin/kotlin-swe-bench), mantenido bajo el repositorio `Kotlin`. Commit inmutable: `b9025d86f7ae634901396766bd61f6d4ae6d2165`. Licencia del **benchmark** Apache-2.0. A diferencia de un resultado de búsqueda anterior que citaba 105 tareas / ocho repositorios, el README y el listado GitHub actualizados a ese commit contienen **106 tareas y nueve proyectos**, y cada directorio original se identifica por su Git tree SHA.

| Proyecto upstream | Tareas propuestas | Licencia declarada por el benchmark |
| --- | ---: | --- |
| pinterest/ktlint | 43 | MIT |
| detekt/detekt | 28 | Apache-2.0 |
| oss-review-toolkit/ort | 12 | Apache-2.0 |
| Hannah-Sten/TeXiFy-IDEA | 8 | MIT |
| ankidroid/Anki-Android | 6 | GPL-3.0 |
| Kotlin/dataframe | 5 | Apache-2.0 |
| square/okhttp | 2 | Apache-2.0 |
| GradleUp/shadow | 1 | Apache-2.0 |
| linreal/cascade-editor | 1 | MIT |
| **Total** | **106** | |

Este catálogo no copia fuentes, parches ni pruebas upstream al repositorio Sentinel. La licencia declarada por cada tarea **no** es una revisión legal independiente de sublicencias o dependencias. En particular, los datos de proyectos GPL no deben redistribuirse comercialmente sin análisis de sus obligaciones. El benchmark público tampoco puede darse por holdout ciego frente a modelos que pudieron verlo antes.

## Flujo en GitHub Actions

`.github/workflows/c2-owner-kotlin-106-upstream-candidate-freeze.yml` es read-only y solo acepta `workflow_dispatch` del propietario desde `main`, o el comentario exacto `ULTRA_SENTINEL_C2_UPSTREAM_KOTLIN_106_V1` sobre [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50).

1. Ejecuta los tests de Ultra Sentinel sobre `main`.
2. Obtiene desde **GitHub API original** el commit SHA fijado y la respuesta **íntegra** de `/contents/tasks?ref=<SHA>`. Comprueba repositorio y licencia del benchmark.
3. Desactiva uso de credenciales en el paso siguiente. `scripts/freeze-c2-kotlin-upstream-candidates.cjs` valida sin red los 106 directorios y sus hashes Git, nueve prefijos explícitos y cuotas reales por repositorio, rechazando duplicados, path traversal, symlinks y entradas desconocidas.
4. Genera un informe trazable con SHA-256 de los bytes originales y un digest canónico de la cola. Los 106 registros dicen literalmente `UPSTREAM_TASK_CANDIDATE_NOT_A_LABEL`, con todos los tests y la independencia como **no verificados**.
5. Archiva JSON original y cola derivada; ningún commit upstream se compila/ejecuta, ningún fallo se etiqueta, no hay acceso a predicciones ni a baseline.

## Cómo aprovecharlo para terminar los 97 casos que todavía faltan

No aplicar la fórmula **105/106 tareas = 105/106 etiquetas**. El paso siguiente será una campaña de reproducción en otro workflow de permisos mínimos y runners aislados, con JDK/dependencias fijadas y límites de memoria/tiempo. Cada candidato atraviesa:

`METADATA_ONLY` → `SOURCE_SHA_ATTESTED` → `BEFORE_FAIL_AFTER_PASS` → `ROOT_CAUSE_DEDUPED` → `INDEPENDENT_LABEL_REVIEW` → `DEVELOPMENT_ADMITTED`.

Para cada **positivo** hace falta una regresión f2p real, identificar la causa/familia/regla `rule/path/line`, confirmar que el Core realmente admite ese archivo y regla, distinguir fallos de infraestructura y comprobar independencia respecto a cualquier verdad previa. Una tarea fallida que no aplique a las reglas Sentinel **no** es una etiqueta válida. Para cada **negativo**, exigimos un control original seguro sobre causa distinta, más un mutante adversarial que falla; los tests p2p de la misma corrección no cuentan como nuevas causas negativas por defecto. Separar 9 proyectos no demuestra independencia interna.

### Cuotas después de la ejecución Run23

- Histórico propietario: **23 etiquetas fuente = 11 positivas y 12 negativas**, solo desarrollo.
- Faltan **97**: al menos 37 positivas, 36 negativas y 24 casos adicionales con diversidad genuina.
- Aún **0** etiquetas nuevas del índice de 106 hasta ejecutar y verificar suites originales.
- **0** métricas ciegas, 0 comparaciones de detectors, SSS+ = `NOT_CERTIFIED`.

Para preservar un **holdout genuinamente desconocido**, reservar futuros PR/metadatos antes de mirar el código, los oráculos, las soluciones o las predicciones. Los ocho PR históricos GameHub, el catálogo Kotlin SWE-bench que hoy se expone para desarrollo y cualquiera que revisemos para mejorar el motor quedan excluidos de ese futuro holdout. El resultado de CI y los eventos Sentry pueden aportar pistas, pero **un crash no equivale a verdad etiquetada**.

## Verificación de seguridad

La lista se obtiene desde una API confiable antes del análisis offline; nunca se ejecutan instrucciones, build scripts o archivos procedentes de esas tareas en este workflow. No aumenta permisos GitHub, no usa token fuera del paso de captura, no auto-fusiona reparaciones y no acepta una cadena de prompts como validación. Se prevén ataques de metadatos alterados, fuentes duplicadas, cuadres de clase ficticios y scores falsos en pruebas unitarias.

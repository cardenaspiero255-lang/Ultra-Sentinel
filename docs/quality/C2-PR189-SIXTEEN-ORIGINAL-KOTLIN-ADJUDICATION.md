# C2 · PR #189 — adjudicación de 16 candidatos Kotlin reales y sus reintentos

**Alcance:** se reevalúan resultados de la ejecución real original de 106 tareas del 18 de octubre de 2026 (run **39168947905**) y los reintentos de 62 tareas del 19 de octubre (run **39214460564**). Ambas ejecuciones usaron el upstream público `Kotlin/kotlin-swe-bench` en el commit `b9025d86f7ae634901396766bd61f6d4ae6d2165`. La nueva auditoría no declara una nueva ejecución Docker de los 16 casos: reutiliza y vuelve a verificar los **artefactos JUnit originales** que ya fueron ejecutados y guardados.

La campaña conserva los hashes ZIP originales de **10 artefactos** y **2 de reintentos**, sus IDs y la identidad owner/GitHub Actions. El gate verifica los JSON de cada tarea, cada hash de los JUnit BEFORE/AFTER y las referencias de PR reales donde se observó una transición. Una discordancia bloquea toda la auditoría; nunca inventa etiquetas.

## Resultado esperado, sujeto a comprobación por CI

| Grupo | Casos | Revisión |
| --- | --- | --- |
| Transición original de tests observada (9) | detekt #4205, #4249, #4628, #4728, #4733, #4738; ktlint #2029, #2091; Shadow #1313 | **Solo reproducción upstream:** falta aplicabilidad al detector y adjudicación causal |
| Sin regresión `f2p` declarada (4) | ktlint #2053; ORT #10179; AnkiDroid #18903; DataFrame #1072 | No crea positivos ni negativos |
| Infraestructura bloqueada (2) | TeXiFy #2624; OkHttp #6887 | Reintentar solo tras identificar dependencias/entorno original |
| Discrepancia (1) | cascade-editor #16 | No inferir prueba original al faltar la transición esperada |

Los resultados de Detekt/Ktlint/Shadow son **nueve identidades de PR** sin repetición exacta; esto NO significa nueve defectos independientes. Las seis reglas de Detekt describen falsos positivos de detectores concretos; Ktlint #2029/#2091 afecta mensajes/comportamiento CLI, y Shadow #1313 afecta la exclusión de archivos reubicados. Tampoco está probado que el motor de Ultra Sentinel implemente o necesite esas reglas.

### Orden de adjudicación causal posterior

1. Para cada uno de los nueve candidatos con cambio de test: comprobar el árbol de código base original, el oráculo antes/después, la corrección real y la regla propia aplicable. No confundir el commit temporal AFTER usado por SWE-bench con el commit integrado original.
2. Comparar causas con las 23 identidades históricas y entre sí, incluyendo reglas semánticamente similares, no solo las SHA de archivos.
3. Construir los controles negativos propios de cada familia (original seguro más mutante sensible); no convertir los cuatro casos sin regresión en negativos automáticamente.
4. Solo después de acreditar independencia y derechos de uso pueden prepararse **nuevas etiquetas de entrenamiento o validación**. Ningún candidato público conocido puede utilizarse como *holdout verdaderamente ciego*.

**Estado de admisión:** etiquetas históricas de referencia = **23** (11 positivas y 12 negativas); nuevas etiquetas acreditadas = **0**; candidatos públicos reanalizados = **16**, otros **90** intactos; conjunto ciego = **NO**; precisión/recall/F1 = **sin medir**; **SSS+ NOT_CERTIFIED**.

Los SHA-256 de los archivos JUnit archivados prueban coherencia interna de las evidencias recuperadas, no acreditan por sí solos procedencia completa del checkout del código upstream ni independencia causal.

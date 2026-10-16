# C2 — recuperación de detección semántica de cuatro casos conocidos

**Objetivo:** detectar como **hipótesis de revisión** cuatro comportamientos observados en GameHub Ultra, sin mezclar la reparación del detector con el conjunto de evaluación ciega. Una coincidencia estática no equivale a verdad real ni a certificación Triple S+.

## Reglas nuevas (solo lectura)
- `STALE_FRAME_TIMING_ACCEPTED` — Kotlin `FramePacingIntelligenceEngine.kt`, detecta la ventana rápida relativa solo al último frame sin sincronizarla con la ventana lenta (C2 #159).
- `CROSS_TRANSPORT_LATENCY_MIX` — Kotlin `NetworkGamingDiagnosticsEngine.kt`, identifica una ventana basada únicamente en `networkHandle` cuando el propio motor registra cambios de transporte (C2 #161).
- `REFERENCE_TOPIC_MISMATCH` — research.ts, detecta confianza `trustedReference: true` respaldada por un umbral de solapamiento léxico de consulta/título/extracto, insuficiente para garantizar relevancia semántica (C2 #73).
- `NEWS_DOMAIN_DIVERSITY_INCONSISTENT` — research.ts, detecta discrepancia entre deduplicar dominios declarados `article.domain` y calcular independencia sobre `hostname(URL)` (C2 #73). Es un hallazgo de **código preexistente en un archivo modificado**, no prueba de regresión introducida específicamente por el PR #73.

El motor no ejecuta el código de los PR, no solicita servicios de IA, no concede autorreparación ni aplica merges. Toda alerta conserva `status=NEEDS_VERIFICATION`. Para evitar ruido, cada regla exige estructuras relacionadas dentro del **mismo archivo completo**, nunca un patrón aislado. Se ancla la posición a una línea fuente.

## Procedencia y controles negativos

El lector auténtico de GameHub obtiene el diff desde la API de GitHub y, solo para Kotlin/Java y exactamente `supabase/functions/ultra-research/research.ts`, recupera el archivo a HEAD inmutable y verifica ruta, SHA Git blob, tamaño, base64 canónica, UTF-8 y coincidencia de todas las líneas de hunk. Sin esa evidencia, **no se produce la nueva alerta**; si se proporciona una fuente incompatible, la cobertura queda `INCOMPLETE`.

Las pruebas RED/GREEN incluyen las cuatro configuraciones defectuosas conocidas, versiones corregidas, archivos ajenos, ausencia de fuente y manipulación de contenido, sin convertir los fixtures sintéticos en «etiquetas independientes».

## Evaluación no contaminada

Las cuatro reglas fueron diseñadas a partir de casos ya conocidos, así que **estos cuatro casos pasan a ser regresiones de desarrollo, no validación ciega independiente**. El antiguo benchmark con captura del detector **anterior** sigue siendo evidencia histórica de `0/4` en una muestra seleccionada, pero no mide una mejora general de precisión/recall/F1 del nuevo detector.

Para verificar la integración en vivo se requiere ejecutar `C2 live capture` en `main`, comprobar identidad de los cuatro HEAD originales, cobertura completa y verificar qué reglas aparecen en los artefactos. Esos resultados deben etiquetarse `KNOWN_CASE_REPLAY`, no sumarse al conjunto de 120 casos desconocidos ni presentarse como certificación externa. Mantener `NOT_CERTIFIED` hasta conjunto de prueba genuinamente separado con negativos, baseline y pruebas operativas.

# Campaña ciega C2: evaluación reproducible dirigida por el propietario

La cohorte activa de GameHub #132, #159, #161 y #73 se evalúa sin mostrar al etiquetador los findings del candidato, el baseline ni los resultados de CI. `createBlindReviewPacket(capture)` solo exporta PR, repo, HEAD SHA, base SHA y cantidad de archivos, junto con un digest SHA-256 canónico.

El conjunto de verdad se genera con un **oráculo reproducible separado del código de detección de Ultra Sentinel**, sin requisito de evaluador humano externo. Para cada caso positivo **y negativo** `(pr, rule, path, line, positive)` se exige evidencia concreta (regresión con fallo reproducido, comportamiento verificado, o control negativo contrastable) y conservación del SHA original. Las hipótesis de auditoría que no tengan prueba objetiva quedan fuera de las métricas de verdad; no hay permiso para autodeclararlas positivas o negativas por intuición. Mantener oculta la salida del candidato y del baseline durante la construcción del conjunto de prueba para evitar contaminación. Las mutaciones sintéticas son un banco separado, no sustituyen errores reales.

## Formato de datos

Paquete: `{ "schema": "ultra-sentinel-c2-blind-review-packet/v1", "repository": "cardenaspiero255-lang/gamehub-ultra", "cases": [{ "pr": 132, "headSha": "<40 hex>", "baseSha": "<40 hex>", "changedFiles": 21 }, ...] }`. El `digest` es SHA-256 del JSON canónico (esquema, repositorio y cuatro identidades de cohorte en orden fijo). Al verificar etiquetas firmadas se recalcula el digest sobre el paquete recibido: se rechazan discrepancias entre SHA y digest, PR fuera de cohorte, cambios de orden, campos adicionales y contenido inyectado. Un SHA bien formado sustituido con un digest nuevo exige cotejo de procedencia contra GitHub; el hash por sí solo no lo detecta.

Manifiesto de etiquetas: `{ "schema": "ultra-sentinel-c2-blind-labels/v1", "packetDigest": "<64 hex>", "labels": [{ "pr": 132, "rule": "SPEECH_REENTRANT_RETRY", "path": "app/src/main/java/.../Example.kt", "line": 42, "positive": true }, ...] }`. **Todos los valores de ejemplo son ilustrativos; no son hechos observados.**

`canonicalLabelManifest` valida formato y unicidad, ordena las etiquetas por PR/regla/ruta/línea y serializa con claves fijas. Para un recibo firmado: `Ed25519.sign(domain || canonical, reviewerPrivateKey)`. El dominio es `Ultra-Sentinel:C2:blind-labels:v1\n`. `verifyBlindLabelSignature` verifica la firma **solo frente a la clave pública que la operación suministra desde un origen confiable, nunca frente a una clave insertada en un PR**.

## Qué acredita y qué no

- Firma válida: los bytes firmados coinciden con el manifiesto de etiquetas y el paquete congelado. Cambios de SHA, línea, clasificación, reglas o hash invalidan el recibo.
- **No prueba independencia ni corrección:** una firma solo verifica integridad y procedencia de clave, no si las etiquetas son verdaderas. El propietario puede firmar el conjunto técnico para trazabilidad; **no se exige otra persona** y jamás se marcará ese recibo como `independentTruthCertified=true`. Evidencia de calidad procede de oráculos técnicos reproducibles y pruebas contrastadas.
- No prueba CI verde, umbrales de precision/recall, seguridad operativa, hardware Android ni Triple S+. El resultado mantiene `independentTruthCertified=false`, `tripleSPlusCertified=false`, `mergeAllowed=false` aun con criptografía correcta.
- El cambio de SHA invalida la campaña anterior. No usar outputs heredados del PR #158 ya fusionado como si correspondieran al #159.

## Procedimiento de aceptación

1. Ejecutar captura C2 read-only y congelar los cuatro HEAD/base SHA. Verificar que las cuatro muestras sean legibles y de identidad correcta.
2. Congelar el paquete sin las predicciones del candidato y baseline; fijar los diffs exactos como entrada a un análisis automático **separado**.
3. Construir etiquetas sustentadas en regresiones verificables, pruebas de comportamiento y controles negativos; registrar su evidencia por `(PR, regla, ruta, línea)`, las discrepancias y los casos no resueltos. Separar claramente mutaciones sintéticas de defectos reales.
4. Opcionalmente firmar el manifiesto con Ed25519 del propietario para trazabilidad; la firma no constituye validación independiente. La clave privada nunca debe cargarse en un PR, issue o workflow público.
5. Verificar SHA, origen de CI y evidencia de cada etiqueta antes de recalcular TP/FP/FN/TN y precisión/recall/F1. Reportar denominadores, límites y falsos negativos críticos. No certificar ni fusionar basándose solamente en un prescreen sintético.

**Estado actual: estructura técnica disponible; todavía no hay un corpus completo de etiquetas de defectos reales contrastados con oráculos reproducibles. Triple S+ NO CERTIFICADO.**

## Endurecimiento del paquete (integridad, no independencia)

`packages/quality-gates/c2-blind-packet-integrity.cjs` verifica forma exacta de los cuatro casos, identidades HEAD/base, límites de archivos y digest SHA-256 sobre el paquete realmente recibido. `canonicalLabelManifest` rechaza el paquete incoherente **antes** de aceptar la firma. Esta defensa impide reutilizar una firma legítima sobre bytes alterados y rechaza estructuras de cohorte manipuladas aunque se recompute su hash; no sustituye la comprobación externa del HEAD/base auténtico.

**Política vigente del propietario:** ningún humano externo, segundo propietario o aprobador de PR es obligatorio. Las etiquetas de verdad deben derivar de pruebas verificables de comportamiento y no de las predicciones de Ultra Sentinel. No crear etiquetas oportunistas para pasar umbrales, ni confundir hash/firma con corrección o verificación del SHA actual contra GitHub. El estado sigue `NOT_CERTIFIED` mientras falten los requisitos técnicos, sin usar falsamente el término «certificación independiente externa».

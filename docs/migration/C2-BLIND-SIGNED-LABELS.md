# Campaña ciega C2: paquete sin predicciones y etiquetas firmadas

La cohorte activa de GameHub #132, #159, #161 y #73 se evalúa sin mostrar al etiquetador los findings del candidato, el baseline ni los resultados de CI. `createBlindReviewPacket(capture)` solo exporta PR, repo, HEAD SHA, base SHA y cantidad de archivos, junto con un digest SHA-256 canónico.

El etiquetador obtiene por separado los diffs originales fijados a cada SHA y redacta casos positivos **y negativos** con `(pr, rule, path, line, positive)`; no debe ver los hallazgos de Ultra Sentinel antes de cerrar la etiqueta. Se deben incluir errores inéditos, variantes y rutas relevantes no detectadas por ninguno de los motores para medir FN verdaderos.

## Formato de datos

Paquete: `{ "schema": "ultra-sentinel-c2-blind-review-packet/v1", "repository": "cardenaspiero255-lang/gamehub-ultra", "cases": [{ "pr": 132, "headSha": "<40 hex>", "baseSha": "<40 hex>", "changedFiles": 21 }, ...] }`. El `digest` es SHA-256 del JSON canónico (esquema, repositorio y cuatro identidades de cohorte en orden fijo). Al verificar etiquetas firmadas se recalcula el digest sobre el paquete recibido y se rechazan SHA, PR, orden, campos adicionales y contenido inyectado, incluso cuando alguien recomputa el digest.

Manifiesto de etiquetas: `{ "schema": "ultra-sentinel-c2-blind-labels/v1", "packetDigest": "<64 hex>", "labels": [{ "pr": 132, "rule": "SPEECH_REENTRANT_RETRY", "path": "app/src/main/java/.../Example.kt", "line": 42, "positive": true }, ...] }`. **Todos los valores de ejemplo son ilustrativos; no son hechos observados.**

`canonicalLabelManifest` valida formato y unicidad, ordena las etiquetas por PR/regla/ruta/línea y serializa con claves fijas. Para un recibo firmado: `Ed25519.sign(domain || canonical, reviewerPrivateKey)`. El dominio es `Ultra-Sentinel:C2:blind-labels:v1\n`. `verifyBlindLabelSignature` verifica la firma **solo frente a la clave pública que la operación suministra desde un origen confiable, nunca frente a una clave insertada en un PR**.

## Qué acredita y qué no

- Firma válida: los bytes firmados coinciden con el manifiesto de etiquetas y el paquete congelado. Cambios de SHA, línea, clasificación, reglas o hash invalidan el recibo.
- **No prueba independencia:** la firma no demuestra que la clave pertenezca a un tercero, que el etiquetador no viera el modelo ni que las etiquetas sean correctas. Eso exige un revisor externo y acta de procedimiento, no autodeclaración en JSON.
- No prueba CI verde, umbrales de precision/recall, seguridad operativa, hardware Android ni Triple S+. El resultado mantiene `independentTruthCertified=false`, `tripleSPlusCertified=false`, `mergeAllowed=false` aun con criptografía correcta.
- El cambio de SHA invalida la campaña anterior. No usar outputs heredados del PR #158 ya fusionado como si correspondieran al #159.

## Procedimiento de aceptación

1. Ejecutar captura C2 read-only y congelar los cuatro HEAD/base SHA. Verificar que las cuatro muestras sean legibles y de identidad correcta.
2. Generar y entregar el paquete ciego al evaluador, **sin** exponer los findings del candidato ni los del baseline.
3. Que el evaluador analice los diffs originales del SHA y entregue etiquetas con explicación y control de conflictos por separado.
4. Cerrar el paquete y firmarlo con una clave Ed25519 cuya procedencia el propietario compruebe fuera del repositorio. La clave privada nunca debe cargarse en un PR, issue o workflow público.
5. Verificar firma, hash de paquete y manifest, recalcular métricas usando el evaluador existente, inspeccionar FP/FN e incertidumbre de los hallazgos semánticos. Aplicar umbrales internos y validación independiente adicional.

**Estado actual: protocolo implementado; no hay firmas externas ni etiquetas verificadas. Triple S+ NO CERTIFICADO.**

## Endurecimiento del paquete (integridad, no independencia)

`packages/quality-gates/c2-blind-packet-integrity.cjs` verifica forma exacta de los cuatro casos, identidades HEAD/base, límites de archivos y digest SHA-256 sobre el paquete realmente recibido. `canonicalLabelManifest` rechaza el paquete incoherente **antes** de aceptar la firma. Esta defensa impide reutilizar la firma legítima con un paquete alterado y detectar manifiestos firmados sobre una cohorte manipulada.

**El revisor independiente aún debe aportar etiquetas reales y registrar su procedencia fuera del mismo modelo y del PR.** No crear etiquetas propias para pasar umbrales, ni confundir hash/firma con independencia o verificación del SHA actual contra GitHub. La certificación sigue `NOT_CERTIFIED` hasta la comprobación externa de todos los gates.

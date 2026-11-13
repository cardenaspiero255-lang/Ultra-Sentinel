# Ultra Sentinel — Fase 2, Bloque 2.5c: v3 congelado, cohorte datetime ciega

Este protocolo ejecuta exclusivamente Hunter v3 congelado por Git SHA
`49235f854c61c29d55a0307ce4a0348553b2ee1f` (árbol
`411a9f24a07a57d21e918c022d1ec8442456537a`) contra seis blobs Kotlin originales de
`Kotlin/kotlinx-datetime@77c95cc8125015f83ea8fd900404c295fba7276e`, con selección comprometida
en PR #388 antes de inspeccionar código y dos oráculos Kotlin/JVM comprometidos en PR #389
antes de ejecutar Hunter. No se reutilizan las cohortes antiguas de coroutines (8) o IO (6).

## Cadena de confianza en dos jobs

1. `frozen-v3-source-only-capture` autentica Git HEAD, árboles y SHA de los seis blobs,
   verifica que están en rutas consultivas permitidas y prepara inventarios estrictos sin
   metadatos de defectos, oráculos ni reparaciones. Invoca exactamente cuatro workers originales
   congelados (numérico, códec, identidad y cancelación), cada uno en Bubblewrap/AppArmor
   sin red, con módulos e inventario únicamente, no con acceso al repositorio ni a los
   oráculos. Verifica los reports, sus rutas/bytes/estados y SHA-256, y **sube el artefacto
   sellado antes de ejecutar cualquier oráculo**.
2. `independent-datetime-oracles-after-seal` depende estrictamente de la publicación exitosa
   del artefacto. Descarga los cuatro reports y sello, verifica integridad; solo después
   autentica de nuevo los originales, el sello de oráculos preexistente y ejecuta en un
   sandbox distinto sin red los dos contratos JVM originales preparados en #389:
   `BinaryReaderOracle.kt` y `CalendarOracle.kt`. No vuelve a
   ejecutar ni ajustar Hunter después de leer respuestas. Publica un veredicto separado.

## Interpretación

Incluso si los cuatro workers escanean los seis archivos correctamente, eso demuestra
**cobertura**, no descubrimiento causal. El número de hipótesis permanece **sin verificar**
hasta que exista un oráculo original específico de esas hipótesis. Dos oráculos benignos
acotados comprueban contratos de tres archivos parcialmente, no el universo de defectos
de los seis; tres carecen por completo de control y ninguno tiene una etiqueta exhaustiva.

No se calculan precisión, recall, F1 ni falsos positivos/negativos globales. Tampoco se
declara una nueva familia de cancelación confirmada, reparación automática, RED→GREEN,
Judge, veto, rollback, permisos de escritura o certificación Triple S+. La Fase 2 permanece
abierta si falta una causa nueva con verificación funcional independiente.

Los resultados reales (conteos y estado) deben proceder del **artefacto inmutable y los
dos jobs exitosos del commit exacto**, nunca del texto de este plan.

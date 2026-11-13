# Fase 2 · Bloque 2.5d — Oráculo original Ktor precomprometido

Este trabajo depende del **manifiesto ya fusionado** en el PR #392: siete fuentes Kotlin originales de `ktorio/ktor@599e1340c718e501bf5fba080b0ade00b49a893f`, seleccionadas por metadatos de Git después de congelar Hunter v4 (`84c824ce6bfe3d260296108e955bbbc4624e6b7e`).

## Primer contrato funcional independiente

Un fichero JVM nuevo `ConnectTimeoutOracle.kt` construye casos de `java.net.ConnectException` con y sin mensajes de timeout y comprueba el método original `isTimeoutException()`, compilando **el archivo auténtico e inalterado** `ApacheUtils.kt`. El archivo de contrato y sus SHA Git y SHA-256 están fijados previamente en `oracle-seal.json`.

Este es un **control benigno acotado**, no una prueba de que las siete fuentes originales carecen de defectos, ni una prueba de la nueva familia de cancelaciones. Solo `ApacheUtils.kt` tiene un control parcial; los otros seis archivos no están cubiertos por oráculos funcionales. Ninguno tiene verdad completa.

La CI autentica los siete objetos Git originales, vuelve a verificar la procedencia de Hunter v4, valida el hash del contrato y **compila sin ejecutar** el oráculo en Kotlin 2.0.21 / JDK 21 dentro de Bubblewrap/AppArmor sin red. No monta respuestas en los workers ni ejecuta Hunter durante esta etapa.

Un siguiente experimento deberá sellar todas las predicciones v4 **antes** de ejecutar este oráculo en un job independiente. Si no hay hallazgos originales, se documentarán cero hipótesis, no se repetirá la cohorte ni se mejorará Hunter usando sus respuestas. Sin verdad completa, precisión/recall/F1 permanecen `null`.

**La Fase 2 sigue abierta:** no existen todavía descubrimiento ciego de familia nueva ni reparación causal original verificada por Judge con veto/rollback.

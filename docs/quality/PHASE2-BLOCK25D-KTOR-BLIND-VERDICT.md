# Ultra Sentinel — Fase 2, Bloque 2.5d: cuarta evaluación ciega Ktor con Hunter v4

Motor **congelado**: `84c824ce6bfe3d260296108e955bbbc4624e6b7e`.
Árbol Git: `db929ca1233215e47de164201ff69d9b4cb1808e`.

Cohorte original **nueva y precomprometida**: siete archivos inalterados de `ktorio/ktor@599e1340c718e501bf5fba080b0ade00b49a893f`, compromiso de metadatos en PR #392 y un único oráculo JVM acotado precomprometido con SHA-256 en PR #393. Estos pasos se completaron **antes de ejecutar Hunter v4 sobre esta cohorte**.

## Protocolo inmutable

1. Autenticación exacta del commit original, árbol, pertenencia de los siete blobs y SHA de cada archivo, sin retirar casos difíciles.
2. Ejecución en Bubblewrap sin red de los cuatro workers originales congelados: numérico, códec, identidad y cancelación con guardas v4. Los inputs contienen únicamente el inventario original de fuentes, sin oráculos, etiquetas, reparaciones ni respuestas.
3. Verificación de todos los reports sin autoridad para reparar y publicación de los cuatro informes y un SHA-256 del sello. **El job original debe terminar exitosamente y publicar el artefacto antes de ejecutar el siguiente.**
4. Un segundo job dependiente descarga y verifica SHA-256 de todos los reports; autentica nuevamente los siete blobs y el sello de oráculos previo, luego compila y ejecuta el oráculo `ApacheUtils.kt` original frente a la tabla independiente de `java.net.ConnectException` en otro sandbox sin red. Publica el veredicto separado, vinculado a las predicciones selladas.

## Regla de evidencia

El ensayo ciego no garantiza detecciones. Una hipótesis es solamente candidata hasta confirmación funcional específica de ese mismo defecto original. El único oráculo actual prueba **comportamiento benigno parcial de un archivo**; los otros seis no tienen verdad y ninguno de los siete está completamente etiquetado. Precisión, recall, F1, falsos positivos y negativos quedan indefinidos hasta contar con verdad suficiente.

Tampoco se declara reparación automática, veto o rollback de un defecto original ni certificación Triple S+. No se reentrenará ni reajustará Hunter v4 sobre estos siete archivos después de revelar resultados; pasarán a ser casos expuestos al finalizar la corrida.

**Los resultados numéricos reales deberán extraerse del artefacto de predicción y del job posterior a los oráculos, no presumirse a partir del código o de la documentación.** La Fase 2 seguirá abierta si no se demuestra una familia nueva con causalidad y reparación funcional independientes.

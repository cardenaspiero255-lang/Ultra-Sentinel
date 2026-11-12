# Ultra Sentinel — Fase 2, Bloque 2.4c: prueba ciega de Hunter v2 con Kotlin IO

El Bloque 2.4 incorpora una versión nueva y congelada del **motor de análisis**, no una modificación retroactiva del PR #380. La ampliación es exclusivamente consultiva y no concede permisos adicionales a Judge/Fixer.

## Identidades comprometidas antes de la ejecución

- Hunter v2: `34679a71aed54abbc3ecbffbf29299cfb25f65b8`, árbol Git `c6a0cdc3d2fa10843d4f58c8bec0c15e222176e2`.
- Cohorte nueva: seis archivos directos Kotlin de `Kotlin/kotlinx-io@cf40e5ba7cd99ba812177d597a9f6ce0570545b1`, scope `bytestring/common/src`, árbol `b94f506ed869ac50eff051ba70c43e290bb9d90d`. Selección y hashes Git consignados en un commit previo a la lectura de código original.
- Dos oráculos originales precomprometidos mediante SHA-256: `ByteStringBuilder.kt` y `Random.kt`, compilados con stubs declarados que limitan el alcance. Cuatro archivos originales no tienen oráculo de comportamiento. No se modificó la selección después de conocer su código.
- La cohorte antigua `Kotlin/kotlinx.coroutines`, ocho archivos del Bloque 2.3, está revelada y no puede computarse nuevamente como desconocida.

## Orden físico de evidencia

Primero el job `frozen-v2-source-only-capture` autentica commit, árboles, los seis blobs originales completos y la política del checkout congelado, ejecuta tres workers originales (numérico, códec e identidad) con inventarios de fuentes **solo en Bubblewrap/AppArmor sin red**, sin oráculos ni respuestas montadas; verifica la cobertura exacta de seis archivos y publica los tres informes brutos y su sello SHA-256. Ningún hallazgo en esta etapa acredita un defecto.

Únicamente después de completar y publicar el artefacto, el job dependiente `independent-kotlin-oracles-after-seal` descarga/verifica los hashes, comprueba de nuevo el sello de oráculos del Bloque 2.4b y ejecuta dos contratos Kotlin/JVM con herramientas originales fijadas en un sandbox separado. No se vuelve a correr ni a reajustar Hunter después de abrir los oráculos.

## Evaluación

El éxito de los seis archivos **escaneados** mide cobertura de ruta y ausencia de abstenciones de entrada, no desempeño general de descubrimiento. Cualquier hipótesis sin causa original y oráculo funcional de ese defecto sigue **sin verificar**. No hay universo de negativos/positivos completamente etiquetado. Precisión, recall, F1, falsos positivos/negativos y «familias nuevas encontradas» no se atribuyen y permanecen nulos o no acreditados.

Si los controles funcionales benignos pasan, ello demuestra exclusivamente esos contratos originales con stubs, no el conjunto completo de Kotlin IO, tampoco reparaciones RED→GREEN, juez independiente, veto ni rollback. Ningún resultado de este bloque habilita reparación protegida, fusión automática de parches ni certificación Triple S+.

Los resultados reales deben consultarse en los artefactos de GitHub Actions asociados al **SHA exacto** del PR. No declarar completo el bloque si alguno de los jobs o sus pasos necesarios falla o se omite.

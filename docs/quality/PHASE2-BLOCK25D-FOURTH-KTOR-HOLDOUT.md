# Fase 2 · Bloque 2.5d — Cuarta cohorte original reservada

Esta cohorte se seleccionó **después** de fusionar Hunter v4 en el PR #391 y congelar por commit `84c824ce6bfe3d260296108e955bbbc4624e6b7e` y árbol Git `db929ca1233215e47de164201ff69d9b4cb1808e`. El detector no se ajustará después de conocer sus fuentes o resultados.

## Fuente y criterio prospectivo

Repositorio distinto: `ktorio/ktor`, SHA `599e1340c718e501bf5fba080b0ade00b49a893f`, árbol raíz `af2e96c115bd52230de937928f0231f5a0a76ad7`. El criterio de selección utiliza solamente el árbol Git completo de archivos de producción Kotlin: primer directorio en orden lexicográfico que contenga entre **seis y ocho** archivos `.kt` inmediatos con tamaños entre 50 y 12.000 bytes, descartando rutas de pruebas, `build`, `fixtures` o generadas, y respetando la política consultiva de Hunter.

Resultado obligatorio: **siete** blobs Kotlin originales de `ktor-client/ktor-client-apache5/jvm/src/io/ktor/client/engine/apache5`. Se fijan nombres, tamaños, hash Git de cada blob, árbol del directorio y commit de origen en `PHASE2-BLOCK25D-KTOR-METADATA-20261112.json`. Un verificador reproduce la elección desde todo el árbol Git y rechaza archivos adicionales, sustituidos, rutas modificadas, symlinks, blobs incorrectos o cambio del motor congelado.

No se leyó el cuerpo de ningún archivo Kotlin antes de comprometer el manifiesto de metadatos. La CI autentica después sus objetos exactos y publica solo identificadores y SHA-256. **No ejecuta Hunter ni oráculos.**

Las tres cohortes anteriores —8 archivos de `kotlinx.coroutines`, 6 de `kotlinx-io` y 6 de `kotlinx-datetime`— están expuestas y permanentemente excluidas de todo nuevo ensayo ciego.

## Frontera de evaluación

La siguiente entrega deberá preparar un oráculo independiente Kotlin/JVM y, cuando sea posible, controles benignos y positivos precomprometidos en Git **antes** de cualquier predicción. Si los siete archivos no permiten construir contratos funcionales independientes sin alterar el sistema ni revelar la causa a Hunter, habrá que declarar la limitación sin retirar ni reemplazar retrospectivamente el conjunto.

Una evaluación ciega posterior debe ejecutar exclusivamente v4 congelado en aislamiento sin red, guardar todas las predicciones y abstenciones con SHA-256, publicar el artefacto sellado, y solo después ejecutar los oráculos en un job separado. Sin verdad funcional completa, no se reportarán precisión, recall ni F1. El fixture sintético usado para validar el scanner v4 no es una fuente original reservada ni prueba descubrimiento novedoso.

**La Fase 2 y el Bloque 2.5d siguen abiertos**: faltan generalización funcional sobre código original, contrafactual causal, reparación verificada y veto/rollback originales. No se han ampliado permisos de Fixer o Judge ni autorizaciones remotas.

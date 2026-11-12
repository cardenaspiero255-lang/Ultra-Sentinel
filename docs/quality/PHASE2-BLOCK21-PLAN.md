# Fase 2, Bloque 2.1 — congelación prospectiva (12-11-2026)

**Estado: únicamente preparación. NO se ha ejecutado una evaluación.**

## Motor realmente congelado

La versión de Hunter es el merge de [PR #380](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/380):

- Commit `3668a4ff860c49c5aaf69a594efc4fa48d94def3`.
- Árbol **completo** `09b8e8a9e598c4c1184fb0b97617cc3b2ff9c73e`, incluyendo todas las dependencias existentes, políticas, workers y pruebas, no únicamente los módulos destacados.
- Los once blobs relevantes están enumerados con SHA Git en `PHASE2-BLOCK21-FREEZE-20261112.json` para facilitar la auditoría.
- El verificador compara estos identificadores contra **objetos Git locales originales** desde el commit fijado; no acepta como motor la implementación de HEAD del PR nuevo. Deshabilita `git replace` y no lee fuentes externas.

## Cohorte nueva, seleccionada exclusivamente por metadatos

Repositorio externo `Kotlin/kotlinx.coroutines`, commit `ead082131ceb45b8e4fda027c74471103c1cd09f`, árbol Git raíz `6c999bde5fe9f473d1418e67127d06dbb4306426`. Regla fijada antes de leer fuentes: **todos los ocho archivos `.kt` hijos directos** de `kotlinx-coroutines-core/common/src/flow`, árbol del directorio `3937a995d91588afdba190d90755c347a4afa80a`. El JSON contiene exclusivamente rutas, SHA de blobs y tamaños provenientes de GitHub. No se seleccionaron líneas, métodos, fallos ni etiquetas basándose en el contenido.

Los identificadores se han consultado como metadatos de la API de GitHub; **no se han descargado ni autenticado localmente los objetos Git externos**. La confirmación byte a byte de los ocho blobs, el inventario total y la elegibilidad del detector pertenece al bloque posterior. No se garantiza que contengan defectos o que representen una muestra estadística. No se conoce ni afirma disyunción de entrenamiento.

## Barreras irrevocables para esta cohorte

1. No retocar el motor congelado durante la evaluación de estos ocho archivos. Cualquier mejora posterior constituye una versión nueva y necesita otra cohorte reservada.
2. Antes de ejecutar Hunter, comprobar identidades de árbol/blobs externos y preparar un oráculo Kotlin/JVM funcional independiente cuya huella sea comprometida **antes** de emitir predicciones. Mantener separado el oráculo de los workers.
3. Ejecutar únicamente los workers del commit congelado en sandbox sin red y sin acceso a oráculos, respuestas ni parches. Sellar informes crudos completos antes de abrir el oráculo; los archivos no admitidos cuentan como abstenciones, no como negativos.
4. Usar controles benignos y casos positivos verificables. Sin un universo completo etiquetado no calcular precisión/recall/F1 ni afirmar número global de falsos positivos.
5. Un resultado sin hallazgos **no** es prueba de corrección ni un éxito de detección. Reparaciones generadas a mano no prueban Fixer automático.
6. No habilitar escrituras, fusiones, permisos, reparaciones remotas ni certificados Triple S+ a partir de la preparación o de los resultados.

## Criterio de cierre exclusivo del Bloque 2.1

Un PR que añada el manifiesto byte-pinneado, su validador de solo lectura, pruebas RED → GREEN y el workflow que verifica en Git el **commit/árbol original** y sus blobs. CI obligatoria aprobada sobre el SHA exacto. Quedan expresamente para los siguientes bloques: lectura o ejecución sobre fuentes Kotlin, oráculos, predicciones, puntuación, generación de parches y verificación de familias nuevas.

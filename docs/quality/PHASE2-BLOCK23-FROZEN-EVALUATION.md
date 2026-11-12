# Ultra Sentinel — Fase 2, Bloque 2.3: ejecución y abstención del Hunter congelado

**Alcance exclusivo:** ejecutar el motor congelado del PR #380 sin adaptarlo a la cohorte ya comprometida, sellar los informes ANTES de ejecutar cualquier oráculo independiente y publicar el resultado verificable. La publicación de este documento no es evidencia de una ejecución aprobada: la evidencia está en los jobs y artefactos del SHA concreto.

## Integridad de la evaluación

- Hunter original: commit `3668a4ff860c49c5aaf69a594efc4fa48d94def3`, árbol `09b8e8a9e598c4c1184fb0b97617cc3b2ff9c73e`. Ningún módulo de Hunter, regla, política o detector fue modificado.
- Cohorte original: `Kotlin/kotlinx.coroutines@ead082131ceb45b8e4fda027c74471103c1cd09f`, ocho blobs Git congelados previamente, seleccionados en el Bloque 2.1. Sin reetiquetar rutas, alterar fuentes, reducir la cohorte ni seleccionar ejemplos después de ver las respuestas.
- Oráculos: seis fuentes y dos controles Kotlin/JVM sellados en el Bloque 2.2, mediante `oracle-seal.json`. Son pruebas benignas limitadas a `FlowCollector.kt` y `SharingStarted.kt`, no un universo etiquetado de defectos.
- Todos los ocho archivos utilizan `kotlinx-coroutines-core/common/src/flow/*.kt`, fuera de la política de rutas del **motor congelado** (`src/main`, `src/commonMain`, `src/jvmMain`, etc.). Este bloqueo de cobertura es un resultado del diseño prospectivo y no se disimula.

## Dos jobs vinculados y en orden irreversible

1. **`frozen-blind-capture`: checkout del motor original por SHA; autenticación de Git de todos los ocho archivos; preparación de inventarios de fuentes originales con sus rutas sin corregir; prueba de aislamiento de Bubblewrap/AppArmor sin red; invocación de los tres workers originales (numérico, códec, identidad) en un sandbox con solo sus módulos y el inventario, **sin montaje de oráculos, checkout externo ni respuestas**. En el resultado esperado, cada worker rechaza la cohorte no admitida. El protocolo exige código de rechazo exacto, mensaje esperado y ausencia de archivo de hallazgos: no acepta problemas de infraestructura ni una ejecución sorpresivamente exitosa como abstención. Publica un artefacto inmutable SHA-256 de abstenciones antes del segundo job.
2. **`independent-scoped-oracles-after-seal`: solo empieza después de que el primer job publique con éxito el artefacto sellado. Descarga y verifica su digest, autentica los archivos del Bloque 2.2, compila fuentes Kotlin originales mediante el compilador 2.0.21 fijado y ejecuta los dos contratos Kotlin/JVM en un sandbox separado sin red. El veredicto nunca interpreta el resultado de esos controles como un falso positivo, un defecto original confirmado o una reparación.

## Lectura correcta del resultado

Si los tres workers se niegan a analizar los ocho archivos, la recepción debe indicar **8 abstenciones, 0 archivos analizados, 3 procesos invocados**. No significa «ocho negativos», «cero falsos positivos» ni «código sin defectos». Las métricas globales precisión, recall y F1 siguen en `null`.

Si ambos oráculos pasan, solo se han verificado **dos controles benignos acotados**; seis archivos siguen sin verdad funcional. Los oráculos contienen stubs para compilar dependencias de las rutas acotadas, de modo que no acreditan todo el runtime de coroutines. No hay adjudicación humana independiente. **No se ha demostrado descubrimiento de defectos/familias nuevos, Fixer, Judge, RED→GREEN, veto ni rollback**.

Cualquier intento de modificar la política de rutas del motor #380 para obtener detecciones sobre esta misma cohorte destruiría la condición de evaluación congelada. La eventual **Fase 2, Bloque 2.4** podrá cambiar el motor *en otra versión y otro conjunto nuevo*, sin reusar estos ocho archivos como holdout no visto.

La CI general puede contener omisiones de tests de aislamiento que requieren un runner específico; este workflow exige su propia comprobación real de Bubblewrap/AppArmor y no permite sustituirla por un skip.

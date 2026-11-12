# Fase 2 · Bloque 2.4a — nueva autoridad consultiva de rutas Kotlin

**Este PR modifica la versión sucesora de Hunter, no el commit congelado del PR #380.**

## Cambio acotado

La política previa `isSafeNovelKotlinPath` continúa idéntica y sigue siendo la única autoridad de rutas para Judge, Fixer y reparaciones protegidas. Una nueva función, `isSafeHunterKotlinPath`, añade exclusivamente para **análisis consultivo de Hunter** los árboles Kotlin históricos:

- `module/common/src/**/*.kt`
- `module/jvm/src/**/*.kt`
- `module/android/src/**/*.kt`

La profundidad de los módulos y longitud de las rutas siguen acotadas. No se admiten rutas de pruebas, fixtures, `testData`, archivos generados, `build`, traversal, separadores Windows, rutas absolutas, extensiones ajenas a Kotlin ni directorios sospechosos.

La versión v2 del protocolo cambia la política utilizada por los escáneres numérico, códec e identidad, y por los preparadores de inventarios que suministran sus fuentes. **No modifica sus reglas de detección**, la autenticación de hashes Git, el aislamiento Bubblewrap ni los requisitos de oráculos independientes.

## Orden prospectivo obligatorio

1. Aceptar este PR únicamente después de CI completa y congelar el **SHA del merge** y su árbol Git, incluidos los módulos y dependencias consultivas; no volver a modificar esta versión durante la prueba.
2. **Después** del congelamiento, elegir un repositorio/fuentes Kotlin originales de otra cohorte, distintos de los ocho archivos ya examinados de `Kotlin/kotlinx.coroutines`. Seleccionar por un criterio metadatos previamente comprometido, nunca por los fallos conocidos.
3. Comprometer criptográficamente fuentes y oráculos de controles benignos/positivos independientes **antes** de cualquier predicción. Registrar explícitamente fuentes no admitidas y abstenciones.
4. Ejecutar el motor v2 congelado con workers aislados sin oráculos ni respuestas; sellar todo el resultado antes de ejecutar oráculos.
5. Declarar tasas de precisión/recall únicamente si existe verdad original completa. Un caso sin positivos demostrados no acredita una familia nueva, aunque la cobertura de rutas sea mejor.

La cohorte de los Bloques 2.1–2.3 queda definitivamente marcada **revelada** y no se reutiliza como prueba ciega. Ningún resultado de esta etapa autoriza cambios remotos o certifica Triple S+.

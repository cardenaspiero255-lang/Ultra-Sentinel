# Ultra Sentinel, Fase 2 — Bloque 2.2: autenticación y oráculos prospectivos

**Alcance: solo preparación y compilación.** Ningún Hunter, oráculo funcional, scoring, Fixer ni Judge se ejecuta aquí. El motor continúa fijado al SHA y árbol del PR #380; el manifiesto inalterable es `PHASE2-BLOCK21-FREEZE-20261112.json` (Git blob `3c1a8036ec8e880c0d474ce9de6cd263feefc862`).

## Procedencia e identidad

La cohorte externa fue elegida en el Bloque 2.1 por la totalidad de los ocho `.kt` hijos directos del directorio `kotlinx-coroutines-core/common/src/flow` de `Kotlin/kotlinx.coroutines@ead082131ceb45b8e4fda027c74471103c1cd09f`. La CI nueva descarga esa revisión inmutable y verifica HEAD, árbol raíz, árbol del directorio, inventario completo de ocho Kotlin, modo Git, SHA-1 de objeto Git **recalculado a partir de los bytes originales**, tamaño y SHA-256 de contenido. Si falta o cambia un solo archivo, falla cerrada. No usa `git replace`. No ejecuta código del repositorio externo.

## Oráculos separados y comprometidos antes de predicciones

El archivo `tests/fixtures/phase2-block22-oracle/oracle-seal.json` incluye un compromiso SHA-256 de los seis archivos originales de oráculos/stubs y los blobs de los ocho archivos externos. Se registra en este PR **antes de cualquier predicción** de Hunter. Las suites compiladas contra **fuentes originales exactas** se limitan a:

1. `FlowCollector.kt`: contrato benigno de SAM `suspend` y propagación de excepciones, sin claims sobre procesos concurrentes.
2. `SharingStarted.kt`: validación de argumentos negativos, equivalencia, hash y representación de configuración, usando stubs mínimos para APIs de flow que no se ejercitan.

En ambos casos, los oráculos son pruebas elaboradas separadamente de las reglas de Hunter y de la selección de la cohorte. **Las seis fuentes restantes no tienen oráculo ni etiqueta**. No hay un caso positivo de defecto original confirmado, por lo que **no existe base para calcular recall o demostrar detección novedosa**. La persona que escribió los oráculos no es un evaluador humano independiente.

La CI verifica el sello y **compila**, con Kotlin 2.0.21/JDK 21, las fuentes originales y los oráculos en Bubblewrap/AppArmor sin red, con fuentes montadas en solo lectura. **NO ejecuta los `main()` de los oráculos ni publica resultados de verdad**. Las respuestas quedan diferidas hasta después de las predicciones selladas, en el Bloque 2.3, con aislamiento estricto: al worker no se le montan archivos de oráculo ni informes de compilación.

## Cierre técnico de Bloque 2.2

Se considera preparado cuando CI del SHA exacto:
- Autentica y publica los ocho objetos Git externos y sus SHA-256.
- Confirma la inmutabilidad de los archivos de compromiso de oráculo.
- Compila ambos oráculos sobre código Kotlin original en un sandbox sin red; si no compilan, el bloque permanece abierto.
- Conserva el resultado `frozenHunterExecuted=false`, `oracleExecuted=false`, `positiveOriginalDefectsVerified=false` y todas las métricas globales en `null`.

No alterar el motor congelado, introducir casos positivos sintéticos como originales ni declarar Triple S+ certificado. **No iniciar Bloque 2.3 en este PR.** Si no aparece ningún defecto original positivo en la evaluación futura, registrar el resultado negativo y no manipular la selección de la cohorte.

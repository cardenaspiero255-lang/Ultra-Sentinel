# C2 — reconciliación de las 12 identidades históricas pendientes

**Fecha:** 2026-10-21. **Alcance:** pruebas de procedencia y revisión causal sobre un overlay derivado de las 23 etiquetas históricas originales. Esta tarea no cambia el código de GameHub, el Core, las etiquetas GOLD, la cohorte de holdout ni el sello original Run23.

## Cadena original y contrafactual

La lista cerrada de las doce identidades procede de la salida autenticada de [PR #179, owner run #39538354430](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39538354430), archivo `12318194179`. La cola de prioridad autenticada proviene de [run #39544945791](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39544945791), archivo `12321306801`. Ambas entradas son **históricas de entrenamiento/desarrollo**, nunca ejemplos ciegos.

Los oráculos originales se ejecutaron en los ocho workflows propietarios siguientes. Todos sus runs, Git commits y ZIP SHA-256 se fijan y revalidan con API GitHub read-only; cada recibo se coteja por la tupla **(PR, HEAD Git, blob, regla, ruta, línea, polaridad y digest de evidencia)**. Compartir PR, blob, archivo, clase o tipo de fallo nunca constituye independencia causal.

| Run original | Identidades | Método contrafactual original |
|---|---|---|
| [39057159822](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39057159822) | #152:110 | JSON original frente a copia corregida; control de JSON ordinario |
| [39059101315](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39059101315) | #158:114 | TTL original y copia que conserva tiempo de observación real |
| [39067708985](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39067708985) | #151:22 | Presentación original versus `take(3)` mutante |
| [39070029033](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39070029033) | #155:12, #158:50 | Validación `isFinite`; mutante de ruta LOCAL→research |
| [39071144969](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39071144969) | #154:100, #150:167 | Guardia de discriminante finito; permutación de STOP/INTERRUPT |
| [39075155081](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39075155081) | #151:293, #154:73 | Mutación de falsa alerta de batería; `minimumSamples>=3` versus `>=2` |
| [39076132177](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39076132177) | #158:144 | Requisito temporal `currentQualifierPattern` en copia corregida |
| [39077240648](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39077240648) | #152:41, #151:185 | Control de monotonía de versión; mutación del guard de sesión ajena |

## Interpretación de la evidencia

La etapa de reconciliación **no vuelve a ejecutar Kotlin**: autentica los workflows originales y verifica los recibos conservados, incluida la identidad exacta de cada etiqueta. El hecho de que un oráculo tenga una corrección o un mutante original no demuestra que una causa positiva sea independiente de las demás. En particular, el umbral no finito de batería #155:12 no puede contarse como nueva familia distinta de todas las otras verificaciones de entradas no finitas por simple diferencia de archivo o PR. Los seis controles negativos no cuentan como causas positivas.

Toda admisión posterior exige: contraste causal separado con el original y un parche mínimo, controles benignos, prueba de alcance y diferencia funcional, ausencia de dependencia/familia ya contabilizada y revisión de cada causa, no de cada línea. Una corrección de desarrollo no acredita un benchmark ciego.

## Resultado y límites

La salida solo puede declarar `ownerOriginalOraclesReconciled=12`, `ownerSourceStagesReconciled=8`, `positiveSourceReceiptsReconciled=6`, `negativeSourceReceiptsReconciled=6`, y **`counterfactualJVMExecutionsThisRun=0`**, `causalIndependenceAdjudicationsAdded=0` y `remainingWithoutIndependentCausalAssessment=12`. El corpus sigue siendo de **23 (11P, 12N)**, sin nuevas etiquetas, con cuatro familias positivas provisionales previas, ninguna causa independiente añadida, sin holdout, `precision=recall=f1=null` y **SSS+ `NOT_CERTIFIED`**.

Este PR se apila sobre #179 y no debe fusionarse antes de su PR base ni sin la totalidad de checks de HEAD en verde. No se adjudican automáticamente las 12 causas.

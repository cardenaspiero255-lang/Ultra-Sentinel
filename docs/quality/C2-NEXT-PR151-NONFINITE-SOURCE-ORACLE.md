# C2 — hipótesis reproducible de margen térmico no finito en GameHub #151

**Lote congelado:** [Actions #38856860621](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38856860621), artefacto `12027755925`, digest `f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34`. PR #151 HEAD `9ad983576c16c6c34d59283979d83c69ede50dce`, base `c594cb5383591d5040b1e88930fc76a5e5c9c6fa`; fichero original `AiSessionCoach.kt`, blob SHA `adb11032b9b7f62f865228dfa1c27258ca3fa0df`.

## Predicado técnico definido antes de leer el detector

`AiSessionCoach.midSession()` en la línea 264 comprueba `!headroom.isNaN()` pero no `isFinite()`. Una lectura `Float.POSITIVE_INFINITY` no es un margen térmico válido; aun así supera `>= 0.80f` y produce alerta. Los métodos `preSession` y `recurringPatterns` también procesan el infinito como señal de presión térmica; este es **un solo defecto de validación de un tipo de telemetría** en el archivo, no tres positivos diferentes.

El oráculo ejecuta el **Kotlin original sin cambios**, sin consultar predicciones: nivel alto finito debe alertar, bajo finito no; `null` y `NaN` no deben producir alarma, y se comprueba explícitamente que el infinito sí la produce, incluyendo otros dos consumidores de la señal. Un stub contiene únicamente la dependencia pública `GamingReadiness`; ninguna versión simulada de `AiSessionCoach` sustituye el original.

## Evidencia, alcance y prohibiciones

En el workflow `c2-next-pr151-nonfinite-headroom.yml` se autentican ejecución y artefacto del congelado, actor propietario, SHA HEAD y Git blob exacto; se compila con Kotlin y ejecuta bajo Bubblewrap/AppArmor sin red, token ni permisos de escritura. El resultado JSON minimizado se guarda solo si todas las pruebas dan el resultado exigido. El workflow de smoke del PR repite la compilación independiente antes de fusionar.

Hasta que el workflow propietario **pase y otro procedimiento de sellado compruebe su artefacto**, el defecto sigue siendo una hipótesis; `positiveFindingLabelsSealed=0`. Incluso después, no se convierte automáticamente en una medición de falsos negativos globales, precisión, recall o F1. El ensayo demuestra cómo responde el código a un valor inválido: **no demuestra que hardware Android real haya enviado Infinity**, ni que el detector haya emitido un hallazgo ni que el antiguo baseline sea equivalente. No hay evidencia de independencia humana externa, que el usuario no exige.

La verdad parcial preexistente de cuatro casos (#152, #153 positivos; #157, #158 negativos acotados) no se modifica, ni se entrena con este holdout. El objetivo sigue siendo congelar ≥120 etiquetas auténticas con negativos y positivos variados, adquirir *todas* las predicciones de **ambos motores sobre idénticos PR**, resolver hallazgos inesperados antes de calcular cifras y obtener evidencia de no regresión de FP y fallos críticos. Estado de certificación `NOT_CERTIFIED`.

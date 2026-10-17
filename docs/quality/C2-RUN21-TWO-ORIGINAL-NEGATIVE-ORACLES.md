# C2 Run 21 — dos controles originales candidatos a sello (18 → 20 solo si CI real pasa)

## Objetivo y límite

Romper el patrón de añadir scripts sin nuevas etiquetas comprobadas: este lote ejecuta **Kotlin original inmutable** de GameHub #151 y #154, con una prueba de comportamiento seguro y una mutación que debe fallar por caso. Esta evidencia es de **desarrollo histórico**, no un nuevo holdout independiente. No ejecuta detectores ni calcula precision/recall/F1. No atribuye defectos a los controles negativos.

### Control A — aumento de batería sin alerta falsa

- GameHub PR #151 HEAD `9ad983576c16c6c34d59283979d83c69ede50dce`.
- `AiSessionCoach.kt:293`, Git blob `adb11032b9b7f62f865228dfa1c27258ca3fa0df`.
- Regla `SESSION_COACH_BATTERY_INCREASE_NO_FALSE_DROP_ALERT`: el código original debe alertar con una disminución relevante pero NO alertar ante un aumento (55 → 65).
- Mutación de sensibilidad: anular temporalmente el retorno que descarta cambios irrelevantes. La mutación debe crear exactamente la falsa alerta de batería.
- Llamador de producción: `SessionCoachMonitorService.kt` en el mismo commit, blob `ef69341a61164bbd69832f26186e48582c1b3042`, utiliza `AiSessionCoach.midSession`.

### Control B — política térmica que rechaza insuficientes muestras

- GameHub PR #154 HEAD `858c9ce5cb6a7916d63f2348432013e49d02ba79`.
- `ThermalPredictionEngine.kt:73`, Git blob `3ecb3b3893d8f710dd7f5203f8378bc784841baf`.
- Regla `THERMAL_POLICY_REJECTS_UNDERSAMPLED_CONFIGURATION`: `ThermalPredictionPolicy(minimumSamples=3)` debe permitirse y `minimumSamples=2` debe rechazarse conforme al contrato original.
- Mutación de sensibilidad: sustituir el límite `>=3` por `>=2` solo en una copia temporal. Debe violar el contrato.
- Llamador de producción: `PerGameAdaptiveRuntime.kt` en el mismo commit, blob `fea7454b92c812beb968f4b5f5af55f3e04e071c`.

## Acreditación operativa obligatoria

El nuevo flujo `.github/workflows/c2-run21-original-negative-oracles.yml` revalida el **sello previo de 18** de [Actions #39071144969](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39071144969), artefacto `12115670408`, digest ZIP `aa2d483e887b7b89bb44aca2537744233f9307ebb8f9e24236e2c813ddab5507`. Descarga fuentes y llamadores a HEAD original por la API GitHub y exige Git SHA exacto. Compila Kotlin original con un stub **solo de ABI**, sin reemplazar la lógica evaluada. Ejecuta JAR en Bubblewrap/AppArmor sin red ni token; luego verifica los controles y que los mutantes fallan. Un recibo nuevo incorpora SHA-256 del original, test y logs más dos identidades distintas por archivo/línea/regla, si pasan todas las condiciones.

Después de fusionar este cambio, el propietario puede disparar el flujo desde `main` o comentar exactamente `ULTRA_SENTINEL_C2_RUN21_TWO_ORIGINAL_NEGATIVES_V1` en [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50). **Antes de una ejecución exitosa el corpus permanece en 18; no contar las pruebas unitarias sintéticas del gate.**

Con éxito y artefacto autenticado: 20 identidades fuente (9 positivas, 11 negativas); quedan 100 para 120, con mínimos adicionales 39 positivas, 37 negativas y otras 24 diversas. Estos requisitos mínimos no convierten 100 controles arbitrarios en 100 defectos independientes; se mantienen deduplicación de causas, pruebas funcionales y selección balanceada.

## Estrategia de capacidad

1. Continuar batch de oráculos originales sobre **archivos y causas nuevas**, empezando por producción no etiquetada; mantener reglas declaradas antes de consultar los detectores.
2. Priorizar **positivos** de defectos genuinos aún inéditos, y controles negativos acompañados de un mutante de sensibilidad; detener casos ambiguos o duplicados como `INCONCLUSIVE`.
3. Mantener el grupo completo de ocho PR originales como **desarrollo histórico**, nunca promocionarlo como holdout ciego.
4. Congelar un grupo futuro por metadatos, separado de entrenamiento y de todas las rutas/causas repetidas, antes de consultar diffs, predicciones o resultados del modelo. Después medir ambos detectores sobre fuente idéntica y comparable.

**No se han modificado** el umbral de 120, los mínimos de clase, los detectores históricos, el bloqueo 153/241 del Core anterior, la condición de 95%, la no-regresión de FP ni el estado formal `NOT_CERTIFIED`. Sin humano externo obligatorio, pero integridad y validez de cada oráculo siguen siendo imprescindibles.

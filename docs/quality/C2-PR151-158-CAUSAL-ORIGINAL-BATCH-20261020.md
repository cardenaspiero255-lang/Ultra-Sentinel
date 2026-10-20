# Ultra Sentinel C2 — adjudicación causal histórica GameHub #151–#158

**Fecha:** 2026-10-20. Cambios de desarrollo, NO certificación ni holdout ciego.

## Continuidad de inventario sin sobrescritura

El PR #175 ya vincula GameHub #150:251 y #150:252 a la misma familia provisional `RECOMMENDATION_CONFIDENCE_CALIBRATION`; #150:250 sigue como control negativo. Este lote recupera el artifact **original y fechado** de #175 (workflow `39509986762`, digest `sha256:186904cc97bc43ff28d0eee2887e81b54a986f726d6130c52343162f9c4e6bb1`) y aplica anotaciones a **siete** de las 23 identidades, sin cambiar los hashes de Run23.

## Oráculos originales, reparaciones contrafactuales y controles

| GameHub | Evidencia y mutación | Estado causal |
| --- | --- | --- |
| **#151**, línea 264, `NONFINITE_THERMAL_HEADROOM_ACCEPTED` | Código Kotlin original blob `adb11032b9b7f62f865228dfa1c27258ca3fa0df`. Original `+Infinity` produce alerta térmica; cambiar *solo* `isNaN()` por `isFinite()` en `thermalObservation` la elimina. Los controles de lectura finita alta y NaN conservan los resultados previos. | **Provisional**: `THERMAL_SENSOR_NUMERIC_DOMAIN`. Reparación solo de mid-session; las otras rutas térmicas no se consideran cerradas. |
| **#152**, línea 207, `SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY` | Código Kotlin original blob `549e3b1d619b83e59bc37b31b4860191c25528f1`. Selección antigua permite que 120 Hz no soportados impidan proponer 60 Hz estables. Reparación limitada a filtrar tasas compatibles **antes** de ordenar por conteo. Controles compatible predominante, incompatible único y evidencia insuficiente permanecen correctos. | **Provisional**: `REFRESH_CANDIDATE_ELECTION`. Sin independencia causal certificada. |
| **#153**, línea 71, `PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE` | Recibo Kotlin original propietario `38889693623`, verificado en PR #173. Existe un defecto original y controles de replay, pero **no** se produjo aún reparación específica de su máquina de estados. | `ORIGINAL_ORACLE_ONLY_COUNTERFACTUAL_PENDING`; no se asigna huella provisional nueva. |
| **#154** y **#155** | Testigos originales y canarios contrafactuales owner-only, run `38969804193`, artefacto `12076406708`, digest `sha256:84b7e898c1fa1d2f1d5dfee6e8d0feb39de17f3067c2dea761a3a25c15d2a01c`. | Controles negativos acotados y sensibles a mutación, no familias positivas. |
| **#157** y **#158** | Testigos originales y canarios contrafactuales owner-only, run `38946358219`, artefacto `12066196917`, digest `sha256:9bda473d6d80e833f4e46e6893e943f551ff299d59cf3e25de0e9a05d2ef3e6a`. | Controles negativos acotados y sensibles a mutación; no prueban cobertura completa de PR. |

Los recibos individuales precedentes fueron autenticados en PR #173; la ejecución de este lote los vuelve a descargar con ID, SHA del HEAD, autor, digest original y ámbito GitHub **read-only**. Los fuentes originales de #151/#152 se descargan por SHA de GameHub, se verifican como blobs Git exactos y se ejecutan en JVM con AppArmor/Bubblewrap, sin red ni secretos. Las reparaciones son **copias descartables de prueba**, no parches de GameHub en producción.

## Integridad del inventario

- `23/23` identidades históricas **sin cambios**; `11` positivas y `12` negativas.
- `2` familias **provisionales** adicionales (#151 y #152), `1` reparación original pendiente (#153), `4` negativos de comportamiento original sensibles a mutaciones.
- `0` familias causales nuevas certificadas independientes; `0` etiquetas GOLD agregadas; el sello original Run23 sigue inmutable.
- Los anteriores `21` grupos no certificados no se consideran resueltos con nombres provisionales. El conjunto externo ciego sigue sin congelar y `BASELINE_INCOMPLETE` permanece pendiente.
- `precision=recall=F1=null`, `NOT_CERTIFIED` en SSS+.

**Siguiente trabajo:** adjudicación contrafactual autónoma del rollback #153; examinar el resto de identidades históricas no anotadas y comprobar duplicidad causal cruzada entre PR antes de fijar cuotas de diversidad o métricas.

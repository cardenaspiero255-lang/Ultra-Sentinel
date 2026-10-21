# Ultra Sentinel C2 — GameHub #153, replay contrafactual auténtico

**Fecha:** 2026-10-20. **Ámbito:** validación causal de desarrollo, no reparación desplegada en GameHub, etiqueta nueva, conjunto ciego ni certificación SSS+.

## Fuente y controles

Código Kotlin original `PerGameAdaptiveRuntime.kt` de GameHub `6508cc124076b9dea437ea1efc213d3ce55d7baf`, Git blob `d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f`. Se verificó el workflow histórico de propietario [#38889693623](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38889693623), incluida identidad del artefacto `12040619454` y digest `sha256:a9787a48048ea2e344fbb5bb9954f91e063cbe55551f0799f46e0c209bbd743c`.

[CI contrafactual del PR #177](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39522939182) obtuvo `SUCCESS`: compila tanto el Kotlin original como una copia *descartable* que inserta exclusivamente `persistProfile(pending.key.packageName, pending.targetProfile)` en la rama `if (wasSessionHandled())` antes de restaurar el estado objetivo y borrar el registro pendiente. Se ejecuta cada versión en JVM aislada por AppArmor + Bubblewrap, sin red ni secretos, sobre los mismos colaboradores ABI y los mismos escenarios.

## Interpretación causal

| Prueba original | Sin parche | Copia parcheada |
|---|---|---|
| Completar sesión normal | Consistente | Consistente |
| Fallo de escritura inicial y recuperación | Recupera | Recupera |
| Fallo durante `clearPendingDecision`, posterior a `markSessionHandled` | Reproducido | Reproducido |
| Replay tras ese fallo | Estado objetivo, **perfil anterior** | Estado objetivo y **perfil objetivo** |
| Eventos duplicados | No | No |
| Procesamiento ocioso posterior | Idempotente | Idempotente |

Diagnóstico: la rama de replay de una sesión previamente marcada como procesada restaura el estado interno, pero omitía reescribir el perfil ya revertido por el manejo del fallo anterior. Una inserción acotada corrige la divergencia en este escenario. Esta prueba **no cubre** otras fuentes de fallos transaccionales, hardware físico, accidentes reales o durabilidad del almacén de preferencias.

El resultado derivado permanece `independentCauseCertified=false`, `newHistoricalLabels=0`, `holdoutFrozen=false`, `precision/recall/F1=null` y `sssPlusCertified=false`. La familia `ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE` es una **hipótesis causal provisional**. Para el inventario histórico, únicamente se deberá aplicar mediante una vista derivada, jamás reescribir Run23 ni incrementar cuotas de diversidad sin nueva evidencia independiente.

## Trabajo siguiente

Incorporar el recibo derivado a la misma cadena causal del PR #176 y ejecutar controles de deduplicación cruzada sobre todas las causas históricas aún sin acreditar. El monitor `BASELINE_INCOMPLETE` sigue impidiendo métricas globales.

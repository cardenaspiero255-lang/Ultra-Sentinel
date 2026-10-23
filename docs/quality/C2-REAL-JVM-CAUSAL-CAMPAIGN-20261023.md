# C2 — Campaña JVM original real · 23 de octubre de 2026

**Ejecutado:** [workflow #39908712698](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39908712698), PR #207. Los cuatro jobs terminaron con `success` (3 suites en paralelo y 1 adjudicación).

## Resultados nuevos y verificables

Los blobs Kotlin originales de GameHub se recuperaron desde commits Git inmovilizados y se contrastaron por SHA de blob (y SHA-256 adicional para los experimentos numéricos). Se compilaron 10 variantes JVM aisladas mediante AppArmor + Bubblewrap sin red y con permisos mínimos. Se archivaron únicamente recibos con hashes; no fuentes originales, JAR, tokens ni predicciones del detector.

| Historia y caso | Intervención JVM | Resultado reproducido | Clasificación causal |
| --- | --- | --- | --- |
| #150:251 historia negativa y #150:252 fuente opositora | 4 variantes: original, solo historial, solo fuente y ambas reparaciones | Cada reparación corrige su guarda y no la otra; los controles de confianza permanecen correctos | **Dos guardas distinguibles**, **una familia conservadora** de calibración |
| #151:264 headroom térmico infinito | 2 variantes: original y reemplazo mínimo de `isNaN` por `isFinite` | El original alerta incorrectamente; el reparado lo rechaza; temperatura finita y NaN conservan respuesta | Efecto local probado, otras rutas del módulo no cubiertas |
| #154:100 discriminante matemático no finito | 4 variantes factoriales conjuntas con #155 | La reparación matemática evita la excepción sin depender del cambio de batería | Efecto local, no independencia de familia global |
| #155:12 umbral de batería infinito | Mismas 4 variantes factoriales de #154 | La reparación de política rechaza el valor infinito sin afectar la matemática | Efecto local, no independencia de familia global |

Son **10 ejecuciones reales de variantes**, **cinco efectos de guardas**, **cero controles benignos fallidos**. Contarlas como 10 nuevos fallos sería incorrecto.

## Adjudicación preliminar de mecanismos — NO equivalen a familias independientes acreditadas

- `CONFIDENCE_POLICY`: #150:251 y #150:252, dos predicados separados que participan de una política de recomendación común.
- `NONFINITE_NUMERIC_BOUNDARY`: #151:264, #154:100 y #155:12, tres entradas y salidas funcionales distintas bajo una hipótesis compartida de validación numérica. Las 4 celdas factoriales acreditan ortogonalidad local para #154/#155; aún no establecen una taxonomía global ni independencia de familias.
- El inventario original contiene 23 identidades (11 positivos/12 negativos). Solo dos registros tenían un nombre de agrupación original; **21 asignaciones históricas siguen pendientes**, incluidas identidades negativas cuya ausencia de defecto no demuestra tasas de FP del detector.

## Orden de los próximos ensayos causales

1. Ampliar #151 a *pre-session* y *recurring*, con controles finitos/NaN/±infinito; ejecutar cambios cruzados con #154 y #155 para decidir si una familia abstracta o varias comprobables corresponde a los defectos.
2. Fuente original #153:71 frente a reparación mínima de rollback, con #152:41 y control negativo #153:69; contrastar versiones, callbacks concurrentes y reversión.
3. Ejecutar los oráculos originales que restan por adjudicar, con reparación y controles: #152:110 (JSON), #152:207 (selección refresco), #158:114 y #158:144 (temporalidad), #157:32 (autorización), y los negativos restantes de STOP, sesión, retención, consulta y telemetría. No crear causas independientes por diferencias de archivo o PR.

## Freno explícito a la admisión externa y al benchmark

La fuente de Nextcloud Talk #6938 y las predicciones de Ultra Sentinel no se consultaron. El trabajo experimental histórico tiene acceso solo a fuentes GameHub conocidas, **nunca será holdout ciego**. Falta excluir solapamiento de mecanismos contra un candidato externo, sellar verdad por oráculo ejecutable e impedir contaminación por entrenamiento. La primera etiqueta GOLD externa y los negativos puntuables siguen en 0.

El benchmark futuro requiere una cohorte externa con positivos y negativos auténticos, sin duplicados por familia, detector y baseline congelados antes de consultar predicciones, métricas por regla/CWE y control de tasas FP. Hasta entonces `precision=recall=F1=null`, `holdoutFrozen=false` y `SSS+ NOT_CERTIFIED`. No inventar datos para alcanzar cuotas.

**Evidencia:** artefacto `c2-real-kotlin-causal-campaign-21-unresolved`, ID `12481887736`, digest ZIP `sha256:a94da267cc12b3d2064c08d74bbfff862f72ec332135c9513f854d5b3176eb40`. La salida contiene `originalKotlinJvmVariantExecutions:10`, `confirmedRepairLocalEffects:5`, `ordinaryBenignControlFailures:0`, `historicalRootCauseAssignmentsResolved:0`, `historicalRootCauseAssignmentsStillPending:21`, `externalGoldLabelsCreated:0`.

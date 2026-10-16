# C2 — próxima cohorte independiente después de corregir 3 errores conocidos

**Orden requerido:** tres regresiones conocidas corregidas y demostradas sobre Git source original; después conjuntos nuevos de evaluación y, por último, comparar precisión/recall/F1 y falsos positivos en datos nunca utilizados para crear esas reglas. Ningún humano externo es obligatorio.

## Fuente y aislamiento

Se pre-registran **8 PR distintos de GameHub Ultra** exclusivamente mediante metadatos autenticados de GitHub (PR, base SHA, HEAD SHA, estado, archivos modificados, propietario/repo). La captura **NO solicita diffs, código, alertas, predicciones, oráculos ni baseline**.

| PR | Tipo técnico | HEAD congelado | Archivos del PR |
|---|---|---|---:|
| #150 | Recomendaciones explicables | `4c6912d7ca17df0669f8a0d9667f34d2f2b205a9` | 21 |
| #151 | AI Session Coach | `9ad983576c16c6c34d59283979d83c69ede50dce` | 41 |
| #152 | AI Profile Builder | `104b7dc33e4c0341cec3fca81e3c8fbe3625357f` | 41 |
| #153 | Adaptive Optimizer | `6508cc124076b9dea437ea1efc213d3ce55d7baf` | 26 |
| #154 | Predicción térmica | `858c9ce5cb6a7916d63f2348432013e49d02ba79` | 24 |
| #155 | Batería y rendimiento | `2289f4e4cda55ddaa50f2016113ded82dc17203c` | 26 |
| #157 | CI Frontier | `cb184c56d28342e46923d149c0e7f27141ce1a24` | 39 |
| #158 | Frontier V2 | `9d8572afedc634ac07dae58a0da326ea62bdc1da` | 23 |

#157 fue cerrado sin fusionar; el benchmark de diffs congelados no supone que haya llegado a producción. Los demás también se analizan por sus commits históricos explícitos, no por el HEAD mutable o lo que tenga actualmente `main`.

**Core actualizado pre-registrado:** Git commit `547938ed88804e25bbabecf74a3c3d91b74cf1a4`, con los blobs SHA `db29f94be1e0afb791a241d26f449695df0eafd0` (Core), `7df2a994f566ad56bdacab999fa6ba83b69e3b4d` (reglas semánticas) y `8c2fa4289d331e157b07f4e693239ac7e31cae8c` (nuevas reglas de regresión). Estos hashes se verifican antes de congelar. No optimizar reglas después de observar resultados sobre esta cohorte.

**Exclusiones explícitas:** GameHub #73, #132, #159, #161, #163, #172, #205, #206 y #208. Los casos #205/#206/#208 se transformaron en tests de regresión y se prohíbe contarlos como defectos desconocidos de esta nueva evaluación. Esto **no garantiza automáticamente independencia semántica entre variantes de un mismo defecto**: esa independencia debe probarse al construir los oráculos.

## Ejecución owner-only

Workflow `.github/workflows/c2-next-eight-holdout-freeze.yml`, desde `main` por el único propietario usando `workflow_dispatch` o comentario literal `ULTRA_SENTINEL_C2_NEXT_HOLDOUT_FREEZE_V1` en issue #50. Recupera exclusivamente los ocho metadatos de PR por API GitHub, valida identidad del repositorio/owner y SHA exacto en CLI sin token, red, escritura ni posibilidad de autocorrección, y publica el manifiesto mínimo `ultra-sentinel-c2-next-eight-holdout-freeze`.

El resultado del congelamiento es `FROZEN_INPUT_ONLY` con `labelsVerified=0`, `precision=null`, `recall=null`, `f1=null`, `fpNonRegressionVerified=false`, `tripleSPlusCertified=false`.

## Cuatro pasos pendientes ANTES de conceder 95%

1. Ejecutar oráculos sobre Kotlin/TS/CI **originales** para los nuevos PR, con positivos y negativos adversariales localizados `(pr, rule, path, line)`. Registrar casos inválidos o inconcluyentes fuera de métricas. Obtener mínimo 120 etiquetas verificables (≥48 positivas y ≥48 negativas), 6 reglas, 4 archivos y 4 PR, priorizando diversidad real y evitando duplicados semánticos.
2. Congelar y auditar la verdad **antes de mirar predicciones**: SHA HEAD, blob, pruebas de reproducción, distribución, decisiones ambiguas y baseline. Un hash o una firma del propietario acredita integridad, no validez de una etiqueta.
3. Ejecutar el nuevo detector y el baseline anterior **sobre exactamente la misma población, commits, cobertura y definiciones de hallazgo**, verificar TP/FP/FN/TN y cero falsos negativos críticos. Resolver cada alerta extra; no llamar FP a una alerta no etiquetada.
4. Aceptar la certificación interna solo si se alcanzan precisión, recall y F1 micro ≥95% **Y** falsos positivos no superiores al baseline (al menos por PR, regla y conjunto); de lo contrario registrar `NOT_CERTIFIED` y abrir un nuevo ciclo de entrenamiento con otro holdout completamente nuevo.

Todavía falta terminar el corpus: la cohorte por sí sola es **evidencia de procedencia**, no una puntuación. Una vez cumplido el benchmark, y solo entonces, seguir con autorización/rollback E2E, Sentry privado, continuidad real y auditoría final.

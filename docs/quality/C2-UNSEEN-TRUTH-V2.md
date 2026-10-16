# C2 Holdout — sello v2 de dos fallos originales sin consultar predicciones

**Objetivo actual (Triple S+ prioridad 1):** ampliar corpus auténtico de defectos nuevos y fijarlo criptográficamente **antes** de solicitar predicciones del detector Core o del sistema de referencia. Sin evaluador humano externo obligatorio.

## Evidencia y procedencia

La primera versión quedó fija y **no se reescribe**:

- Sello v1: [run #38840604111](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38840604111), artefacto `12021635251`. SHA-256 del recibo `53192822e5736996a6040c914972a7ce0de17835ae03480e484a6a79766b612e`. Digest de verdad `f5bfde8f804882cf0bc5e01b34bbc962709d94dbf9f6d8b5a39faa3b747fc8f9`.
- Nuevo original: GameHub **PR #205**, HEAD `1ecf73e789b91354ce9d8b7289d9492930ae5950`, [run #38841470698](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38841470698), artefacto `12021616975`, archivo `UltraFrontierV2.kt`, Git blob `f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4`. SHA-256 del recibo JSON `acfad2f0c457103819206a15e2a8f5d59382cc9f37a54a07fb3f3ca2983ae918`.
- Cohorte congelada original #172/#205/#206/#208: digest `b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e`; detector Core fijado para evaluación `bb38bb77983339301cafe8a7594e258e0c2924a6`.

La reproducción #205 observó que valores numéricos `8 GB` y `8 Gb` dentro de la misma afirmación terminaban como **dos fuentes de apoyo y ninguna contradictoria**. Los controles de diferencias numéricas, normalización de prosa y claves de afirmaciones distintas pasaron. Esto prueba el comportamiento del grafo original bajo esa entrada; **no** prueba el impacto en todos los llamadores de Android, ni que alguna versión del detector lo haya encontrado.

La reproducción previa #206 muestra el corte de una pareja UTF-16 en `UltraSpeechChunker.kt:26` cuando un emoji atraviesa el límite de longitud, también con controles exitosos.

## Sello v2

El CLI `scripts/extend-c2-unseen-truth.cjs` valida **byte por byte** los dos recibos SHA-256 y estructuras exactas sin conexión de red ni token de GitHub. El workflow de lectura `c2-unseen-truth-v2.yml` verifica además repositorio, actor, workflow, commit y artefacto de cada run original. No reinterpreta ni elimina el sello v1.

El nuevo dossier debe registrar **2 positivas originales verificadas**, **0 negativas puntuables** y **3 controles benignos**. Esto significa **118 etiquetas adicionales como mínimo**, con al menos 46 positivas y 48 negativas, además de diversidad por familias/rutas, baseline en los mismos SHA y auditoría de alertas no confirmadas.

**No se calcula 95 %**, ni se proclama no-regresión de falsos positivos: `precision=null`, `recall=null`, `f1=null`, `baselineComparable=false`, `noFalsePositiveIncreaseCertified=false`, `tripleSPlusCertified=false`.

## Próximo paso en el orden acordado

Construir negativos de hallazgo realmente comprobables `(pr, rule, path, line)` sobre código original y más positivos en el resto de la cohorte, de forma separada del detector. Cuando exista un universo suficientemente grande y congelado, puntuar Core y baseline heredado sobre exactamente los mismos commits, con TP/FP/FN/TN y umbral micro ≥0,95, cero FN críticos y no-regresión FP por PR. Si se usa cualquiera de estas muestras para ajustar el detector, debe excluirse del siguiente holdout ciego.

Después, únicamente después de pasar el benchmark, seguir con autorización/rollback E2E, Sentry privado autorizado, continuidad y auditoría final.

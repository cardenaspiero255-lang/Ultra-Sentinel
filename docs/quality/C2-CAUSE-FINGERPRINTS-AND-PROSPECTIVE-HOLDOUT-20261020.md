# C2 — causas históricas, admisión de candidatos y nuevo holdout prospectivo

**Fecha:** 2026-10-20. Estado: `PRE_ADMISSION_ONLY`, **SSS+ NOT_CERTIFIED**.

## 1. Defectos originales conocidos: cerrados como regresiones de entrenamiento

El replay real [run #39492884594](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39492884594) verificó exactamente **3/3** hallazgos conocidos, comparando el Ultra Sentinel Core con los SHA históricos de GameHub **#205, #206 y #208**. No realizó cobertura completa de cada PR; el baseline Core congelado había identificado **0/3** antes del ajuste posterior. Estas tres identidades fueron reveladas al autor durante el desarrollo: **no** son holdout ciego, GOLD nuevo, ni suficientes para precisión/recall/F1.

## 2. Inventario 23 etiquetas: bloqueo conservado

El módulo `packages/quality-gates/c2-causal-prospective-preflight.cjs` verifica la **estructura** de un inventario histórico de 23 (11 positivas, 12 negativas), identidades `repository/pr/headSha/rule/path/line/polarity`, blob Git original, huella causal, número del workflow y SHA-256 del recibo. Rechaza identidades y huellas duplicadas, clases imposibles y campos añadidos que intenten afirmar aprobación.

Una huella hexadecimal y una referencia de recibo **no autentican** causalidad ni ejecución. Sin descargar y comprobar independientemente los recibos originales de Run23 y anteriores, el resultado sigue `UNATTESTED_PROVENANCE`, `historicalEvidenceAuthenticated=false`. No declarar completado este inventario ni aumentar las 23 etiquetas. **Nadie tiene que obtener dos revisores humanos**: se requieren oráculos técnicos externos al detector y procedencia genuina.

## 3. Candidatos nuevos: clasificación y filtro por detector

- **GameHub #205/#206/#208**, los PR históricos #150/#151/#152/#153/#154/#155/#157/#158 y otros listados en `KNOWN_GAMEHUB`: `KNOWN_HISTORICAL_EXCLUDED` para evaluación nueva.
- **Kotlin SWE-bench 106 y Detekt #7715/#7888**: material público revelado, `DEVELOPMENT_ORACLE_REQUIRED`. Deben reproducirse contra commits originales y obtener correspondencia con una regla **implementada** de Ultra Sentinel; los resultados de reglas propias de Detekt no acreditan tal correspondencia.
- **Positivos**: probar fallo original/corrección por el oráculo y detector `rule/path/line`; **negativos**: probar comportamiento correcto original y mutante adversarial. Nunca contar cada test p2p como una causa nueva.

El cribado se limita a metadatos para que no abra contenido del futuro holdout. Cualquier regla nueva o ajustada tras consultar una muestra la convierte en desarrollo.

## 4. Prospective TRAIN/holdout: solo contrato, NO congelamiento

La fecha de corte mínima actual es `2026-10-20T19:30:54Z`, posterior a la evidencia divulgada de GameHub #206. La nueva cohorte debe proceder de PR genuinamente nuevos, con fecha original `createdAt`, repositorio, PR, SHA base/HEAD verificados en GitHub, sin compartir commits, rutas críticas o huellas causales con los 23 históricos ni otros candidatos. Un PR posterior al corte **no demuestra por sí solo independencia**.

El módulo declara `PROSPECTIVE_METADATA_ONLY_NOT_FROZEN` aun cuando los metadatos sean válidos; no se activa ningún holdout si falta el inventario histórico autenticado y los oráculos independientes. Para congelarlo hace falta **otro** workflow owner-only que verifique metadatos originales sin leer respuestas, reglas o predicciones. Solo después de cerrar y sellar verdad se podrán puntuar candidato y baseline sobre idéntico SHA, con 120 etiquetas genuinas, ≥48 por clase, ≥6 reglas, ≥4 PR y ≥4 rutas, y umbrales internos de precisión/recall/F1 ≥95% y no-regresión de FP.

**Estado cuantitativo:** 23 históricos de desarrollo; 97 por acreditar; 0 admitidas nuevas en esta etapa; precisión, recall y F1 nulos; reparación automática, auto-merge y certificación **bloqueadas**.

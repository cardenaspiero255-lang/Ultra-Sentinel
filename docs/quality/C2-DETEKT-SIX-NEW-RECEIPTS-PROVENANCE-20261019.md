# C2 Detekt — auditoría verificable de seis recibos nuevos (sin admisión)

**Corte:** 19-oct-2026. **Recibos originales:** [GitHub Actions #39321487604](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39321487604), commit Sentinel \`727adac81513c3b29ab6cd60b671334880a66ca9\`, SHA de corpus \`Kotlin/kotlin-swe-bench@b9025d86f7ae634901396766bd61f6d4ae6d2165\`. Artefactos ZIP originales: \`12223952862\` (lote 1), \`12223450867\` (lote 2), \`12222843961\` (comparación y cuatro puertas). Conservarlos sin reescribir ni fabricar nuevos labels.

## Resultado anterior al parche de cinco dígitos

| PR upstream | Estado en run 39321487604 | f2p con contrato satisfecho | Error, si lo hubo |
| --- | --- | --- | --- |
| [detekt/detekt#7625](https://github.com/detekt/detekt/pull/7625) | \`TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED\` | 1 | Ninguno declarado |
| [detekt/detekt#7635](https://github.com/detekt/detekt/pull/7635) | \`TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED\` | 1 | Ninguno declarado |
| [detekt/detekt#7667](https://github.com/detekt/detekt/pull/7667) | \`TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED\` | 2 | Ninguno declarado |
| [detekt/detekt#7715](https://github.com/detekt/detekt/pull/7715) | \`REPRODUCTION_MISMATCH\` | No contabilizado en gate | \`IfElseBracing@c8e99\`: PASS/PASS en XML; alias cinco hex no reconocido |
| [detekt/detekt#7718](https://github.com/detekt/detekt/pull/7718) | \`REPRODUCTION_MISMATCH\` | No contabilizado en gate | \`IfElseWrapping@c8e99\`: PASS/PASS en XML; alias cinco hex no reconocido |
| [detekt/detekt#7888](https://github.com/detekt/detekt/pull/7888) | \`TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED\` | 1 | Ninguno declarado |

**Cambios de estado de campaña: solo cuatro transiciones preliminares, dos discrepancias; cero etiquetas admitidas.** Los f2p declarados en seis manifiestos suman ocho tests, pero solo cinco estaban validados en los cuatro recibos aceptados antes del parche corto; los otros tres pertenecen a dos candidatos con gate bloqueado.

## Procedencia upstream del código: hechos y limitaciones

Los seis \`before/commit.txt\` del artefacto contienen **exactamente** el SHA base publicado por su PR upstream correspondiente:

| PR | SHA BEFORE original = base upstream | SHA de \`solution/fix.patch\` en corpus (Git blob) | Causa raíz sugerida por PR y patch (NO certificado como regla Sentinel) |
| --- | --- | --- | --- |
| #7625 | \`82ab4c5ac06f006a0906920687dc016af37642a6\` | \`95148a8b9aacfa0cf6ffb63f4a821ef48a1c5137\` | \`BaselineFormat.kt\`: etiquetas XML vacías no emitidas en forma autocerrada; hunk ~L54 |
| #7635 | \`d53028caa506a25443e9ea9c1498329daf94b001\` | \`bef41baee173048b4bb00b707feb5008d6fe70b4\` | \`UndocumentedPublicClass.kt\`: regla no configurable para ignorar companion por defecto; hunks ~L41–92 |
| #7667 | \`7f5799dd496e63648212550b5a3d3c7cac9b77ff\` | \`bdf5e1e887eddfbd23ddec092950d365267f457a\` | \`SarifOutputReport.kt\`: propiedad \`originalURIBaseIDS\` innecesaria/incorrecta en SARIF; ~L55 |
| #7715 | \`8a3565572208446ff769152ded9ca5bdf957f8b0\` | \`b4dbdd79b5e162fa8cf2f271e948b4f4c821fa65\` | \`ThrowingExceptionsWithoutMessageOrCause.kt\`: comparación \`ignoreCase=true\` confundía llamadas distintas; ~L57 |
| #7718 | \`a4ec32a2a496439a2580951f4c340146a0e3d610\` | \`fd6a98a7e8c91b293bb849a352dfcd558de6940c\` | \`Results.kt\`: SARIF sin \`partialFingerprints["signature/v1"]\`; ~L25 |
| #7888 | \`6c8f571d886aa581b62b02964e00ef7008559e72\` | \`48ed8558e022403f6f45eb430182b890e1d2769a\` | \`UnusedImport.kt\`: faltaban operadores configurables para analizar usos de imports; hunks ~L27–162 |

La revisión de los seis \`solution/fix.patch\` originales de \`Kotlin/kotlin-swe-bench\` verificó que **cada línea de adición/eliminación del patch está presente en el diff publicado del PR Detekt correspondiente**. Es evidencia consistente con sus cambios, pero **no** demuestra que los commits temporales AFTER del runner sean commits publicados del upstream, ni que un detector Sentinel haya advertido el defecto. Los seis PR están fusionados upstream; las fechas y los commits de fusión no deben confundirse con el BEFORE del benchmark.

## Puertas de admisión SSS+

- **Gate 1, reproducción original:** cuatro recibos pasan transiciones provisionales; dos requieren el arreglo del sufijo \`@[0-9a-f]{5}\` y revalidación de sus XML originales completos. Incluso con 6/6 validados, preservar originales y verificar firma, archivo, parche y contexto de ejecución antes de afirmar autenticación independiente.
- **Gate 2, causa raíz independiente:** hipótesis por PR sustentadas por el diff; falta oráculo independiente que pruebe el defecto original y controles benignos sin contaminación. No convertir un f2p o dos tests SARIF en etiquetas independientes sin prueba.
- **Gate 3, regla real del detector:** \`packages/core/ultra_sentinel_core.cjs\` permite \`sourceScope='KOTLIN_JVM_V3_EXPERIMENTAL'\` para analizar rutas; NO implementa automáticamente las reglas Kotlin/Detekt ni acredita \`ruleId\`, ruta/linea, TP/FP ni contrafactual. Los identificadores \`UndocumentedPublicClass\`, \`UnusedImport\` y \`ThrowingExceptionsWithoutMessageOrCause\` son reglas del **proyecto Detekt**, no evidencia de reglas equivalentes de Ultra Sentinel. Falta reporte de detección verificable en original+corregido.
- **Gate 4, independencia:** las 23 etiquetas de desarrollo históricas y sus huellas completas siguen sin contraste semántico individual suficiente; los PR conocidos de Detekt NO constituyen holdout ciego.

**Estado obligatorio:** \`historicalLabels=23\`, \`newLabels=0\`, \`admitted=0\`, \`blindHoldout=false\`, \`precision=null\`, \`recall=null\`, \`f1=null\`, \`SSS+=NOT_CERTIFIED\`.

Esta auditoría puede ampliar evidencia de procedencia y discusión causal, **nunca** certificar detector ni inventar GOLD. El monitor/automatización SSS+ continúa pausado.

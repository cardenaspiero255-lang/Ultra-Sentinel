# Fase 1 — aceptación técnica del caso Kotlin original MIT (2026-11-08)

**Decisión:** `ACCEPTED_SCOPED_FUNCTIONAL_CASE` — se acepta el hito técnico delimitado de **Hunter → Fixer → Judge con defecto original nuevo para el corpus histórico**, oráculo Kotlin/JVM independiente, control benigno, veto funcional y rollback Git local exacto.

**Importante:** esta aceptación **no es** autorización de reparación o release, no certifica Triple S+ Private Edition y no cambia los campos fail-closed del recibo original (`phaseOneClosed: false`, `requiredManualReleaseGatePending: true`). Tampoco demuestra capacidad general multiarchivo ni eficacia estadística en otras familias. El control integral `RED_GREEN_REPAIR` y los demás 12 controles de edición privada exigen sus propias evidencias operativas.

## Identidades inmutables

- Repositorio receptor: `cardenaspiero255-lang/Ultra-Sentinel`.
- PR de implementación: [#323](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/323); HEAD validado `82a99d64ebd0b0825c2a5ac1468e755208736d11`.
- Commit de fusión en `main`: [`bb57279b8186eb78b29d5cb7712ffa3cb6e0885c`](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/commit/bb57279b8186eb78b29d5cb7712ffa3cb6e0885c).
- Fuente externa MIT: `iamkurtgoz/ECommerceAndroidCompose`, repositorio GitHub ID `464093153`, commit `57f7a95021a125e0cdae4924c32891f6b70b0c5a`.
- Archivo original: `domain/src/main/java/com/iamkurtgoz/domain/util/Validator.kt`, Git blob `5b8af35cf6393dc9dbc6217b8d00329bda7bc196`.
- Regla del caso: `ANCHORED_END_LINE_TERMINATOR_ACCEPTED`, ubicaciones 7, 12 y 17. Es nuevo **para Ultra Sentinel**; no se afirma descubrimiento inédito ni vulnerabilidad en el ecosistema.

## Ejecuciones y recibos recuperados

| Tipo | URL exacta | Resultado |
| --- | --- | --- |
| CI del PR | [run 42542039665](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/42542039665) | `success`, job `mit-external-original-jvm` completo |
| Artefacto del PR | [13641980781](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/42542039665/artifacts/13641980781) | ZIP descargado, `receipt.json` leído |
| CI posterior en main | [run 42542373266](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/42542373266) | `success`, mismo workflow de oráculo Kotlin/JVM, evento `push` y HEAD `bb57279b...` |
| Artefacto en main | [13641836891](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/42542373266/artifacts/13641836891) | ZIP descargado, `receipt.json` leído |

Hashes SHA-256 observados **sobre los bytes descargados**, no inferidos de nombres:

- ZIP PR: `2cce325864e5689657f7897198613ba2fab822eb41337f4648e86c8fe62dcff9`
- ZIP main: `3ae64e7d61435ef59d0900c21bb720183466a43b3dbd2852784c1f75bf73d275`
- `receipt.json` descomprimido del PR: `51e8d7613c33ae3f868a1cb4ab1dfea5dab703987242f046f5aed12ffff23410`
- `receipt.json` descomprimido de main: **idéntico** `51e8d7613c33ae3f868a1cb4ab1dfea5dab703987242f046f5aed12ffff23410`

Los ZIP de las dos ejecuciones pueden diferir en metadatos de compresión; se ha comparado el contenido JSON real. Los artefactos GitHub expiran según la retención configurada (14 días); los identificadores, enlaces y digests permiten auditar la procedencia después de la expiración, pero **no** sustituyen la conservación externa del artefacto si se requiere revalidarlo byte por byte más adelante.

## Criterios de aceptación del caso

| Criterio | Evidencia observada |
| --- | --- |
| Fuente original atribuida a un repositorio externo permitido | Metadatos de GitHub API, licencia MIT, commit y Git blob original fijados en workflow; `repositoryAndCommitMembershipCheckedViaGitHubAPI: true` |
| Detector y candidata generada desde el mismo caso | `candidateGeneratedByHunterFixer: true`; tres hallazgos, regla y hashes fijados |
| RED original real | `artifacts.original.verdict = RED`, `jvmExit = 1` |
| GREEN funcional de la candidata | `artifacts.candidate.verdict = GREEN`, `jvmExit = 0` |
| Control adversarial vetado | `artifacts.unsafe.verdict = VETO`, `jvmExit = 1`; `unsafeCandidateFunctionallyVetoed: true` |
| Control benigno conservado | `benignControlsPreserved: true` en el recibo generado por el ejecutor de confianza |
| Oráculo original independiente en aislamiento | `independentOriginalKotlinJVMExecuted: true`, pasos Kotlin/JVM y Bubblewrap/AppArmor `success` |
| Rollback exacto del mismo caso | `exactOriginalByteLocalRollbackVerified: true` |
| CI posterior a la fusión | run de `main` #42542373266 con evento `push`, HEAD `bb57279b...` y job `success` |
| Integridad entre las dos ejecuciones | SHA-256 del contenido `receipt.json` idéntico en PR y `main` |

## Frontera de seguridad y pendientes independientes

1. **No autorizado:** `ownerProductionAuthorization: false`, `remoteWrites: false`, `productionReleaseAllowed: false`. No modificar JARVIS, GameHub ni el repositorio externo.
2. **No comprobado:** `androidDeviceTested: false`; firma del commit externo `originalRemoteCommitSignatureVerified: false`. El caso usa identidad de repositorio, commit y blob verificada por GitHub API, **no** una atestación criptográfica del autor del commit.
3. **No generalizado:** el caso es una familia particular, no prueba cobertura multiarchivo arbitraria ni independencia sobre nuevos defectos de GameHub/JARVIS.
4. **No certificado:** mantener `NOT_CERTIFIED` para Triple S+ y los 13 controles [Private Edition](PRIVATE-EDITION-RELEASE-GATES.md).
5. **Siguiente fase:** ampliar Family Hunter a familias y grafos causales multiarchivo con controles contrafactuales y oráculos independientes, antes de declarar autocorrección general.

**Conclusión auditada:** el hito técnico delimitado de Fase 1 queda **aceptado** en este documento con evidencia auténtica reproducible asociada a SHA, pero la bandera ejecutable `phaseOneClosed` en el recibo de CI permanece `false` por diseño. Ninguna transición de autorización o despliegue se infiere de la aceptación documental.

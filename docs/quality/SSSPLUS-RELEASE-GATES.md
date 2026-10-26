> **Nota de alcance (25-10-2026):** este scorecard de 120 etiquetas se mantiene para reproducir el benchmark histórico, pero **no es una condición de cierre de Ultra Sentinel Private Edition**. No se debilitan firmas, seguridad ni verificaciones E2E por ese cambio. [Criterios actuales de la edición privada](PRIVATE-EDITION-RELEASE-GATES.md).

# Triple S+ — criterio interno medible y certificación pendiente

El término **Triple S+** es una clasificación interna del proyecto, **no** una certificación profesional o estándar industrial. Ningún fixture sintético, porcentaje de CI, autocalificación del autor ni salida de este repositorio otorga por sí solo la clasificación.

## Dos niveles de evidencia

**Nivel A — Tests internos** (automatizable): el Core detecta mutaciones sintéticas conocidas, sus controles benignos no activan la regla, el contador de precisión/recall/F1 no regresa frente al baseline en un conjunto etiquetado, los test de seguridad pasan y GitHub registra el SHA exacto. Implementado parcialmente.

**Nivel B — Evidencia empírica reproducible, sin evaluador humano obligatorio** (pendiente): diffs reales de GameHub y salidas completas del revisor heredado y Ultra Sentinel a idénticos SHA, verificación directa de CI mediante API, y **oráculos separados del candidato**: regresiones reproducibles y verificadas, comportamientos comprobados, controles negativos y análisis de variantes. Las etiquetas de defectos reales deben estar respaldadas por prueba concreta y no pueden derivarse de que el propio candidato haya alertado; las hipótesis sin reproducción quedan `UNVERIFIED` y fuera del denominador. Repetir los ensayos y documentar sesgos, límites de cobertura y equivalencia semántica. Los casos sintéticos se miden por separado, nunca se presentan como defectos reales encontrados. **No hace falta un segundo propietario, aprobador ni anotador humano externo.** Tampoco se puede declarar independencia externa inexistente.

## Scorecard reproducible

Módulo `packages/quality-gates/sssplus-pre-screen.cjs`, comando
`node scripts/evaluate-sssplus-pre-screen.cjs /ruta/absoluta/campana.json`.

Reutiliza el parser existente de `shadow-parity-metrics.cjs`; **no implementa un lector paralelo de GitHub**. El esquema de entrada es `ultra-sentinel-parity-campaign/v1`: cohortes identificadas por `repository,pr,headSha,baseSha,sourceCheckState,labels,baseline,candidate`. Cada identidad de hallazgo es `rule,path,line`, y cada etiqueta incluye `positive:boolean`. Las predicciones no etiquetadas bloquean la evaluación.

Los umbrales propuestos, internos y sujetos a validación contra muestras reales, son:

| Criterio | Umbral |
|---|---|
| PR distintos | al menos 4 |
| Etiquetas | al menos 120 |
| Positivos y negativos | al menos 48 de cada clase |
| Reglas distintas | al menos 6 |
| Rutas distintas | al menos 4 |
| Precision, recall y F1 | cada una ≥ 0,95 (micro promedio) |
| Regresión por PR | 0 regresiones frente al baseline en TP, FN y FP |
| Falsos negativos críticos definidos | 0 |
| Etiquetas críticas positivas verificables | ≥12 |
| Controles críticos negativos | ≥12 |
| Reglas críticas distintas con positivos | ≥3 |
| Estados de CI de origen | todos declarados `SUCCESS`; comprobarlos directamente en la API de GitHub con SHA exacto |

Las reglas críticas incluidas ahora son `PRIVILEGED_UNTRUSTED_CHECKOUT`, `POTENTIAL_HARDCODED_SECRET`, `SPEECH_REENTRANT_RETRY`, `UNSCOPED_COROUTINE`, `POTENTIAL_PRIVATE_LOG`. Su conjunto es conservador, no una taxonomía exhaustiva de vulnerabilidades.

La ausencia de evaluador humano no cambia las protecciones implementadas: un campo `independentLabelsVerified=false` significa que **no hay independencia externa demostrada**, no que el propietario deba contratar a alguien. El resultado `NUMERICAL_PRESCREEN_ONLY` **no significa S+ aprobado**: `tripleSPlusCertified=false`, `independentLabelsVerified=false`, `liveSourceCiIndependentlyVerified=false`, `mergeAllowed=false` siempre. Fijar esos campos en un JSON de entrada tampoco concede autoridad. No usar el exit code cero de este comando para habilitar auto-merge.

## Certificación respaldada por evidencia

`packages/certification/sssplus-evidence-certification.cjs` incorpora el
verificador offline `verifyTripleSPlusEvidenceBundle(bundle)`. Es el único
componente que puede emitir `TRIPLE_S_PLUS_CERTIFIED`; el pre-screen por sí
solo sigue siendo diagnóstico numérico.

El bundle debe contener el mismo `campaignSha256` calculado sobre la campaña
canónica y exactamente tres attestations Ed25519: `TRUTH_ATTESTOR`,
`CI_ATTESTOR` y `RELEASE_OWNER`. Cada una vincula repositorio, SHA del motor y
digest de campaña; las tres deben usar claves y `keyId` distintos. Sus
afirmaciones son cerradas: etiquetas independientes congeladas, CI de origen
exitosa ligada al SHA y autorización de lanzamiento en modo lectura.

Las claves públicas incluidas en el bundle **no son** anclas de confianza. El
llamador debe aportar `trustedAttestors`, un almacén externo con una clave
Ed25519 fijada para cada rol; una firma autoemitida, una clave repetida o una
clave distinta a ese almacén devuelve `NOT_CERTIFIED`. Esta separación evita
que tres claves creadas por quien arma el JSON aparenten una revisión
independiente.

La certificación no agrega privilegios: incluso con evidencia válida, el
resultado conserva `mergeAllowed:false` y `autoRepair:false`. A fecha de este
commit no existe un bundle auténtico de producción, por lo que el estado real
del repositorio permanece **NOT_CERTIFIED** hasta reunir y verificar dicha
evidencia.

## Mutation Lab

`node scripts/run-mutation-lab.cjs` ejecuta el Core real sobre ocho variantes sintéticas peligrosas y sus ocho controles benignos: coroutine fuera de ciclo de vida, espera bloqueante, GC forzado, loop sin cancelación, retry de reconocimiento síncrono, fuga por log, secreto literal y checkout privilegiado de PR no confiable.

La mutación se limita a datos de diff en memoria, sin ejecutar código de PR, red ni escritura en GitHub. Un resultado 8/8 prueba **solo esos fixtures**. No equivale a mutation score real sobre GameHub, test de Android en hardware ni robustez universal.

## Requisitos de cierre S+

Para solicitar evaluación Triple S+: (1) dos ciclos consecutivos con artifacts verificables en Actions y datos minimizados; (2) observaciones realistas sobre GameHub/JARVIS con validación del SHA; (3) campaña de paridad con etiquetas congeladas **sustentadas en pruebas reproducibles por un oráculo separado de Ultra Sentinel**, con positivos y controles negativos; (4) repetición con nuevas familias desconocidas y sin filtraciones entre entrenamiento/evaluación; (5) autorización exclusiva del propietario y aislamiento comprobados en host de ensayo para cualquier reparación; (6) medición de recall crítico y falsos positivos **solo en conjuntos con verdad verificable**, distinguiendo explícitamente defectos reales de mutaciones sintéticas; (7) plan de rollback y resultados reproducibles. **No se exige humano externo ni aprobación externa de PR.** Hasta tener la evidencia técnica objetiva, la clasificación permanece `NOT_CERTIFIED`.

Ver además `docs/migration/C2-PARITY-CAMPAIGN.md` y `docs/quality/TESTING.md`.

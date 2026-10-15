# Campaña C2 — Paridad medible sin duplicar el observador

**Cohorte activa posterior a la fusión de #163 (15 de octubre de 2026):** GameHub **#132, #159, #161 y #73**. GitHub confirmó que [#163](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/163) está fusionado (main `fca3250bd71700045cf9b2fc4e4281421f545d2e`) y ya no cumple la condición de muestra abierta. [#73](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/73), investigación general y Q&A, es la muestra sustitutiva explícita: HEAD `194908b7dfa9d882afbc4d7eeaa3781b3e84e9e8`, base `2dee9f6024748bb54b9da86a758fc09c18c426b4`, 7 archivos en el momento de selección. Cualquier modificación posterior exige una nueva captura SHA-pinned.

**Advertencia:** se reinicia el conjunto de etiquetas para la muestra sustituta; **no se trasladan las etiquetas del #163 al #73** ni se atribuyen pruebas o resultados independientes. La fuente de checks de algunos PR antiguos puede ser incompleta, lo que debe mantener el estado `INCOMPLETE_NOT_CERTIFIABLE`, nunca autorizar una certificación. Ninguna muestra con el estado `merged` es elegible para la captura actual de PR abiertos.

**Estado:** infraestructura de métricas implementada en `packages/quality-gates/shadow-parity-metrics.cjs` y `scripts/evaluate-shadow-parity.cjs`; comparación real, baseline heredado y etiquetas externas siguen **PENDIENTES**. Un resultado de pruebas sintéticas solo valida la lógica del evaluador.

## Historial de la cohorte original (2026-10-14; NO usar para validar el estado actual)

| Familia | GameHub PR | HEAD observado | Límite |
|---|---|---|---|
| Voz y errores STT | [#132](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/132) | `06289e42b6ecb1f6fa75d49a1bdd383df9b51422` | 21 archivos, HEAD mutable |
| Frontier / agente | [#158](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/158) | `1f9e525d54e0407f91e2ea6db74e98d0aa0646dd` | 23 archivos, borrador |
| Diagnóstico de red | [#161](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/161) | `6a2b2a2b1249dcdebf91013b42a3c4510938a5dc` | 12 archivos |
| Historial y Nano | [#163](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/163) | `692c7e143e94fd727ec98a181b818ecd42e10aca` | 36 archivos, borrador |

Esta tabla es **histórica**: el #158 se fusionó posteriormente y sus HEAD anteriores no representan la cohorte de PR activos. Los estados se verificaron en la fecha indicada, pero **no** se ha recopilado una verdad etiquetada de hallazgos ni los informes completos anteriores/nuevos. Antes de comparar, fijar de nuevo HEAD/base SHA exactos y comprobar que siguen abiertos y que los checks están completos. El #201 antiguo **solo es evidencia histórica negativa**, no muestra actual representativa.

## Procedimiento reproducible

1. Capturar snapshot autenticado de cada PR desde el lector existente `packages/orchestrator/gamehub-live-reader.cjs` y checks/observador de proveedores. Fijar SHA de HEAD y base y rechazar cambios de SHA durante la captura.
2. Obtener findings del Core **actual** y del revisor **heredado**, para esos mismos diffs completos. No tratar el nombre de un check como lista de findings.
3. Construir un corpus JSON etiquetado con evidencia independiente, incluyendo casos positivos y negativos por regla/ruta/línea. No aceptar etiquetas producidas automáticamente por el candidato que se evalúa. Mantener un manifiesto por SHA firmado fuera del PR.
4. Para cada muestra introducir `repository,pr,headSha,baseSha,sourceCheckState,labels,baseline,candidate`; los findings utilizan `{rule,path,line}` y las etiquetas añaden `positive:boolean`. Se exige anotación de **todos** los hallazgos del baseline y candidato; las omisiones invalidan la muestra.
5. Ejecutar localmente: `node scripts/evaluate-shadow-parity.cjs /ruta/absoluta/campana.json`.
6. Registrar TP, FP, FN, TN, precision, recall, F1, revisión manual de discrepancias y latencia de los revisores desde logs **confiables**; repetir cuando cambie HEAD. Reportar incertidumbre y cobertura.
7. No promover `semanticEquivalenceCertified`: el evaluador lo fija a **false** y `sourceChecksIndependentlyVerified` permanece **false** incluso ante la cadena `SUCCESS` entregada como input.

## Política de CI y cutover

- Si cualquier check de origen falla: `BLOCKED_SOURCE_CI`; si hay información incompleta, detener certificación.
- Jamás ejecuta código del PR, tokens, pushes, autofusión o autorreparación.
- Los resultados de fixtures sintéticos solo validan el calculador, **no** acreditan paridad del motor.
- No retirar scripts o workflows viejos hasta tener cohortes representativas, falsos positivos y falsos negativos resueltos, revisión externa de etiquetas y capacidad de rollback.


## Captura C2 real desde GitHub Actions (implementación posterior)

Se añadió `packages/quality-gates/live-gamehub-c2-cohort.cjs`, CLI
`scripts/capture-live-gamehub-c2.cjs` y workflow
`.github/workflows/c2-live-capture.yml`.

- Recopila solo los cuatro PR de la cohorte activa: **#132, #159, #161 y #73**. Cada ejecución consulta los HEAD/base actuales, exige diff paginado completo con el lector existente, extrae únicamente `rule,path,line` del Core y verifica de nuevo el HEAD/base al terminar la lectura de los checks.
- El estado de checks se registra como **observado**, no como acreditación de todas las protecciones. Si faltan resultados, alguna prueba falla, hay saltos, límite de paginación o evidencia incompleta, el caso **no** es comparable y se informa `INCOMPLETE_NOT_CERTIFIABLE`.
- Los datos públicos exportados NO incluyen evidencia textual de vulnerabilidades, snippets de diff, respuestas API, tokens, título de issue, autor o cuerpos de PR. Los hallazgos sin posición, paths ambiguos y cobertura parcial bloquean el estado completo.
- El lector anterior puede rechazar un PR grande, diff omitido o archivo binario. Esto se registra como `BLOCKED_INCOMPLETE_OR_STALE` y **no se fuerza** a través de una API alternativa no auditada.
- Disparo manual: comentar **exactamente** `ULTRA_SENTINEL_C2_CAPTURE_V1` en la issue [#50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50) desde la cuenta propietaria. El evento no acepta comentarios en PR ni otras issues y no requiere token personal, servidor ni tarjeta. También admite `workflow_dispatch`.
- El workflow puede finalizar rojo con código 2 por cobertura parcial o CI de origen, **sin que el reporte público se pierda**, porque el artefacto `ultra-sentinel-c2-sanitized-candidates` se guarda en caso de evaluación válida pero incompleta.

**Estado de certificación:** recopilar candidatos reales **no** equivale a tener los findings del revisor heredado ni verdad independiente. La salida deja `baselineComparable:false`, `independentLabelsVerified:false`, `tripleSPlusCertified:false` siempre. Solo después de una validación ciega separada y fijada a SHA se pueden calcular métricas concluyentes y pedir una revisión de Triple S+.


## Contexto léxico Kotlin/Java ligado al SHA (opt-in)

La captura C2 solicita `hydrateSource:true` al lector **existente** `gamehub-live-reader.cjs`. Para cada archivo Kotlin/Java de producción (no pruebas), este lector consulta `GET /contents/{path}?ref={headSha}` con el mismo token de solo lectura, tamaño acotado y sin seguir `download_url`.

El validador `github-pinned-full-source.cjs` comprueba identidad de path, tipo GitHub `file`, tamaño máximo de 160 KiB, bytes UTF-8 íntegros y **SHA-1 del blob Git real** comparado con la entrada de la API `pulls/{number}/files`. Luego el lector vuelve a comprobar HEAD/base SHA actuales. Si el contenido no es verificable o el HEAD cambia, la captura se bloquea en vez de afirmar cobertura completa.

Esto evita confundir Kotlin ejecutable con texto dentro de comentarios o cadenas multilínea y puede reducir avisos `INCOMPLETE` producidos por hunks intermedios. **No** arregla snippets GitHub omitidos, binarios, cobertura de reglas heurísticas o falta de etiquetas independientes. El código fuente **no se publica** en el artefacto ni en el reporte C2; solo se extrae el hallazgo mínimo `rule,path,line`.

No habilitar esta hidratación en el monitor de cron, para no incrementar su superficie de red ni consumo de API; es exclusiva de la campaña C2 opt-in.


## Procedencia de CI vinculada al PR (endurecimiento)

Se aplica `packages/orchestrator/check-pr-provenance.cjs` a cada respuesta GitHub `check-runs` durante la campaña C2: **no basta con que el check esté verde y coincida el SHA**. La relación `pull_requests[]` del propio check debe incluir exactamente el número de PR, SHA HEAD y SHA base de GameHub, y las URL canónicas del repositorio en ambas partes. Una asociación ausente, truncada o con otro PR se rechaza con `INCOMPLETE_CHECK_PROVENANCE` o `CROSS_PR_CHECK_CONTAMINATION`.

La comprobación final del PR valida además los IDs inmutables del repositorio GameHub (`1375408706`) y su propietario (`322222186`); una rama de un fork no equivale al mismo repositorio. Si GitHub no expone vínculos suficientes para un check legítimo, **el resultado sigue incompleto** hasta obtener otra evidencia auditable. La etiqueta `OBSERVED_SUCCESS_UNATTESTED` nunca acredita aprobación de branch protection ni reemplaza un corpus de defectos etiquetados independientemente.


## Rotación de cohorte activa (2026-10-15)

- GitHub confirmó que el [PR #158](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/158) está **merged**; ya no es elegible en el lector de PR abiertos.
- La muestra activa que lo sustituyó fue el [PR #159](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/159), proyecto de *Frame Pacing & Refresh Intelligence*, HEAD observado `07e1866424305f7639e176e07a452c9f484b5e2b`. Su estado **draft** y CI deben comprobarse cada ciclo; no se interpreta como release-ready.
- Las cuatro muestras **actuales** son [#132](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/132), [#159](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/159), [#161](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/161) y [#73](https://github.com/cardenaspiero255-lang/gamehub-ultra/pull/73); #163 es histórico tras su fusión.
- Si algún PR cierra, la campaña se bloquea hasta escoger explícitamente una muestra sustitutiva y recalcular su identidad. No rotar silenciosamente casos después de ver los resultados: eso podría sesgar el benchmark.


## Control de cuota de GitHub API en la captura C2

Una respuesta HTTP 429, o HTTP 403 con cabeceras verificables de cuota agotada, bloquea la campaña con el motivo mínimo `GITHUB_RATE_LIMITED`. No se hacen reintentos ni consultas a los demás PR mientras la cuota de instalación está agotada. Los cuatro slots se conservan para transparencia, pero los no consultados quedan como `BLOCKED_INCOMPLETE_OR_STALE`; nunca pasan a `CANDIDATE_SNAPSHOT_ONLY`.

El estado se basa en la respuesta real de GitHub y no incluye tokens, cuerpos de error o credenciales en los informes. Cuando la cuota se renueve, repetir la campaña completa con SHA actualizados; no reutilizar una captura incompleta para la certificación. El bloqueo `GITHUB_API_BUDGET_EXHAUSTED` del lector sigue siendo un fallo explícito, distinto de la cuota compartida de GitHub.


## Entrega ciega reproducible (CLI offline)

Una vez obtenida la captura C2 **real** y descargado el archivo `c2-candidate.json` del artefacto sanitizado, generar un paquete ciego con:

```bash
node scripts/create-c2-blind-packet.cjs /ruta/absoluta/c2-candidate.json > c2-reviewer-packet.json
```

El comando es local, no realiza peticiones de red y rechaza archivos relativos, enlaces simbólicos, fuentes incompletas, cambios de cohorte, checks observados no exitosos y análisis parcialmente cubiertos. Produce solo PR, HEAD/base SHA, número de archivos y un SHA-256 del JSON canónico, sin publicar los hallazgos del candidato, los resultados del baseline ni etiquetas.

El paquete **no** constituye verdad de referencia ni prueba que quien etiquete sea independiente. La anotación debe realizarse fuera del modelo evaluado y contra esos mismos diffs de GitHub, documentar sus reglas, rutas y líneas, registrar casos positivos y negativos, justificar discrepancias y firmar posteriormente el manifiesto con una clave de revisión confiable. Verificar el binding Ed25519 con `packages/quality-gates/c2-blind-review.cjs`. Los requisitos cuantitativos y de revisión independiente de `SSSPLUS-RELEASE-GATES.md` siguen vigentes; ni firma ni CI verde activan certificación o autorreparación.

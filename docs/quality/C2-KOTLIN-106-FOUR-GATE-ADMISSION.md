# C2 — cuatro condiciones obligatorias para 106 candidatos Kotlin

Este control es **de revisión previa**, no de certificación. Separa la evidencia de las pruebas originales de lo que aún debe acreditarse antes de añadir cualquier etiqueta a Ultra Sentinel.

## Condiciones de admisión (conjunción, no puntuación)

1. **Pruebas originales reproducibles:** un test `f2p` falla en el commit original y pasa tras aplicar exactamente el parche; conservar manifiesto de tests original, logs, artefactos, commits y SHA de blobs fijados. Los `before/after` locales de la reproducción no equivalen a commits originales publicados. Debe validarse la procedencia independientemente del resultado JUnit.
2. **Causa raíz distinta y acreditada:** ruta, regla, ubicación, cambio causal y oráculo independiente que demuestra la conducta. Una tarea de SWE-bench con 25 tests no equivale a 25 defectos independientes.
3. **Correspondencia real con el detector:** ejecutar el detector Ultra Sentinel sobre la misma versión original y comprobar `ruleId`, ruta/linea y el defecto; un `sourceScope=KOTLIN_JVM_V3_EXPERIMENTAL` no demuestra que la regla exista ni que sus alertas acierten. Exigir controles benignos y contrafactuales.
4. **Independencia histórica:** cotejar firmas causales contra las 23 etiquetas **autenticadas**, además del resto de candidatos y dependencias. El sello histórico completo todavía no está disponible en un manifiesto de huellas independiente y validado por este gate, así que la admisión permanece bloqueada.

El módulo `packages/quality-gates/c2-upstream-acceptance.cjs` valida el roster de 106 directorios originales contra el árbol Git fijado y clasifica las declaraciones de resultados. El script `scripts/c2-review-kotlin-candidates.cjs` acepta exclusivamente los recibos originales de los lotes; en modo `full` exige el conjunto completo de 106 identidades, sin duplicados. Rechaza intentos de inyectar banderas `rootCauseVerified`, `detectorApplicabilityVerified`, `historicalIndependenceVerified` o etiquetas artificiales.

El reporte `c2-kotlin-four-gate-review` identifica la fase pendiente **de cada tarea**:

- `originalTests=TRANSITION_OBSERVED_UNATTESTED` cuando el recibo afirma una transición y tiene formato válido; esto **no** verifica independientemente la prueba ni la procedencia.
- `originalTests=INFRA_BLOCKED`, `REPRODUCTION_MISMATCH`, `NO_F2P_DECLARED` o `SOURCE_PENDING` según corresponda.
- `rootCause=ROOT_CAUSE_UNVERIFIED`, `detector=DETECTOR_APPLICABILITY_UNVERIFIED`, `historical=HISTORICAL_INDEPENDENCE_UNVERIFIED` hasta que se implementen sellos independientes, comprobables, para cada condición.

La campaña de ejecución `full` #39168947905 fue iniciada sobre un commit **anterior** a esta incorporación. Su workflow no se modifica retroactivamente. Tras descargar sus artefactos al directorio `receipts`, es posible crear el mismo reporte localmente con:

```bash
node scripts/c2-review-kotlin-candidates.cjs \
  --receipts /ruta/absoluta/receipts \
  --mode full \
  --output /ruta/absoluta/c2-four-gate-review.json
```

El resultado permanece `admitted=0`, `newLabels=0`, `precision=null`, `recall=null`, `f1=null`, `blindHoldout=false`, `tripleSPlusCertified=false`. **23 etiquetas históricas de desarrollo, 97 pendientes**. Una campaña pública conocida no constituye una evaluación ciega del 95 %.

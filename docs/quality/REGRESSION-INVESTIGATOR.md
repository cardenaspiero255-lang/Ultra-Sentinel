# Regression Investigator — fase offline, no ejecutora

**Nueva fase US-008 (25-10-2026):** `packages/quality-gates/regression-investigator.cjs` identifica el siguiente commit que conviene probar en una búsqueda binaria de regresión, usando una secuencia cronológica proporcionada de identificadores Git y resultados `GOOD/BAD`.

## Uso

```sh
node scripts/plan-regression-bisect.cjs /ruta/absoluta/observaciones.json
```

Ejemplo de entrada (reemplazar los SHA por valores reales del mismo historial):

```json
{
  "repository": "cardenaspiero255-lang/gamehub-ultra",
  "commits": ["0000000000000000000000000000000000000000", "1111111111111111111111111111111111111111", "2222222222222222222222222222222222222222"],
  "observations": [{"sha": "0000000000000000000000000000000000000000", "result": "GOOD"}, {"sha": "2222222222222222222222222222222222222222", "result": "BAD"}]
}
```

El resultado `TEST_REQUIRED` incluye `nextSha`. Tras registrar un resultado reproducible para ese SHA y volver a evaluar se reduce el intervalo. Si dos commits adyacentes son `GOOD`/`BAD`, retorna `CANDIDATE_REQUIRES_REPRO`: **no** certifica causalidad. Un resultado BAD anterior a otro GOOD es no monótono y retorna `NON_MONOTONIC_INCONCLUSIVE`; un estado sin extremos `GOOD` y `BAD` retorna `MISSING_BOUNDARY_OBSERVATIONS`.

La CLI no usa GitHub, red, tokens, Git checkout, Git bisect ejecutable ni cambios remotos. Valida límites y SHA y rechaza evidencia desconocida, repetida o contradictoria.

**Limitación:** los resultados los declara el llamador; las identidades de commits y su genealogía no se han consultado ni autenticado en GitHub. Esto **no** cubre aún el E2E de US-008: falta construir el adaptador de lectura de ancestría real y comprobar las pruebas CI originales sobre commits exactos, con autorización si se precisa ejecutar código. Jamás confundir la sugerencia con un fix validado. `mergeAllowed:false`, `autoRepairAllowed:false`.

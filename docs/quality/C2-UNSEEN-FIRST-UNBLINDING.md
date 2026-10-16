# C2 — primera medición real del detector sobre casos desconocidos

**Orden establecido:** medir primero la precisión sobre defectos no utilizados durante el desarrollo, sin aumentar falsos positivos, antes de autorizar reparaciones/rollback, Sentry, cron o certificación final. Solo participa el propietario.

## Desbloqueo sin fuga de información

La cohorte #172/#205/#206/#208 se congeló antes de mirar predicciones. Los tres positivos de GameHub #205, #206 y #208 se reprodujeron mediante código Kotlin original y quedaron fijados en el [sello C2 v3](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38842931678), artifact ID `12021956554`, SHA-256 **del JSON** `dce263a427b05c2fcb4fa2c52509ed6a82964772fe9c4f0bd526230c77809a59`; digest de verdad `544fb6e0c035239166097bf5abac894ccf8d0bedc234626326a31cd7e6ee7dec`.

El detector quedó fijado antes de la primera prueba: commit `bb38bb77983339301cafe8a7594e258e0c2924a6`; blobs exactos de `ultra_sentinel_core.cjs` y `c2-semantic-patterns.cjs` verificados en GitHub y de nuevo mediante `git hash-object` antes de cualquier captura. No actualizar las reglas para perseguir los resultados de este holdout.

El [workflow de medición](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/workflows/c2-unseen-first-measure.yml) se dispara únicamente por el propietario desde `main`, manualmente o comentando exactamente `ULTRA_SENTINEL_C2_UNSEEN_FIRST_MEASURE_V1` en issue #50. Primero verifica el run previo, repositorio, actor, SHA, artifact ID, estado `success` y SHA-256 original del JSON sellado. **Incidente y solución segura:** el primer run #38844478231 falló antes de medir porque el lector completo intenta hidratar `research.ts` de #205 (>160 KB), fuera del límite del Core preregistrado. El segundo run #38844858326 identificó `UNVERIFIED_PINNED_SOURCE` en ese PR. Además el endpoint mutable `pulls/208/files` devolvía el blob `fe804973...`, distinto del blob del HEAD congelado `9298fe614...`; sus hunks tampoco coincidían con el original. Ningún resultado de esos runs debe contarse como benchmark.

Para no modificar el Core ni ocultar esta limitación, la nueva captura compara **SHA base...HEAD inmutables** directamente mediante `/compare/{base}...{head}` de GitHub. Verificamos por separado para #205, #206 y #208 que el blob de cada archivo objetivo y **todas sus líneas de contexto y adición** coinciden con el contenido original de HEAD. El workflow descarga solo **el archivo donde se reprodujo cada uno de los tres defectos**. La evaluación es, por tanto, `FROZEN_TARGET_FILE_DIFF`, con `wholePrCoverage=false` — **NO** afirma analizar todas las modificaciones de los PR. Se rechaza cualquier mismatch o fuente incompleta.

El único output publicable contiene `(rule,path,line)` por hallazgo; jamás diffs, cuerpos de código, tokens, transcripciones, claves o archivos de origen. El evaluador posterior es offline con `env -i`, permisos de solo lectura de Node y sin token GitHub.


### Actualización de HEAD del PR #208 posterior al congelamiento

El 16 de octubre de 2026 el PR #208 avanzó a HEAD `bf3bfd1490e9446fc000bf03fca2e5e3be631865` (15 archivos), **después** del congelamiento C2 original en `df2bd33416d652480e51994784e511fbcb7ede12` (13 archivos). El primer run con comparaciones inmutables bloqueó de forma segura al contrastar incorrectamente el HEAD **actual** con el histórico sellado. La medición posterior debe consultar exclusivamente `compare/fca3250bd71700045cf9b2fc4e4281421f545d2e...df2bd33416d652480e51994784e511fbcb7ede12` y `contents?ref=df2bd...`, mientras la API del PR actual se usa solo para confirmar que sigue siendo el mismo repositorio/propietario.

**Nunca sustituir el HEAD histórico por el actualizado para mejorar el score, ni llamar a esta medición "situación actual del PR #208".** El control firmado previamente y los SHA de los archivos constituyen la procedencia del ensayo. Si el PR cambia, la versión nueva necesita otra cohorte congelada y nuevas etiquetas independientes.

## Qué medimos y qué NO

- `observedKnownPositives.total=3`: positivos que **no participaron** en el diseño de las cuatro reglas antiguas. `detected` y `missed` se obtienen comparando directamente la identidad exacta `rule/path/line`.
- `observedHitRate`: solo aciertos dentro de **tres positivos seleccionados y reproducidos**, no recall poblacional. Dado que la identidad de regla fue definida por el oráculo, la comparación debe auditarse antes de convertirla en un benchmark certificado.
- `unlabelledCandidateFindings`: alertas emitidas sin verdad independiente. **No son falsos positivos** mientras no estén verificadas; tampoco pueden darse por válidas o descartadas.
- `verifiedNegativeFindingLabels=0`: no hay todavía controles negativos **etiquetados por identidad**. Por tanto global `precision=null`, `recall=null`, `f1=null`, FP no-regresión `false`, certificación ≥95 % `false`.

**Condición de fallo cerrado:** cualquier cambio de SHA, fuente parcial, omisión de alertas, token expuesto, resultado sin archivo de verdad validado o ejecución incompleta bloquea la medición. No se reemplaza por datos sintéticos ni se supone que el sistema anterior tuvo cero falsos positivos.

## Continuación

Después de medir estos tres casos, crear y cerrar un conjunto de verdaderos negativos por `rule/path/line` con pruebas de ausencia del defecto, y aumentar la muestra con casos positivos y negativos de PR no vistos. Para un benchmark global sigue haciendo falta **cobertura de todos los archivos y versiones bajo evaluación**, además de 120 identidades confiables, 48 positivas, 48 negativas, ≥6 reglas, ≥4 rutas y ≥4 PR, cobertura crítica y baseline heredado en idénticos commits, seguido por validación estadística y verificación de no aumento de FP. No volver a utilizar para certificación ciega casos empleados después para modificar Core.

Hasta entonces `NOT_CERTIFIED`, sin auto-merge, sin reparación autónoma de producción y sin alterar GameHub Ultra.

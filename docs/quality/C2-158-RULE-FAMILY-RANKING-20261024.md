# C2 — Priorizar 158 PR prospectivos por familias del Core congelado

**24-10-2026. Estado: PRESELECCIÓN DE METADATOS; NO GOLD; NOT_CERTIFIED.**

## Cohorte y procedencia

El manifiesto original contiene exactamente 169 identidades PR con SHA base/HEAD congelados. **11 ya tuvieron inspección de fuente** y deben permanecer fuera del holdout intacto: 8 en `C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json`, Lawnchair #7428, Bitwarden #7499 y Home Assistant #7681. Quedan **158 candidatos no inspeccionados**. Ninguno está certificado como etiqueta positiva ni negativa.

Este PR no abre ningún diff, título, body ni código de los 158. El comando `scripts/c2-rank-prospective-metadata.cjs` opera offline sobre *solo* identificadores Git y `filename/status/sha/additions/deletions/changes`. Un workflow protegido consulta los metadatos vivos, compara exactamente PR/base/head/createdAt con el manifiesto, procesa de inmediato la API de archivos para **descartar los campos `patch` de la respuesta en la tubería** y conserva únicamente datos sanitizados. La respuesta remota puede incluir `patch` en tránsito; nunca se guarda ni se envía al Core. No afirmar que se evitó recibir esos bytes en la infraestructura de GitHub, sólo que **no se inspeccionaron como código ni se persistieron**. Los errores de API, drift y listas truncadas se marcan explícitamente, sin adivinar elegibilidad.

La ejecución de ranking del repositorio usa el actor propietario 322222186 en main; sólo se activa automáticamente con la primera fusión de este documento. Puede repetirse por despacho manual del propietario. Los PRs normales sólo corren tests offline. Nunca se ejecuta código de los candidatos, ni se invocan predicciones del detector/baseline, ni se sella verdad ni se autoriza la reparación.

## Qué reglas son realmente posibles sin inspeccionar fuente

Core histórico anclado al commit `547938ed88804e25bbabecf74a3c3d91b74cf1a4`, blob `db29f94be1e0afb791a241d26f449695df0eafd0`; **17 rule IDs**, catálogo `FROZEN_RULES`. El ranking usa las rutas permitidas históricas (`app/src/main` y `.github/workflows`) y **jamás modifica el Core**.

- Código Android Kotlin/Java: hipótesis **no verificadas** de `UNSCOPED_COROUTINE`, `BLOCKING_ANDROID_CALL`, `FORCED_GC`, `NON_CANCELLABLE_LOOP`, `POTENTIAL_PRIVATE_LOG`, `POTENTIAL_HARDCODED_SECRET` y `UNBOUNDED_RECURSION` (esta última requiere fuente completa y Kotlin original; no se prueba desde rutas).
- Una ruta con `speech`, `voice`, `recogniz`, `asr`, etc. agrega como hipótesis **`SPEECH_REENTRANT_RETRY`**. Los nombres son una afinidad débil, no defectos observados.
- Workflows de GitHub bajo `.github/workflows/`: `PRIVILEGED_UNTRUSTED_CHECKOUT` como **hipótesis**, pero cambiar un pin de Actions no demuestra vulnerabilidad. Debe verificarse un checkout real de fuente no confiable con `pull_request_target`.
- `REGRESSION_TEST_COVERAGE` se considera advertencia de metadatos, **no defecto positivo** ni prueba de ausencia de pruebas preexistentes.
- Las siete familias de regresión conocidas ancladas a rutas/código de GameHub son **material de desarrollo**, no evidencia de otros repositorios ni de generalización ciega. No se les atribuye compatibilidad por coincidencias textuales de nombre.
- Actualizaciones exclusivamente de `package-lock`, `gradle/libs.versions.toml`, `renovate.json`, `build.gradle`, etc. quedan con `METADATA_DEPENDENCY_ONLY` y rango 0. Un PR que modifica workflow YAML podría ser un pin o un cambio real de permisos: **sin leer código no se etiqueta falsamente como dependencia-only** y queda en revisión inferior.

## Orden objetivo y protección contra promesas falsas

La prioridad es (1) rutas realmente analizables, (2) afinidad por archivo a una familia general implementada, (3) cambios de pruebas asociadas y (4) tamaño manejable; se desprioriza PR masivo. Un test modificado es sólo un *indicio de disponibilidad*, **no acredita regresión original ejecutable**. El informe conserva `exactRulePathLineConfirmed=false`, `originalFixBenignExecuted=false`, `sourceReadAuthorized=false`, `truthSealed=false`, `newGoldLabels=0` para todos.

El informe puede incluir menos de 158 PR con rutas comparables si algunos originales derivaron de SHA, sus blobs no son accesibles o la API falló. En esos casos no se asigna puntuación de detectabilidad; se reporta `DRIFT`, `API_ERROR` o `INCOMPLETE`. Prohibido convertir ausencia de evidencia en verdad negativa.

## Paso posterior, separado y condicionado

Tras revisar el resumen fuente-libre y escoger **uno** de los casos no expuestos con mayor afinidad plausible, fijar permiso de lectura del propietario sobre ese PR específico, reacreditar HEAD/base/blobs, revisar licencia y exclusión causal, luego inspeccionar fuente sólo bajo autorización y demostrar el `ruleId/path/line` original exacto. Sólo con un defecto cubierto realizar upstream **original falla / corrección pasa / benigno pasa** en ejecutor aislado, repetir con un verificador independiente y sellar verdad antes de medir Sentinel o baseline. De lo contrario `INCONCLUSIVE` sin GOLD.

Los otros gates siguen aparte: 120 etiquetas realmente admisibles, balance 48+/48-, métricas micro >=.95, autorización/rollback E2E, Sentry privado, cron/alertas observados y auditoría final del SHA. SSS+ permanece `NOT_CERTIFIED`.

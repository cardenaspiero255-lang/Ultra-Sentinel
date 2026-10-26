# Ensayo protegido GameHub PR151: GitHub OIDC → Kotlin real → rollback

Este procedimiento es **privado en su propósito**, pero el repositorio se mantiene público por decisión del propietario. NO realiza reparación, lanzamiento o despliegue en GameHub real; solo prueba una **copia desechable** de un archivo Kotlin de un SHA histórico verificable.

## Autorización desde Android: un clic

En GitHub autenticado como `cardenaspiero255-lang` abrir:

https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/workflows/gamehub-pr151-owner-e2e.yml

Seleccionar `Run workflow`, rama `main`, y confirmar. El workflow no tiene permisos de escritura de contenido. En el runner obtiene un JWT OIDC directamente del emisor `https://token.actions.githubusercontent.com` con audiencia fija `urn:ultra-sentinel:gamehub-pr151:sandbox`. Antes de ejecutar corrige/compila la fuente, verifica su firma RS256 frente a JWKS del emisor por TLS (algoritmo y kid fijos por política, sin URLs derivadas del token) y exige:
- actor ID GitHub = `322222186`; repositorio ID = `1418338512`;
- `sha` idéntico a `GITHUB_SHA`, `run_id` e intento `1`;
- `event_name=workflow_dispatch`, workflow `.github/workflows/gamehub-pr151-owner-e2e.yml@refs/heads/main`, `ref=main`;
- `sub` **inmutable**, con IDs reales del propietario y repo (creado 2026-10-14);
- emisión reciente, expiración del JWT y prohibición de `alg=none`, `jku`, `jwk`, `x5u`;
- ejecutor `github-hosted`.

Existe también disparador de comentario del propietario bajo issue #50 con texto literal `ULTRA_SENTINEL_GAMEHUB_OWNER_OIDC_PR151_V1`, comprobado independientemente por GitHub Actions y por `GITHUB_EVENT_PATH`; el JWT emitido debe acreditar `event_name=issue_comment`.

**OIDC certifica un workload emitido por GitHub y ligado al propietario autenticado**; no certifica firma Ed25519 bajo una clave personal que solo el usuario controla, y no puede invocar `scripts/run-owner-sandbox-repair.cjs` ni autorizar cambios remotos. La ruta de reparación real firmada con Ed25519 permanece intacta.

## Defecto real investigado

Archivo original: `app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt`, GitHub GameHub Ultra PR #151, commit `9ad983576c16c6c34d59283979d83c69ede50dce`, blob Git `adb11032b9b7f62f865228dfa1c27258ca3fa0df`.

El código compara métricas térmicas con `!isNaN()` y umbral alto: `Float.POSITIVE_INFINITY` no es NaN y se interpreta erróneamente como presión térmica. La prueba Kotlin original reproduce fallo RED; el cambio de tres predicados a `isFinite()` pasa GREEN y Judge independiente. Los controles cubren finitos, null, NaN, infinito positivo/negativo.

La detección experimental `packages/recovery/gamehub-pr151-source-hunter.cjs` verifica el blob histórico exacto y líneas 73, 150 y 264. **No modifica las 17 reglas congeladas del Core ni crea etiquetas GOLD**: es una hipótesis específica del caso, que necesita el oráculo Kotlin como comprobación causal.

## Recovery y recibos

El workflow de PR `gamehub-pr151-source-rollback-pr.yml` obliga pruebas de regresión antes de merge: descarga el código original por SHA, comprueba su blob, compila Kotlin original y corregido, ejecuta RED/GREEN/Judge con Bubblewrap sin red, crea un repo Git TEMPORAL `sandbox/frozen-gamehub-pr151` SIN remote, aplica exactamente las tres correcciones a un commit local y lo revierte. El SHA del árbol del revert debe ser **idéntico al original**, y el blob restaurado debe coincidir byte por byte.

El workflow del propietario repite ambas pruebas y sella recibo SHA-bound de la aprobación OIDC, fuente, hipótesis, Kotlin y restauración del árbol. Ningún recibo comunica secretos, credenciales o código fuente bruto.

## Criterios de certificación

- [ ] Verificación real del JWT OIDC emitido por GitHub en workflow del propietario (no cuenta el test RSA de fixture).
- [ ] RED Kotlin original, GREEN Kotlin corregido, Judge independiente ejecutados en runner autorizado.
- [ ] Commit de corrección y revert en Git temporal con árboles idénticos y cero remotos.
- [ ] Recibo descargable de la misma ejecución con SHA y run ID.
- [ ] Firma Ed25519 personal **para el ejecutor de reparaciones de producción** y recorrido completo `verifyHunterRepairBinding→runOwnerAuthorizedSandboxRepair` sobre defecto real **todavía aparte**. No se sustituye por GitHub OIDC sin revisión de diseño/seguridad adicional.

**No afirmar Triple S+, release ni reparación productiva certificada por este ensayo**. La muestra histórica es conocida y no pertenece a un benchmark ciego independiente.

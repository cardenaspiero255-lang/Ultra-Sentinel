# Live registered PR handoff — GitHub read-only integration

Scope: only `cardenaspiero255-lang/gamehub-ultra`, a trusted-main registered
`BatteryAwareGamingEngine.kt` repair plan, and **review-only** handoff.
No GitHub mutation, repair execution, merge, release, or rollout.

## Input and trust boundary

The caller MUST load its plan using `loadRegisteredPlan(root, digest)` from the
reviewed registry in the trusted `main` checkout; never construct the plan
from PR content, a comment, workflow_dispatch text, or an external URL.
The user of this adapter supplies a read-only GitHub token and an integer
PR number to `assessLiveRegisteredRepairPr({plan,prNumber,token})`.
It uses only bounded fixed-origin `GET` requests:

1. Read the PR and pin exact origin/candidate commit SHA, repository and base.
2. Read exactly the two expected modified PR files and their Git blob hashes.
3. Enumerate **all** latest current-head check runs via bounded pagination,
   reject incomplete pages, inconsistent totals, duplicates or unknown data.
4. Re-read the PR and reject a changed HEAD/base, mergeability, or update time.
5. Invoke the existing `assessRegisteredRepairPr` gate; handoff only if all
   required checks succeed, no blocking checks remain, and CAR-29 is preserved.

The adapter catches network or validation errors and returns only
`LIVE_HANDOFF_EVIDENCE_BLOCKED` on failure. It never exposes token contents.

## What the evidence does NOT demonstrate

- A mock GitHub API in the local tests validates network contracts but **not**
  a live successful PR handoff.
- GitHub's public PR #245 used for the registered battery plan is already
  **closed**. The correct live decision is a block, not review-ready.
- This is a read-only review handoff, not a recovery E2E in an authorized
  physical host and not a substitute for reviews or branch protection.
- The token requires GitHub permission to read PRs and checks on the target
  repository; if GitHub denies permissions, this flow must block.
- Additional legacy commit-status contexts, changed post-read checks, upstream
  review/ruleset requirements and actual patch approval remain separate
  terminal release decisions. Never wire this result directly to auto-merge.

## Reproducible CI evidence

- RED: run `40428753701` on `7da008fdf0b764013e1486fb83ccca0f436aae8c`
  failed because the live adapter did not yet exist.
- GREEN: run `40428882874` on `0e0d3f3b99aa336cea5803e19658933148d1bc7a`
  completed `npm run check` with 1127 passing tests, 0 failures, no omitted
  tests in the Node test runner.

Production authorization is **not** implied by a successful mocked integration
or green CI. Preserve `remoteWrites:false` and `autoMergeAllowed:false`.

## E2E encadenado: autorización → Kotlin → rollback → checks

El módulo `packages/recovery/registered-owner-e2e-handoff.cjs` y el
`scripts/registered-owner-e2e-handoff.cjs` se ejecutan **después** de que el
workflow `owner-single-approval.yml` haya verificado:

1. Un comentario del propietario en el issue #50, OIDC con claves JWKS
   originales de GitHub, SHA del workflow, ventana temporal y nonce único.
2. Plan registrado `gamehub-battery-valid-range`, SHA y blobs Kotlin exactos.
3. Ejecución RED/GREEN/Judge en JVM real aislada sin red.
4. Reparación y reversión Git en árbol temporal idéntico al origen.
5. Recibo previo de `registered-owner-proof.json` con aprobación de sandbox
   (no autorización de escritura remota).

La etapa nueva lee **solo archivos privados creados dentro del mismo job**
en `RUNNER_TEMP`, rechaza enlaces simbólicos, permisos inseguros y recibos
discordantes, y verifica las identidades cruzadas de plan, SHA de ejecución,
run ID, comentario de propietario y blobs original/candidato. A continuación
consulta GitHub en modo lectura para examinar el PR #245, los archivos
modificados y sus checks sobre el HEAD exacto. Genera un segundo recibo
`registered-owner-review-handoff.json`, incluido en el artifact de la
ejecución, sin credenciales ni datos privados.

**Situación real de GameHub #245:** está fusionado/cerrado. Aunque las
pruebas de recuperación aislada estuvieran verificadas, el recibo debe indicar
`SANDBOX_E2E_VERIFIED_PR_REVIEW_BLOCKED`. No se reactiva ni se autoriza la
fusión de un PR cerrado. El flujo de revisión positiva solo está probado
mediante fixtures controladas; se necesita otro PR vigente y un plan nuevo,
registrado y revisado, para comprobarlo con GitHub real.

**CAR-29 permanece protegido:** `car29ChecksVerified` puede expresar
éxito de los checks actuales, pero `car29FullySatisfied=false`,
`protectedReviewVerified=false` y `releaseAuthorized=false` hasta que
otra verificación autenticada compruebe las aprobaciones protegidas y demás
reglas de branch protection. No hay permisos para auto-merge o push.
El éxito de GitHub Actions por sí solo no es una autorización.

**Condición de ejecución:** este tramo solo se activa cuando una aprobación
auténtica y nueva del propietario inicia el workflow de `main` después de
fusionar el código. Las pruebas del PR verifican el contrato y la integración
con HTTP simulado, no alegan haber disparado una autorización real.

# C2 — vista histórica extendida con GameHub #153:71

**Fecha de CI UTC:** 2026-10-21. **Propósito:** incorporar evidencia causal acotada de GameHub #153 a la vista histórica derivada, sin reescribir ni recertificar Run23.

## Entradas originales autenticadas

El workflow `.github/workflows/c2-pr153-extended-causal-overlay.yml` recupera dos artefactos inmutables mediante permisos de GitHub exclusivamente de lectura, verificando run ID, autor, repositorio, SHA de código, workflow, SHA-256 publicado por GitHub y vigencia del artefacto.

1. PR #176 — [run 39514323998](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39514323998), artefacto `12306549884`, SHA-256 `4cf7d2d255bc37ff8c6d2f9e8effeb51ae047c62900cb667262bce6e0da59968`. Contiene la vista original extendida de **23** identidades y el lote de #151–#158.
2. PR #177 — [run 39523094775](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39523094775), artefacto `12312576821`, SHA-256 `ccd2fb77b4eb2a362e715a38446c7bbc88276a2765db3790f5caaa7c6f14cb8d`. Contiene el contrafactual Kotlin original/parcheado de #153, con el blob original `d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f`.

## Único cambio permitido

- **GameHub #153, línea 71**: `PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE`, clasificación `SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL`, familia `ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE`, huella causal *provisional* derivada del nombre de la familia, `independentlyCertified=false`. Se reevalúa el comportamiento real observado contra el oráculo `adjudicateReplay()` original de #177, incluidos controles benignos.
- **GameHub #153, línea 69**: `ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK`. Registro histórico separado, sin anotación nueva. Coincidir en el mismo PR no autoriza fusionar sus identidades ni afirmar una causa común.
- **GameHub #150:251 y #150:252**: conservan exactamente su familia provisional compartida `RECOMMENDATION_CONFIDENCE_CALIBRATION`. **#150:250** sigue siendo un control negativo, sin huella positiva.
- **GameHub #151/#152**: mantienen sus anotaciones provisionales de reparación parcial, sin calificación de independencia. **#154/#155/#157/#158** siguen siendo controles negativos acotados sensibles a mutantes, sin huella causal positiva.

La transformación es una vista derivada y aditiva: los blobs, rutas, líneas, clases, hashes y recuentos del sello Run23 no se alteran. El artefacto de CI contiene solo metadatos históricos derivados, sin secretos ni código original.

## Restricciones de admisión y certificación

`count=23`, `positives=11`, `negatives=12`, `provisionalPositiveFamiliesAfter=4`, `certifiedIndependentCausesAdded=0`, `remainingHistoricalCausesUncertified=21`, `newLabels=0`, `independenceVerified=false`, `holdoutFrozen=false`, `precision/recall/F1=null`, `sssPlusCertified=false`.

Las cuatro familias son hipótesis de desarrollo, **no cuatro causas independientes certificadas**. El futuro benchmark sigue sin admitirse hasta certificar independencia y resolver `BASELINE_INCOMPLETE`. Ninguna modificación se despliega en GameHub; el parche de #153 era una copia descartable utilizada para demostrar la causalidad.

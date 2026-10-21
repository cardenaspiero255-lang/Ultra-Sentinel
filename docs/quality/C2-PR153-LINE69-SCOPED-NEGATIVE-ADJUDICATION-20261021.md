# C2 — Adjudicación conservadora de GameHub #153, línea 69

**Alcance:** identidad negativa histórica `ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK`. Este trabajo no añade una causa positiva, no crea etiquetas GOLD, no recertifica Run23 y **SSS+ permanece `NOT_CERTIFIED`**.

## Evidencia original que debe autenticarse en CI

- Owner Run16 [#39067708985](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39067708985), commit `f7612b326485d86aa698d024d2ecf1931923d7df`, artefacto `12113662602`, archive SHA-256 `1a41eba8de90abacade6d0f561aeb4cd2b65411b59ae9d080f7eff9c4ec26988`. Ejecutó sin red el Kotlin original de GameHub #153 a HEAD `6508cc124076b9dea437ea1efc213d3ce55d7baf` y mató el mutante que introduciría el callback explícito en una escritura adaptativa. El blob original `GameStateOwnershipContracts.kt` es `18911c26a9afaf051fda0e9ea14cdaccf943a47b`.
- Overlay derivado previo [Run #39533113371](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39533113371), commit `e00dd04e503599a729639b9171c235679256c99d`, artefacto `12316571128`, archive SHA-256 `0f1918ab6836870eada72a477e59334208d69298f3f42ed8557fea3945bd229f`. Preserva las 23 identidades históricas y la hipótesis positiva provisional **#153:71**.
- Se comprueban las identidades de ambos runs, el propietario, la ruta de workflow, la conclusión exitosa, los artefactos, los hashes y su no caducidad. La transformación valida también la procedencia y la identidad exacta de la etiqueta negativa incluida en Run16.

## Decisión causal limitada

La fuente original demuestra que las tres rutas explícitas notifican el callback y que `saveAdaptiveProfileForGame` delega sin dispararlo. El mutante altera exclusivamente la ruta adaptativa y viola el oráculo. Se registra como `SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE`, con **huella causal positiva nula**. Es una verificación de **un comportamiento seguro acotado**, no una prueba de corrección de todo el PR, ni una auditoría de Android E2E.

La línea **#153:71**, en el archivo `PerGameAdaptiveRuntime.kt`, trata una divergencia positiva de recuperación/replay. No se asigna la misma familia a #153:69; su polaridad y mecanismo son distintos. Las otras 22 identidades, incluidas #150:250/251/252, permanecen byte a byte con los mismos campos del overlay anterior. La vista es aditiva y derivada; no toca GameHub ni el conjunto sellado original.

## Condiciones de aceptación

La nueva salida requiere `count=23`, `positives=11`, `negatives=12`, `historicalIdentitiesWithAnnotations=11`, `provisionalPositiveFamiliesAfter=4`, `certifiedIndependentCausesAdded=0`, `remainingHistoricalCausesUncertified=21`, `newLabels=0`, `independenceVerified=false`, `holdoutFrozen=false`, `precision=recall=f1=null`, `sssPlusCertified=false`. Las cuatro familias siguen siendo hipótesis provisionales, no diversidad causal certificada.

**Estado:** propuesta técnica sujeta al workflow original-source autenticado y al CI del HEAD exacto. No considerar ejecutada o aceptada esta fase hasta obtener SUCCESS de los gates en el PR.

# C2 — revisión técnica de los dos oráculos Kotlin originales (2026-10-18)

## Evidencia inspeccionada, sin minting automático

- Ejecución aislada: [Actions #39166787286](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39166787286), éxito del workflow y los dos shards, `sourceCommit=b9025d86f7ae634901396766bd61f6d4ae6d2165`.
- GradleUp: artefacto `12150923015`, digest `sha256:97374a7f865ad4795058fe5f7d9adfa7d16c7452f517cc30fb1d8b49f94e4a72`. JUnit: 1 `f2p` FAIL→PASS y 46 `p2p` PASS→PASS, cero duplicados/conflictos declarados.
- Detekt: artefacto `12150459226`, digest `sha256:a6b5f9d85438a8a1eac999f2d3e86b6636aed44563860d26dc34da46c450f1ef`. JUnit: 1 `f2p` FAIL→PASS y 2566 `p2p` PASS→PASS. **Persisten dos identidades JUnit no puntuadas con estados conflictivos en cada fase**; no atribuirles una etiqueta ni ignorar la advertencia.
- Ambos recibos señalan explícitamente `rootCauseVerified:false`, `sourceCommitProvenanceVerified:false`, `independentReviewVerified:false` y `detectorApplicabilityVerified:false`. Las dos ejecuciones se consideran **transiciones de test bajo revisión**, no etiquetas nuevas.

## GradleUp/shadow #1313 — causa técnica revisada

- PR original: https://github.com/GradleUp/shadow/pull/1313, referencia a las incidencias #295, #562 y #884.
- Cambio de producción: `src/main/kotlin/com/github/jengelman/gradle/plugins/shadow/relocation/SimpleRelocator.kt`. Originalmente la normalización `pattern.replace('.', '/')` convertía también el punto de una extensión en un separador; para una exclusión como `kotlin/kotlin.kotlin_builtins` se pierde la coincidencia. La corrección distingue patrones de archivo por `FilenameUtils.getName/getPathNoEndSeparator` y conserva sus extensiones.
- Test original: `SimpleRelocatorTest.canRelocatePath()`. `before=b9d4a93656f1ba66929195e2e244bbd1edcc589c` existe en GitHub upstream. `after=5297d9209bdce719cce92509732ffedf6b701af3` es un commit local temporal de la reproducción: **no debe presentarse como commit upstream original**. Se contrastó el PR original con los cambios aplicados, pero aún no existe una attestation independiente de cada blob de corrección.

## detekt/detekt #4205 — causa técnica revisada

- PR original: https://github.com/detekt/detekt/pull/4205, issue #4204.
- Cambio de producción: `detekt-rules-style/src/main/kotlin/io/gitlab/arturbosch/detekt/rules/style/ForbiddenMethodCall.kt`. Antes solo se inspeccionaba el descriptor de la llamada resuelta; la corrección incorpora `overriddenDescriptors`, por lo que una invocación de una sobrescritura puede encontrar el método prohibido definido en su interfaz/base.
- Test original: `ForbiddenMethodCallSpec.should report overriding method calls`. `before=ea00969fca38ea4d5f41baddcc819a585936a2b4` existe en upstream. `after=126084064b8a08798ba697e09c95234be44b30b0` es commit local de la reproducción, no commit upstream.

## Pertinencia al detector y decisión

El opt-in `KOTLIN_JVM_V3_EXPERIMENTAL` habilita rutas `src/main/kotlin/**/*.kt`, **no** implica análisis semántico/tipos de reglas específicas. El core actual se centra en patrones Kotlin/Android e inspección léxica; no hay evidencias de que detecte ni la confusión archivo-vs-paquete de Shadow ni el recorrido de `overriddenDescriptors` de Detekt. No afirmar `true positive` de Ultra Sentinel.

**Decisión:** mantener ambos como `CAUSE_EXPLAINED_DETECTOR_RULE_UNVERIFIED` de desarrollo, pendientes de autenticación de fuente original, huella causal contra 23 etiquetas históricas, licencia verificada y nuevo contrato/detector con negativos adversariales. No son holdout ciego, no suman etiquetas ni afectan precisión/recall/F1.

## Campaña de 106 candidatos

La auditoría previa de manifiestos [Actions #39166886529](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39166886529) dio 91 tareas con `f2p` declarados y 15 sin `f2p`. La ejecución `full` utilizará la fuente fijada, un roster de 106, sharding de 5 y máximo 3 ejecutores concurrentes, y sus recibos serán **candidatos** hasta cotejo y revisión causal. El acceso de red para descargar dependencias del Docker build ocurre en runners efímeros; la ejecución de las pruebas originales dentro de los contenedores usa `--network none`. Los flujos son de solo lectura y no alteran el Core congelado.

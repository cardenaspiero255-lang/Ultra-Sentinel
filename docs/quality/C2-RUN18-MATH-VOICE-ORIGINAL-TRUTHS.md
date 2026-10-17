# C2 Run 18 — two distinct source-scoped original behaviors

The previously owner-sealed corpus has 16 identities (8 positive and 8 negative), from GitHub Actions run 39070029033, artifact 12114598638 with digest sha256:bc2cd5da189f39bed41c02737b1b73cf5df17bc0f938be9094bcf4e87377f764. Previous presealDigest: 6bac3d64f843455c3f95728404ad53b25ece0748f1ed5c0e5439ae5a8cea97d4. Those 16 are pinned and unchanged.

## Positive from frozen GameHub #154 — quadratic overflow exception

Original HEAD: 858c9ce5cb6a7916d63f2348432013e49d02ba79.
File: app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraMathEngine.kt, line 100.
Git blob: 063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a.
Original byte SHA256: f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a.
Proposed positive: QUADRATIC_DISCRIMINANT_NONFINITE_DOUBLE_UNHANDLED.

An ordinary quadratic x^2 + x - 6 = 0 returns -3 and 2. In contrast, a syntactically valid quadratic x^2 + x - (350-digit positive integer) = 0 produces an intermediate BigDecimal discriminant whose conversion to Double yields Infinity. BigDecimal.valueOf(sqrt(Infinity)) then throws NumberFormatException; UltraMathEngine.solve has no local guard. The unchanged historical Kotlin passes the ordinary equation and fails the no-unhandled-exception contract. An isolated counterfactual checks isFinite before passing the Double to sqrt, making this exact contract pass without touching original bytes. The counterfactual returns null rather than solving the large equation; this case demonstrates resilience against unchecked numeric conversion, NOT high-precision root solving.

Real frozen production caller: UltraUnifiedAgent.kt, Git blob 5d271a02aa4227e07a5c352b572f6c14621e80fc, calls UltraMathEngine.solve(transcript). This establishes callsite wiring, not a physical device incident.

## Negative from frozen GameHub #150 — voice stop precedence

Original HEAD: 4c6912d7ca17df0669f8a0d9667f34d2f2b205a9.
File: app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraWakePlaybackGuard.kt, line 167.
Git blob: f661289c8fb9d5ca59687f156923971f4cc4672d.
Original byte SHA256: b3147996af60bb304f65c400ca535ee07ad828921d0df870f9117d19422f49dc.
Proposed negative: SPOKEN_STOP_PRIORITY_OVER_EXPLICIT_WAKE_BARGE_IN.

During active TTS, an explicit 'Ultra, para' triggers STOP_TTS, before the generic explicit wake invocation can cause INTERRUPT_TTS. Original Kotlin also accepts speech while idle, suppresses TTS echo, and recognizes an unrelated explicit wake as INTERRUPT_TTS. A temporary mutant swapping the two when branches makes the specific stop-priority contract fail while control cases pass. The external parser is simulated by ABI-only versions of its real normalize/strip invocation functions, and owner CI pins the actual parser at blob febd1687ceb26a9f195413021fb0257392c0592b. The actual service at blob cb23014c91b447bef2eeb7b619503495d31a55da consumes this policy and routes STOP_TTS to stopActiveUltraSpeech. This is a scoped source negative, not proof that physical ASR/microphone/TTS always works.

## Provenance and fail-closed seal

A dedicated owner-only GitHub Actions workflow authenticates the 16-label owner run/archive and the 5 original source/caller/parser Git blobs, then runs all unchanged Kotlin and sensitivity variants in a networkless Bubblewrap/AppArmor environment without credentials. A new positive and negative are admitted only when all source, expected failures, control passes, and prior identity checks succeed. No original source is mutated. No model, baseline or detector predictions are read.

Before such CI finishes, the official corpus remains 16 (8 P / 8 N). On authenticated success only, it becomes 18 (9 P / 9 N), leaving 102 of the 120 minimum. The 24 diversity slots remain subject to independent root-cause, provenance and contamination restrictions. Historical Core scope 153/241, independent blind holdout, detector P/R/F1 at 95%, FP non-regression, Sentry/rollback/availability and full Triple S+ remain NOT_CERTIFIED.
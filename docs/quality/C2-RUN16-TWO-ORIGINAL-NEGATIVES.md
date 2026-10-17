# C2 Run 16 — two independent original safe-behavior controls (candidate negatives)

The prior twelve truths are owner-sealed in Ultra Sentinel Actions [#39059101315](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39059101315), artifact 12110378858 with ZIP digest sha256:2c14ea320284efac3539f0811bc9910ce5854bf3391452383734a7eed65d6193. Historical original-source inputs were frozen in GameHub PRs #150, #151, #152, #153, #154, #155, #157, #158; do not refetch mutable PR heads or count synthetic mutants as defects.

## Candidate 1 — PR #151, presentation tail boundary

- Immutable HEAD: 9ad983576c16c6c34d59283979d83c69ede50dce
- Original file: app/src/main/java/com/cardenaspiero255/gamehubultra/ui/components/SessionCoachPresentation.kt
- Git blob: f623999ecd31f6961bc48f34d834674494b7d1db, source SHA256: 635d678a15f914e2fc3fb84a05839cf2eef8187c4221a5c8f3e4c3128157ea7e
- Predicate: ACTIVE_SESSION_ONLY_LATEST_THREE_OBSERVATIONS at line 22, negative only for specified behavior and tested five observations.
- Original-source oracle: active session shows last three ordered observations, does not render pre-session banner; idle session shows latest single observation. Control passes; replacing takeLast(3) with take(3) in temporary copy makes the specific tail contract fail.
- Production caller (same HEAD) PerformanceSessionComponents.kt Git blob 6bfce4f62894c5f96cf993933a9e2a426163720a explicitly calls SessionCoachPresentation.lines(...).
- This does not prove the entire UI or PR is free of defects.

## Candidate 2 — PR #153, adaptive-vs-explicit selection boundary

- Immutable HEAD: 6508cc124076b9dea437ea1efc213d3ce55d7baf
- Original file: app/src/main/java/com/cardenaspiero255/gamehubultra/data/GameStateOwnershipContracts.kt
- Git blob: 18911c26a9afaf051fda0e9ea14cdaccf943a47b, source SHA256: 8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15
- Predicate: ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK at line 69, negative only for the limited behavior.
- Original-source oracle: all three explicit profile methods invoke the explicit-selection callback, while the adaptive update delegates its persistence without invoking the explicit callback. A temporary mutant adds this callback to adaptive save, causing the independently compiled original Kotlin test to fail.
- Production callsites (same HEAD): GameHubViewModel.kt Git blob 592fc44b083721e15fd3ce5c105502f0547449cc invokes saveAdaptiveProfileForGame; GameHubProductionComposition.kt blob 51aa42d47aa451fa1866616e67accfa70e0980c2 wires AdaptiveAwareGameSelectionStateRepository.
- This does not establish Android E2E correctness, absence of side effects in the underlying repository, or full PR correctness.

## Owner-only attestation and counts

Workflow c2-run16-two-original-negatives.yml can run only from trusted main with explicit owner dispatch or exact issue #50 comment ULTRA_SENTINEL_C2_RUN16_TWO_NEGATIVES_V1. It authenticates previous twelve-label signed evidence and source blobs, verifies producer/caller SHAs, compiles untouched historical Kotlin with ABI-only stubs, runs original and mutant JVM jars under mandatory AppArmor/Bubblewrap with no network or GitHub token, and signs a single partial source-truth artifact. It rejects reused identities and evidence hashes. **Before success of this workflow, count remains 12.** If the owner workflow completes successfully and publishes the attested artifact, exactly **14** labels are certified as source-scoped behavior truths (**7 positive / 7 negative**), leaving **106** to the 120 minimum.

Still blocked: frozen historical Core maximum 153/241 eligible files, 88 excluded; old vs new matched captures, 95% precision/recall/F1, false-positive nonregression, blind independent holdout, rollback and Sentry 24/7 continuity. NOT_CERTIFIED. This increment is not the final SSS+ certification.

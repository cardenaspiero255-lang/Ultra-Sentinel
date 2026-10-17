# C2 Run 17 — two original-source behavior candidates

Owner-sealed baseline: 14 labels, 7 positive / 7 negative, Actions run 39067708985, artifact 12113662602, ZIP SHA-256 1a41eba8de90abacade6d0f561aeb4cd2b65411b59ae9d080f7eff9c4ec26988. Its preseal digest is c588dd2ceaf0e95644c30d6f0ca8b07fe7a8a06fb77e92f46954a016cadd23c3. Prior truth cannot change.

## PR #155 — positive: nonfinite high-drain policy threshold

Frozen HEAD 2289f4e4cda55ddaa50f2016113ded82dc17203c, file app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt, line 12, Git blob 8696360219231f3f1477d5ad21c93bca2197e281, source SHA256 cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b.
Rule NONFINITE_HIGH_DRAIN_POLICY_THRESHOLD: policy constructor accepts Float.POSITIVE_INFINITY because it only checks greater-than-zero. Valid samples 80% to 69% in ten minutes yield a 66%/hour finite drain; default threshold 20%/hour correctly triggers BALANCED, but an infinite threshold bypasses that finite drain. Unmodified Kotlin passes valid-input control and fails finiteness contract; corrected copy requiring isFinite passes both. Production caller PerGameAdaptiveRuntime.kt Git blob 3f5d99509f28ed1ff8ea4ad95e3f532977505662. The default production constructor does not use Infinity; this is a constructor input validation defect, not a confirmed in-device incident. This case does NOT establish a new nonfinite-input family independent of the #151 original.

## PR #158 — negative: LOCAL query does not call research

Frozen HEAD 9d8572afedc634ac07dae58a0da326ea62bdc1da, file app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraQueryExecutionCoordinator.kt, line 50, Git blob e1423d747bdeeb556c4633febcfc9455e1f3cef6, SHA256 921bf26b622392d06021ada2635a2a44d226c45c379156322ceb08892ed85430.
Rule LOCAL_QUERY_NEVER_TOUCHES_RESEARCH_GATEWAY: the LOCAL request returns unverified local content and calls no remote provider. The REQUIRED control reaches the gateway once. Replacing LOCAL -> localOnly with LOCAL -> researchOnly on a temporary mutant violates the contract. Real constructor call in UltraProductionQueryExecutor.kt Git blob 5775edb4bf0fe814fe279a38d0ab1a18b1173db1. This does not guarantee that every Android feature operates offline.

## Seal and exclusions

Owner-only GitHub workflow c2-run17-original-source-truth.yml verifies the prior immutable owner run and digest, Git SHA and hash of each original and caller, compiles the unchanged Kotlin and runs original/mutant under mandatory networkless, tokenless Bubblewrap/AppArmor. Only an independently verifiable successful owner run can add these two labels. On success: 16 source-scoped truths, 8 positive and 8 negative, remaining 104. No detector evaluated, no hidden holdout inspected, no F1 or precision claims. C2 remains NOT_CERTIFIED; historical Core covers at most 153/241, 88 excluded.
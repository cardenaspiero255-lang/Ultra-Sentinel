# C2 Run 20 — two independent source-scoped behaviors in state persistence

Starting truth: 18 cases (9 positive / 9 negative) owner sealed by Actions run 39071144969, artifact 12115670408, ZIP SHA256 aa2d483e887b7b89bb44aca2537744233f9307ebb8f9e24236e2c813ddab5507. The separate Run19 evidence persisted all 15 original Git trees (owner run 39073109686), proven one shared historical PR component and disallowed historical blind holdout.

## Positive #152 — stale applied version destroys newer rollback state

Original immutable HEAD 104b7dc33e4c0341cec3fca81e3c8fbe3625357f, original file app/src/main/java/com/cardenaspiero255/gamehubultra/data/AiProfileProposalStore.kt:41, Git blob ed936aa687b08cf8d964d54f9d88e68bb12344ec, SHA256 f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da. Proposed positive identity STALE_PROPOSAL_VERSION_REPLACES_NEWER_ROLLBACK_STATE, root cause state_version_monotonicity.

The original API correctly saves applied version 5 and its corresponding rollback configuration. If recordApplied is called with an older proposal version 4, it overwrites the current applied version and rollback with older data. The isolated counterfactual ignores strictly older versions, preserving version 5. The contract is limited to persisted-store version monotonicity, not a claim that an observed production user experienced an old-proposal race.

Original production callsite GameHubUltraApp.kt, same frozen HEAD, blob 5e747dd88469b7457269b1e2dc592af9cd439f46, wires aiProfileProposalStore::recordApplied to the apply callback. The baseline PR153 rollback-divergence finding is different code and mechanism; the label must remain in the shared historical development component, never cross into holdout independently.

## Negative #151 — stale session identifiers cannot terminate the active session

Original immutable HEAD 9ad983576c16c6c34d59283979d83c69ede50dce, original file app/src/main/java/com/cardenaspiero255/gamehubultra/data/SessionCoachSessionStore.kt:185, blob 742e440004d51743e8e4b02c40171f951edfd125, SHA256 d8dbd5fadac170ed7b36c844f2480a03185046f381f64fd30feee0d20c219a70. Proposed negative identity SESSION_ID_MISMATCH_REJECTS_FOREIGN_FINISH, root cause session_ownership_guard.

The original allows an active session A and one sample, rejects appends from session B, refuses finishActiveSession(expectedSessionId=B) while A is active, and succeeds when finishing A. Removing the expected-session guard in a temporary mutant makes the original-source contract fail. Frozen production callsite SessionCoachMonitorService.kt, SHA ef69341a61164bbd69832f26186e48582c1b3042, calls finishActiveSession with expectedSessionId=sessionId. This is not proof of full Android lifecycle correctness.

## Owner-only seal and remaining limitations

Run20 revalidates the previous owner-sealed 18 original identities, fetches and SHA-pins these four original files, compiles the complete untouched Kotlin implementation with ABI-only Android stubs, and requires original failure/correction success for #152 and original success/mutant failure for #151 in networkless Bubblewrap/AppArmor. No detector is executed, predictions are not read, and neither code nor frozen baselines are modified.

Before successful authenticated owner CI, the certified historical truth count remains **18**. Upon successful published immutable GitHub Actions owner artifact only, it becomes **20** (10 positive / 10 negative), leaving **100** to 120. All historical PRs form one connected provenance component, so the new labels remain development truth; a future blind holdout must be obtained from preregistered unseen data. Precision, recall, F1 and SSS+ remain NOT_CERTIFIED.
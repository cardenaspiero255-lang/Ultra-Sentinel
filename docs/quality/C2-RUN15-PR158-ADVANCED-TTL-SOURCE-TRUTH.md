# C2 run 15 — frozen PR158 stale advanced-signal TTL, owner-gated truth

## Reproducible finding (source original, NOT an actual phone incident)

Frozen GameHub Ultra PR #158 HEAD: 9d8572afedc634ac07dae58a0da326ea62bdc1da.
Path: app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierWorldState.kt.
Git blob: 0d18a43a8e36ea3edacc2cad72071d96aa31626e.
SHA-256 of original bytes: 99a229e357823d65d7b04b642c9cf1ba312a35d0308da635ee38c425c8576591.
Label candidate: ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION, line 114, positive.

Root cause: UltraFrontierWorldStateRegistry.update(context, nowMillis) compares previousAge to previous.timestampMillis. That timestamp is refreshed on every context update, even without a new thermal/battery/adaptive observation. Each refresh under 120000 ms from the prior *context* keeps the prior advanced data, so the 120000-ms maximum advanced evidence age is never enforced against its initial measurement time. The subsequent snapshotForPlanning compares age against the refreshed context timestamp, also accepting the stale signal.

An executable Kotlin oracle with the exact original historical file uses:
- A genuine advanced thermal-risk observation at t=1000 ms, with risk CRITICAL, preventive gate true and selected game.
- A lightweight update at t+60000 ms: retaining advanced data remains correct and passes the original.
- An idle context update (sessionActive false, selected game unchanged) at t+90000 ms.
- Another idle context update at t+150000 ms: the historical source still reports CRITICAL and preventAggressiveProfiles true despite no advanced observation after t=1000 ms. A 120000-ms original observation TTL should have expired.
- A separate different-game control verifies cross-game isolation when run after a successful TTL check.
- An isolated counterfactual saves the time of the last advanced observation separately from the time of a context update, and all original controls plus expired-evidence contract pass. The counterfactual is a sensitivity test only, NOT a new source sample, and never changes original Git bytes.

Production path evidence (same frozen PR158 HEAD):
- GameHubAiAdvisor.kt Git blob 2462ef57ff426493c5398de1201d69bba9c1fe60: actual UltraFrontierWorldStateRegistry.update(context) caller.
- GameHubUltraApp.kt Git blob 30c1e2883838f07814df996d4fbaa7fc6bd34438: production sessionActive tracks activeSessionPackage != null separately from selected game.
- UltraFrontierEvolution.kt Git blob 2b7236098db5b6e4da56458e4461e3075f08a076: planner reads UltraFrontierWorldStateRegistry.snapshotForPlanning() and its budgeter uses thermalRisk / preventAggressiveProfiles.
- BatteryAwareGamingEngine.kt Git blob 8696360219231f3f1477d5ad21c93bca2197e281 is an unchanged compile-time dependency from the frozen PR158 tree. This blob also appears in PR155/157 and creates a dependency edge, NOT multiple defects.

The owner-only workflow checks immutable Git blob IDs of original source AND producer and planner files, authenticates last owner-sealed eleven source labels (Actions run 39057159822; artifact 12110215750; ZIP digest sha256:23429e9483176c03546ac639200e0b2f74194decd645821361f0393b82ee93c7), compiles original Kotlin with ABI-only stubs, then runs its original/counterfactual JVM tests without network, credentials or host access using mandatory Bubblewrap and AppArmor. It refuses malformed witness or prior truth. Only a successful owner run can seal exactly one additional bounded positive, for 12 total (7 P / 5 N). No detector predictions, new learning, F1 scoring, repairs, or merges are authorized by this truth artifact.

## Important scope and exclusions

This finding is the *observation-age extension* vulnerability, NOT a claim that all thermal warnings after session end are wrong: physical temperature remains relevant after a game closes. The original PR158 tests intentionally retain fresh same-game advanced evidence, so a blanket "clear on every session end" change is not established by this oracle. Nor does the isolated Kotlin test constitute an actual device incident or full game runtime E2E.

The prior PR158 negative label UNBOUNDED_AUDIT_TRAIL_RETENTION in UltraFrontierAuditTrail.kt is a different rule and file. No reused positive from PR155/157 is counted. The identical BatteryAwareGamingEngine.kt blob across PRs is a dependency and stays within one connected evaluation component.

Current owner-sealed baseline before CI: 11 authentic labels, 6 P / 5 N, 109 remaining. After a separate successful owner-only run: at most one more to 12, 7 P / 5 N, 108 remaining. The historical frozen Core still has a structural analyzed-files upper bound 153/241, with 88 excluded paths. Any numerical 95% precision/recall/F1 gate remains NOT_CERTIFIED until compatible scope, 120+ diverse original labels and complete matched old-vs-new detector predictions are authenticated.

# C2 next holdout — first SHA-sealed original-source positive (#153)

**This is ground-truth construction, not detector scoring.**

Verified source chronology:
- Owner-only original new eight-PR holdout [Actions #38856860621](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38856860621), artifact `12027755925`, SHA-bound packet digest `f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34`, candidate and baseline never consulted.
- [PR #97](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/97) merged as `71aa7937625daa9945bbaf0a495a4f9073c5faaa`, 499/499 tests.
- Controlled real Kotlin execution [Actions #38889693623](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38889693623), artifact `ultra-sentinel-c2-next-pr153-pending-replay-original-witness` ID `12040619454`. Artifact JSON SHA256 bytes `a3e3d28a8bf3d4b0a59541efd96f698002deea355ec35dd8e17e5662a9830cba`. Original GameHub #153 file `PerGameAdaptiveRuntime.kt`, Git blob `d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f`.

The experiment reproduced a crash/replay inconsistency with controlled collaborator failure: `clearPendingDecision` fails after the stored session is marked handled, the catch rolls the applied profile back, but the retry branch resumes the *target optimizer state* without persisting that target profile. Normal application, failure before profile write and idempotent retry controls passed. This proves logic under a deterministic injected storage failure, **not observed real-device incidence, defect severity in production, or any detector's ability to identify it**.

The owner-only seal workflow `c2-next-pr153-source-truth-seal.yml` verifies both successful older runs and immutable artifact IDs, exact run code SHAs, witness JSON byte digest and frozen packet identities. It then runs a fail-closed offline node process with no network, credential or write permission and produces exactly one positive source-behavior label: `(pr=153, rule=PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE, path=app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt, line=71, positive=true)`.

**Honest metrics:** `sourcePositiveLabels=1`, `verifiedNegativeFindingLabels=0`, `benchmarkScoredLabels=0`, `includesPredictions=false`, `includesBaseline=false`, `precision=recall=f1=null`, `fpNonRegressionVerified=false`, `tripleSPlusCertified=false`. Other original-source behavior controls at #154, #155, #157, #158 are technical control evidence, **not four clean projects or dozens of TN labels**.

Next collect enough *truly independent* labels with control oracles covering all candidate findings at rule/path/line level, then seal the truth *before* revealing any predictions. Complete comparison with baseline on the exact same original commits, without ignoring unlabelled alerts. The ≥95% Triple S+ target and false-positive non-regression remain pending and cannot be credited from this single fault. The old #205/#206/#208 samples remain training regressions and are excluded.

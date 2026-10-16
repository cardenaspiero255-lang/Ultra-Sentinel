# C2 new cohort: real original-source controls from GameHub #154 and #155

The eight-PR holdout was frozen on the owner's [GitHub Actions run #38856860621](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38856860621) before model predictions or labels were consulted. Packet digest: `f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34`. The source versions below belong to that exact holdout, not current main.

- PR #154: `858c9ce5cb6a7916d63f2348432013e49d02ba79`, source `app/src/main/java/com/cardenaspiero255/gamehubultra/domain/ThermalPredictionAdvisor.kt`, Git blob `b2e15247536ecc00d4811021774ab2f34608ac3e`.
- PR #155: `2289f4e4cda55ddaa50f2016113ded82dc17203c`, source `app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt`, Git blob `8696360219231f3f1477d5ad21c93bca2197e281`.

The owner-only workflow `.github/workflows/c2-next-original-pr154-pr155-oracles.yml` retrieves GitHub contents at those immutable HEAD SHAs and checks `git hash-object` before compiling the complete original Kotlin. Only dependency ABI classes are fake; no copy or replacement of the engine implementation is permitted. JVM runs inside no-network Bubblewrap and AppArmor with no GitHub credentials.

**Independent control objectives (not model predictions):** #154 no warning when not allowed, preventive warning when enabled, duplicate suppression, recovery after a warning, confidence clamped to [0,100]%. #155 empty-sample behavior, critical battery, charging exclusion, high- and low-drain calculations, short-window refusal, power-saver priority, timestamp-order invariance and charging boundary reset.

**Important negative-label restriction:** a successful control proves one behavior of this frozen original function on specified inputs; it does **not** by itself establish a scored false-positive/true-negative identity for a detector rule/path/line. For this stage `negativeFindingLabelsEstablished=0`, `precision=null`, `recall=null`, `f1=null`, `tripleSPlusCertified=false`. To claim new verified labels, independently construct explicit defect predicates, location identities and full prediction-universe ground truth, with baseline and candidate scored on identical sources. This prevents the known pitfall of inflating denominator counts with successful controls.

Next: source-oracle evidence for remaining PRs, close the independent label corpus, compare baseline and candidate with complete coverage, and require actual ≥95% precision/recall/F1 without added FP before certification. The original three defects from #205/#206/#208 are training regressions, never part of the second blind cohort.

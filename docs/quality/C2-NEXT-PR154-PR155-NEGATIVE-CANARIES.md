# C2 — bounded safe-source negatives from original PR154 and PR155

Owner-freeze evidence [run 38856860621](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38856860621) pins the historical GameHub PR #154 HEAD `858c9ce5cb6a7916d63f2348432013e49d02ba79` and PR #155 HEAD `2289f4e4cda55ddaa50f2016113ded82dc17203c`. The original Kotlin blob SHAs are `b2e15247536ecc00d4811021774ab2f34608ac3e` and `8696360219231f3f1477d5ad21c93bca2197e281`.

These are **two semantic negative predicates, not sixteen numerical true negatives**:

- PR #154 `ThermalPredictionAdvisor.kt:22`, rule `THERMAL_WARNING_WITHOUT_PREVENTIVE_PERMISSION`. The unchanged original rejects predictions when `allowPreventiveSignal=false` and passes the existing Kotlin control `NO_WARNING_WHEN_NOT_ALLOWED`. A temporary copied mutant disabling that guard must fail **that same assertion**.
- PR #155 `BatteryAwareGamingEngine.kt:47`, rule `BATTERY_DRAIN_CROSSES_CHARGING_BOUNDARY`. The unchanged original ignores earlier samples crossing an observed charging segment; the Kotlin control `CHARGING_DISCARDS_PRIOR_DRAIN` passes. A temporary copied mutant removing the charging boundary must fail **that same assertion**.

The owner-only workflow `c2-next-original-pr154-pr155-oracles.yml` validates immutable sources, compiles untouched Kotlin first, exercises the original behavior in a no-network tokenless Bubblewrap/AppArmor JVM, and **then** runs the two mutated copies. Each mutant must fail at its designated guard; unexpected compilation failure, timeout, unrelated test failure, or a surviving mutant blocks publication.

A successful witness is not automatically a scored label. Only the two explicit (PR/rule/path/line) negative predicate labels are candidates for an independent subsequent source-truth seal. Other unexamined code and rules may still contain bugs. Mutants are artificial counterfactual controls and NEVER real positive defects. No candidate detector or baseline predictions are consulted. All benchmark metrics and Triple S+ remain unavailable.

This change does not mutate GameHub source, the frozen Ultra Sentinel Core, or the training corpus. Source controls require exact owner GitHub SHA/artifact provenance. The next step is authenticating the owner workflow run and sealing the two bounded negative labels alongside the five existing truth cases; after that, continue collecting original-source positives and negatives to reach at least 120 and measure old and new detectors over identical complete diffs.

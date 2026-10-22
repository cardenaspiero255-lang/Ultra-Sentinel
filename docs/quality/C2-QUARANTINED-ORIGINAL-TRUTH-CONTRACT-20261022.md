# C2 — quarantined original-source independent truth adjudication contract

**Date:** 2026-10-22. **Verdict:** `NO_INDEPENDENT_ORIGINAL_ORACLES`. This is a *selection and source-tree identity commitment*, **not** an independently certified positive/negative label set or final untouched holdout.

## Current inputs and immutable identities

- Four external PR metadata records from [PR #200](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/200), input manifest `C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json`, canonical digest `e9d43a9c62a7e82d9a50212c297e61aff72d8ea78a46b0a23796a9d4787fa9f3`.
- 17 original implemented Core rule emitters, full three Git-blob-pinned source modules from `c2-executable-rule-inventory.cjs`. The code independently recalculates the frozen emitter inventory from unmodified Core files. Changing rules changes the pin or breaks the gate. **This is a rule vocabulary/engine pin, not a measured baseline or predictor capture.**
- `packages/quality-gates/c2-independent-oracle-quarantine.cjs` computes a deterministic selection SHA-256 over the four full PR pointer tuples, Core engine snapshot and original known-development exclusion list, before any source inspection.
- An owner-only, credentials-minimized `.github/workflows/c2-independent-truth-quarantine.yml` checks all four candidate HEAD/base Git **commit tree IDs**, fork source repository, PR number and recorded date directly from GitHub API. It never downloads the candidate PR source, patch, title, issue, tests or predictions. The SHA-256 digest of these tree IDs is publicly reproducible, but a tree hash itself is **not** an independently verified defect or correct behavior.
- The 4 prospective candidates remain `AWAITING_EXTERNAL_ORIGINAL_SOURCE_ORACLE`, with no scored findings or independent causal family count. Known unblinded `tasks/tasks` [PR #199](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/199) and `ankidroid/Anki-Android` are excluded as development, never allowed to inflate this candidate cohort.

## Separating source-original truth work from detector predictions

The next tool/process capable of examining unknown candidate source must be **an isolated original-source oracle process**, with no Core imports, detector search path, model predictions, issue/title/patch-derived answers, or ability to alter the frozen Core. It may begin **only after** the owner commits the selection receipt and documents each candidate's training/lineage exclusions.

For every eligible candidate, require all of the following, in this order:

1. **Source original**: verify exact Git commit/tree/blob SHAs and preserve authentic original modified source, avoiding guessed, reconstructed or generated source truth. Establish actual rule scope separately (some PRs may be outside the 17 implemented rules; those remain `OUT_OF_SCOPE_UNSCORED`).
2. **Causally independent behavior oracle**: implement or retrieve executable original behavior tests, prove the observable original failure or benign guard. A red CI build, successful upstream merge, or title/issue claim alone is not sufficient.
3. **Minimal isolated counterfactual**: only where truth is plausible, run original/fixed states plus at least one benign and one discriminating mutant against a bounded oracle, using protected no-network sandbox. Preserve original byte SHA, testsuite JUnit XML and all original test outcomes; do not classify introduced tests as if they were historical original independent witnesses.
4. **Adjudicate root-cause identity**: compare all causal fingerprints and source lineage against the 23 GameHub development labels, 9 Kotlin public candidates and the known Tasks.org worker control. One PR can contain more than one mechanism; two tests or source lines can share one cause. Deduplicate before considering labels.
5. **Seal trusted results**: source CI run ID, artifact SHA-256, source blob SHA, Kotlin/JVM/JUnit original and fixed evidence, benign controls, rule applicability/line, and authenticated causal-adjudication explanation. A JSON claim containing `originalTestsPassed: true` is not sufficient: the new `inspectUntrustedTruthClaim` explicitly refuses scoring such declarations. Never publish sealed truth to the detector-development environment.
6. **Only after sealed truth:** capture the current engine and a separate pinned historical baseline on **identical source SHAs**, release the predictions after verifying the engine versions, compare every eligible positional `(ruleId,path,line,blob)`, investigate extra alerts and only then measure genuine TP/TN/FP/FN. Do not retrofit Core rules to examples under evaluation. If tuning is needed, move those examples to development and reserve a fresh independent holdout.

## Current causal and certification verdicts

- Confirmed independent new source defects among the four = **0**; independent original-source negatives = **0**; accepted original oracles = **0**.
- Known original Tasks.org worker thread produced two `BLOCKING_ANDROID_CALL` development-time alerts; their common mechanism is **one candidate context issue**, not two blinded independent FP labels.
- Prospective truth seal = **false**; training/holdout causal independence = **unverified**; historical evidence remains **development**.
- `precision=recall=F1=falsePositiveRate=null`; `cohortFrozen=false`, `blindHoldout=false`, `newGoldLabels=0`, `SSS+ NOT_CERTIFIED`.

This workflow is intentionally limited to original Git metadata; claiming that it generated truth labels from the four PRs would misrepresent its output.

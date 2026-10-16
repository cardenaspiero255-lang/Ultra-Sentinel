# C2 — original source input scope is NOT frozen Core analytical coverage

## Verified historical source

- GitHub [source universe run #38974165470](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38974165470) SUCCESS for frozen PR #150/151/152/153/154/155/157/158, 241 original changed-file entries, exact base/HEAD Git SHA, original blobs and full diffs.
- Artifact ID `12077973482`, ZIP SHA256 `fcc878c3af06d053e3e2b3e9ef3cc0f646e1a0edee4871a95333f16cd9e476a7`. The source inventory is cryptographically linked to frozen manifest and candidate baseline lock. No detector executed, no label created.
- Candidate SHA `547938ed88804e25bbabecf74a3c3d91b74cf1a4`, historic baseline predecessor `3c97b60717f6a08ddc7d618587202537d62bc951`, **identical Core blob** `db29f94be1e0afb791a241d26f449695df0eafd0`.

## Verified upper bound of files reachable by the frozen Core

`packages/core/ultra_sentinel_core.cjs` only scans a path when `production(path)` returns true and the diff contains added source lines; its `coverage.analyzed` counter increments only for such files. The original frozen production predicate limits paths to Android app/main, Supabase functions, GitHub scripts/workflows and control-center; excludes tests, benchmarks and docs. An exact-path census of 241 original GitHub compare entries yields the following source **eligibility upper bounds**:

| Frozen PR | Changed-file inputs delivered | Core-eligible max | Explicitly excluded by Core |
|---|---:|---:|---:|
| #150 | 21 | 15 | 6 |
| #151 | 41 | 27 | 14 |
| #152 | 41 | 27 | 14 |
| #153 | 26 | 15 | 11 |
| #154 | 24 | 16 | 8 |
| #155 | 26 | 15 | 11 |
| #157 | 39 | 23 | 16 |
| #158 | 23 | 15 | 8 |
| **Total** | **241** | **153** | **88** |

`153` is an **upper bound**, not a claim that 153 files were analyzed. Some eligible paths may additionally be skipped due to patch, text, or lack of lines added. The frozen Core's counting scheme therefore cannot honestly report `analyzedFiles=changedFiles=241` even when the source input archive contains 241 exact entries. This is a structural incompatibility with `c2-frozen-benchmark-gate.cjs`, which currently demands equality, rather than a GitHub source acquisition failure.

Owner-only audit `.github/workflows/c2-frozen-core-eligibility.yml` authenticates the SHA and ZIP digest of the original owner source run; validates the manifest SHA256, 8 exact commit pairs, paths, unique blob IDs and per-file patch hashes; applies the historical Core eligibility predicate **without reading predictions**; and publishes a minimized audit artifact with permanent non-certifying `BLOCKED_FROZEN_CORE_ANALYZED_COUNT`. No model or truth labels are read in this preflight.

## Resolution options without metric manipulation

**Do not** set `analyzedFiles=241` by counting paths merely delivered to the model. That would falsify the Core's semantics and make 95% metrics unauditable.

To keep the **same original candidate/baseline** and historically frozen cohort: define a separately preregistered two-tier scope policy, with 241/241 delivered input bytes and 153 maximal Core-eligible paths, while requiring full analysis of **every eligible** file and explicit documentation of 88 excluded paths. That would require a new gate/schema and a new owner-approved eligibility policy; until valid, the existing strict 241 analyzed-files gate correctly blocks scoring and certification.

To require **literal 241/241 code-path analysis**, redesign the Core to process tests, build scripts and other paths, define credible corresponding rule semantics, compile/test coverage, then freeze the updated detector and a fresh blind cohort before evaluation. That is **not** the same candidate SHA and must not be reported as the previously preregistered C2 benchmark.

Separate unavoidable truth barrier: seven SHA-attested source predicates (3 P/4 bounded N), at least 113 authentic additional balanced source-oracle labels required for 120. PR #150 still unlabelled. Synthetic mutations and extra lines cannot be counted as independent positives; any shortage must be documented as `INCONCLUSIVE` and, if necessary, a new untouched holdout must be frozen. Until both truth and scope are valid and the old/new engines produce matched complete findings, precision/recall/F1 and FP parity remain **unknown** and internal SSS+ = `NOT_CERTIFIED`. No external human reviewer is mandated.

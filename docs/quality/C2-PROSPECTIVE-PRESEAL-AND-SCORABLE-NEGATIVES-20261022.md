# C2 — prospective benchmark preseal readiness and causal-scoring exclusions (2026-10-22)

**Decision:** `PRE_ADMISSION_ONLY`. This document does **not** freeze an independent holdout, certify source-root-cause families, mint labels, or report FP/precision/recall/F1. Newly certified GOLD = **0**, independently scored rule-specific benign negatives = **0**.

## Prerequisite observations verified against GitHub Actions

1. [PR #197](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/197) attested archived GameHub #206 original Kotlin 4/4 JUnit, provenance and the current Core `TTS_UTF16_SURROGATE_SPLIT` at the exact rule/path/line. The derived fix passes the 32/800 character JVM trials and clears the alert. It is **not** an independently sampled safe-source negative, and GameHub `main` still contains original blob `6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a` at `UltraSpeechChunker.kt`, so do not use it as a benign sample.
2. [PR #195](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/195) provided a Git-blob-pinned inventory of **17 existing Core emitters**, plus six original GameHub negative controls. All six original source controls are outside the **active rule vocabulary** for their claimed identity. They therefore generate **zero eligible matching-rule scored negatives**, not six TN, and the false-positive rate is **null**, not 0%.
3. [PR #174](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/174), owner [run 39507652290](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39507652290), archive `12304232471` (SHA-256 `4d90780e70be617f11970c5ac9be0e7c000b3f7c92edd0e0b5c4968fd24fbd8d`), proved separable #150:251/#150:252 confidence guards using a 2×2 original-Kotlin repair experiment. They remain in **one conservative family**, `RECOMMENDATION_CONFIDENCE_CALIBRATION`; #150:250 is an original benign control. Do **not** count two causal families or turn its benign control into a detector TN.
4. [PR #185](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/185), original [run 39725398948](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39725398948), established orthogonal numeric patch effects for #154:100 and #155:12. Both may express the same broader nonfinite-input-boundary family; the experiment does **not** certify two independent families.
5. The historical archive is still **23 source identities, 11P/12N**. Authenticating archive continuity, individual original witnesses or scoped Kotlin behavior does not establish 23 independent scored labels; the later queue has **12 identities** still in need of discriminating causal adjudication and the source audit has **21 unresolved causal-group assignments**.

## New executable pre-registration only

`packages/quality-gates/c2-prospective-preseal-readiness.cjs` and `scripts/c2-prospective-preseal-readiness.cjs` accept only **historical development metadata** and **prospective PR metadata**. They pin the current source-blob inventory of 17 emitters, call the existing `screenCandidates` preflight, reject a repeated Git head SHA across candidate identities, and emit a deterministic metadata digest independent of input order.

The local interface, when a genuinely sourced metadata file exists:

```sh
node scripts/c2-prospective-preseal-readiness.cjs /absolute/path/to/input.json /absolute/path/to/report.json
```

The input object is exactly `{"schema":"c2-prospective-metadata-input/v1","historical":[...],"candidates":[...]}`. Each historical entry follows `c2-causal-prospective-preflight.cjs` HKEYS, and each candidate follows CKEYS (`repository/pr/baseSha/headSha/createdAt/source/disclosure`); **no source snippets, predictions, oracle outcomes, patch content, positive flags or truth are accepted in prospectives**. The CLI rejects symlinks, multi-linked input, invalid schema, overlarge JSON and attempts to overwrite a report. Its output is descriptive metadata only: `cohortMetadataFrozen=false`, `blindHoldout=false`, `baselineAuthenticated=false`, `truthSealed=false`, `precision=recall=f1=null`, `newGoldLabels=0`.

**No candidate metadata has yet been collected or attested by this step.** The tool does not scrape repos in the background, authenticate external source dates, attest baseline Git trees, or create a scored cohort. A metadata SHA is useful for comparing proposals, **not** a blind freeze receipt.

## Actual eligibility and next external evidence requirements

- **Rule-specific negatives:** find *genuine, pre-existing safe original Kotlin source* within a Core rule's code scope, with original Git blob and immutable PR lineage. Execute its own behavioral safe oracle and a minimal unsafe counterfactual (canary). Independently adjudicate `(ruleId,path,line)` against the frozen detector's output and a verified baseline on the **same source and Git commits**, before counting TN or FP. Known corrected, synthesized, post-revealed or out-of-vocabulary samples remain development controls, **not blind statistics**.
- **Historical independence:** continue orthogonal source interventions for the remaining 12 identities, particularly within shared source/guard/number-handling families. Keep each original identity but score only independently attested causal membership; reference [PR #184](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/184) for historical mechanism hypotheses. Do not award positive family quotas solely because there are different lines/PRs.
- **Prospective cohort:** collect genuinely new third-party GitHub PR metadata first, exclude all known GameHub examples, public Kotlin SWE-bench tasks, in-repo evaluation, any previously revealed patch, identical SHA and causal lineages across splits. The original createdAt alone does not establish independence. An owner-only GitHub freeze workflow must attest the original external metadata and immutable blobs before truth or detector results are opened.
- **Before scoring:** authenticate ≥120 independent label identities (≥48 positive, ≥48 negative, ≥6 applicable rule IDs, ≥4 PRs and paths), a comparable pinned baseline and complete truth oracles sealed **before** predictions; then run baseline/current Core on identical source SHA populations, inspect all extra findings and test no increased FP. The existing numerical gate `C2-FROZEN-120-BENCHMARK-GATE.md` intentionally refuses an unauthenticated score. Require separate truly untouched holdout after exploratory development.

**Overall: SSS+ = NOT_CERTIFIED, precision = recall = F1 = FPR = null, prospective holdout = NOT_FROZEN.**

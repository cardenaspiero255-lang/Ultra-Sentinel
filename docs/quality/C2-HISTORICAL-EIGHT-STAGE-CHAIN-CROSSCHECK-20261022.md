# C2 — real 23-label development archive: eight-stage continuity and ten recovered witnesses

**Date:** 2026-10-22. **Classification:** `HISTORICAL_DEVELOPMENT_INTEGRITY_ONLY`. **No new GOLD, independent causes, negative detector-scoring labels, or scored blind holdout.**

## Original GitHub source and downloaded ZIP SHA-256 verification

All rows below correspond to original successful GitHub Actions runs and available ZIP archives. Each listed SHA-256 of the downloaded ZIP was independently compared byte-for-byte with the artifact's GitHub-published digest. The stage content labels were then matched by exact tuple `(PR, original HEAD SHA, original Git blob SHA, rule, path, line, polarity)`. The owner execution origin is documented in each earlier pinned run workflow; this offline crosscheck does not independently re-authenticate the owner or the original compiled Kotlin witnesses.

| Original stage | GitHub Actions run | Archive artifact ID | ZIP SHA-256 | Count |
| --- | ---: | ---: | --- | ---: |
| Run15 / #152 truth | [39057159822](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39057159822) | 12110215750 | `23429e9483176c03546ac639200e0b2f74194decd645821361f0393b82ee93c7` | 11 |
| Run15 / #158 truth | [39059101315](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39059101315) | 12110378858 | `2c14ea320284efac3539f0811bc9910ce5854bf3391452383734a7eed65d6193` | 12 |
| Run16 | [39067708985](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39067708985) | 12113662602 | `1a41eba8de90abacade6d0f561aeb4cd2b65411b59ae9d080f7eff9c4ec26988` | 14 |
| Run17 | [39070029033](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39070029033) | 12114598638 | `bc2cd5da189f39bed41c02737b1b73cf5df17bc0f938be9094bcf4e87377f764` | 16 |
| Run18 | [39071144969](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39071144969) | 12115670408 | `aa2d483e887b7b89bb44aca2537744233f9307ebb8f9e24236e2c813ddab5507` | 18 |
| Run21 | [39075155081](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39075155081) | 12116887077 | `163caab401c119a4f907034bcc973064ad1b4c3b207fe92f616b560474e26001` | 20 |
| Run22 | [39076132177](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39076132177) | 12117067167 | `7a77bdc5b53c18c24f87de5c754d094f008639020da1a31fbd67ae5815bf16cc` | 21 |
| Run23 | [39077240648](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39077240648) | 12117128918 | `31ea72b3231fe73fb97e815ff70d88f3a5ddeb1d7fd7a3324584de9b7fbe3400` | 23 |

Run23 derived source audit [39498507463](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39498507463), artifact 12298808223 SHA-256 `f404c0c6464cb8a5187e4b050064da23872f36886ae31f2a1b64431428562abc`, reports exactly **23/23 Git blobs** and historical **11P/12N**; its 23 label tuples and each available evidence digest matched the Run23 archive. **23/23 original identities are preserved across stages**, 0 deletions or changes to any already-declared evidence SHA; labels may legitimately reorder, so the gate compares by tuple rather than array index.

## The ten formerly missing Run23 receipt digests WERE recovered elsewhere

The Run23-era *embedded inventory* contained **13 declared evidence SHA values and 10 missing individual receipt fields**. The later independent recovery [run 39504873407](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39504873407), artifact `12301669735`, ZIP SHA-256 `0f326b7ea21f2f7bde788183792a8e4e1fed7174a49cac00829b0291842c9c12`, supplies **10/10 external original source witnesses**; all ten match the exact previously missing tuples in the Run23 source audit. The ten recovered identities share **9 distinct witness hashes in 7 original artifact IDs**. One original witness supports both #150:250 and #150:252, so ten labels are **not** ten independent causal witnesses.

The recovery report explicitly retains `historicalEvidenceAuthenticated=false`, `independenceVerified=false`, `unresolvedCausalGroups=21` and `newLabels=0`. The separate owner-run identity queue [39544945791](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39544945791) still lists **12 identities** requiring independent counterfactual causal adjudication, despite the existing original source receipts. The previous eight-workflow receipt reconciliation authenticated those original witnesses but did **not** rerun 12 Kotlin oracles in that reconciliation.

## Executable policy

- `packages/quality-gates/c2-historical-eight-stage-integrity.cjs` exports `crosscheckHistoricalChain(stages,run23Audit)` and `linkRecoveredOriginalReceipts(run23Audit,recoveryArtifact)`. The first checks exact eight-stage counts, immutable identity, monotonic labels, unchanged receipt digests and exact final Run23 source-audit comparison. The second matches every externally recovered original witness against exactly the ten *missing-in-Run23* identities.
- `npm run check` runs fail-closed unit tests for missing/altered identities, tampered polarity/source blobs, retrospective digest alteration, and improper claims of historical attestation. These unit tests are **synthetic code-behavior tests**; they are not new defect labels or new Kotlin witness executions.
- The offline functions consume JSON input supplied by the caller. The separate GitHub workflows and externally checked ZIP digests establish upstream archive provenance. The functions themselves do **not** download or authenticate GitHub owner runs, source code behavior, or future detector predictions.
- The combined source archive evidence may support historical *development adjudication*, but no detection-based negatives are scored. In particular a successful Kotlin benign test without a matching Sentinel `rule/path/line` prediction is **not** a verified detector TN.

## Next causal/benchmark barriers

1. Execute the twelve remaining counterfactual source analyses with original Kotlin, distinct minimal interventions, orthogonal benign cases and independent source oracles; cluster overlapping causes (including the three #150 confidence predicates and nonfinite-value families).
2. On original SHA-pinned files compare an actual frozen Sentinel `rule/path/line` against independently sealed positive and safe negative evidence. Unmatched/out-of-scope cases remain unscored, not FP/TN.
3. Build a new prospective cohort, free of known GameHub and public Kotlin benchmarks; freeze training exclusion and source metadata before seeing detector outputs or patches. Authenticate a real baseline on the identical source population.
4. Only with ≥120 genuinely attested balanced and diverse labels, separate genuine untouched holdout and verified nonregression can precision/recall/F1/FP metrics be reported and SSS+ reviewed.

**Status: source archive content and recovered witness linkage checked; 21 historical causal-group assignments unresolved, 12 identities still awaiting causal adjudication, newly admitted GOLD 0, independently scored negative detector labels 0, FPR/precision/recall/F1 null, blind holdout not frozen, SSS+ NOT_CERTIFIED.**

# Block 2.6 v6: original negative result after blind ABI admission

The first complete experiment is [run 43995181112](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43995181112), protocol `37db856b78a1c80bd998ee3c578c6e19ec0ff81a`. Frozen Hunter `0aba994cd371651d605985b659c4b32e5c3f2b15` and all 37 reserved Kotlin source blobs remain unchanged.

The independent contracts were committed at `9be009025a100d7d864082e5225a8e9f87d215a7` and compiled without execution in run `43973990563`. The preceding blind ABI preflight admitted eight numeric callables across two cohorts; five cohorts compiled. Its original admission SHA-256 is `a872230937e2214e243441c32a23be1f198e12abd30bb9025276300d301ec9bf`.

Prediction artifact `14288824716` was published at `2026-11-17T01:27:49Z`, before the dependent independent artifact `14289507850` at `01:29:05Z`. Both original ZIP archives, extracted raw reports, independent envelopes and per-file SHA-256 values are retained under `evidence/block26-v6-first-run/`. The prediction archive digest is `ffb65e41fbf25a093e0ebef790a9aa81e1c5c4b73e4359112d93f72de111b88e`; the independent archive digest is `bcf02da2ada133229da2541256d2b3e1f7f656705063423ecfeb961074ffab66`.

| Measurement | Original result |
| --- | --- |
| Source-bound reports | 17 |
| Completed numeric methods | 6 of 8 ABI candidates |
| Sealed hypotheses | 2 |
| Independently confirmed distinct defects | 0 |
| Scoped false-positive hypotheses | 2 |
| Unadjudicated hypotheses | 0 |
| Finite independently scoped observations | 83 |
| Execution abstentions | Cohort 2 compilation; cohort 4 JVM scope execution |

Both hypotheses concern the original cohort-3 binary search and agree with its independently specified bounded results. Their numeric turning points are valid behavior, so they are scoped false positives. The cohort-4 executor returned status 1; the retained receipt does not identify a particular method or an exact failure mechanism. Do not relabel that abstention as a verified defect or a negative source label. A separately recorded stack-domain exception is outside the finite numeric join and is not a Hunter discovery.

Global precision, recall and false negatives remain unknown. This is a valid negative experiment, not closure of Block 2.6. It does not permit Block 2.7, repair, protected writes or certification. Subsequent executions on these originals are replays. Any successor must preserve these files and results, freeze its general admission/coverage changes before selecting a fresh cohort, and exclude all six repositories and all 37 original blobs from future unknown-source claims.

The regression `node --test tests/unit/phase2-block26-v6-first-run.test.cjs` authenticates retained bytes, replays the exact independent adjudication and rejects altered prediction/source bindings. No external bytecode is executed by that regression.

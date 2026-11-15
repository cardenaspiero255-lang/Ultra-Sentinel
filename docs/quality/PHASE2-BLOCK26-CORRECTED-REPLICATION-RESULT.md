# Block 2.6 — corrected frozen Hunter: replication not demonstrated

The first successful execution [43775990612](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43775990612) did **not** reproduce discovery of a distinct original defect. The result is `REPLICATION_NOT_DEMONSTRATED_NO_SUPPORTED_METHODS`, not a clean audit or a measurement of defect sensitivity.

## Prospective protocol

The corrected engine was fixed at `9550170e084505a09e7ee65d2e68eb0e1883d3b2`, tree `4ce3798a50d54a74f49b7756b27a3f0951fd823a`. Freeze commit `6d1e2a99e262f2493d2ed8de9b53727f6e6c9ea4` preceded repository selection and source reads. Its three detector/launcher/guard blobs are checked unchanged by regression tests. No detector retuning, original-source edits or use of earlier LCM cases occurred.

The frozen selection rule ranked all 46 public repositories returned by the declared metadata query by stars, excluded prior context, and reserved each next metadata-eligible root `src/main` cohort. Missing production roots were recorded as metadata rejections, not scans. Source bodies and package eligibility were inspected only after each public reservation commit. Three eligibility abstentions were retained before the first executable cohort; evaluation stopped after that cohort's actual result, without searching for a positive result afterward.

| Cohort | Original source commit | Files | Observed outcome |
| --- | --- | ---: | --- |
| `DmitryTsyvtsyn/Kotlin-Algorithms-and-Design-Patterns` | `1f89f062a056e24cc289ffdd0c6e23cadf8df887` | 64 | Five single-segment packages and four unsupported source paths; no original bytecode executed |
| `thomasnield/kotlin-machine-learning-demos` | `429efdbe579f7b9a7c86b1451e11e3beef46a5c5` | 4 | Unresolved/default package headers; no original bytecode executed |
| `alidehkhodaei/data-structures-and-algorithms` | `8d9b0e97d7e345b30e30483209c2fafc77b9c840` | 5 | Single-segment `array` / `string` packages; no original bytecode executed |
| `sanity/pairAdjacentViolators` | `01cdf7bc88162eec654c95d8f303d8854edb704a` | 10 | Authenticated originals compiled in isolation; 17 classes inspected, zero supported numeric methods or object pairs exercised |

The namespace audit is deliberately a conservative header preflight, not a Kotlin semantic parser or compiler proof. Unrecognized headers abstain. The frozen executable interface requires qualified package prefixes; its compiler staging contract also rejects spaces/Unicode paths. These contracts were not relaxed for this evaluation.

## Independent controls and artifacts

Oracle commitment `698853b5c84295ceb9bf9f2dc555d24f21682290` fixed SHA256 `f960651779c282397fd45a7a92e31e22e9f14d1d510adbd228ed501d1dd00c5f` before prediction execution. It uses direct original Kotlin calls and independent closed-form references for linear splines and explicit binary-search cases. It receives no Hunter report. Staging copies these unchanged oracle bytes under the existing isolated launcher's supported Kotlin entrypoint basename; original source filenames and bytes stay untouched.

Protocol `4e2ed48747bef223e633e6b10f65436970096bea` authenticated all four source trees and original blob inventories. The existing Bubblewrap/AppArmor/cgroup compiler and probe launchers ran without network or oracle mounts into Hunter. Predictions were published at `2026-11-15T23:41:08Z`; the separate dependent oracle job printed its verdict at `2026-11-15T23:42:06Z`.

- Raw frozen report: zero hypotheses; 104 unsupported methods; ten skipped nested classes; three comparable classes with three constructor abstentions; zero unloadable classes. No functions were exercised by Hunter.
- Independent scoped controls: 75 linear-spline cases and nine binary-search cases passed. This supplies neither a positive defect label nor whole-file benign truth.
- Verified distinct new defects: zero. Precision, recall, false positives and false negatives remain null. These results do not refute or establish discovery on future supported APIs.
- The fourth cohort largely uses `Double`, iterable/collection arguments and ordinary receiver APIs outside the frozen probe's supported integral/static/singleton and bounded Comparable interfaces.

Downloaded original JSON artifacts and verified archive/file hashes are retained in `evidence/block26-corrected-frozen-first-run/`. Artifact IDs: eligibility `14186183061`, predictions `14186113155`, independent controls/verdict `14186796104`. The receipt binds them to the first successful protocol/run. All 83 reserved source files are exposed and must not be reused as unknown after future coverage improvements. Later CI executions are replays, not additional discoveries.

## Failed attempt and regression fix

Run [43775411184](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43775411184) stopped before predictions: the host's read-only source reader rejected the Cyrillic initial character in `Сhain Of Responsibilities.kt`. A new inert Git-fixture test first reproduced the refusal, then passed after separating canonical authenticated Git-path reading from executable-path admission. The test also requires executable staging to keep rejecting that path before creating an output directory. No detector, original source, oracle or runtime isolation guard changed. The retry's historical prediction and verdict artifacts are preserved unchanged.

The first ranking ledger's `tree` value for the Dmitry repository echoes a requested treeish; the authoritative `source.treeSha` is `b9ce1ff3214cbaa6bb6b26db8384bcb6aebdaece`, which the Git reader verified. Execution never relies on that ranking-ledger field.

The next improvement requires a new candidate and another untouched cohort: broaden supported Kotlin package/path and receiver/type coverage without turning abstentions into clean or false-negative labels. This evaluation keeps Block 2.6 open for replicated distinct discovery and does not start Block 2.7.

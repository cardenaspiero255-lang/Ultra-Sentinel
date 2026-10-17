# C2 Run 19 — original Git tree evidence and holdout contamination

## Immutable inputs and owner provenance

Frozen GameHub Ultra PRs: #150, #151, #152, #153, #154, #155, #157, #158. Expect 241 changed-file occurrences, 215 distinct HEAD blobs and exactly 26 duplicate HEAD blob groups (52 occurrences) between #155 and #157. The old historical Core can inspect at most 153/241 changes; 88 test/Gradle paths are excluded. The owner-sealed source-truth baseline is **18 total identities (9 positive / 9 negative)** from Actions run #39071144969, archive #12115670408 with SHA256 aa2d483e887b7b89bb44aca2537744233f9307ebb8f9e24236e2c813ddab5507. None are scored by either pinned detector.

## 15 ORIGINAL responses, not rebuilt tree guesses

The owner-only workflow c2-run19-raw-git-trees-provenance.yml is restricted to trusted main and owner ID 322222186 (manual dispatch or exact issue #50 comment ULTRA_SENTINEL_C2_ORIGINAL_GIT_TREES_V1). It uses read-only GitHub REST to fetch 15 complete Git tree JSON responses at their original immutable SHA commit roots, verifies each returned SHA, rejects truncated trees and stores **each original response unmodified** with a SHA-256 file digest. It then reconstructs exactly the 241 PR diffs, 215 HEAD blob identities, 26 duplicate groups and production changed-path dependency graph. It rejects missing or contradictory inputs. The final artifact contains the raw 15 JSONs, per-file SHA256SUMS, and provenance_manifest.json.

A structural test checks the exact 15-SHA roster and fail-closed owner workflow. These tests do not replace the live owner CI replay. An offline auditor can verify the raw saved JSON files with --tree-dir without requiring network access.

## Holdout safety

All eight PRs are connected by overlapping changed production paths. A separate offline source-archive audit also verified all 241 original HEAD Git blobs against raw bytes and all 18 label references against the frozen HEADs. It found 123 distinct changed paths and 62 as-yet-unlabeled unique production HEAD snapshots under the *conservative exclusion of files already labeled*. **These 62 are candidate snapshots, not automatically 62 distinct root causes and not new labels.**

Do not split these eight PRs across model training and a supposedly independent holdout; use their 18 owner-sealed scoped labels only as **historical development/regression truth**. Future holdout membership requires preregistration from *metadata only*, created after the last owner seal cutoff, and independent labeling with immutable SHA, reproducible source behavior, root-cause deduplication and model-prediction isolation. A new cohort is **not frozen** by this workflow.

Current quota to 120 remains 102: 39 additional positives, 39 additional negatives, and 24 authentic diverse cases beyond the minimum 48 per class. No F1/precision/recall number is supported because both detectors have not been executed on the same complete pinned population. SSS+ remains NOT_CERTIFIED. No repair, auto-merge, retraining, Sentry claim or false-positive nonregression is implied.

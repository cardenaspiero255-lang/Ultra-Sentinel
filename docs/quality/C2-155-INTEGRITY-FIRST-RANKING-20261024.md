# C2 ranking V3 · 155 untouched PRs · integrity before source

**Date:** 2026-10-24. **Status:** metadata-only, no source inspected by this workflow, no model predictions, no GOLD, SSS+ NOT_CERTIFIED.

## Cohort

The sealed original 169 PR manifest is immutable. Eleven historically exposed and Nextcloud Talk #6940 were already excluded from the 157 V2 pool. The owner-authenticated disposals of Nextcloud Talk #6946 (source release run 40145173894, independent 16-blob attestor) and #6945 (source release run 40146912385, independent one-blob attestor), both exact-rule INCONCLUSIVE and zero GOLD, are now excluded as well. **14 exposed, 155 intact**. A tampered missing Git SHA, counterfeit disposition or duplicate/missing observation blocks V3.

## Changes to selection

The earlier ranking V2 scored route names such as `LoggerImpl.kt` and `AsyncTask.kt` even when their modified files had **zero added lines**. V3 retains the historic Core and its 17 frozen rules unchanged, but a filename can now contribute a hypothesis only if its file has at least **2 lines added in GitHub's sanitized metadata**. This is still a heuristic, not evidence the added lines contain any relevant predicate. Changed test files are supplementary and cannot fabricate an original rule match.

Any PR changing **100 or more files** is automatically marked `BULK_CHURN_PRE_READ_CAUTION`; its rank score is set to zero for *automatic priority selection*. This is a decision on selection efficiency only: it is **not** a negative or a guarantee that no defect exists. Such a PR needs a separate owner-approved, scope-specific metadata assessment before source can be released. Cases marked GIT DRIFT, API ERROR or TRUNCATED stay unranked, not negatives.

Workflow `.github/workflows/c2-155-integrity-first-ranking.yml` is limited to the introducing SHA on owner-protected main (GitHub actor 322222186), or manual owner dispatch. It first runs the full npm check, then queries exactly 155 manifest tuples. PR GitHub metadata must match repo, created date, frozen base/head SHA, and the complete paginated sanitized changed-file count must equal the PR's `changed_files` field. Only filename, status, blob SHA and change counts are preserved. No API raw patch, title/body, source bytes or predictions are recorded. The report is explicitly not a certification artifact. Workflow reuses sanitized `gh api --paginate` projection but checks total cardinality, which was missing from V2.

## Pre-read applicability: nextcloud/android#17870

The candidate exists in original roster and is still open. Its frozen SHA base `d57fdc89810ac9ca1c0f9590b19fb1d11ae8cc7c` and head `8b3f38c610961e1b1f2810839c8bf769f9664770` match GitHub API. **Three metadata pages were retrieved: 100+100+58 = 258 distinct files with 258 valid Git blob SHA strings.** GitHub reports exactly 258 changed files, all modified, 116 added lines and 397 deleted lines. Of those, **217** are Android production Kotlin/Java files, **40** test files and **1** other (`app/detekt.yml`). Production contains 94 additions and 343 deletions; **153 production paths have zero added lines** and **179 paths have two or fewer changed lines**. The named LoggerImpl.kt and LogEntry.kt each have **zero additions**, hence cannot support an added-line log statement by their filenames alone. There are no changed workflow files.

This is a complete Git metadata set, but no rule `path/line` is known and original/fix/benign behavior is not reproduced. The large breadth and dominant deletions make it a low-confidence automatic choice. **Do not authorize a source read of #17870 on the basis of filename hints or the old score 5.** Record the snapshot separately in `docs/quality/C2-155-NEXTCLOUD17870-PRE-READ-METADATA-20261024.json`; #17870 remains among the **155 unopened**. It may be scoped for separate future owner review without being silently excluded.

## Success and failure criteria

Exactly 155 source-free observations, no old released PR IDs, no truncated file lists masquerading as matched, stable deterministic ranked shortlist of filename hints with additions and 100+-file holds. The report must say `newGoldLabels=0`, `truthSealed=false`, `sourceReadAuthorized=false` and `originalOracleExecuted=false`.

Only after V3 has successfully generated a fresh metadata artifact may a single new candidate receive its own exact Git SHA/blob owner-only source release and independent attestor; then a true original frozen rule/predicate and separately run original/fixed/benign oracle are required. **No changes to Core or reserved holdout after revealing source.**

## Owner revalidation of explicit no-source-release report field

The initial protected rank workflow required `releasedSource==false` in its JSON gate but V3 had omitted the field. This corrective commit adds the explicit immutable `releasedSource:false` contract, with an adversarial unit assertion and the original non-disclosure semantics unchanged. This owner-protected merge reintroduces this exact frozen V3 policy document, allowing an **authenticated new metadata-only run** without inspecting source, widening the cohort, changing weights, or granting any PR read. Only the new protected run with all jobs and artifact success may be used for ranking decisions; the initial run must not be treated as valid.

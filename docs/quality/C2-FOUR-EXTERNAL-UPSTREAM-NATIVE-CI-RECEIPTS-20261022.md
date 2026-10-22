# C2 — four original GitHub upstream CI receipts, **not** causal truth

Date: 2026-10-22. **Result:** Original pinned external CI metadata captured in [GitHub Actions run 39860877272](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39860877272), job `verify-upstream-original-ci-without-unblinding`. Source API authentication was performed in the owner-only read-only workflow. Archived [artifact 12462131019](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39860877272) ZIP SHA-256 `628832e4681366e961bacee8e9ba416408352f7ab6cef46728b252a00faa2806` matches the GitHub-published artifact digest. The single JSON receipt has `ciMetadataDigest=a29f1352c933e7c006f67910a3f7335d8888fa15293546347372997d11a2c50f`. **872/872 unit tests passed** on this exact source run.

This is an independent *CI provenance receipt*, **not an independent original-source behavioral oracle**. GitHub's check runs prove that a job reached an outcome on a pinned original Git SHA; they do not establish the behavior of the changed code, correct fix, applicability of a `rule/path/line`, or a positive/negative label.

## Frozen Git commit versus moving live PR

| Registered external candidate | Source-head native check runs | Comparable head/base native check names | Comparable source-test check names | Status |
|---|---:|---:|---:|---|
| `ActivityWatch/aw-android#379` | 0 | 0 | 0 | `NO_HEAD_CHECKS` |
| `LawnchairLauncher/lawnchair#7428` | 8 | 8 | 0 | `NON_TEST_CHECK_METADATA_COMPARABLE_NOT_BEHAVIOR` |
| `bitwarden/android#7501` | 27 | 13 | 9 | `TEST_CHECK_METADATA_COMPARABLE_NOT_BEHAVIOR` |
| `nextcloud/talk-android#6938` | 20 | 7 | 2 | `TEST_CHECK_METADATA_COMPARABLE_NOT_BEHAVIOR` |

The Bitwarden PR **moved live HEAD** after initial preregistration: originally pinned `99be64d61f0a0eeefb42b3f6d268a5b248814d37`; live observation at this run `14fd033f52df1f28bfe0ce19a95247598b7150cd`. Original pinned Git object was still authenticated with GitHub's Git-commit endpoint and its check runs were collected by original SHA; the newer head was *not* substituted. Three other PRs retained their registered pointers at this run. Zero original base drift.

## Reproducibility and limits

- The owner-only `.github/workflows/c2-upstream-original-ci-receipts.yml` calls GitHub's **read-only** PR ID, immutable commit and `/commits/{sha}/check-runs` APIs for all 8 original SHA positions. Check-run responses are paginated fully, total-count checked and each `head_sha` attested. No source content, test code, PR patch/diff, issue body, detector output, JUnit or upstream executable is fetched or executed.
- `packages/quality-gates/c2-upstream-original-ci-receipts.cjs` verifies all four frozen metadata identities and source-check schemas, rejects malformed records, incomplete snapshots, extra keys, duplicate check IDs, swapped SHA and fake truth. The CLI in `scripts/c2-upstream-original-ci-receipts.cjs` binds live observed PR metadata to the **frozen original source** and emits only unscored CI metadata.
- A **green CI check or same-named head/base test is NOT an independent root cause oracle**. Without an authenticated failing/benign original test case and an observed correcting minimal intervention with unambiguous scoped rule applicability, none is eligible to be scored. A missing head check (ActivityWatch) is missing evidence, not a failed test.
- The Bitwarden head drift test is a real negative case for source immutability. An attempted automatic replacement was blocked and corrected with regression coverage. Revalidation must continue against the originally selected Git SHA or a separately predeclared new population—not silently migrate this cohort.
- No source files, PR titles, fixes or outcomes were inspected in the prospective candidate registry or in this CI attestation workflow. The pilot task `tasks/tasks` is a known, unblinded development control and remains excluded.

## Next independent experimental boundary

1. An independent **source executor** must be supplied or prepared with a priori original-source behavior oracle per PR and a license-aware, isolated runtime. For a positive case, authenticate original failure, scoped corrected behavior, innocuous negative cases and distinct cause. For a benign control, run its original positive behavior and a separately controlled unsafe counterfactual. Store JUnit/XML and both source Git blob SHA and original native source-run receipt in a separate artifact **before** releasing Core predictions.
2. Authenticate training and cross-repository family exclusions; all four original snapshots are candidates, none is a prospective sealed evaluation label. Distinct repositories and Git SHAs are necessary but not sufficient for causal separation.
3. Pin a separately tested baseline executable and candidate engine; compare predictions only after source/label truth and holdout commit are sealed, on **identical** source Git SHA and positional `rule/path/line` populations.

**Totals at this gate:** `4/4` original Git upstream check metadata pairs examined; `2` candidates with comparable test-named head/base checks; `1` candidate without any HEAD check runs; `1` PR head drift preserved. **0/4 original-source causal truths attested, 0 GOLD labels, 0 scored negatives, training independence not certified, baseline not authenticated, holdout NOT_FROZEN, precision/recall/F1/FPR null; SSS+ NOT_CERTIFIED.**

# C2 Bitwarden Android 7499 — source-free historical Core path gate

**Status:** PRE_SOURCE / OWNER_READ_RELEASE_PENDING / NO_GOLD / NOT_CERTIFIED.

## Why this PR and why only path prefilter

Original preregistered `bitwarden/android#7499` was selected from the **160 never-source-inspected** identities remaining after eight earlier quarantines plus authenticated Lawnchair #7428. Metadata frozen before inspecting PR title/source: created 2026-10-20T22:29:32Z, base `9bdf4d222ed0916415973418052f0bd089507875`, frozen HEAD `6ee1047c7312ce61153184e84840bc372cf38602`. Eight changed paths and Git blob IDs are locked in `C2-BITWARDEN7499-FROZEN-PATH-PRESEAL-20261024.json`; **five** fall within historically frozen `app/src/main/kotlin` production scope and **three** are unit-test source.

The exact *historical* (not current) Core code is Git blob `db29f94be1e0afb791a241d26f449695df0eafd0` at commit `547938ed88804e25bbabecf74a3c3d91b74cf1a4`, not the later general-Kotlin Core snapshot. The historical semantic auxiliary blobs and all **17 exact rule IDs** are enforced by TDD. For an `app/src/main/kotlin` path, only general Android rule families can plausibly apply. Path is a **necessary but insufficient** prerequisite; no regex matches, culprit line or runtime truth is inferred from filenames. The original source might be bug-free, out of the exact rule set, a duplicated causal lineage or an unmerged experimental fix.

**Important limit:** This upstream PR is currently **open**, so its HEAD is not guaranteed to be a merged, accepted fix. Any head/base drift fails closed. Even authentic original-vs-proposed-fix execution would not alone establish GOLD, and missing line-specific rule correspondence must yield `INCONCLUSIVE`.

## Production evidence architecture

1. PR CI runs `npm run check` and validates a metadata-only exact scope snapshot against known immutable SHA/blobs and nine excluded sources. It does not submit source/diff/code to Core or read any predictions.
2. **Only after a merge introducing the explicit request to protected main by original owner actor ID 322222186**, the guarded owner job validates historical Git blob IDs, re-reads the original PR metadata and sanitized `filename/status/sha/additions/deletions/changes` list, and fails on mismatch. It writes `sourceReadPermitted=true` **only** after both path and owner checks succeed.
3. Separate attestor job independently retrieves the main GitHub run/artifact identity, original PR base/HEAD Git objects and the eight per-file Git blob pointers. No source code, PR patches, tokens or local JARs are archived.
4. Workflow jobs for both Bitwarden and the earlier one-time Lawnchair request now **skip future unrelated merges**; they do not accidentally reauthorize or manufacture red CI jobs on every main push.

## Hard rules for the next step

After owner run succeeds, inspect exact original and proposed-fix source under read-only license conditions. Require a frozen actual `ruleId/path/line` **from original root-cause independent evidence**, then an authentic upstream original error/fixed success/benign pass using networkless isolated tests on immutable source (not approximate rewritten semantics). The next independent attestor must rehash original Git blobs, upstream JUnit XML/results and runner artifacts, verify repeatability and causal independence **before** sealing truth and **before** candidate/baseline prediction queries. If the PR changes no code matching one of 17 frozen rules, set `INCONCLUSIVE_OUT_OF_RULE_SCOPE`, quarantine as development and do **not** run a contrived oracle for scoring.

Any owner release does not itself seal truth: `newGoldLabels=0`, `truthSealed=false`, `candidatePredictionsRead=false`, `tripleSPlusCertified=false`. Previous documented truth stays 9, gap to minimum 120 stays 111 until a separately authenticated independent original-source evaluation.

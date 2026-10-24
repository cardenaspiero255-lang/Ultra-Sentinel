# C2 prospective source candidate triage — truth-first audit, 24 October 2026

**Verdict: NO NEW GOLD / NOT_CERTIFIED / NO BLIND SCORING.**

## Precise sequence and disclosure warning

Source selection first wrote GitHub commit-anchored metadata records with the exact repository, PR, creation date, base SHA and HEAD SHA from the 169-row frozen manifest. Several candidate source diffs were then inspected **while the preregistration fields still said `sourceReleasePermitted=false` and no owner-authenticated independent release receipt existed**. Consequently this exploration **does not meet the project's untouched blind holdout admission protocol**. Do not claim it does. Every source-inspected PR is now quarantined for development and must never be silently promoted to GOLD.

The disclosure ledger `C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json` records **8 exposed / 161 not opened** from the 169 exact metadata identities. All 8 remain outside held-out scoring. No detector Core, baseline predictions or scores were consulted while inspecting them, but absence of predictions does **not** undo premature source disclosure.

| Original external PR | Original observed source | Finding | C2 decision |
|---|---|---|---|
| [WordPress Android #23430](https://github.com/wordpress-mobile/WordPress-Android/pull/23430) | Ruby Dangerfile milestone warning | Not within frozen Core's Kotlin/Android semantic rule vocabulary | INCONCLUSIVE |
| [WordPress Android #23432](https://github.com/wordpress-mobile/WordPress-Android/pull/23432) | GPS EXIF attributes left after privacy stripping; PR adds Robolectric regression | Valid bug *claim*, but no exact registered frozen rule for EXIF stripping and no original/fix executed in our trusted source oracle | DEVELOPMENT_ONLY |
| [Home Assistant #7661](https://github.com/home-assistant/android/pull/7661) | Renovate action pin update | No causally justified original fault or fix oracle | INCONCLUSIVE |
| [Home Assistant #7662](https://github.com/home-assistant/android/pull/7662) | WearDns propagates non-IOException from disconnected mobile fallback; PR adds test | Causal hypothesis with upstream regression source; **no compatible new-line active Core rule** or trusted original/fix/benign execution yet | DEVELOPMENT_ONLY |
| [Home Assistant #7664](https://github.com/home-assistant/android/pull/7664) | E2E workflow setup action pin | Dependency refresh without original defect oracle | INCONCLUSIVE |
| [Home Assistant #7666](https://github.com/home-assistant/android/pull/7666) | Non-replayable WebSocket subscriptions | Requires new domain semantic predicate, original regression and full upstream test | DEVELOPMENT_ONLY |
| [Home Assistant #7672](https://github.com/home-assistant/android/pull/7672) | E2E workflow setup action pin | Dependency refresh without original defect oracle | INCONCLUSIVE |
| [Home Assistant #7676](https://github.com/home-assistant/android/pull/7676) | Location dispatch coalescing/ordering and per-server serialization | Current frozen rules do not encode send-queue temporal correctness | DEVELOPMENT_ONLY |

**These are upstream PR claims inspected after metadata precommit; they are not eight independently verified defects, eight GOLD labels or proof of separate root causes.** Their original/fix/benign test suites have **not** been run by the trusted C2 prospective worker. The previous known ActivityWatch/Tasks development oracles remain separate and cannot be laundered into the 169 prospective pool.

## Engineering gates now checked in CI

`packages/quality-gates/c2-prospective-source-preflight.cjs` requires every preregistered SHA/date tuple to match the immutable 169-row manifest, refuses additions of predictions or GOLD assertions, rejects duplicate/mismatched identities, and verifies all eight disclosed candidates remain quarantined. It **does not** claim independent Git SHA/oracle provenance or rule compatibility. Tests in `tests/unit/c2-prospective-source-preflight.test.cjs` cover forged SHA, duplicated sources, disclosure loss, fake release permission, false truth flags and predictor leakage. No permissions, model inference or real external source execution are added.

## Correct next attempt (untouched 161 only)

1. Choose a **new** item by fixed metadata-only ordering, define training/causal exclusion policy and bind repo PR/base/HEAD and tree hashes with a read-only **owner-authorized GitHub API check**. Record license/source permission and a separate explicit release receipt **before** inspecting any code. If the original head-to-PR association has drifted, quarantine; no live-pointer substitution.
2. Preserve the fixed 17-rule Core vocabulary, its `production(path, externalKotlin)` restrictions and complete exact changed-line evidence. A bug with no implemented rule is a legitimate development finding, not a comparable positive or a reason to change the frozen detector during evaluation.
3. On independent isolated workers execute **real upstream original failure, fixed success, and benign control**, preferably genuine JUnit from the upstream project with isolated read-only pinned Git trees and preprovisioned build dependencies. No PR-provided commands, GitHub tokens, source JARs or network in the sandbox. Any lack of oracle yields `INCONCLUSIVE`.
4. A distinct trusted attestor reacquires original blob/commit/workflow/artifact IDs and independently rehashes test XML/log bytes, checks flakiness and causal lineage. Only once an exact rule/path/line truth label is authenticated can a **separate frozen truth seal** admit GOLD. Only after that seal may benchmark candidate/baseline predictors run; report all unexpected false positives too.
5. Benchmark gates and SSS+ remain pending: **9 previously documented scoped truths, 111 missing**, plus separate owner checks for rollback, Sentry, monitor reliability and security. Neither passing preflight nor a developer-only oracle can override these blocks.

**Do not trigger full prospective source execution or seal truths from this PR. It is a truthful quarantine and process regression guard, not a completed external oracle.**

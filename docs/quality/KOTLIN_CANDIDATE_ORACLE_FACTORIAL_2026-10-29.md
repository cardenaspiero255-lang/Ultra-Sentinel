# Kotlin candidate intake and independent multi-file oracle evidence

Date: 2026-10-29. Scoped to PR #269, stacked on the still-draft PR #268. This is **not** a Triple S+ release approval.

## Priority 1: bounded non-registered candidate handoff

- `packages/investigation/novel-kotlin-candidate-intake.cjs` takes complete Kotlin source bytes and arbitrary candidate-source bytes as **inert data**. It does not contain a per-rule replacement table or execute those bytes.
- It accepts paths without a pre-registered repair pair, verifies canonical 40-hex Git blob consistency, de-duplicates, reuses the separate experimental Kotlin advisory detector, re-scans each proposed source, and fails closed if a claimed risk persists or a new HIGH risk appears.
- It supports the existing experimental `REGEX_PREFIX_AS_COMPLETE_VALIDATION` and `CLOCK_ROLLBACK_WITHOUT_INVALIDATION` families in this branch, **not arbitrary unknown vulnerabilities**. The frozen C2 Core remains unchanged.
- Every returned case retains `originalOracleVerified=false`, `autofix=false`, and no authorization or remote writes. Static disappearance of a pattern is NOT functional correctness.
- The trusted original JARVIS Termux pilot remains in PR #268; the extra original-JVM clock policy oracle in this PR exercises the second advisory family with RED, GREEN and an intentionally unsafe control. Its clock is injected by a test; no real Android clock rollback has been proven.

## Priority 2: distinguish co-changing files from causal interaction

- `factorial-oracle-evidence.cjs` validates exact bounded 2^n case matrices for 2–4 files and analyzes minimal passing sets, while deliberately marking causality and JVM provenance unverified.
- `original-oracle-vector-factorial.cjs` analyzes **per-oracle** results so that two unrelated failures requiring separate changes cannot be misrepresented as one cross-file causal chain merely because an aggregate AND only passes when both changes land.
- `jarvis-dual-policy-factorial-original.sh` compiles and executes four combinations of immutable original JARVIS Termux and voice Kotlin files, using a separate trusted JVM oracle for each policy. It expects FAIL/FAIL, PASS/FAIL, FAIL/PASS, PASS/PASS and archives only SHA-bound sanitized receipts.
- This is a **negative causal control**: two independently repaired policies do not constitute proof of a common root cause. No general causal discovery is claimed.

## Controls and limits

- TDD RED first; Node 22 `npm run check` required on every changed PR HEAD. Original-source Kotlin JVM CI must be green on the same HEAD before the PR may leave Draft.
- Original JARVIS source is pinned to `f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868` with verified Git blob SHAs, fetched by trusted CI with read-only credentials. JVM runs in the existing restricted AppArmor/Bubblewrap harness.
- No executable source/oracle is read from an untrusted pull-request attachment, no changes to GitHub or Android product repositories, no `contents: write`, auto-merge, release or production authority.
- Matching caller-provided source hashes alone does not authenticate a remote repository or a JVM receipt. A genuine independent oracle must be executed by the trusted runner; this analysis cannot certify itself.

## Remaining before a complete Triple S+ capability

1. Generalize independent original-source Kotlin oracle selection to additional families without accepting executable untrusted oracles.
2. Authenticate candidate provenance and the full original/candidate/negative receipt chain against the **current** source HEAD; support arbitrary external patches only through strictly isolated, owner-authorized trusted execution.
3. Reproduce genuinely interacting multi-module defects, including causal exclusion controls, not only two independent policies.
4. Integrate the signed owner authorization and production-safe patch application, CI/review gates, crash-safe rollback, and Android functional acceptance.
5. Continue the separate Sentry, alert-delivery, private memory and final inventory gates.

**Classification: incremental functional engineering, NOT_CERTIFIED.**

# P2 #262: bind compiled repair bytes

Inspected base: `16ebb4f624cf151bb3556ff994eacf61d8253176` (remote main).
PR #262 was already merged, with an unresolved P2 on cached JVM evidence.
No open PRs existed at the start. Active ruleset 25100401 requires a PR,
resolved review threads, up-to-date `structure-and-contracts` from integration
15368, zero human approvals and no bypass. All applicable Kotlin jobs must pass
as well. Visibility remains public.

## Cause and change

The local Judge previously mapped arbitrary current repair bytes to previously
passing logs. Original Git blobs, JAR hashes and correct Git rollback did not
prove that the repair had been compiled.

The shell producer now hashes original/repair Kotlin and oracle inputs before
compilation, checks them before/after each compilation and JVM execution, and
records ordered repair hashes plus selected source hashes in each JVM row.
Compiler logs and JARs are checked across execution. The consumer rejects missing,
changed or mismatched bindings before creating any Git scenarios. Empty compiler
logs are valid and still hashed. The CLI substitutes each repair after real JVM
execution, requires rejection, restores it in finally, and rechecks the originals.

Trust boundary: these hashes provide consistency on the trusted producer runner;
they are not signatures and cannot authenticate a wholly forged receipt. The
output explicitly retains that limitation and grants no remote write/merge rights.

## Tests

Before implementation: 15 focused cases, 7 passed and 8 failed as expected,
including both post-evidence repair replacements, absent/swapped repair hashes,
updated repair hash with stale per-mode sources, wrong/missing per-mode sources,
and modified compiler log. Existing JAR/log rejection controls passed.

After implementation: focused cases include the CLI substitution drill, restoration
and an empty compiler log. Synthetic JAR/log fixtures are explicitly not JVM proof.
Original refresh/battery fixtures were fetched by immutable Git blob and verified
with `git hash-object` against the production pins. No physical Android claim.

The first full suite exposed a test race: the cleanup assertion inspected other
workers' `ultra-factorial-*` directories. It now records its own process allocations
and checks every allocated directory was removed after the oracle exception.

Coverage: Node V8 reports 100% lines and 87.95% branches for the Judge module;
90% lines for the CLI. This is line coverage, not 90% branch coverage or a measured
shell patch coverage. Shell syntax passes `bash -n`; real Kotlin is a CI requirement.

## Initial scope matrix at the inspected base (not final acceptance)

| Area | Existing implementation reused | Remaining evidence/work |
|---|---|---|
| Core / Family Hunter | core semantic patterns, family fingerprints, cross-file intervention planner | General semantic breadth and independently reproduced new defects |
| Causal experiments | cross-file sandbox, original GameHub/JARVIS Kotlin bridges | P2 binding fix; general experiments beyond registered pairs |
| Hunter → Fixer → Judge | hunter-repair-binding, repair-draft, supervised-repair, repair-judge | New-defect repair generation and authenticated functional end-to-end chain |
| Memory | memory ledger, quarantine and curated playbooks | Verified historical fix admission, persistent authenticated revocation |
| Regression investigator | offline bisect planner | Trusted Git ancestry and executed supervised bisect |
| GameHub / JARVIS | live readers, OIDC owner flow, Kotlin voice/functional Judges | Current product E2E and physical Android validation |
| Sentry | read-only adapter, opt-in smoke, sealed checkpoint | Actual authorized Sentinel connectivity, sanitized event and SHA correlation |
| Monitor / Watchdog | operations heartbeat auditor, checkpoint/outbox | Independent external observer, actual notification delivery/acknowledgement |
| Reports / optional tooling | evidence recommendations, mutation lab | HTML exporter, optional pre-commit hook, real-code mutation scope |
| Release | private-edition readiness evaluator (declarative only) | Authenticated evidence for all 13 gates; no release authorization |

The historical US-001–US-035 inventory and Private Edition gates were read.
Their old statuses must not be treated as current acceptance. This intervention
addresses Phase 1; it does not complete Phases 2–9 or certify Triple S+.

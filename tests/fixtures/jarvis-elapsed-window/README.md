# Phase 2 research: independently adjudicated elapsed-window hypothesis

This is an *experimental*, non-production Kotlin/JVM experiment. The first-pass
Hunter receives an inventory of original `.kt` files (including their Git blob
IDs), **not** a path, preselected rule, known cause, patch, or oracle. The
scope-specific Fixer runs only *after* the Hunter report is saved.

## Provenance and current verification

- Original source: `cardenaspiero255-lang/JARVIS` at commit
  `747c14b5d97750a7b2736968e2d516f02448558d`.
- Verified original Git blob: `ac73f8fcd1f5c9f578247ba4c653204cd3369cb9`.
- A separate read-only review fetched all **66** original Kotlin core files.
  The broad lexical source pattern returned two hypotheses: `OfflineVoiceQuestionGate.kt`
  and `SafeAutomationEngine.kt`. The former rejects negative clocks, so it is
  **not** an established defect. Only the latter was tested with the JVM oracle.
- Locally, Node.js tests: 8 passed, 0 skipped, with 100% lines and 97.56%
  branches across new Hunter and Fixer modules.
- The byte-identical original `SafeAutomationEngine.kt` was compiled against
  `OriginalConsentOracle.kt` on **Kotlin 1.9.0 / JDK 21**. Original RED,
  generated candidate GREEN and deliberately wrong candidate VETO were
  observed. See `LOCAL_JVM_RECEIPT.json` for the process transcripts and
  SHA-256 hashes of the local executable JARs.
- **Not yet verified:** CI with pinned Kotlin 2.0.21; running the *actual*
  Hunter module over all 66 files; protected GitHub workflow and its combined
  functional Judge/rollback. The separate 66-file review used the matching
  lexical search, not the executable Hunter module.

## Independent JVM verification

The oracle is intentionally independent of Hunter's implementation, path,
replacement and search pattern. It checks normal consent, normal expiry,
extreme injected-clock expiry, STOP revocation, and a destructive candidate.

This is **not** a demonstrated Android runtime exploit: the clock is test-injected
at `Long.MIN_VALUE` for a preview and `Long.MAX_VALUE` for confirmation. Normal
`System.nanoTime()` reachability and security impact are unproven. Therefore,
this case is a reproduced boundary-condition defect, not production eligibility
or autonomous security repair approval.

## Planned controlled CI run

Apply the patch against the **unmerged PR #332 head** (or its successor), open a
stacked PR and allow `phase2-blind-elapsed-original-oracle.yml` to run. The
workflow requires exact Git sources, Kotlin 2.0.21, JDK 21, Bubblewrap without
network, enforced AppArmor, original RED, candidate GREEN, unsafe VETO, local
Git-policy Judge and exact Git rollback. It never writes to JARVIS or grants
production, protected-operation or merge authorization.

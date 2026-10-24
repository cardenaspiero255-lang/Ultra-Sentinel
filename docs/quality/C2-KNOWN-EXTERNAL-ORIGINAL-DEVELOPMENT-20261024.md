# First externally sourced Kotlin control after the isolated-oracle fixture

**24 Oct 2026 — DEVELOPMENT CONTROL ONLY / NOT_CERTIFIED**

## Scope of this first real external source replay

The owner-only trusted workflow `.github/workflows/c2-known-external-development-oracle.yml` reuses a **previously inspected** original Kotlin source commit in `tasks/tasks`:

- repository `tasks/tasks`;
- immutable original source HEAD `3936c221aea180b795085d7402286373b5d3f6d2`, parent `5624816cac6ecab701969d24e6d3387ccd21a773`;
- `app/src/main/java/org/tasks/notifications/Throttle.kt`, exact blob `0e472cfd73510ab11a396ee5eba9968d57172050`;
- **implemented rule scope** `BLOCKING_ANDROID_CALL`, which recognizes the original Android-path `runBlocking` and `Thread.sleep` syntax. A static finding is a risk hypothesis, not proof of main-thread blocking;
- the original source executes in a networkless Bubblewrap/AppArmor JVM with minimal trusted test-only ABI stubs. The developer control compares an original background worker to **an injected inline executor using the identical upstream production source**.

This experiment does NOT establish an upstream fix or original upstream test suite. The same source exhibits different scheduling properties under two injection conditions. The source was inspected previously and the exact commit **is not associated here with an independently authenticated upstream PR number**. It is excluded at repository level from the 169 pristine prospective metadata candidates and from scoring.

## Separate original-source attestation

- A separate GitHub Actions job checks out the identical external HEAD from public Git, re-checks ancestry and actual Git blob ID, and independently computes the SHA-256 over its source bytes.
- The producer publishes only the actual Kotlin runtime `worker.json` and sanitized source-only `report.json`; no third-party code, JAR, tokens or Core findings appear in the artifact.
- The independent attestor uses `scripts/c2-attest-tasks-original-development.cjs` and `packages/quality-gates/c2-external-original-attestor.cjs` to rehash runtime bytes, validate every original behavioral assertion through the existing standalone source oracle, and compare the producer source digest with the fresh original Git checkout.
- The verifier also checks the GitHub owner, repository, workflow run HEAD, named artifact ID and GitHub-published digest. This is **GitHub owner metadata validation**, not an independent signature or complete ZIP-byte attestation.
- The verification module does not import or execute the candidate Core or legacy baseline, and cannot be coerced into promoting a label. Adversarial tests reject forged commits, altered source/worker bytes, extra certification claims, detector access or falsified outcomes.

## Explicit unresolved conditions for first truly blind external PR

This is a working **known-development** adapter, not the first genuine prospective PR oracle:

1. Before releasing one of the 169 metadata-only candidates, complete independent training-lineage and causal-family exclusions. The Nextcloud #6938 pre-admission gate still reports `sourceCodeReleasePermitted=false`; do not silently change it.
2. For a specifically selected approved *original PR*, pin the full original base/head blobs and verify the exact rule/path/line and license. Do not take a different live HEAD.
3. Execute a real upstream regression in the original and corrected states, plus independently justified benign controls in Bubblewrap with preprovisioned dependencies, no network or tokens; produce authentic JUnit/XML and execution-time evidence.
4. Re-authenticate producer workflow, original upstream Git objects, original/fix/benign output and causal fingerprint in the **separate attestor**. Quarantine unsupported and flaky cases.
5. Seal truth before any model/baseline predictions. Do not turn the known Tasks development oracle, a synthetic failure, a manifest row, or a SHA into GOLD.

**Truth remains 9 documented source-scoped labels, 111 missing.** `newGoldLabels=0`, `precision=recall=f1=null`, `truthSealed=false`, `holdoutFrozen=false`, `tripleSPlusCertified=false`, no auto-merge or auto-repair.

# C2 source-only executable original oracle — development control

**Status:** original Tasks.org source-runtime experiment, **not** prospective original truth, an independent holdout, a GOLD label, or SSS+ certification.

## Boundaries
- Known pilot: `tasks/tasks` Git HEAD `3936c221aea180b795085d7402286373b5d3f6d2`, ancestor `5624816cac6ecab701969d24e6d3387ccd21a773`, original `Throttle.kt` Git blob `0e472cfd73510ab11a396ee5eba9968d57172050`.
- Trusted owner `push` to `main` only. Checkout pins the exact trusted `github.sha`, checkout of the original upstream Git HEAD is read-only. A different external HEAD must never be substituted.
- Compile authentic Kotlin upstream source with documented test-only Android/coroutines ABIs. Execute it inside Bubblewrap with no network namespace, read-only host mounts and temporary directories, as in the existing restricted AppArmor host policy.
- Compare **background-worker execution** against a **deliberately synchronous injected executor** using the **same original production class**, not a claimed upstream fix. The latter demonstrates why the dispatch choice matters; it does *not* prove an upstream defect or classify a Core finding as false positive.
- The source-only witness module/CLI **does not import, execute or read Core or baseline predictions**; Git identity and runtime witness SHA-256 are captured in a sanitized artifact. The output explicitly retains `originalSourceVerifiedByGitInThisProcess=true` but `runtimeExecutionAuthenticatedByThisProcess=false` because the latter relies on inspecting the owner CI execution, not on self-attested JSON.
- **Evidence admission remains zero**: 0 prospective source oracles, 0 GOLD, 0 scored negatives, no truth seal, no independent training/holdout separation, no precision/recall/F1. The four preselected external repositories remain metadata-only: ActivityWatch #379, Lawnchair #7428, Bitwarden #7501, Nextcloud Talk #6938.

## Next independent gate
Verify cross-repository causal-family/training exclusions; create a source-only *separate evaluator* for one preselected external PR with an original-specific upstream test and a minimal, controlled fixing intervention. Authenticate exact Git blobs, run a genuine test suite in the isolated runtime, retain test-run and JUnit/XML evidence, review licensing, seal truth before opening candidate/baseline predictions. Mark missing source tests as `UNVERIFIED`, not false negatives. Only after a separate rigorous lineage audit should a prospective case be eligible to score.

# C2 — original external Tasks.org worker control (development evidence; 2026-10-22)

**Verified original upstream**: [Tasks.org commit 3936c221](https://github.com/tasks/tasks/commit/3936c221aea180b795085d7402286373b5d3f6d2), parent `5624816cac6ecab701969d24e6d3387ccd21a773`, production `app/src/main/java/org/tasks/notifications/Throttle.kt`, Git blob `0e472cfd73510ab11a396ee5eba9968d57172050`. This preexisting publicly disclosed code is **DEVELOPMENT ONLY**, never a genuinely unseen candidate. Upstream source remains in `tasks/tasks`; not bundled in the Ultra Sentinel artifact (review its original license there).

## Reproducible execution and frozen Core findings

Authenticated [workflow 39838679032](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/39838679032), artifact `12451413432`, GitHub ZIP SHA-256 `2ab98817d5ed05450c1ff843f9f8d749f54852dffb81cd47cc1cd0384e4f9179`. Source original SHA, parent ancestry, exact modified Git diff `20 additions / 16 deletions` and original Git blob independently checked during CI. Source compiled unchanged by `kotlinc`, with explicitly bounded Kotlin coroutine/logging/time ABI test stubs, then run inside isolated JVM using Bubblewrap+AppArmor without network or GitHub tokens. Unit suite **855/855** green.

- Original `Throttle.run` dispatches the work onto an injected `newSingleThreadExecutor`. The executable control observed **the caller returned before worker completion**, the callback executed on an independent executor thread, and the next original invocation used the default sleeper for **351 ms** on that worker.
- Authentic original source and its executable diff were processed by the existing frozen `ultra_sentinel_core.cjs` without altering the detector or renaming the original path. `BLOCKING_ANDROID_CALL` fired at **line 14** (the default `Thread.sleep`) and **line 27** (the `runBlocking` inside `executor.execute`). Exact `rule/path/line` are retained.
- The alert text suggests potential UI/callback blocking. Because both calls execute as worker work in this source, the finding is a **concrete potential false-positive mechanism worth fixing with thread-context awareness**, not a proven UI ANR. The original app might have other issues not tested by this narrow observation. This controlled evidence is **not** an independent expert adjudication, does not use full upstream kotlinx-coroutines in the harness, and has no blinded sample status.

### Measured versus unmeasured

`coreExactMatchingFindings=2` is an observed count of development-time alerts, **not** a measured count of independent false-positive cases. Both alerts share the **one source/worker-thread mechanism**, so do not count two separate causal labels. `scoredTrueNegatives=0`, `scoredFalsePositives=0`, `falsePositiveRate=null`, `precision=recall=f1=null`, `newGoldLabels=0`, `holdoutFrozen=false`, `SSS+ NOT_CERTIFIED`.

### Next required independent casework

1. Seal source-truth oracles with an independent evaluator of *actual thread execution* and relevant Android app lifecycle behavior. Verify that an original future source with `BLOCKING_ANDROID_CALL` is truly safe on the caller/UI path, and that a narrowly unsafe original call in the **same Core rule scope** is separately reproduced with an authentic upstream regression. Do **not** call this known Tasks.org example a genuine prospective holdout.
2. Establish lineage/family separation and rule-specific negatives before model improvements. If the detector is modified to suppress worker `runBlocking` or `Thread.sleep`, this known case remains regression/training only.
3. For new, unexamined third-party PRs, register only PR number, repository, createdAt, and exact base/head SHAs. No diff/text/issues/test outcome/prediction may be opened before an independent metadata freeze.

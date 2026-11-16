# Block 2.6 — prospective String-capable Hunter: first-run result

**Result: ZERO replicated autonomous original defects. Block 2.6 remains OPEN.**
The frozen engine is `5a6f28499ad0ffd7cf7d5f98bc535bb5205eb1ed`
(PR #408). This negative result is not a clean bill of health.

## Prospective separation
1. Engine modules and deterministic metadata-selection criteria were committed in
   `a4110c6` **before** the GitHub repository query.
2. Two untouched source repositories (5 + 20 original Kotlin blobs) were sealed in
   `46354f0` by commit, tree, and Git blob identities **before reading source bodies**.
   Historical/exposed original repositories were excluded. Metadata ranks 11 and
   14 were first eligible according to the preregistered rule; rank 4 with a
   slash-bearing default branch was separately checked via Git ref/commit metadata
   and contained zero eligible production Kotlin paths.
3. Independent Kotlin oracles were authored and SHA256-committed before prediction;
   isolated preflight compiled both with Kotlin 2.0.21. Neither the detector nor
   original sources were modified after reservation.
4. [The first run](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43810197101)
   uploaded the source-bound Hunter prediction artifact `14199867578` at
   `2026-11-16T05:27:26Z`, before executing the independent oracle job and
   publishing artifact `14200461330` at `05:28:29Z`. There were no oracle
   mounts in the Hunter process; real cgroup/Bubblewrap/AppArmor isolation was required.

## First-run measurements

| Cohort | Inspected classes | Executed stable methods | Unsupported | Independent controls |
| --- | ---: | ---: | ---: | --- |
| `alidehkhodaei/data-structures-and-algorithms` | 5 | 0 | 5 | Four non-admitted direct calls, all correct |
| `esoxjem/Algorithms` | 40 | 0 | 88 | 21 eligible bounded Fibonacci observations; one non-admitted binary-search mismatch |
| **Total** | **45** | **0** | **93** | 21 eligible independent observations, five excluded controls |

One scalar method candidate in the second cohort had four successful calls but
did not complete a deterministic triple, and the detector recorded one internal
abstention. All four source/package reports are `INCOMPLETE_NO_SUPPORTED_METHODS`.
There were zero published Hunter hypotheses, zero source/compile execution
abstentions and zero independently confirmed new Hunter discoveries.
Accuracy and recall remain unmeasurable (null), not 100%.

The second oracle separately observed the untouched recursive
`algos.arrays.BinarySearch.search` returning `-1` instead of index `1` on
the sorted input `[-20,-10,0,3,5]` when looking for `-10`. That method takes
`Array<Int>`, which compiles to a boxed JVM array and lies outside the
**frozen** probe's admitted input signatures. This is a missed control,
**not** an autonomous Hunter discovery. The independently checked original
`Fibonacci.nthFib` values for n=0..20 were correct.

## Next technical decision

The missing coverage is now specific: support finite bounded **boxed numeric JVM
arrays**, including Kotlin `Array<Int>`, with cloned argument instances,
fixed immutable numeric controls, deterministic observation envelopes and
abstentions for pathological execution. This is a new detector revision and
must be TDD-tested on *synthetic controls first*, frozen and prospectively
evaluated on a **different** untouched cohort. These 25 files may never be
presented as unknown again.

Exact first-run hashes, artifact IDs, source counts, disabled claims and
negative controls are in `PHASE2-BLOCK26-STRING-FIRST-RUN-RECEIPT.json`.
Replay CI executions are historical checks, never fresh discoveries.
Block 2.7, external repair, novel family certification and global performance
claims remain blocked.

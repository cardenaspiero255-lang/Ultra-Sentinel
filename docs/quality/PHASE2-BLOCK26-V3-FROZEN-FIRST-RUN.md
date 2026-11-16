# Block 2.6 — first prospective frozen v3 run (no replicated discovery)

**Evidence classification: original-source blind evaluation, incomplete coverage, not a new finding.**

- Source selection was frozen by Git tree metadata commit `2cfdb7e5c071e089e69ffa22288dc8d244851f50` before reading the bodies.
- Hunter candidate `31222b3bedb1d48253e9cd4e676250b5841a384f` was frozen before that selection. Its original source/launcher hashes remain pinned in `PHASE2-BLOCK26-V3-COHORT.json`.
- Source: `esoxjem/Algorithms@375097050f4649eeb6cd9d72aae3b5824ca47d91`; 20 original production Kotlin blobs, exactly identified by blob SHA and byte size.
- Independent binary-search oracle file `tests/fixtures/phase2-block26-v3/oracle-1.kt` has the SHA-256 committed in the manifest **before** prediction execution; it was compiled without execution before Hunter and never mounted into the Hunter sandbox.
- [First complete frozen CI run 43809410260](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43809410260): original-source isolation, SHA256-pinned Kotlin 2.0.21, adverse namespace check, source authentication, prediction sealing and ordered dependent independent oracle all passed.
- Immutable first-run prediction artifact `14200365581` was uploaded before the dependent independent oracle; independent verdict artifact `14199398875` published afterward.
- Independent verdict: **0** supported methods probed, **0** hypotheses, **0** confirmed distinct Hunter defects, **12** scoped independent observations, zero recorded execution abstentions. Global precision and recall remain `null`. No repeat discovery occurred.
- Independent oracle exposes a recursive binary search error in `algos.arrays.BinarySearch.search(Array<Int>, Int)`. Hunter did **not** predict it. It is not an autonomous finding, and no global false-negative metric can be calculated from an incomplete evaluation.
- The likely coverage gap is Kotlin `Array<Int>` compiling to `java.lang.Integer[]` while the frozen numeric probe admits only primitive arrays. Any successor support must be proved RED→GREEN on synthetic Kotlin/JVM types **before** using a **different untouched original-source cohort**.
- CI replays after this first run remain replays, not new blind discoveries. No detector retuning occurred within the first run; existing source and oracle bytes were not changed. No new-family claim, repair, remote writes, authorization or Block 2.7 closure.

**Status: Block 2.6 remains OPEN; Block 2.7 remains NOT ALLOWED.**

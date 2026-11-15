# Block 2.6: first frozen original Kotlin arithmetic finding

The first prospective run [43771160768](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43771160768) found one independently confirmed original software defect. This is evidence for discovery of a previously unevaluated original, not discovery of an unknown family or proof of general completeness. No Block 2.7 work or repair of the external repository was performed.

## Immutable order

1. Candidate `8c246fd285793350a2fa3ccc2dcaa4eeac052750` fixed the generic executable probe before source selection.
2. Reservation `9ebd6ff7378a17858726305f75c9219b7f7880fe` selected all 49 regular production Kotlin blobs of `bmaslakov/kotlin-algorithm-club@a8fa9edf615d0498bd1d2e8328f72a180d345343`, by Git metadata without reading bodies. The earlier TheAlgorithms repository was excluded when prior cohort metadata showed it had already been evaluated.
3. Commitment `5c87f5757d2e9ece5474bf4b2751fb7e735734a3` fixed the independent oracle SHA256 before predictions. The oracle uses JDK BigInteger arithmetic and direct Kotlin calls, without Hunter inputs.
4. Protocol `e38718f9bbd2e74f5db8b8e371df375bc7b066dd` authenticated and compiled the untouched originals in a networkless bounded namespace. The unchanged frozen probe received only the original executable JAR, the package scope and its own code. Neither oracle, predictions, repaired code, repository checkout nor host environment was mounted into it.
5. Capture job `132987151561` published prediction artifact `14183379782` at `2026-11-15T22:47:53Z`, with report SHA256 `79ee71421af71ff548428aa105e944f65978b92f3f291a3bfbf5b0d704f201d6`.
6. Dependent job `132987513063` independently recompiled the same originals with the precommitted oracle, then produced its verdict at `2026-11-15T22:48:51Z`. Oracle artifact: `14183599303`.

## Observed results

| Unit | Sealed prediction | Independent observation |
| --- | --- | --- |
| Original `GcdKt.lcm(Int, Int)` | Scalar turning point `0, 100, -100`; both argument positions | Inputs `(2147483647, 100)` and `(100, 2147483647)` return `-100`; wider exact arithmetic yields positive `214748364700` |
| Original `Point.compareTo` | No ordering-law hypothesis | 625 independent bounded lexicographic controls passed |
| Original bounded LCM arithmetic | No defect claim for these controls | 40 exact representable results passed; eight additional cases required wider arithmetic |
| Original `binomial` | One turning-point hypothesis | Not covered by this oracle; remains unadjudicated |

Three hypotheses therefore include two witnesses of the same confirmed LCM defect and one unadjudicated hypothesis. The defect is silent signed overflow violating nonnegativity for positive LCM operands. No claim is made that the exact wider result fits the declared `Int` return type; overflow handling is absent and no arithmetic error is signaled. The new object-order checks supply additional coverage and a benign control; the LCM discovery itself came from the existing generic scalar probe, without a rule specialized for LCM or this source.

The execution inspected 59 classes, probed three numeric methods and 171 object pairs / 2,664 candidate triple steps. It reported seven abstained probes, 360 unsupported methods, 15 skipped nested classes and one unsupported constructor. These are operational counts, not fully labeled examples or false-negative rates. Precision, recall, global false positives and false negatives remain null. No cohort-wide clean result, new-family claim or authorization follows from this receipt.

## Regressions and limits

The cyclic-order regression failed before transitivity support and passed afterward. Review also found a valid constructor-generated identity order that the first frozen object probe falsely flagged. That benign regression was reproduced RED, then corrected in the production candidate by comparing the same constructed objects in reverse directions and across triples. The frozen experiment remains byte-for-byte unchanged; its numeric probe does not construct objects, so this fix does not alter its LCM observations. A future blind evaluation of the corrected engine requires another untouched cohort.

The first-run JSON files in `evidence/block26-object-first-run/` are downloaded original artifacts, with hashes in `receipt.json`. The scoped verdict intentionally leaves `block26Closed=false` pending successful CI and main integration and keeps `block27Allowed=false`. Replays must not be counted as fresh discoveries.

Reproduce the first run by checking out protocol `e38718f9bbd2e74f5db8b8e371df375bc7b066dd` and following `.github/workflows/phase2-block26-object-contracts.yml` on a Linux runner with the required Bubblewrap/AppArmor and cgroup v2 isolation. The compiler archive is SHA256 pinned. Without those facilities, execution fails closed. Recorded artifact verification is available through `node --test tests/unit/phase2-block26-object-eval.test.cjs` and does not execute external bytecode.

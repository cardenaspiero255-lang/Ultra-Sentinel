# Block 2.6 — frozen Kotlin API v2: coverage improved, discovery not replicated

The first run [43796552964](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43796552964)
exercised five original methods, including two structured-argument methods, but
confirmed **zero new Hunter discoveries**. Two hypotheses remain unadjudicated
by the exact preregistered observation join. Block 2.6 remains open.

The compatibility implementation is integrated by PR #403. Its final head
`7c2a7f7068bc5ec85d778a9b474937d0c64bf9e0` passed all seven PR checks;
merge `3f42f0b5f0f5959bdcde2b2f0425496f4ce72401` passed all 59 main workflows.
Those successes establish development regressions and isolation, not discovery.

Freeze `63b0cc26948dbe62f6cb49902c69b37327199a40` predates the exact metadata
search. Reservation `da5a71ee1c9f51411c84a8218fcbe7b12168c22d` predates source
body reading. The fixed query returned 73 repositories; repository metadata
allowed deterministic ranking of the complete first page despite the search
connector not exposing a sort argument. The ledger records root-path and size
rejections. An unpublished draft inventory's overly broad nested-root
interpretation was corrected before publication or any source-body reads.

| Reserved original | Source SHA | Production Kotlin files |
| --- | --- | ---: |
| MarcinMoskala/KotlinDiscreteMathToolkit | `17a7329af042c5de232051027ec1155011d57da8` | 12 |
| Keelar/ExprK | `91fdabf44dda509589ef03722ab70d37b316ef02` | 8 |
| thelastpickle/tlp-stress | `2d4542c27d3f1c0e24899c01247b9a8ee3c9a238` | 50 |

All 70 root production blobs are reserved unchanged. Compiler/dependency and
unsupported API outcomes are retained, never replaced with handpicked sources.
An independent test author prepared direct-call oracles without accessing
Hunter predictions. Oracle file SHA256 commitments are in the cohort manifest.

The workflow first **compiles** the committed oracles in isolation without
executing original bytecode. Required source-compatible oracle compilation must
succeed before any Hunter execution; a preregistered dependency abstention is
recorded separately. Hunter then independently recompiles original-only inputs
and receives only its frozen probe, original JAR and compiler-derived package
scope. It never receives oracle code, answers, repairs or the checkout.

Predictions, exact raw-byte hashes and operational abstentions must be uploaded
before the separate oracle job starts. That job verifies the seal, independently
recompiles untouched originals plus the committed oracle, then executes them in
the original cgroup/Bubblewrap guard. Host envelopes bind the raw oracle output
to its source commit and oracle SHA256. Exact decimal normalization preserves
Long distinctions; conflicting observations or missing cohort outcomes fail
closed. Distinct confirmations are conservatively grouped by original method,
not free-text contract wording.

Protocol validation: 14 focused evidence-integrity tests pass, including five
independently reproduced RED regressions before correction. The full local
suite has 1,976 passes, no failures and four explicit platform/namespace skips.
CI performed the mandatory real adversarial namespace test successfully. The
first published prediction/oracle artifacts are retained with their hashes in
`evidence/block26-kotlin-api-v2-first-run/`; subsequent runs are replays.

## First execution

| Cohort | Executed coverage | Independent result |
| --- | --- | --- |
| KotlinDiscreteMathToolkit | 13 classes; five methods with complete stable triples; two structured methods; 12 completed triples; 76 successful calls; two scalar hypotheses | 578 preregistered numeric observations; neither complete hypothesis tuple was covered by the fixed table |
| ExprK | 19 classes; zero admitted numeric methods; 125 unsupported methods, ten nested classes skipped, one constructor abstention | Explicit `NO_ORACLE_SCOPE`; separate expression controls do not establish Hunter coverage |
| tlp-stress | Full untouched source compilation failed because dependencies are outside the frozen standard-library build | Recorded compiler abstention; no external service was contacted and no source was rewritten |

Predictions artifact `14195060426` was uploaded at `2026-11-16T03:12:48Z`.
The dependent original-oracle artifact `14194563117` was uploaded at
`2026-11-16T03:14:07Z`. Archive and individual-file SHA256 values are in
`receipt.json`; raw report and envelope bytes are preserved unchanged.

Both hypotheses concern `DiscreteMath.splitsNumber(n,k)` with positive fixed
`n=1` or `100`, varying `k=0,1,Int.MAX_VALUE`, and results `0,1,0`. The independent
contract counts partitions into exactly k nonempty unordered groups, for which
that turning point is expected. This mathematical rejection was explained only
after sealing; the original numerical observation table did not contain both
entire reported tuples. The immutable automated verdict therefore stays at
zero confirmations and two unadjudicated hypotheses, not fabricated exact
matches or global false-positive/false-negative measurements.

The precommitted and executed oracle also exposed an original boundary defect:
`splitsNumber(0,1)` returns `1` instead of `0`. Hunter did **not** predict it.
The evidence retains this missed scoped case explicitly; it is not an autonomous
discovery, a repair, or a reason to reuse these sources as unknown. Global
precision, recall and false-negative counts remain null.

Block 2.6 remains open until a distinct original defect is independently
matched to sealed predictions. Global precision/recall and false negatives
remain unknown outside the scoped oracle. No new-family claim or Block 2.7
work is authorized by this receipt.

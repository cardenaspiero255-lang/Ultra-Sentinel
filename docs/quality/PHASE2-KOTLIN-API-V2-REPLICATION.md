# Block 2.6 — frozen Kotlin API v2 prospective replication

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
CI must perform the real namespace tests. No oracle result or original defect
is claimed by this prospective document. The first published prediction/oracle
artifacts will be retained with their hashes; subsequent runs are replays.

Block 2.6 remains open until a distinct original defect is independently
matched to sealed predictions. Global precision/recall and false negatives
remain unknown outside the scoped oracle. No new-family claim or Block 2.7
work is authorized by this receipt.

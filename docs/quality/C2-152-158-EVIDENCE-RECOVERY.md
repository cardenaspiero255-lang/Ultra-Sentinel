# Recovery of the PR186 C2 source evidence

The two PR186 receipts previously pinned by `c2-152-158-mechanism-cross.yml`
were uploaded by run `39726814046` with a 14-day retention period on
2026-10-22. GitHub no longer lists either artifact. The original upload logs
identify the historical IDs and digests, but do not recover the missing receipt
bytes. Their absence must not be treated as historical evidence being present.

The comparison workflow now calls the PR186 source experiment in its own run.
It checks out the experiment scripts and oracles at the original Sentinel
commit `3ae25092c30a5274d790bc4954707fda06edc0bc`, verifies the original
GameHub source blobs, and repeats both four-cell Kotlin matrices with their
ordinary controls. It also repeats the separate six-JVM rollback experiment at
Sentinel commit `f1e65032d65e84907b8f2d52fcaa7b1610d4ba0b` and ten-JVM source
campaign at `7c9d0e459974a48367aed99c2c86853160fa3f82`. The report records
24 **new** JVM executions and calls the inputs `SAME_RUN_ORIGINAL_SOURCE_REPLAY`.
These receipts have new artifact IDs and digests: they replace the experiments,
not recovered bytes from historical runs. The hosted runner supplies the Kotlin
compiler as in the original workflows; its bytes are not pinned, so this does
not claim byte-identical JARs or a fully reproducible toolchain.

The comparison job requires the replay and its consolidation to pass. It
checks the current GitHub run and attempt, repository and owner, expected
head SHA, unique artifact names, expiry and SHA-256 zip digests before reading
the new receipts. The pure-JavaScript metadata checker is not an independent
authenticator when given arbitrary JSON; the workflow obtains metadata directly
from the GitHub API. A replay failure, missing artifact or incorrect digest
blocks the comparison. A failed-job-only rerun may leave replay artifacts from
an earlier attempt, so rerun the **entire** workflow if a new attempt is needed.

The two other historical inputs, artifacts `12501326370` and `12502631435`,
were still available on 2026-11-06 and are scheduled to expire on 2026-11-22.
Their bytes were independently downloaded and their SHA-256 digests matched
GitHub's metadata, but this workflow does not depend on those old artifacts:
it requires fresh receipts from the pinned original experiments on every run.
Never reuse an old artifact ID or digest for regenerated evidence.

This workflow demonstrates the stated source-level comparisons, not general
causal independence, benchmark accuracy, release authorization or Triple S+
readiness. The original receipt schema remains declarative; successful CI and
the GitHub provenance checks are separate evidence for the execution.

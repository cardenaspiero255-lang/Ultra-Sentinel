# JARVIS bounded-read progress: second original JVM family

This is a second **historically known** Kotlin family from JARVIS commit
747c14b5d97750a7b2736968e2d516f02448558d, separate from the
ephemeral-note persistence experiment. The pinned original Kotlin source is
core/BoundedImageInputStream.kt (Git blob fd061b9dad636684184ccf2e96f87084d3b99df5).

The GitHub Actions workflow pins Kotlin 2.0.21 by SHA-256 and runs this
script in networkless Bubblewrap with enforced AppArmor. The script
independently checks the original local Git commit, tree cleanliness,
path and source blob. It reuses the existing bounded-read Hunter/Fixer
advisory to **generate** a local candidate from original source and
compiles three variants with an independently written Kotlin/JVM oracle:

- Original RED: a nonempty bulk read returning zero is accepted.
- Candidate GREEN: zero non-progress is rejected; normal positive reads,
  zero-length reads, EOF and byte budgets are preserved.
- Intentionally incorrect VETO: rejects normal positive reads, even
  though it also rejects zero progress.

The shared local-case process classifier inspects all three JVM outcomes.
Then the local Git Judge verifies the candidate blob and disposable
direct-parent commit; exact-tree rollback restores the original.
Failures fail the workflow, and source, jars and credentials are not uploaded.

**Limits:** the case was already known in the historical corpus. Its
syntactic Fixer is bounded to one defect family, not a generalized
semantic repair agent. The transcript classifier does not authenticate
its own input; a trusted runner supplies JVM execution and Git checks.
This proves no Android-device behavior, new family discovery, cross-file
causal chain, production write permission, SSS+ release, or Phase 2 closure.

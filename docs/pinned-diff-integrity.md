# Commit-pinned PR diff integrity

The GameHub read-only collector validates every hunk count and reconstructs the
entire head file from the merge-base source. The source requests use immutable
commit SHAs; blob bytes must match their Git SHA-1 metadata. The PR head, base,
repository identity and changed-file count are read again before returning.
The compare endpoint supplies the merge base for GitHub's three-dot PR diff.
Renames read the old path at the merge base and the new path at the head.

`completeDiff` and `diffContentVerified` mean the supplied changed text files
reconstruct correctly against those authenticated GitHub sources. They are not
CI attestation, proof of causal defects, repair approval or independent GitHub
attestation. The GitHub API remains the provenance authority. File modes and
binary changes are not analyzed by this text collector.

The collector fails closed on missing/unavailable sources, bad encodings,
non-files, invalid hashes, unsupported paths, oversized responses and a patch
which does not reproduce the complete head file. Source files are bounded to
320,000 bytes and a conservative ASCII path policy. Pure renames, mode-only and
binary changes remain unsupported. These cases do not receive a clean result.
The frozen Core misinterprets in-hunk `+++`/`---` rows; they remain quarantined
until its replacement parser is independently validated.

Per-run API request budget is 608: up to two source requests per changed file,
compare, PR reads and pagination; cumulative response limit remains 40 MiB.
Optional Kotlin/Java semantic hydration reuses cached head source. No request
executes code from the PR, follows supplied URLs, writes to GitHub or retries
rate-limit failures. The additional reads trade quota and latency for evidence
integrity; unavailable evidence blocks review.

Tests include Git-generated diffs for newline/CRLF/UTF-8 variants, real divergent
commit ancestry with rename/add/remove operations, truncated text with correct
counts, omitted changes and forged end-of-file markers. These are local
functional tests, not claims of physical device or deployed service validation.

Observed remote-source check: GameHub PR #252 at head
`641c208e9e3b89579d6df7fee72b293ab2a3c610`, merge base
`2248a93deeaf62f6c74547d3f5359ca3ea1fc770`. Both Kotlin patches, retrieved via the
GitHub connector, reconstructed their pinned head source exactly; their head
blob SHA-1 matched the PR-files metadata. Both API patches lacked a final LF.
This checks compatibility with those two authentic source changes. It is not a
live-runtime token/connectivity test of the collector or an Android execution.

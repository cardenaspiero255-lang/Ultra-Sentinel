# C2 — four previously uninspected external PR metadata records

**2026-10-22. Status `METADATA_ONLY_REQUIRE_OWNER_API_ATTESTATION_NO_LABELS`.** This is NOT an independent truth seal, train/test split, unknown-defect corpus or frozen holdout. No labels, source code, patches, PR titles, issue bodies, test oracles or predictions were read during this candidate registration.

The metadata-only manifest is `docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json`; candidates are from **four different original GitHub repositories**, have `createdAt` after cutoff `2026-10-20T19:30:54Z`, and preserve the original GitHub-reported immutable base/head SHA observations. The owner-only `c2-four-external-prospective-metadata.yml` workflow compares all four exact `(repository, PR, createdAt, baseSha, headSha)` tuples directly with GitHub PR API, without reading source or PR text. Any HEAD drift fails closed and requires a new explicit metadata snapshot, never a silent replacement.

In contrast, `tasks/tasks` (the external original worker-control source inspected by [PR #199](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/pull/199)) and `ankidroid/Anki-Android` (whose source had been inspected during discovery) are explicitly excluded **at repository level** from this proposed never-read set. Known GameHub original PRs and public Kotlin SWE-bench are also excluded.

This step establishes **only** that four public external PR identities existed at the recorded source SHA/date when the owner API check completed. It does not establish that they are defects, safe controls, are Kotlin, match any of the 17 frozen Core rules, share no causal family, or have independent original behavior oracles. Their PR contents were **not inspected** to avoid pre-unblinding contamination. The source identity alone cannot justify `GOLD`, `FP`, `TN`, `precision`, `recall` or `F1`.

## Mandatory future admission and freeze sequence

1. Establish Git commit and repository ancestry/immutability for each PR, plus entitlement to examine and redistribute its code. Record immutable full source/diff scope **only after** a separate owner-authenticated candidate-selection and training-exclusion seal, while preventing the candidate Core or developer from consuming patches.
2. Partition by repository, SHA lineage, issue/causal fingerprint and rule family across training and holdout. The four records span four named repositories only; no causal independence has been attested. PRs sharing lineage or previously inspected related code must be quarantined to development.
3. Run independent source-original behavior oracles in isolated environments to establish actual safe/buggy truth, verify flakiness, original correct fix and controls. Exclude any PR whose core rule has no valid scope and any unverified negative.
4. Freeze original truth and the baseline/current detector Git blobs before exposing predictions. Score the same original exact `(ruleId,path,line,sourceBlobSha)` population and **all** unexpected findings for both engines. Require prospective unseen validation and separate genuine untouched holdout. The 120-label quality gate and no-regression false-positive threshold remain unfulfilled.

**No original external defects authenticated by these four metadata-only rows yet.**

`sourceBlobsInspected=0, candidateFindingsRead=0, confirmedNewDefects=0, scoredNegatives=0, newGoldLabels=0, cohortFrozen=false, baselineAuthenticated=false, precision=recall=f1=falsePositiveRate=null, sssPlusCertified=false.`

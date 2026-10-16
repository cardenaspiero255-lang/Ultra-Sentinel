# C2 — immutable 8-PR source input bundle and historic baseline lock

## Observed evidence, preregistration, and scope

Eight exact historic GameHub `base...HEAD` GitHub REST comparisons were read before implementing this workflow: #150/151/152/153/154/155/157/158 returned `ahead`, exact merge base and last head SHA, **21+41+41+26+24+26+39+23 = 241 changed-file entries**, all with a Git SHA and diff hunk, zero removed/renamed and zero missing patches. This is **complete GitHub compare metadata**, not proof of detector full-file execution or of full ground truth.

Frozen packet `f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34`, candidate `547938ed88804e25bbabecf74a3c3d91b74cf1a4` and immutable 8-case identities are defined in `packages/quality-gates/c2-next-holdout.cjs`.

**Objective historical baseline candidate:** `3c97b60717f6a08ddc7d618587202537d62bc951`, the **immediate Git parent** of the frozen candidate. Candidate PR #93 introduced `c2-known-defect-regressions.cjs` and updated semantic rules after earlier C2 evidence; its parent is reproducibly older, selected **before** this cohort's detector results, not chosen to maximize scores. Shared Core blob `db29f94be1e0afb791a241d26f449695df0eafd0`; predecessor semantic blob `b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9`, candidate semantic blob `7df2a994f566ad56bdacab999fa6ba83b69e3b4d`. These properties are checked using Git ancestry and original blob hashes. This is a verifiable **predecessor-of-candidate baseline**, not proof that it was an independently released/production legacy version; claims about a deployed production baseline need deployment evidence that is not presently recorded.

## Owner-only acquisition without candidate/truth access

Workflow `.github/workflows/c2-frozen-source-universe.yml` (issue #50 command `ULTRA_SENTINEL_C2_FROZEN_SOURCE_UNIVERSE_V1`, or owner workflow dispatch) performs:

1. Test repository at `main`, require candidate-parent SHA and both Core/semantic blob identities.
2. Retrieve each fixed GitHub REST compare with only read permissions and a token restricted to that job step.
3. Parse eight full compare JSON responses with `scripts/verify-c2-source-inventory.cjs`. Reject missing/unexpected file entries, unsafe paths, Git blob SHA drift, duplicate paths, no Git patch, wrong merge-base/HEAD, unexpected status, count mismatch.
4. Clone public GameHub Git objects into a disposable temp dir with **no source checkout**. Fetch the exact 16 historic SHAs; compare the changed-path universe from `git diff --name-only -z`. Recover original base and head blobs with `git cat-file`, verifying SHA-1 Git blob identity, SHA-256 bytes and exact GitHub compare blob, with full binary-safe per-file diff. **Never execute a file from GameHub**.
5. Materialize `source-universe.tar`: per PR, original `base/` and `head/` blobs plus `patches/` and a `manifest.json` with all raw/content hashes, canonical source universe SHA256, and exact 241 entries; output archive and `SHA256SUMS` in immutable GitHub Actions artifact.
6. Do not import review Core, baseline, training cases, ground truth or predictions. Prohibit benchmark execution in this workflow; `detectorsExecuted=false`, `scoredLabels=0`, `tripleSPlusCertified=false`.

The output is only a **byte-for-byte source input**. Both model executions must later receive this **same** sealed source artifact, not fetch their own PR heads or silently omit test/non-production files. Explicitly distinguish `inputBytesVerified=241` from `engineFilesScanned=241`, which still must be established separately. Engines that do not understand a file must report it as **unsupported/omitted and BLOCK**, not claim it was analyzed.

The GitHub workflow is triggered on the owner only, fails closed on any missing/inaccessible SHA (including unmerged historical #157), malformed patch or oversized object, publishes **no** assertion of 95% metrics and never merges changes itself.

## Truth remains incomplete

The completed seven-source label seal was independently authenticated at [GitHub Actions #38970396948](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38970396948), archive ID `12076436893`, archive SHA256 `666f9356c8e83f196a0d6a1006dbf1de9ccbb50345832812c0128e590794f077`, truth digest `1a8938be1716ec67162bf6bad4f164da527f734e75499326ab912cae95f56cd7`: 3 positive and 4 bounded negative label identities, **113 real additional labels required** for 120; no score.

Research recommends **up to** 15 genuine source predicates per PR and 60P/60N, but these are quotas for sampling, not evidence. In particular 241 changed-file entries are **not** 241 independent defects or true negatives. A suspected defect without source-original reproduction remains `INCONCLUSIVE`. One mechanism must not be multiplied via input variants or line locations. Synthetic mutation canaries may only validate negative predicate sensitivity. Coverage of #150 in truth is still absent. Source code of known training-regression cohort #205/#206/#208 must not contaminate C2 labels.

The post-truth comparison is a **separate** owner-only workflow requiring: sealed 120+ real labels, baseline/candidate frozen engine artifacts and environment digests, exact `sourceUniverseSha256` and identical positional finding scope, no omitted paths or unadjudicated findings, micro precision/recall/F1 ≥95%, zero critical FNs and no FP regression per PR and rule. Since the frozen Core might skip nonproduction files or emit nonpositional alerts, this may be blocked even if the byte-level bundle is complete; do **not** relax its numerical gate or falsely claim full review coverage. If observed cases cannot yield enough authentic positives, freeze a distinct prospective holdout rather than manufacturing 113 labels. Internal Triple S+ remains `NOT_CERTIFIED`.

References: [GitHub Actions security](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions), [GitHub artifact provenance](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds), [SLSA provenance](https://slsa.dev/spec/v1.0/provenance).

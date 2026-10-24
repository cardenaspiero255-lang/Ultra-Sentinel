# C2 — owner-authenticated first untouched source release

**24 October 2026 — controlled source inspection, never GOLD or a benchmark.**

Selection occurred without opening source, PR titles, PR patches or model predictions. The pinned public original PR is `LawnchairLauncher/lawnchair#7428`, created `2026-10-22T10:19:58Z`, baseline `c13364593e779add560f3413255b2f8fdc50e21a` and PR HEAD `8affcce26ad139ecf9d163028956854ff6dfe799`. One changed file, human author, closed; the source HEAD is currently also available in fork `caizhixing/lawnchair`. All source identifiers are already in the 169-row metadata-only manifest. The eight previously exposed PRs are forbidden for this workflow; they remain quarantined. This selection does **not** assert a bug, fix, license compatibility, causal independence or one of the 17 Core rules.

`docs/quality/C2-OWNER-ONE-PR-SOURCE-RELEASE-20261024.json` expresses a narrowly scoped owner request. On **merging the introducing PR into protected main as GitHub actor ID 322222186**, workflow `.github/workflows/c2-owner-source-release-7428.yml` verifies that this is the **first** introduction of the receipt, confirms the exact actor, repository ID and SHA, performs a read-only GitHub PR metadata recheck **before** fetching a file list, compares against the frozen roster and verifies the eight excluded identities. No PR secrets or execution privileges are passed to upstream. All workflows and checkout actions are SHA-pinned.

Only after this authorization will the trusted job read **changed-file Git paths and blobs** and emit a minimal `release.json`, `scope.json` and `SHA256SUMS` artifact. The independent second runner rechecks actor/commit/run/artifact identity, both immutable base and fork head Git commit objects, PR metadata and the exact file blob from fork HEAD. Neither job sends any source or candidate predictions to the detector. They **do not** execute upstream code.

## Fail-closed rules

- Wrong user ID, repository ID, branch, event type, PR/date/base/head or changed-file scope -> no release.
- Already-exposed original PR, trained/development original repo or altered frozen-manifest tuple -> no release.
- Input JSON with unexpected privileges, injected model predictions, fake certification or extra keys -> no release.
- Repeated later main pushes must not re-run the release; only the introducing merge is eligible.
- The separate attestor must match independent GitHub objects and source scope before the read-release gate is considered verified.
- `newGoldLabels=0`, `trainingIndependenceCertified=false`, `causalIndependenceCertified=false`, `sourceOracleAuthenticated=false`, `ruleCompatibilityAuthenticated=false`, `truthSealed=false`, `sssPlusCertified=false` at every stage.

## Mandatory follow-up before any GOLD

The next **separate, audited adapter** must use **only** the externally verified exact source/commit metadata: recheck license, inspect source lineage against the development/training corpus, identify a legitimately implemented frozen Core rule with exact path/line **without consulting predictions**, and reproduce a real upstream original failure, fixed success and benign control under a networkless sandbox. The independent attestor must reexecute/re-hash JUnit/XML, compare original/fixed/benign output to trusted upstream Git objects, test non-flakiness and causal uniqueness, and seal truth *before* the baseline/current Core is run. If the candidate is not genuinely rule-compatible or cannot be reproduced, publish `INCONCLUSIVE`, quarantine it, then choose another previously untouched candidate through a **new** owner-approved release, never automatically broaden this release.

This PR **implements the prerequisite release gate**, not the actual original/fix/benign oracle. One clean metadata-release artifact cannot be counted as one GOLD label. Existing documented truth remains 9 source-scoped labels, target remains 120, gap 111; SSS+ is NOT_CERTIFIED.

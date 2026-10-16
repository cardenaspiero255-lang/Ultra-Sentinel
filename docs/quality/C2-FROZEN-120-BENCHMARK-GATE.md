# C2 — frozen eight-PR whole-source benchmark precondition (NOT CERTIFIED)

**Purpose.** A local, fail-closed *numerical* comparison gate that refuses to produce a percentage until it receives **120+** separately evidenced, balanced and diverse original-source labels and **both** detector captures on the same eight exact historic GameHub PR source commits. The verdict is never SSS+ certification. **It cannot authenticate the data on its own.**

- Owner-only source freeze: [run 38856860621](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38856860621), frozen engine SHA `547938ed88804e25bbabecf74a3c3d91b74cf1a4`. PRs #150, #151, #152, #153, #154, #155, #157, #158 at the exact base+head SHAs in `packages/quality-gates/c2-next-holdout.cjs`. Do not re-fingerprint mutable PR heads.
- Verified *partial* truth at this stage: 2 positives (#152 and #153), 2 predicate-scoped negatives (#157 and #158), not a whole-PR cleanliness claim. [owner run 38947142683](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38947142683), sealed truth digest `13ff038ec3c91c369ebf8eb38a7c9d3579c2c100b2178199335a372d8fdd0260`; archived artifact #12065927799. **At least 116 additional defensible labels** and multiple families are missing. Counters must not increase without independent reproducible original-source behavior evidence and immutable provenance.
- Existing known regression positives in other previously unblinded PRs (especially #205, #206, #208) are **not** acceptable as fresh blind examples. Neither are the deliberately fault-injected Kotlin counterfactual copies; they only validate the sensitivity of an oracle.
- Per-label identity is exactly `(pr, rule, path, line)` plus the original immutable PR HEAD SHA, Git blob SHA and a **unique** evidence witness SHA-256. Duplicate labels and reused evidence IDs are rejected. An absence of alerts is not proof of negative truth. Do not derive labels from the detector candidate or baseline; seal the complete truth before reading their findings.
- Each engine capture must contain the **same eight frozen PRs in freeze order**, exact base/head SHAs, exact changed-file count with zero omitted/nonpositional findings, no partial source and no unexpected predictions. The old baseline must have a distinct pinned engine SHA; a user-supplied baseline SHA still requires external authentication to GitHub Git blobs. `PINNED_GITHUB_COMPARE` is a **claimed** evidence source, not proof by itself. Hash all source and prediction artifacts in a separate owner-only GitHub workflow.
- Pre-scoring diversity: at least 120 labels, 48 positives, 48 negatives, four PRs, six distinct rules and four distinct paths, enough critical controls and positives in several critical rules, and both classes per rule. Rule-level and per-PR nonregression are assessed by the existing `sssplus-pre-screen.cjs` engine after the new gate validates equality of all source identities and full coverage.

## Offline interface

`node scripts/evaluate-c2-frozen-benchmark.cjs /absolute/path/to/campaign.json`

The input JSON is bounded to 2 MiB, must be a regular single-linked non-symlink file, and is read without network. Root envelope:

```json
{
  "schema": "ultra-sentinel-c2-frozen-benchmark-input/v1",
  "repository": "cardenaspiero255-lang/gamehub-ultra",
  "packetDigest": "f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34",
  "truth": {
    "schema": "ultra-sentinel-c2-frozen-truth/v1",
    "sealedDigest": "<64-hex-character-sha256-of-authenticated-truth>",
    "sourceEngineSha": "547938ed88804e25bbabecf74a3c3d91b74cf1a4",
    "labels": [],
    "trainingExclusionDeclared": true,
    "candidatePredictionsRead": false,
    "baselinePredictionsRead": false
  },
  "candidate": {
    "kind": "CANDIDATE",
    "sourceEngineSha": "547938ed88804e25bbabecf74a3c3d91b74cf1a4",
    "samples": []
  },
  "baseline": {
    "kind": "BASELINE",
    "sourceEngineSha": "<different, verified 40-character git-sha>",
    "samples": []
  }
}
```

Each `truth.labels[]`: `{pr, headSha, rule, path, line, positive, sourceBlobSha, evidenceSha256}`; each capture `samples[]`: `{pr, headSha, baseSha, scope, findings}`. `scope` must have `{changedFiles, analyzedFiles, omittedFiles:0, nonPositionalFindings:0, partial:false, source:"PINNED_GITHUB_COMPARE"}`, with analyzedFiles matching the immutable PR changed-file count. Each `findings[]` is `{rule,path,line}`. All predictions from **both engines** must correspond to a truth identity; unlabelled extra predictions are **blockers to investigate**, never silently ignored or assumed to be false positives.

Do not copy the example placeholders into real evidence. Tests use **synthetic arrays only to validate code behavior**, not to advance corpus counters. Until the 120-label gate passes, `comparisonPerformed=false`, `precision=recall=f1=null`. With 120 structurally valid inputs, output may show `NUMERICAL_DIAGNOSTIC_ONLY` or `NUMERICAL_FAIL_NOT_CERTIFIED`; in both cases `realEvidenceAuthenticated=false`, `sourceCiAuthenticated=false`, `trainingSeparationAuthenticated=false`, `tripleSPlusCertified=false`, `mergeAllowed=false` because caller-provided JSON is unauthenticated.

The CLI deliberately exits code **2 even after a perfect numerical result**, so it cannot be used as a release/merge success gate. A subsequent owner-authenticated GitHub job must independently verify truth/artifacts, full SHA-pinned source acquisition and baseline provenance and then decide whether a **fresh, never-trained-on** final blind holdout is needed. Certification remains `NOT_CERTIFIED`.

## Work required to unblock for real

Collect source-original executable oracles and their per-label hash attestation across previously untouched paths in #150, #151, #154, #155, #157 and #158, as well as uncovered source behaviors in #152 and #153. Pre-register scope and rule predicates, test original safe/failing behavior, validate canary sensitivity for bounded negatives, and freeze each truth receipt before either detector can access it. Require complete authentic diff capture (including patches/full-source if necessary); if the frozen Core cannot analyze a file or emit positional findings, mark coverage **BLOCKED**, do not substitute modified Core. Identify and pin a legitimate historic **baseline** engine first, then capture both engine outputs on the same base...HEAD source universe. Resolve extra alerts through independent technical oracle evidence, not by discarding them. The numerical gate is necessary but never sufficient for SSS+.

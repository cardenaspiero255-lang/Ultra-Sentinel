# Phase 2: prospective blind evaluation — independent adjudication gate

## Frozen observations, not a benchmark

The registered Hunter is the complete Git tree at `2db0d9890d437ea407b61349203c94e3d76f2d5b`.
The external holdout is `android/nowinandroid@2982e63cb691ad49cd009aab43dc206fee6699c2`, with all nine `app/src/main/kotlin` source blobs frozen by `docs/quality/PHASE2-PROSPECTIVE-HUNTER-FREEZE-20261111.json` (Git blob `9679e6063491d9a16a5e2d5679982400d400b917`).

The [successful main run 43107038443](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/43107038443) authenticated the two Git trees, checked nine source blobs, executed the three frozen Hunter workers in no-network Bubblewrap, and sealed **zero unverified findings**. Its prediction digest is `26d5c322ce20a9447cfb4cb168e523676f35b25ad0657e91e47bf7c8fdbb51c5`.

**Zero predictions is not zero false positives, zero defects, or a successful novel-family discovery.** No independent truth or repair was verified. This observation must not be used to tune the frozen Hunter and then rescore the same holdout.

## Required independent work, in order

1. Preserve the original prediction artifact, exact workflow run ID and SHA, Git blob identities and frozen engine commit. Preserve the SHA-256 archive digest independently of the evaluator.
2. Obtain independently designed original Kotlin/JVM behavioral oracles and matched benign controls for *every* selected source/case. Establish a complete finding-level negative universe as well as positives. When a file has no defect, substantiate that conclusion with appropriate coverage and explicit limits; an absence of detected findings is not a negative oracle.
3. Establish the oracle/truth authorship, code provenance and evidence lineage independently of the detector. Cryptographically anchor truth before the evaluator can unblind it. The existing manifest has `truthCommitmentSha256: null`: this prevents claims of prospectively precommitted ground truth for this first run. A retrospective commitment must never be represented as pre-prediction.
4. Authenticate execution of original RED, candidate GREEN, wrong-patch VETO, benign controls and rollback separately for each attempted repair. A compiler success or a JSON `verified: true` is insufficient.
5. Check that each claimed new family was absent from the frozen Hunter's training/rules and from all training and prior test sets. Novelty cannot be inferred from a new filename, repository, line number or renamed rule.
6. Only then compute TP, FP and FN on the *same fully labeled unit of analysis*, report abstentions and coverage, and calculate precision, recall and F1 with denominators. Report repair success only over attempted, independently verified repairs; provide exact counts and confidence intervals. No score should be inferred for unlabeled cases.

## Gate behavior

`packages/quality-gates/phase2-heldout-adjudication-preflight.cjs` checks structural consistency, listed source identities, case entries, truth commitment references and contradictory labels. It **always blocks scoring** until an independent trusted attestation verifier is implemented and original evidence authenticated. The pinned manifest explicitly has no prospective truth commitment; a later caller assertion cannot change that. Self-declared hashes, timestamps and verification flags are not trusted attestations. Its label counts and source-entry completeness, when supplied, are **assertions**, not validated facts; neither the source nor the negative universe is certified complete.

No automatic deployment, protected action, certification, model comparison or Triple S+ claim is authorized by this preflight.

## Next valid experiment

For genuinely prospective scoring, preregister a **new** reserved dataset with its independent truth commitment and external oracles sealed *before* Hunter sees the sources, freeze the full engine and evaluation protocol, and run the same immutable engine once. Keep all raw hypotheses, including abstentions, and use a different future holdout for any post-hoc detector improvements.

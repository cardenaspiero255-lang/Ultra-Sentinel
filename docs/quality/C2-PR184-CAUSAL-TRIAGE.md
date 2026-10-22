# C2 · PR #184 — source-level causal mechanism triage of 12 authentic historical identities

As of 2026-10-22, all six positive source behaviors and six negative scoped controls were reproduced in original Kotlin with sensitivity controls. The full source-behavior proof is the immutable GitHub Actions archive **#12400472561**, workflow **#39719546587**, SHA-256 ZIP **36e2de8c11c0ac580f379b869c2e558975bdfc245d97bf0c067c9d1b431dc861**.

## Causal hypothesis registry (not independent causes)

| Identity | Status | Mechanism and distinct intervention hypothesis |
| --- | --- | --- |
| #152:110 positive | provisional | Premature closing of JSON sources array; repair bounds the parsed bracket while preserving multiple sources |
| #152:41 positive | provisional | Version-monotonic rollback overwrite; repair refuses older versions while preserving newer writes across packages |
| #154:100 positive | provisional, **possibly shared numeric boundary** | BigDecimal discriminant overflows when converted to Double; finite guard preserves ordinary roots |
| #155:12 positive | provisional, **possibly shared numeric boundary** | Nonfinite high-drain policy threshold passes a positive-only check; finite-positive guard preserves normal policy |
| #158:114 positive | provisional | Context update refreshes stale advanced observations; dedicated original-observation timestamp preserves fresh idle evidence |
| #158:144 positive | provisional | A comparison-current qualifier is not classified as requiring fresh data; narrow qualifier recognition repairs the path |

These are six bounded reproducible source defects in **five provisional mechanism *candidate* buckets** because the two nonfinite numeric defects may share one family. The five buckets do **not** increment the historic prior four provisional families, are not externally independent causes, and are not labels eligible for a blind holdout.

## Six original negative boundary controls

- #150:167 spoken STOP intent keeps priority over wake-word barge-in.
- #151:22 session observations use the latest three relevant active samples.
- #151:185 closing a session with a foreign session ID is rejected.
- #151:293 a battery percentage increase does not produce a false drop alert.
- #154:73 the thermal policy rejects configurations with insufficient samples.
- #158:50 local-only queries do not contact a remote research gateway.

All six original negatives passed and purposefully seeded mutants were killed. A killed negative mutant proves local guard sensitivity, **not** a positive defect in the genuine original.

## What remains and why

Independent root-cause adjudication requires **orthogonal, discriminating interventions** on observed root mechanisms, not matching/different files or PRs and not just original-versus-repair for a single case. In particular, the two numeric issues must be cross-compared to determine whether their causes fall within one shared numeric-boundary family. A genuinely independent holdout of new real defects, detector prediction runs, false-positive evaluation and SSS+ authorization/rollback tests also remain necessary.

The source label inventory remains 23 (11 positive and 12 negative); **new GOLD labels = 0, certified independent causes added = 0, blind holdout = false, precision/recall/F1 = null, SSS+ NOT_CERTIFIED.** This report records what is causally hypothesized and what *has not* been accredited. The report itself is not certification.

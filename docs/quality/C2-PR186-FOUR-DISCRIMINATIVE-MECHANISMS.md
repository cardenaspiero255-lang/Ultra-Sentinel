# C2 PR #186 — four discriminative historical Kotlin mechanisms

## Goal

Verify whether each of the four remaining historical source defects has a *bounded*, distinguishable intervention rather than an overbroad patch. The exact historical originals are Git blob-pinned and executed as untouched Kotlin with trusted minimal ABI stubs. The upstream project is never built or executed. Bubblewrap/AppArmor enforce a networkless JVM.

| Scope | Original broken behavior | Narrow repair | Deliberately wrong repair |
| --- | --- | --- | --- |
| JSON #152:110 | A `]` inside source URL truncates `sourceIds` | Find matching bracket outside strings | Scan to the **last** `]` and accidentally include an unrelated `decoy` array |
| Rollback #152:41 | Stale proposal overwrites current rollback | Compare versions **per package** | Compare against **game.alpha** for every package; blocks independent game.beta |
| Thermal #158:114 | Refresh extends stale observation TTL | Retain the timestamp of original advanced signal | Clear all signals on idle, losing still-fresh evidence |
| Query #158:144 | Comparison containing *ahora/today* loses freshness | Qualifier-aware comparison classification | Treat **every** comparison as live, including timeless comparisons |

The three Kotlin variants (original, specifically repaired, and wrong/overbroad repaired) must each compile. An original must fail the historical discriminative expectation; the narrow repair must preserve normal behavior and pass; the wrong repair must fail its *specific* guard. A mere nonzero Java exit code does not count as a killed mutant without its expected exception marker.

The workflow additionally verifies original Git blob and available SHA-256s, requires green regression tests, authenticates the prior #184 historical source classification (GitHub Actions run #39720489097, artifact #12401200189), and archives only hashed source-behavior receipts.

## Evidence limitations

The four source-scoped mechanism hypotheses become better discriminated **if** all CI cases pass, but **no new independent root-cause family is certified**. Cross-family independence requires a published family taxonomy, overlapping-oracle controls and/or tests that distinguish causal mechanisms in detector prediction space, plus genuinely independent labels. Six original positives and six negative controls remain part of the same historic 12; the historical label inventory remains 23. There is no new GOLD label, no blind holdout, no supported precision/recall/F1, and **SSS+ remains NOT_CERTIFIED**. Wrong fixes are intentional counterfactuals and must never be distributed as production patches.

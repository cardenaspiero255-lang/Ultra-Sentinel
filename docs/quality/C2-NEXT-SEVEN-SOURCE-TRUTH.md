# C2 — seven SHA-attested source-scoped truth identities

Original frozen GameHub PR source **no candidate or legacy-baseline predictions were read**, and the frozen model training set was not changed.

- Positives: #151 nonfinite thermal reading; #152 supported-refresh candidate suppression; #153 adaptive-profile rollback divergence. All three rely on deterministic execution of the original Kotlin at fixed historical commits; hardware incidence and whole-PR defect coverage are not asserted.
- Negative predicates: #154 thermal preventive notification cannot bypass the allowance; #155 charging segment prevents reusing prior battery drain; #157 tool mutation requires correct explicit authorization; #158 bounded audit history evicts older records. Each negative is a unique (PR/rule/path/line) predicate exercised on original Kotlin with a counterfactual mutant that fails an independent assertion. **None proves its PR is globally clean.**

The additional #154/#155 source proof was run by the owner in isolated Bubblewrap/AppArmor: [Actions 38969804193](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38969804193), artifact `12076406708`, ZIP SHA256 `84b7e898c1fa1d2f1d5dfee6e8d0feb39de17f3067c2dea761a3a25c15d2a01c`.

The existing five-label original-source truth was sealed on [Actions 38969278857](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38969278857), artifact `12075338764`, ZIP SHA256 `9e754dc490d5c7d1afe3e5b278a8762f0499ba5a20f1de548f57fa1c259a31af`, truth digest `c1806b94f2ddeb026a2d8eb0009398cc5a660445220abfd2dde4f391a7d4a8d0`.

`c2-next-seven-source-truth-seal.yml` verifies the exact source-owner identity and immutable run/HEAD/artifact hash, then executes an offline no-network/no-write Node verifier that rejects forged or extra labels. If the owner run succeeds, the result will be **three positives, four bounded negatives, seven independent source-scoped labels**. At least **113 more** distinct authenticated labels (45 positives and 44 negatives minimally) are still required to reach 120. Prior synthetic mutants are sensitivity controls, never extra real defects.

The 120-label source-population policy additionally requires representative critical positive/negative coverage, diverse rules and paths, complete sample-scoped candidate/legacy findings for every frozen PR and all nonpositional/orphan findings resolved; no global metrics are estimable now. Neither numeric-only tests nor input-supplied claims certify evidence independence or non-regression. `benchmarkScoredLabels=0`, `precision=recall=f1=null`, `fpNonRegressionVerified=false`, `tripleSPlusCertified=false`, `NOT_CERTIFIED`.

Owner trigger after successful main merge: `ULTRA_SENTINEL_C2_NEXT_SEVEN_SOURCE_TRUTH_V1` in issue #50. No external person required; no GitHub write by workflow. Subsequent steps remain frozen-source corpus expansion, independent full-coverage baseline/candidate scoring, then authorization/rollback, private Sentry, operational monitor, final audit, in the user's requested order.

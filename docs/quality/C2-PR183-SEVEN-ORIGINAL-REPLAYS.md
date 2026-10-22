# C2 · PR #183 — seven missing original Kotlin replays, twelve historical identities

**Scope.** Read-only evidence tests against immutable GameHub Ultra source blobs. No detector training or scoring, repo write on GameHub, automatic repair, blind evaluation, or increase to independently certified root causes.

## Authentic original replays

Five parallel isolated JVM jobs reuse the repository's existing owner-run oracles. Each fetches exact Git source blobs from the recorded historical HEAD, asserts git blob SHA and where known SHA-256, compiles only original source + test oracle + an isolated mutant or repaired copy, then runs within Bubblewrap/AppArmor with no network.

| Suite | Historical identities in the original 12 | Expected proof |
| --- | --- | --- |
| json | #152:110 positive | JSON array early closing; original fails, bounded repair passes |
| presentation | #151:22 negative | latest-three active-session samples; original passes and reordered-tail mutant fails |
| battery-local | #155:12 positive; #158:50 negative | nonfinite high-drain threshold repair; local-only gateway mutant |
| thermal-session | #151:293 negative; #154:73 negative | no battery-rise false-drop; thermal minimum sample-count guard |
| comparison | #158:144 positive | freshness qualifier ignored originally; bounded repair passes |

The original presentation owner script also checks an auxiliary #153 historical negative. It **does not** add another entry or independent cause to the 12. Positive #155 nonfinite-threshold is **not** automatically distinct from any earlier numeric/nonfinite family.

The preceding five current-run replays are authenticated from owner GitHub run **39717303301**, artifact **12399373117**, ZIP SHA-256 **36d3f54b3444e4b6e331e504999171ee303c9a59331dd518f56db3f91b53ed8a**. That parent report covers #152:41, #158:114, #154:100 (positive) and #151:185, #150:167 (negative).

## Acceptance and limits

The aggregator requires **12/12** source behaviors with original log SHA-256, repaired/mutant SHA-256, exact original identity tuple, original HEAD SHA and Git blob. All 7 new original / counterfactual witnesses must be confirmed by passing GitHub Actions. Do not declare success if any job fails, is cancelled, or lacks an archive.

The inherited historical corpus remains **23** (11 positive, 12 negative). The positive original behaviors are **not** automatically independent causal families; there are still **zero newly certified independent causes** and four prior provisional families, each still provisional. A negative control is not a positive defect, even when a mutation kills it. Full independent counterfactual family adjudication requires separate discriminating interventions comparing shared hypotheses and non-equivalent mutants. There is no valid blind holdout or precision, recall or F1 estimate. **SSS+ NOT_CERTIFIED**.

Source behavior completeness and independent causal-family adjudication must be reported separately to prevent causal-label inflation.

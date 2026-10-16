# C2 — joint SHA-sealed original-source positives, no benchmark score

**Inputs (independent of candidate/baseline):** source freeze eight-PR run \`38856860621\`, packet digest \`f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34\`.

- PR #153: original \`PerGameAdaptiveRuntime.kt:71\` failed injected crash/replay consistency control. Prior sealed truth: [run 38890454291](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38890454291), artifact \`12041790611\`.
- PR #152: original \`AiProfileBuilder.kt:207\` selects the *global* most common refresh observation before validating supported rates, so 120 Hz x4 unsupported suppresses a supported 60 Hz x3, contrary to the target's supported-candidate selection predicate. Source run [38930244332](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38930244332), artifact \`12057454797\`, pinned JSON SHA256 \`f0c1bd296d028312d16bd128b0fc407bc48e07207256e210467d7e9659bf2c73\`.

## Trust policy

The owner-only \`c2-next-two-source-truth-seal.yml\` authenticates both immutable runs, actor IDs, exact workflow SHA, artifact identity, and pinned source witness bytes. An offline Node verifier validates *all* fields of the earlier one-positive truth and new witness. It rejects altered provenance, unknown fields, fabricated negatives, model leakage, symlinks, hardlinks and invalid JSON.

**Conditional on successful owner-only seal:** two positive findings at exact PR/rule/path/line identity, zero verified negative finding labels, zero benchmark-scored labels. Missing at least 46 genuine positives and 48 genuine negatives under the 120-label gate, across diverse rules, files and PRs. The two source behaviors do **not** imply that the candidate detector found them. Precision, recall, F1, baseline false-positive parity and critical recall remain null/unknown; certification remains \`NOT_CERTIFIED\`.

No second human reviewer required by owner policy. The holdout remains disjoint from known training regressions #205/#206/#208. Do not consult model outputs until the complete oracles and negatives are frozen. Do not merge GameHub PRs, repair code automatically, or assert 95% from these technical witnesses.

Owner trigger: \`ULTRA_SENTINEL_C2_NEXT_TWO_SOURCE_TRUTH_V1\` on [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50), after merge and CI review. The archived result contains only minimized truth and hashes, not model findings or source code.

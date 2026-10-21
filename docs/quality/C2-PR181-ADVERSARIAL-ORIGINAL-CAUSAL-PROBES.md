# PR #181 — adversarial Kotlin root-cause probes (C2)

Date: 2026-10-21. Development-only, train-only original GameHub evidence. This is not a benchmark of Ultra Sentinel and not SSS+ certification.

## Prior source identities

The reconciled source inventory comes from PR #180 owner GitHub Actions run **39545846533**, ZIP artifact **12320788934**, archive SHA-256 **82f8f14e0be684d7755b0ae8d4a6f7eaaea6726d8f7891fb6fe22541d29bd9e0**. It enumerates **12 exact identities** (6 source positives and 6 safe source negatives) from eight earlier authenticated GitHub Actions runs. Each identity is bound by PR, original HEAD, original Git blob, path, rule, line, and polarity.

## New adversarial original-source replays

The new pull-request workflow uses GitHub read-only API to authenticate the previous receipt and fetch six pinned original GameHub Kotlin source files at historic immutable commits. It compares Git blob SHA and byte SHA-256 before compiling anything. It requires AppArmor plus Bubblewrap on a no-network JVM without access to GitHub tokens.

It invokes existing original/mutant Kotlin scripts and adds new separate oracles:

1. **#152:41, positive**: versioned profile rollback under interleaved writes across two package identifiers, testing both monotonic version protection and lack of cross-package interference. Original fails the stale overwrite contract; temporary guarded version must pass.
2. **#158:114, positive**: a fresh but inactive session must retain valid advanced evidence, while an older observation must expire even if context keeps updating. Temporary observation-age repair must pass; a tempting blanket **clear-on-inactive** pseudo-repair must fail the fresh-idle control.
3. **#154:100, positive**: ordinary quadratic root solving must remain correct while a very large valid discriminant must not produce an uncaught numeric exception. A bounded guard repair must pass.
4. **#151:185 and #150:167, negative controls**: original owner-verified guard and spoken stop precedence must pass; removing/swapping guards should be detected by their original Kotlin mutant oracles.

The remaining three positives (#152:110, #155:12, #158:144) and four negatives (#151:22, #151:293, #154:73, #158:50) retain the authenticated **owner receipt only**. PR #181 must not claim to re-execute them. They remain candidates for follow-up causal interventions.

## No causal inflation

The new adjudicator can report **3 bounded behavioral reproductions** only when original/repair/adversarial logs are verified and hashed. It does not upgrade independent cause counts. The two numeric defects (#154 math conversion; #155 battery configuration) must not be treated as independent merely because they are in different files; the same limitation applies across all PRs. Safe negative controls are **not positive root causes**.

The source corpus stays at 23 (11P, 12N), provisional families remain four, no independent causes are added, six controls stay negative, holdout remains not frozen and the benchmark metrics are null. **SSS+ stays NOT_CERTIFIED.**

CI verification, actual errors and archived output govern final claims. Creating this document or its code does not mean the new Kotlin executions passed.

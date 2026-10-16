# C2 — four real original-source scoped truth identities (NOT_CERTIFIED)

This evidence packet is deliberately **not** the 120-label balanced benchmark. Two positives are reproduced original-source defect behaviors; two negatives are distinct bounded source predicates, each validated by observing original Kotlin PASS and a fault-injected **temporary** copy FAIL at the expected guard. Mutated copies are counterfactual controls **not real GameHub defects**, and are never counted as extra positive labels.

Provenance locked before either candidate or baseline findings:
- Frozen eight PR metadata: owner-only [run 38856860621](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38856860621), source-engine SHA \`547938ed88804e25bbabecf74a3c3d91b74cf1a4\`.
- Real positive #152 \`AiProfileBuilder.kt:207\` plus #153 \`PerGameAdaptiveRuntime.kt:71\`: earlier [seal run 38931168454](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38931168454), artifact \`12058802148\`, sealed digest \`c4a573927259fd4c2a66c8b1cf9c58c2a0010bcb23e9412d7026c1a4693a6b65\`.
- Real bounded negative #157 \`UltraFrontierToolGateway.kt:32\`, rule \`MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION\`: original denies unapproved and wrong-tool calls; a temporary copied guard bypass fails the same Kotlin oracle.
- Real bounded negative #158 \`UltraFrontierAuditTrail.kt:60\`, rule \`UNBOUNDED_AUDIT_TRAIL_RETENTION\`: original evicts oldest at capacity 2; temporary copy with \`>\` in place of \`>=\` fails the bounded-capacity oracle.
- Both negatives: [authenticated isolated run 38946358219](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38946358219), artifact \`12066196917\`, archive SHA-256 \`9bda473d6d80e833f4e46e6893e943f551ff299d59cf3e25de0e9a05d2ef3e6a\`.

The owner-only four-case seal workflow verifies exact immutable run identities, owner actor, workflow code SHA, artifact ID, archive digest, frozen PR HEAD/blob/path/rule/line and source control flags; then an offline no-network/no-write Node verifier rejects altered or ambiguous inputs. No external human and no Codex required by the user's current policy.

**If the seal workflow succeeds:** 2 source-attested positive labels, 2 predicate-scoped negative labels, four distinct PRs, and **zero scored benchmark labels** (because no complete full-PR finding population, candidate/baseline parity, or verified critical-rule coverage has yet been acquired). At least 46 additional positives and 46 additional negatives and 116 labels total remain for the minimum 120-label gate, including diversity requirements. Precision/recall/F1 remain \`null\`, false-positive parity unknown, Triple S+ \`NOT_CERTIFIED\`.

Negative truth is **only about the explicitly exercised source predicate and scenarios**, never a claim that the whole PR is clean. No claim of 95% or false-positive improvement can be made. Future work: enumerate all original-source findings across all preregistered PRs, seal candidate-free labels including independent behavior failures and counterfactual-resistant controls across at least six comparable rule families, then capture both model variants on the exact same full frozen source and score every alert. Training on this holdout after unblinding invalidates reuse for blind scoring.

Owner trigger after merge: \`ULTRA_SENTINEL_C2_FOUR_SCOPED_SOURCE_TRUTH_V1\` on [issue #50](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/issues/50).

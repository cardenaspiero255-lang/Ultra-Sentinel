# C2 one-shot bulk campaign — receipt intake without fictitious labels

**Status: INFRASTRUCTURE / NOT_CERTIFIED.** This change does **not** create 111 independent GOLD labels. It gives Ultra Sentinel a bounded, deterministic path for **one batch of up to 512 original-source candidates** and quarantines all oracle claims until independent GitHub provenance, source-lineage, original-vs-fix-vs-benign JUnit evidence and actual Core rule scope are authenticated.

## Why a massive replay cannot automatically produce 111 truth labels

The [nine-label source-scoped seal](C2-NEXT-NINE-SOURCE-TRUTH.md) documents **4 original positives and 5 bounded negatives**, leaving **111 additional distinct, valid** labels to reach the minimum of 120. This is a **quota**, not a batch size or an instruction to generate 111 synthetic defects. Existing [106 Kotlin tasks](C2-KOTLIN-106-BULK-REPRODUCTION-CAMPAIGN.md) were previously reproduced as *development candidates*. Many have no implemented 17-rule Sentinel detector match; their JUnit reports do not authorize new GOLD. The 23 historical developer examples may be causally overlapping and are not a new blind cohort.

### Implemented in this PR

- Metadata-only deterministic planner with a maximum of 512 distinct PR head identities, split across up to 32 reproducible shards. Does **not** retrieve source, patches, issue text, predictions or private tokens.
- Requires post-training cutoff, exact source metadata schema, immutable SHA formatting, rejects reused original Git heads, known-training projects and any modification of the four preregistered prospective SHA tuples.
- Strict offline intake for source-oracle receipt **claims** (original, fixed, benign JUnit digests, exact rule/path/line and causal fingerprint). Rejects duplicates and evidence reuse; extra flags such as `newGoldLabels`, `independentTruthCertified`, `candidateFindings`, and `sourceOracleAuthenticated` fail closed.
- Quarantine output **always** reports zero new GOLD, unchanged previously documented nine, and 111 still missing. This is intentional: a caller-supplied JSON digest is not proof of GitHub ownership, original Kotlin execution or genuine independent causal behavior.
- PR CI runs all `npm run check`, plans the four pre-registered prospective candidates and emits a sanitized JSON artifact with no source. An **owner-only** `workflow_dispatch` from protected `main` separately checks the exact four GitHub PR metadata tuples against the authenticated GitHub API, still without reading source or asserting labels.

### Run the complete registered metadata roster in one invocation

```bash
node scripts/c2-bulk-evidence-intake.cjs plan \
  "$PWD/docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json" \
  > /tmp/c2-plan.json
printf '[]\n' > /tmp/c2-oracle-claims.json
node scripts/c2-bulk-evidence-intake.cjs review \
  /tmp/c2-plan.json /tmp/c2-oracle-claims.json
```

A larger **owner-approved source-free** manifest follows `c2-bulk-source-candidate-manifest/v1` with exactly `cutoff` and `candidates`, each record containing only `repository,pr,baseSha,headSha,createdAt,source,disclosure`. Adding a new external PR does not imply that it is eligible, causally independent, testable or a supported detector rule.

## Mandatory next trusted step (NOT implemented by this PR)

1. Freeze a diverse expanded prospective roster before revealing original source or detector findings. Exclude known training sources by causal lineage, not just Git SHA. Protect it from unblinding.
2. Owner-only **source oracle workers**, isolated with disabled network/token and a bounded read-only source checkout, establish original failure, fixed behavior and independent benign controls. Attach original upstream JUnit and authenticated Git blob IDs for each proposed rule/path/line. Block source that cannot be safely run or reproduced.
3. **Independent attestor** downloads and re-hashes the exact source/oracle receipts from GitHub Actions, authenticates trusted runner, artifact provenance, original Git object SHA, fixed control, causal uniqueness, reproducibility and exact implemented frozen Core rule (17-rule scope). Reject every unscorable or unreproduced case.
4. Seal **truth first** without candidate/baseline access; balance ≥48 positives and negatives, ≥6 rules and ≥4 PR/paths, enforce critical-rule coverage. Only afterward can the separate benchmark compare complete frozen detector and baseline predictions. Never loosen the 241-versus-153-eligible Core coverage contradiction or set `analyzedFiles=241` without proof.
5. New GOLD count may increase **only** in a separately authenticated truth admission artifact. A PR or scheduled check, array of test names, repeated variants, or metadata roster cannot mint labels. If independent genuine evidence is insufficient, return `INCONCLUSIVE` with a numerical deficit; no SSS+ certification or auto-merge.

### Security and limitation

`c2-bulk-evidence-intake.cjs` is offline and read-only, with no cross-repository write, no reviewer privilege, no login key, and no background task. A green workflow certifies only the intake invariants, **not** 111 labels, source/oracle correctness, precision/recall/F1, Core coverage or SSS+. The prospective four from [2026-10-22](C2-FOUR-EXTERNAL-CANDIDATES-PROVENANCE-20261022.md) remain content-uninspected; their source should not be released to the detector by this job.

# C2 next eight-PR holdout: path-overlap risk audit

**Observed 2026-10-16 from GitHub PR changed-file metadata (not model predictions):**

- Frozen holdout: #150, #151, #152, #153, #154, #155, #157, #158. Prior development cases: #73, #132, #159, #161, #163, #172, #205, #206, #208.
- 241 changed-file occurrences across the eight holdout PRs, representing 123 distinct paths.
- **31/123 (25.20%)** of the holdout paths also occur in the development cases.
- **28/28** possible holdout PR pairs share at least one file path.
- #155 and #157 share **26 paths** (all 26 changed files in #155).

**Status: PATH_OVERLAP_REVIEW_REQUIRED, NOT_CERTIFIED.** Path overlap is a potential source of correlated defects and training/evaluation contamination, **not proof of label leakage or identical defects**. Disjoint paths alone would not prove semantic independence either. A hash or signed manifest proves integrity, not label correctness.

Before unblinding candidate predictions: (1) reproduce defects against original pinned HEAD/base SHA with an oracle isolated from Ultra Sentinel; (2) assign stable family IDs and exact rule/path/line evidence; (3) quarantine suspected cross-split variants and ambiguous cases, retaining an audit trail; (4) verify positive and benign negative controls; (5) obtain at least 120 verified labels across the diversity and critical gates in `SSSPLUS-RELEASE-GATES.md`. Do not silently remove unfavorable holdout cases or redefine the frozen population. If effective sample size is insufficient, preregister a fresh untouched cohort.

The metadata-only gate `c2-next-cohort-path-audit.cjs` reports file reuse without claiming a benchmark, independence, a defect, or certification. The workflow is read-only and owner-triggered; its artifact contains public paths only.

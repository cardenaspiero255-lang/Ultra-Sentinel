# C2 original Kotlin JUnit transitions — pre-audit, **not** certified labels

This gate is deliberately **not** a test runner or a source-of-truth oracle. It refuses to count any label from unverified reports.

The 106 original tasks come from `Kotlin/kotlin-swe-bench` at `b9025d86f7ae634901396766bd61f6d4ae6d2165`. To generate real evidence, isolated runners must first execute original `tests/test.sh` on the pinned **base** and **gold-patched** project images independently, with per-project prerequisites, test patch, verified original Git commits, no secrets, and captured fresh JUnit XML. The gold reward alone is not before/after proof. This script then checks the exact original expected f2p and p2p transitions against both JUnit sets and records SHA-256 for the inputs.

Example (run **only** after separately obtaining genuine, isolated, traced before/after JUnit output):

```bash
python3 scripts/c2-upstream-junit-evidence.py \
  --task GradleUp_shadow-1313 \
  --expected upstream/tasks/GradleUp_shadow-1313/tests/expected_tests.json \
  --before evidence/GradleUp_shadow-1313/before-junit \
  --after evidence/GradleUp_shadow-1313/after-junit \
  --source-commit '<verified-original-base-SHA40>' \
  --fixed-commit '<verified-fixed-commit-SHA40>' \
  --output evidence/GradleUp_shadow-1313/transition-review.json
```

**Security/evidence limits:** The supplied commit identifiers are syntax-checked, **not authenticated against GitHub by this script**. JUnit reports can be fabricated unless run-level artifacts/attestations independently authenticate their origin. Source commit ancestry, original test script integrity, flaky reruns, external project licensing, causal source lines, rule applicability, root-cause independence, negatives with independent mutation-sensitive safe behavior, and prospective blind holdout all require distinct evidence and review. The generated receipt always contains **zero** new labels and `tripleSPlusCertified=false` irrespective of how many transitions were observed. Existing 23 historical labels remain untouched; at this point 97 remain to reach 120. A `p2p` control is **not** a new negative label.

Local tests: `python3 -m unittest discover -s tests/unit -p test_c2_upstream_junit_evidence.py` and `npm run check` (via the Node test wrapper). Falsified/missing/duplicate XML, passing-before, failing-after, skipped, overlapping expected categories and symlinks are rejected.

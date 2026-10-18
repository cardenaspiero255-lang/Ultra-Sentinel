# C2 Kotlin 106 original-source bulk reproduction

This is an **owner-triggered GitHub Actions research campaign**, not certification or auto-labeling. Its pinned source is Kotlin/kotlin-swe-bench at commit b9025d86f7ae634901396766bd61f6d4ae6d2165: 106 original tasks from nine explicit projects.

## Launch

In GitHub Actions choose **Ultra Sentinel — C2 Kotlin 106 isolated reproduction campaign** on **main**. Only repository owner ID 322222186 can dispatch it. Choose smoke (two original tasks) or full (all 106). It does not accept bot-created comments and never triggers on a schedule. Full is resource intensive; review GitHub Actions CPU, storage and budget limits first.

The roster preflight rejects missing, duplicate or injected tasks. Shards each contain at most five tasks from one upstream project; at most three run concurrently. Pinned upstream task Docker environments and base images are built on ephemeral GitHub-hosted runners. **Third-party build recipes require network during build**; do not use a production/privileged machine. Runtime containers use no network, dropped capabilities, no new privileges, bounded PIDs, CPU and memory. Workflow permissions are read-only and checkouts do not persist credentials.

For each task with declared f2p tests, BEFORE runs the original regression test patch on base source. AFTER applies the upstream gold patch before running the same tests. Each run captures original JUnit XML and a temporary Git commit SHA claim. The previously merged scripts/c2-upstream-junit-evidence.py validates FAIL→PASS, PASS→PASS, SKIP→PASS and ABSENT→PASS transitions. A gold reward=1 alone is not sufficient. The temporary AFTER commit is **not an original upstream merged commit**.

Missing regressions, dependency outages, OOM, unavailable containers, flaky runs and invalid JUnit evidence are separated as NO_DECLARED_REGRESSION, INFRA_BLOCKED or REPRODUCTION_MISMATCH. Artifacts retain candidate receipts, original stdout, XML and SHA-256 where available. If a task is missing from full campaign artifacts, the aggregate fails rather than claiming completion.

**Not ground truth:** Public SWE-bench tasks and historical PRs remain development examples, not a prospective blind holdout. All transitions require later original-source/ancestor provenance checks, independent cause-root review, detector applicability, license validation, and comparison of fingerprints against the existing corpus. Negative labels require separate mutation-sensitive safe behaviors; p2p tests alone never qualify.

Historical baseline: **23 labels (11 positive/12 negative)**. Quota: **97 remaining** (37 positive, 36 negative, 24 diverse). The aggregator deliberately emits zero new labels, precision=null, recall=null, f1=null and tripleSPlusCertified=false regardless of observed candidate transitions. Sentry runtime events alone cannot establish source truth.

Run tests: python3 -m unittest discover -s tests/unit -p test_c2_bulk_kotlin_campaign.py and npm run check. Docker reproduction must not be claimed until the owner dispatches this merged workflow and actual artifacts are inspected.

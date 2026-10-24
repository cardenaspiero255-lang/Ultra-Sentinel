# C2 Home Assistant Android #7681 — historical frozen path screen and owner read

**Status before main release:** metadata only, no source inspected, no candidate/baseline predictions read, no rule proven, no independent truth, no GOLD.

External frozen identity from the 169-row prospect manifest: `home-assistant/android#7681` created `2026-10-22T20:46:35Z`, base `c0457ffd2353bff63eceafd2a82ca0f505a70e10`, head `dbf2056e4a9cab37c6b766fe22afda687119033e`. User-controlled fork is `dlip9663/android`. The two immutable paths/blobs were recorded *without inspecting PR title or patch*: `app/src/main/kotlin/io/homeassistant/companion/android/frontend/js/FrontendJsBridge.kt` (production, blob `20cf04c4bddd2bf415697f3f9be55bd4545ffad3`), and `app/src/test/kotlin/io/homeassistant/companion/android/frontend/js/FrontendJsBridgeTest.kt` (test, blob `f8bca3e1f174f80d42cc01e6f293270d5314cf03`).

Selection from 159 untouched candidates follows a bounded source-free path heuristic: one scoped Kotlin production file and an existing test. This is NOT evidence that the bug falls under any of the 17 frozen rules; it cannot be counted positive or benign.

Workflow `.github/workflows/c2-path-release-homeassistant7681.yml`:
1. Source-free unit tests and immutable Git/blob/path validation of preregistered changed-file identities, exclusions (eight previous unauthorised disclosures + Lawnchair #7428 + Bitwarden #7499), and frozen historical Core blob `db29f94be1e0afb791a241d26f449695df0eafd0`.
2. Owner-only protected-main introducing merge must belong to GitHub actor ID `322222186`, repository ID `1418338512`, exactly one explicit request, no repeat on later merges.
3. Owner CI checks original PR SHA pointers and paths via read-only public GitHub API; does **not** fetch or execute upstream code. A separate verifier rechecks same-run artifact identity, both original Git commits and their exact two blob pointers. Fork HEAD is checked at `dlip9663/android`, because it is not necessarily present in upstream canonical repository.
4. Only after successful separate attestor may source and PR patch be inspected for independent causal hypothesis. Verify license, exact historical ruleId/path/line, comparable test under networkless source-compiled worker, real original fail and fixed/benign pass; independent validator must rehash JUnit and original Git, certify causal independence before sealing truth. If no exact historical rule, issue `INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE`, quarantine and do not run a fake evaluator.

The checked-in release request is a proposal to allow exact public source inspection only. No permission for code execution, repair, Git writes, model training or scoring. Do not add a new rule to the frozen detector based on the observed source.

Separate SSS+ gates (120 admissible labels with 48+/48- and independent baseline, Ed25519/replay/rollback E2E, Sentry private opt-in, real scheduled monitor jitter and a single-SHA security audit) remain unaccredited; main CI green does not bypass them.

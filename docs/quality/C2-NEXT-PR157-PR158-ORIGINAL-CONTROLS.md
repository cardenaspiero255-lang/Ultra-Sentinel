# C2 new holdout: original-source behavior controls for GameHub #157 and #158

**Pre-registration:** owner-only [Actions #38856860621](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/38856860621), artifact ID `12027755925`, packet digest `f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34`. The engine was frozen before this stage at `547938ed88804e25bbabecf74a3c3d91b74cf1a4`. Neither detector output nor inherited baseline are consulted during these tests.

## Exact original-source evidence

- PR #157, HEAD `cb184c56d28342e46923d149c0e7f27141ce1a24`, original `app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierToolGateway.kt`, Git blob `a4361860bc51d5473766b6fb82f10bdca2b154ce`.
- PR #158, HEAD `9d8572afedc634ac07dae58a0da326ea62bdc1da`, original `app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierAuditTrail.kt`, Git blob `d1af5d8c6574c325fdacadec54748cb730c3aacd`.

The workflow `.github/workflows/c2-next-original-pr157-pr158-oracles.yml` verifies the pre-existing freeze run, repository ID, owner ID, run SHA, the frozen packet and both HEAD/blob pairs **before** compiling. Kotlin tests use the original GitHub file unchanged and minimal ABI stubs for external dependencies; no fake class replaces the tool gateway or audit trail. JVM execution runs in Bubblewrap/AppArmor with no network or GitHub credentials and emits sanitized control outcomes only.

### Objective behavioral controls

For #157, verify read-only tool execution without mutation approval, default denial of both mutating and mixed operations, denial of incorrect/cross-tool confirmation, and correct authorization only for the matching tool ID. For #158, verify fixed-capacity eviction, ignoring empty correlation IDs, truncation of correlation and reason fields, rejection of invalid attempt numbers and clear behavior.

**These are functional controls, not yet classifiable negatives in a detector benchmark.** To establish a label such as `(pr, rule, path, line, positive=false)`, an independently defined rule and semantic error predicate must be specified, the absence of that error must be proven against the original source, and the complete set of candidate and legacy findings must later be scored over the identical files. Counting seven controls as seven TN labels would falsely inflate precision/recall claims and is prohibited.

`negativeFindingLabelsEstablished=0`, `precision=null`, `recall=null`, `f1=null`, `fpNonRegressionVerified=false`, `tripleSPlusCertified=false`.

### Next benchmark stages

Add executable technical oracles to the other six heldout PRs. When enough real positive/negative labels exist, freeze the entire truth population before obtaining detector outputs, then run current detector and old baseline on identical SHA commits and **all** scored locations. If labels, rule breadth, FP comparability, complete coverage or 95% minimum are lacking, report `NOT_CERTIFIED` rather than treating absence of findings as proof of quality.

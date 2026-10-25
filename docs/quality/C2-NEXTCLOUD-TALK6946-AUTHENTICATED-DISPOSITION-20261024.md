# C2 Nextcloud Talk #6946 — post-owner outcome: no historical UNSCOPED_COROUTINE

**Disposition:** `INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE`. Not GOLD. SSS+ `NOT_CERTIFIED`.

## Authenticated pre-read protocol

Ranking V2 [run #40143252243](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40143252243) chose `nextcloud/talk-android#6946`, score 9, on a **filename-only** hint because `NcApiCoroutines.kt` changed; it never ran the detector or opened source. Original manifest SHA base `591f033cd87f44d90c430d7fa477285eb22186e0`, HEAD `043f67d25278f6c55713f02ed8a5455e7f4bdebb`, 16 changed Git blobs. All pinned before code reading.

[Owner-release Actions run #40145173894](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40145173894) on introducing main SHA `69b45805919449bdc9df34980880465108be4e68`: **4/4 SUCCESS** — offline tests, one-time owner merge, owner source read, independent attestor. Attestation artifact `12579999665`, SHA256 `fdba145e3c688ce1514caf512dc4af4157a74f5f20f8802d76864eae96ce64fc`; attestor independently checked owner run identity, both Git commits and HEAD Git tree mapping of all 16 path/blob identities with `truncated=false`. This only authorizes inspecting the specific change, not executing code or claiming ground truth.

## Source and rule inspection after authorization

The 16-file patch adds SIP dial-in, webinar mention permissions, listable scope and corresponding repository and view-model calls. The additions in `NcApiCoroutines.kt` are `suspend fun` Retrofit declarations, **not unscoped execution**. The additions in `ConversationInfoViewModel.kt` launch asynchronous work through `viewModelScope.launch`, which is lifecycle-scoped. A source-only count on the published diff yielded 384 added lines, **zero** added `GlobalScope.launch` or `GlobalScope.async`, **two** added `viewModelScope.launch` calls, zero added `Thread.sleep`/`runBlocking` matches, and zero source-pattern matching literal secrets.

The historical Core is frozen at commit `547938ed88804e25bbabecf74a3c3d91b74cf1a4`, blob `db29f94be1e0afb791a241d26f449695df0eafd0`. Its generic Android `UNSCOPED_COROUTINE` rule needs an executable **added** line matching `GlobalScope.(launch|async)`, with source classification. No such line exists here, so **no exact historical `ruleId/path/line` match**. A method being declared `suspend` or a file being named Coroutines does not satisfy the predicate.

## Original tests and why no triple oracle was executed

The original `ConversationInfoViewModelTest.kt` did exist, blob `5b78047ae7b93d3edd8ccc0ddc70567aa70cc241`; HEAD `05ca78a3c5e6c54ba9bf5bfa80bbc862dabe4fbc`. The original fake repository `bd10c586d56276a24c1c568c11cff80e61643691`, HEAD `342aa8ec87a924e697a1e0758baacb869d74dcd7`. Original ViewModel `5f80aee2d0f8d875b914bfe79a48f93360c60fd6`, HEAD `44f468c6cf3eb7a68a81bfcc8ea2bc44988fb1c8`.

Three new proposed ViewModel tests exercise *new SIP/listable/mention endpoints*, which did **not exist at original base**. Their existence in HEAD cannot demonstrate an original defect matching the historical `UNSCOPED_COROUTINE` rule. No upstream original/fixed/benign tests were executed, no JUnit provenance is claimed, no external source executed, no truth sealed, and neither Ultra Sentinel nor baseline produced predictions.

**Decision:** a triple oracle for this rule would be fabricated or irrelevant; do not run it or mark a true/false positive/negative.

## Consequences for holdout

From 169 original prospectively preregistered PRs, 12 were previously source-exposed (8 initial, Lawnchair #7428, Bitwarden #7499, Home Assistant #7681, Nextcloud Talk #6940) and now Nextcloud Talk **#6946** is released/inspected. Exactly **156 remain source-uninspected**. Historical documented truth remains 9, *no newly validated GOLD*, nominal gap to 120 still 111.

Continue by recalculating a **new source-free 156 roster** against the remaining ranking candidates (a new owner gate for each release). The existing 157-result V2 is a record of an earlier exposure state, not a license to reopen #6946 as a blind candidate. Possible runner/Gradle tests on unrelated features belong to development, not GOLD. All operational certification gates are unchanged.

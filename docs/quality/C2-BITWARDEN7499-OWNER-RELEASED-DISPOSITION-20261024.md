# C2 — Bitwarden #7499, owner-authenticated source released; rule not eligible

**Outcome:** `INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE`, owner authorization and independent metadata/blob attestation SUCCESS, original/fixed/benign oracle NOT RUN, no GOLD.

Protected-main owner run [40127755967](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/40127755967) at main SHA `c4e9fe92604d375b4885073a0df0c33174cd71fc` recorded four successful jobs (precheck, one-shot merge, owner release and independent attestor). Artifact ID `12573284548`, GitHub SHA256 `c2c0e0b29391a13ce8b08e413adb0d825b64b6d364f05933bdf945add802d28d`.

## What is verified and what is not

- Original PR identity is `bitwarden/android#7499`, base `9bdf4d222ed0916415973418052f0bd089507875`, proposed HEAD `6ee1047c7312ce61153184e84840bc372cf38602`, created 2026-10-20T22:29:32Z. It was **still open** at inspection. Do not misreport the proposed fix as accepted/merged upstream.
- The path-only gate found **five Kotlin production files** reachable by the historically frozen `app/src/main/` selector plus three unit-test files. Historical Core blob is `db29f94be1e0afb791a241d26f449695df0eafd0` at `547938ed...`; 17 historical rule IDs, not the current experimental Core.
- Only after owner authorization was PR [#7499](https://github.com/bitwarden/android/pull/7499) inspected. It modifies KeyConnector migration to feed `masterPasswordUnlock.salt` rather than `profile.email` into the SDK derivation pipeline and selects the KDF from `masterPasswordUnlock` rather than the profile-global SDK KDF. Genuine upstream **claim** and exact source changes, not yet an independent original-bug/fix pass.
- Original/fixed immutable blob IDs are attached to `C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json`. No secrets, tokens, full source or original PR patch is placed in the report.
- **No specific active frozen rule requires a correct crypto salt vs email or KDF source.** The general Kotlin production path selector makes the files visible, but does not make a crypto semantic bug a positive for `BLOCKING_ANDROID_CALL`, `UNSCOPED_COROUTINE`, `POTENTIAL_HARDCODED_SECRET`, etc. Modified unit tests contain `runBlocking`, but frozen Core excludes tests; treating them as a production blocking rule would be a false positive.
- The original/fix/benign oracles **were deliberately not executed**: their results would not constitute a comparable example for the fixed historical rule vocabulary. No detector predictions were run or read. Causal independence, source license and accepted upstream fix remain unverified. `newGoldLabels=0` and `truthSealed=false`.

## Permanent disclosure accounting

The 169 original PR metadata-only roster is now partitioned into **eight earlier inspected without source-release**, **one owner-released Lawnchair #7428**, **one owner-released Bitwarden #7499**, and **159 still without inspected source**. The first ten must never be reused as untouched prospective holdout. Earlier nine documented source-scoped labels and 111 missing labels are unchanged.

## Next eligible attempt, do not force it

The exact next implementation should screen *changed-file paths* against the genuine historical production predicate before any owner-release; the path screening gate now exists. Prior to selecting the next item, rule-family eligibility must remain explicitly `UNVERIFIED`; after a new owner-authorized release and source inspection, require a **specific, preregistered original-code rule-path-line obligation**, independence from prior training, an original upstream regression test and a corrected/benign test. Only if all exist should trusted workers use immutable source in an isolated environment and a separate attestor independently verify the receipts. Otherwise stop with `INCONCLUSIVE` and keep an honest zero.

The original selected PR is upstream OPEN and cannot be used to claim stable merged remediation. SSS+ stays NOT_CERTIFIED.

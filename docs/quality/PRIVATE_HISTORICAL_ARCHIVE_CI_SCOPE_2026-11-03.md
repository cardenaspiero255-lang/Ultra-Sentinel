# 2026-11-03 — historical archived witness preflight and Private Edition CI scope

## What actually failed

After PR #268 merged, protected `main@8576f6845fc9d79f36dbf6d16e0b522aff59c396` ran 31 GitHub Actions `push` workflows: 30 concluded `success`, and [run 41692389694](https://github.com/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/41692389694) concluded `failure` in step **Authenticate archived original receipts and original 15 owner witnesses by GitHub API**. The architecture bootstrap and original JARVIS Kotlin/Judge workflows on the same SHA concluded successfully.

The failed historical job is a **non-GOLD source-archive development campaign** for 23 old identities, not the Private Edition real-repair release gate. The job expects several GitHub artifact ZIPs from old immutable runs.

Live authenticated GitHub API reads on 2026-11-03 returned `artifacts.total_count==0` for **all eight** original `STAGES` witness runs pinned in the workflow:

- `39057159822`, `39059101315`, `39067708985`, `39070029033`
- `39071144969`, `39075155081`, `39076132177`, `39077240648`

These original runs themselves remain `completed/success`, with expected GitHub owner identity and workflow paths; **the archives are no longer retrievable**. The exact cause of their disappearance (expiration, deletion or another retention event) was not independently established.

The following additional original `ORIGINS` runs currently have zero returned artifacts:
`38968765586`, `38930244332`, `38969804193`, `38946358219`. The old rollback run `38889693623` has zero artifacts **by design** and was already handled by a separate original-Kotlin replacement witness in the prior script. Other derived run artifacts are still present; they do not recreate missing original ZIP bytes.

## Non-bypass correction

The historical witness workflow is changed from mandatory-on-every-`push` to **explicit `workflow_dispatch` only**, allowed for the authenticated owner and protected `main`. This does **not** mark the failed run green or claim archival truth. Manual execution still fails closed on missing pinned ZIPs, unexpected digests, expired artifacts, SHA drift, or identity mismatches. Two explicit errors now identify missing ORIGINAL versus DERIVED artifacts.

No script, hashes, original manifest, provenance predicate, source code behavior or GitHub permissions for the historical replay were weakened. No `continue-on-error`, `if: always()` release bypass, forged data or auto-merge is introduced. The historical campaign remains accessible and remains blocked until the original bytes are genuinely recovered or the owner separately authorizes clearly labeled, independently re-executed replacement witnesses.

Private Edition functional CI continues to require the mandatory **structure-and-contracts** ruleset check and functional Kotlin/JVM Judge/rollback tests, real authorized GitHub execution, zero confirmed high-impact regression, and validated rollback. **Historical counts of 120 labels are not a release gate**.

This scope change must itself be integrated only via a protected PR with owner GitHub-authenticated exact-SHA authorization and green checks. After integration, independently list `event=push&head_sha=<new SHA>` and verify that no required test was suppressed. All #269/#270/#271 integrations retain separate authorizations and checks.

## Limits

Archive metadata is not equivalent to original ZIP bytes, and a missing historical artifact cannot count as a validated source-witness label. The 13 Private Edition operational controls remain independent; none is certified by this correction. The prior failed run remains a historical failure.

# C2-44 · Second recovery (final owner-controlled metadata-only retry)

Run #40152757391 completed 4/4 workflow jobs, but its output placed all 44 new GitHub PRs into `INCOMPLETE`. This is a **tooling error**, not an empirical result about the PRs. The inline JavaScript filename validator in the metadata worker contained an incorrectly escaped slash inside a regular expression. Its Node execution rejected every candidate (it did not inspect PR source), and the outer shell treated the failures as incomplete records.

This recovery removes the inline JavaScript path validator and uses the separately unit-tested `packages/quality-gates/c2-new-external-file-metadata.cjs` module. Real sanitized public GitHub filename/SHA fixtures and adversarial invalid fields have TDD tests. Candidate metadata still includes *only* `filename,status,sha,additions,deletions,changes`; no title/body/patch/source access is authorized. Invalid fields retain status `INCOMPLETE`, no rule score or GOLD.

**No changes to** the original frozen 44 PR manifest Git blob `a51c679023a792ba4fce54731d13970946a18678`, the 169 original identities, 17 frozen Core rules, scoring criteria or previous disclosure count. This recovery is a separate one-time owner-reviewed protected-main gate triggered by merging THIS document, not by re-opening any PR source.

Do not rely on run #40152453096 (failed) or #40152757391 (44 invalid due to validator). Only a new protected-main owner execution with a nontrivial number of MATCHED identities plus an independent attestor can select potential filename-hint candidates. Even then, a per-PR owner source release + independent original/fix/benign oracle is mandatory for GOLD.

No source has been read and no new GOLD has been created; SSS+ remains NOT_CERTIFIED.

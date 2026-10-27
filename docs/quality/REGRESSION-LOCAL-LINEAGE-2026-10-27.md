# Regression Investigator: local Git lineage

Phase 5 incremental implementation. The existing bisect planner accepted supplied
commit ordering without consulting Git. `planRegressionFromGit` now reuses that
planner after checking actual commit object hashes and each contiguous parent link.
The CLI accepts an optional absolute checkout directory:

```
node scripts/plan-regression-bisect.cjs /absolute/observations.json /absolute/checkout
```

No checkout, project script, test command, network fetch or write is performed.
Git uses bounded time/output, disabled hooks/fsmonitor, no replacements, no lazy
fetch and no allowed network protocols. The existing safe-checkout policy is reused.
Shallow history, grafts, replace refs, partial-clone config, symlink roots, missing
or altered objects, skipped/reordered commits and merges are rejected. Merges need
an explicit experiment; first-parent ordering alone is not causal evidence.

TDD: 10 new cases failed before implementation (missing bridge), then passed.
Two additional cases verify tampered loose-object hash rejection and both CLI
modes. Focused suite: 17 passing. Module line coverage 100%, branch coverage
96.36%; CLI lines 100%. Full pre-integration suite: 1209 passed, no failures/skips.
After integrating #263, the combined suite must run again on its exact tree.

The result only asserts `localGitLineageVerified`. It deliberately retains
`commitsVerifiedExternally=false`, `observationsAuthenticated=false`,
`remoteRepositoryIdentityAuthenticated=false`, `causalityVerified=false`,
`executable=false`, `mergeAllowed=false`, `autoRepairAllowed=false`.

Pending: authenticate repository/CI via trusted remote readers, run the original
RED/GREEN oracle under authorized isolation, then produce a causal report. This
change does not implement supervised executable bisect or grant repair authority.

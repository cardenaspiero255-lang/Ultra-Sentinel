# C2 PR #185 — Causal cross-intervention test for two numeric source defects

Date: 2026-10-22. Status until authenticated CI completes: **PROPOSED / NOT_CERTIFIED**.

## Question and experiment

Are GameHub Ultra #154:100 and #155:12 genuinely two independent root-cause families, or two examples of one abstract **nonfinite numeric boundary** mechanism? Prior PR #184 grouped them provisionally under one family hypothesis. An ordinary original→patched test on each file does not answer this question.

This PR adds an authentic four-cell **2×2 factorial Kotlin JVM experiment** compiling the original GameHub Ultra source implementations *together*, using frozen original git blobs and small scoped ABI shims. Both interventions may independently be enabled:

| Math discriminant repaired? | Battery threshold repaired? | Expected math handling | Expected nonfinite threshold rejection |
| --- | --- | --- | --- |
| No | No | Fails with uncontrolled numeric exception | Incorrectly accepted |
| No | Yes | Still fails | Correctly rejected |
| Yes | No | Correctly handled without an exception | Still incorrectly accepted |
| Yes | Yes | Correctly handled | Correctly rejected |

Every combination also has two legitimate, normal-condition controls: a finite quadratic with known roots and a valid gaming battery recommendation. Kotlin is executed inside Bubblewrap/AppArmor in a no-network environment. Source git blobs, original byte SHA-256, patched source hashes, jar hashes, and output logs are checked. The prior original-source causal hypothesis record is authenticated from PR #184 run **#39720489097** artifact **#12401200189** ZIP SHA-256 **01da653043639bdb02f2aa4d149b7de333874d70996b9d9bba5287ee12e4b5fb**.

## Interpretation rules

If all four outcome cells pass with scoped ordinary controls, the direct effect of **each local repair on its own API** is experimentally separable from the other repair. Such an outcome is evidence of *orthogonal implementation-level interventions*.

It **does not** establish two independently distinct *family-level causes*, because the two patches can both implement a common invariant (rejecting nonfinite numeric values at module-specific input boundaries). To certify distinct families would require explicitly defined family taxonomy, controls over shared conceptual causes, and independent labels/detector sensitivity not supplied by this 2×2 experiment.

Hence the current candidate shared numeric-boundary family remains provisional. No labels are added, existing 23 source labels remain, independent cause count is not incremented, no blind holdout is claimed, precision/recall/F1 stay null, and **SSS+ remains NOT_CERTIFIED**.

This PR is the first discriminating cross-intervention experiment, not closure of independent adjudication across all six positive causes.

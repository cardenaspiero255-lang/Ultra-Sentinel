# Block 2.6 — bounded Kotlin API compatibility v2

The previous corrected frozen replication exercised zero compatible methods.
This candidate extends the existing generic JVM probe before selecting another
source cohort. It does not add target names, expected answers or repair rules.

| Capability | Admission and limit |
| --- | --- |
| Double | Primitive/boxed finite numeric values, fractional samples and negative values; nonfinite results abstain. Integral comparisons and observations remain exact Long values. |
| Ordinary instance methods | Public noarg or up to three integral/Double/String constructor arguments. Explicit constructor signature and seeds accompany witnesses. Every ordinary receiver is reconstructed for every observation. |
| Structured arguments | Primitive numeric arrays and exact List, Collection or Iterable interfaces with a proven numeric wrapper element type. Fresh bounded ordered shapes for every invocation. Raw, wildcard, nested, opaque and concrete collection types abstain. |
| Namespaces | Single or qualified Unicode JVM identifiers; explicit `.` selects only the default package. Class and method identity comes from compiled bytecode, not guessed source headers. Nested non-Comparable classes remain out of scope. |
| Original paths | An opt-in compiler/staging mode retains authenticated canonical Unicode and spaced source paths. Quoted compiler argument files prevent option injection; original bytes are not rewritten. Historical experiments retain their v1 staging contract. |

The existing class/method/finding/ordering budgets remain. Numeric invocation
attempts also have an 80,000-call ceiling. Methods count as exercised only after
at least one complete stable finite triple. Candidate methods, completed triples,
successful calls and exercised Double/instance/structured method counts are
reported separately. Rejected constructors do not create apparent coverage.

The v2 launcher reuses the original fail-closed cgroup guard, networkless
Bubblewrap namespace, cleared environment and read-only executable inputs. It
requires 512 MiB aggregate memory, no swap, 32 tasks and a 45-second deadline.
No source checkout, oracle, predictions or credentials are mounted into Hunter.

Compatibility tests first failed against `847e30e`: five type/receiver/scope
cases. Independent review added RED regressions for ambiguous overloaded
constructor witnesses and inaccessible receivers counted as exercised methods.
Positive, benign and adversarial cases include fractional observations, exact
Long.MAX_VALUE, mutable receiver/array state, erased generics, unsafe scopes and
existing order-law controls. Synthetic Kotlin fixtures test actual Kotlin 2.0.21
signatures in the enforced CI namespace. Synthetic results are development
regressions, never original discoveries.

Local validation: 1,960 passing tests, zero failures, four explicit pre-existing
namespace/Windows environmental skips; 23/23 focused JVM regressions pass.
JaCoCo 0.8.13 reports 290/300 lines (96.67%) and 401/444 branches (90.32%).
The local container cannot provide systemd cgroups or Bubblewrap namespaces;
mandatory real isolation, including the v2 adversarial launcher test, is a CI
gate before original bytecode execution. A second positive-size structured band
`[1,2,3]` also passed RED→GREEN, so an empty-input precondition does not suppress
coverage of nonempty-only collection APIs.

A fresh evaluation must prospectively pin this candidate's commit and detector,
launcher, compiler/staging and guard blobs before selecting sources. It must
precommit an independently prepared oracle, publish prediction hashes before
oracle execution, and retain unadjudicated hypotheses and coverage abstentions.
Previously exposed cohorts, including PRs #401/#402, are excluded. No successful
CI run alone closes Block 2.6, proves a new family or starts Block 2.7.

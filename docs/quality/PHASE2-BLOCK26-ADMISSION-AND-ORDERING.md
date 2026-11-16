# Block 2.6 — effective JVM admission and independent ordering evidence

This successor fixes reproduced execution gaps; it does not rescan exposed
cohorts as unknown or reinterpret the zero-confirmation v4 result.

- Missing constructor parameter classes no longer discard usable static
  methods. Comparable, equality and ordinary receiver admission share a local
  reflection-error boundary; global constructor/invocation budgets still fail
  closed.
- Receiver/twin construction is atomic. Failure of the second constructor no
  longer misaligns later object-law samples.
- Class metadata admits public static named members and legal top-level `$`
  identifiers. Private, non-static, abstract, interface, anonymous and synthetic
  members stay excluded. Default/named Kotlin companions use their enclosing
  public static final field of the exact declared type; no private access or
  fabricated receiver is used. Ordinary construction still ignores unrelated
  fields merely named `INSTANCE`.
- Existing generic scalar probes gain a bounded positive `[1,2,3]` band and
  integral signed `[-1,0,1]` band. Previously admitted positive-only operations
  such as floating logarithms can now complete a stable finite triple. Existing
  extreme, bounded integral and fractional bands remain; all execution budgets
  are unchanged. An intentional turning point remains an unverified hypothesis.
- The existing source/oracle/raw-output envelope can now carry independently
  precommitted `orderingObservations`. Only exact class, constructor, lexical
  seed and sign matches that violate the public Comparable contract can confirm
  a sealed ordering hypothesis. Contradictions fail closed; multiple witnesses
  for one class ordering contract count once per cohort. Both raw observations
  remain in the confirmation. Historical oracles without ordering observations
  retain their exact previous verdicts.

Independent synthetic tests first reproduced constructor metadata loss, pair
misalignment, member/companion omissions, positive-domain abstention and signed
integer gaps. Separate inert evidence tests reproduced the unconditional
unadjudicated ordering path. Reviews also reproduced the Comparable member
admission bypass and an irrelevant `middle` field bypassing contradiction
detection; both are corrected before freezing a successor.

Kotlin 2.0.21 development fixtures verify the actual default/named companion ABI
inside the existing mandatory Bubblewrap/AppArmor/cgroup CI executor. These are
synthetic regressions, never original discoveries. A new original evaluation
requires a new immutable engine SHA, untouched reserved sources and independent
oracles committed before Hunter runs. No new family or Block 2.7 claim follows.

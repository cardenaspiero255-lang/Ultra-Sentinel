#!/usr/bin/env bash
set -euo pipefail
root="$RUNNER_TEMP/c2-next-kotlin-pinned"
build="$RUNNER_TEMP/c2-next-counterfactual-build"
mkdir -p "$build"
chmod 0700 "$build"
# Exact originals and their passed behavioral controls were verified by prior steps.
test "$(git hash-object "$root/157/UltraFrontierToolGateway.kt")" = a4361860bc51d5473766b6fb82f10bdca2b154ce
test "$(git hash-object "$root/158/UltraFrontierAuditTrail.kt")" = d1af5d8c6574c325fdacadec54748cb730c3aacd
python3 - "$root" "$build" <<'PY'
import pathlib,sys
source=pathlib.Path(sys.argv[1])
dest=pathlib.Path(sys.argv[2])
for pr,file,old,new in [
    (157,'UltraFrontierToolGateway.kt',
     'if (requiresConfirmation && !confirmationMatchesTool)',
     'if (false && !confirmationMatchesTool)'),
    (158,'UltraFrontierAuditTrail.kt',
     'while (records.size >= capacity)',
     'while (records.size > capacity)')
]:
    s=(source/str(pr)/file).read_text(encoding='utf-8')
    if s.count(old)!=1:
        raise SystemExit('C2_NEGATIVE_CANARY_SOURCE_DRIFT')
    (dest/file).write_text(s.replace(old,new,1),encoding='utf-8')
PY
echo 'ULTRA_MUTATION_CANARY_TOOL_AUTH_BYPASS'
echo 'ULTRA_MUTATION_CANARY_UNBOUNDED_AUDIT'
kotlinc "$build/UltraFrontierToolGateway.kt" \
  tests/oracles/c2-next-pr157-tool-abi.kt \
  tests/oracles/c2-next-pr157-tool-gateway-controls.kt \
  -include-runtime -d "$build/mutant157.jar"
kotlinc "$build/UltraFrontierAuditTrail.kt" \
  tests/oracles/c2-next-pr158-lane-abi.kt \
  tests/oracles/c2-next-pr158-audit-trail-controls.kt \
  -include-runtime -d "$build/mutant158.jar"
test -s "$build/mutant157.jar" && test -s "$build/mutant158.jar"
chmod 0400 "$build/mutant157.jar" "$build/mutant158.jar"
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
  if [ -L "$mount" ]; then
    target="$(readlink "$mount")"
    [[ "$target" != /* && "$target" != *..* ]] || exit 2
    mounts+=(--symlink "$target" "$mount")
  elif [ -d "$mount" ]; then
    mounts+=(--ro-bind "$mount" "$mount")
  else
    exit 2
  fi
done
for pr in 157 158; do
  set +e
  env -i PATH=/usr/bin:/bin HOME=/tmp \
    /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
    --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    ""${mounts[@]}"" --ro-bind "$jdk" /jdk --ro-bind "$build" /workspace \
    --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/mutant$pr.jar" \
    > "$build/mutant$pr.log" 2>&1
  status=$?
  set -e
  test "$status" -ne 0 || { echo "C2_NEGATIVE_MUTANT_SURVIVED_$pr"; exit 2; }
  if [ "$pr" = 157 ]; then
    grep -F 'C2_NEXT_157_FAILED_MUTATION_WITHOUT_APPROVAL_BLOCKED' "$build/mutant157.log" >/dev/null
  else
    grep -F 'C2_NEXT_158_FAILED_BOUNDED_CAPACITY_EVICTS_OLDEST' "$build/mutant158.log" >/dev/null
  fi
done
# Each bounded semantic predicate is counted once, not per assertion.
# The proof still is not a complete benchmark finding-level closed universe.
cat > "$RUNNER_TEMP/c2-next-counterfactual-negative-proof.json" <<'JSON'
{"schema":"ultra-sentinel-c2-next-scoped-original-negatives/v1",
"sourceRepository":"cardenaspiero255-lang/gamehub-ultra",
"frozenPacketDigest":"f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34",
"cases":[
{"pr":157,"headSha":"cb184c56d28342e46923d149c0e7f27141ce1a24","blobSha":"a4361860bc51d5473766b6fb82f10bdca2b154ce","rule":"MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierToolGateway.kt","line":32,"positive":false,"originalControlPassed":true,"counterfactualFailedAtTarget":true},
{"pr":158,"headSha":"9d8572afedc634ac07dae58a0da326ea62bdc1da","blobSha":"d1af5d8c6574c325fdacadec54748cb730c3aacd","rule":"UNBOUNDED_AUDIT_TRAIL_RETENTION","path":"app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierAuditTrail.kt","line":60,"positive":false,"originalControlPassed":true,"counterfactualFailedAtTarget":true}],
"negativeFindingLabelsProvenUnderControlScope":2,"negativeFindingLabelsEstablished":0,
"candidateInspected":false,"baselineCompared":false,
"precision":null,"recall":null,"f1":null,
"fpNonRegressionVerified":false,"tripleSPlusCertified":false,
"limitation":"Two bounded, mutation-sensitive original-source predicates. No closed prediction universe and no baseline; not scored TN evidence."}
JSON
jq -e '.schema == "ultra-sentinel-c2-next-scoped-original-negatives/v1" and
  (.cases|length)==2 and .cases[0].positive == false and .cases[1].positive == false and
  .negativeFindingLabelsProvenUnderControlScope == 2 and
  .negativeFindingLabelsEstablished == 0 and
  .candidateInspected == false and .baselineCompared == false and
  .precision == null and .recall == null and .f1 == null and
  .fpNonRegressionVerified == false and .tripleSPlusCertified == false' \
  "$RUNNER_TEMP/c2-next-counterfactual-negative-proof.json" >/dev/null

#!/usr/bin/env bash
# Called only after frozen source + owner truth artifact and all production callsite checks.
set -euo pipefail
root="${1:?Usage: script /absolute/source-root}"
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
original="$root/UltraFrontierWorldState.kt"
battery="$root/BatteryAwareGamingEngine.kt"
test -f "$original" && test ! -L "$original"
test -f "$battery" && test ! -L "$battery"
test "$(git hash-object "$original")" = 0d18a43a8e36ea3edacc2cad72071d96aa31626e
test "$(git hash-object "$battery")" = 8696360219231f3f1477d5ad21c93bca2197e281
test "$(sha256sum "$original" | cut -d' ' -f1)" = 99a229e357823d65d7b04b642c9cf1ba312a35d0308da635ee38c425c8576591
python3 "$repo/scripts/c2-pr158-advanced-ttl-counterfactual.py" "$original" "$root/counterfactual.kt"
test "$(git hash-object "$root/counterfactual.kt")" != 0d18a43a8e36ea3edacc2cad72071d96aa31626e
for version in original counterfactual; do
  if [ "$version" = original ]; then input="$original"; else input="$root/counterfactual.kt"; fi
  kotlinc "$input" "$battery" \
    "$repo/tests/oracles/c2-pr158-domain-abi.kt" \
    "$repo/tests/oracles/c2-pr158-ai-abi.kt" \
    "$repo/tests/oracles/c2-pr158-advanced-ttl-oracle.kt" \
    -include-runtime -d "$root/$version.jar" \
    > "$root/compile-$version.log" 2>&1
  test -s "$root/$version.jar"
done
run_jar() {
  local filename="$1"
  if [ "${C2_OWNER_SANDBOX:-0}" = 1 ]; then
    test "${GITHUB_ACTIONS:-}" = true
    test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
    command -v bwrap >/dev/null
    local jdk
    jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
    local mounts=(--ro-bind /usr /usr)
    for mount in /bin /lib /lib64; do
      if [ -L "$mount" ]; then mounts+=(--symlink "$(readlink "$mount")" "$mount");
      else mounts+=(--ro-bind "$mount" "$mount"); fi
    done
    env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent --unshare-all \
      --new-session --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
      "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
      --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
      -- /jdk/bin/java -jar "/workspace/$filename.jar"
  else
    test "${GITHUB_ACTIONS:-}" != true
    java -jar "$root/$filename.jar"
  fi
}
set +e
run_jar original > "$root/original.log" 2>&1
original_exit=$?
set -e
test "$original_exit" -ne 0
grep -q '^C2_PR158_FRESH_CONTROL_PASS$' "$root/original.log"
grep -q 'IllegalStateException: C2_PR158_ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION' "$root/original.log"
run_jar counterfactual > "$root/counterfactual.log" 2>&1
grep -q '^C2_PR158_FRESH_CONTROL_PASS$' "$root/counterfactual.log"
grep -q '^C2_PR158_EXPIRED_ADVANCED_TTL_PASS$' "$root/counterfactual.log"
grep -q '^C2_PR158_CROSS_GAME_CONTROL_PASS$' "$root/counterfactual.log"
python3 - "$root" "$repo" <<'PY'
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]);repo=Path(sys.argv[2]);hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
witness={
 'schema':'ultra-sentinel-c2-pr158-advanced-ttl-witness/v1',
 'pr':158,
 'headSha':'9d8572afedc634ac07dae58a0da326ea62bdc1da',
 'blobSha':'0d18a43a8e36ea3edacc2cad72071d96aa31626e',
 'sourceSha256':hashfile(root/'UltraFrontierWorldState.kt'),
 'oracleSha256':hashfile(repo/'tests/oracles/c2-pr158-advanced-ttl-oracle.kt'),
 'originalLogSha256':hashfile(root/'original.log'),
 'counterfactualLogSha256':hashfile(root/'counterfactual.log'),
 'positiveControlPassed':True,'originalDefectReproduced':True,'counterfactualPassed':True,
 'productionCallsitesAttested':True,'planningConsumerAttested':True,
 'candidateRead':False,'baselineRead':False
}
(root/'witness.json').write_text(json.dumps(witness,sort_keys=True)+'\n')
print('PASS: original frozen PR158 source fails TTL and counterfactual passes; no model evaluated')
PY

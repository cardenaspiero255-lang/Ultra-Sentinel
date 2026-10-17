#!/usr/bin/env bash
# Owner-only original Kotlin regression: original must fail, independent fixed copy must pass.
set -euo pipefail
root="$1"
[[ "$root" = /* && -d "$root" && ! -L "$root" ]]
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
test "$C2_OWNER_SANDBOX" = 1
test "$GITHUB_ACTIONS" = true
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null
command -v kotlinc >/dev/null
test -f "$root/158.kt" && test ! -L "$root/158.kt"
test "$(git hash-object "$root/158.kt")" = 0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f

python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
original=(r/'158.kt').read_text(encoding='utf-8')
bad='requiresFreshData = currentDataPattern.containsMatchIn(clean),'
fixed='requiresFreshData = currentDataPattern.containsMatchIn(clean) ||\n                        currentQualifierPattern.containsMatchIn(clean),'
assert original.count(bad)==1,'C2_RUN22_ORIGINAL_ROUTER_ANCHOR_DRIFT'
(r/'158-counterfactual.kt').write_text(original.replace(bad,fixed,1),encoding='utf-8')
PY
test "$(git hash-object "$root/158-counterfactual.kt")" != 0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f
for phase in original counterfactual; do
  source="$root/158.kt"
  if [ "$phase" = counterfactual ]; then source="$root/158-counterfactual.kt"; fi
  kotlinc "$source" \
    "$repo/tests/oracles/c2-run22-parser-abi.kt" \
    "$repo/tests/oracles/c2-run22-current-comparison-oracle.kt" \
    -include-runtime -d "$root/158-$phase.jar" \
    > "$root/158-$phase.compile.log" 2>&1
done

run_jar() {
  local name="$1"
  local jdk
  jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
  local mounts=(--ro-bind /usr /usr)
  for mount in /bin /lib /lib64; do
    if [[ -L "$mount" ]]; then
      local target
      target="$(readlink "$mount")"
      [[ "$target" != /* && "$target" != *..* ]] || return 2
      mounts+=(--symlink "$target" "$mount")
    elif [[ -d "$mount" ]]; then
      mounts+=(--ro-bind "$mount" "$mount")
    else return 2; fi
  done
  env -i PATH=/usr/bin:/bin HOME=/tmp bwrap \
    --die-with-parent --unshare-all --new-session \
    --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    "${mounts[@]}" --ro-bind "$jdk" /jdk \
    --ro-bind "$root" /workspace --proc /proc --dev /dev \
    --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/$name.jar"
}
set +e
run_jar 158-original > "$root/158-original.log" 2>&1
code=$?
set -e
test "$code" -ne 0
grep -qx 'C2_CURRENT_COMPARISON_STABLE_CONTROL_PASS' "$root/158-original.log"
grep -q 'C2_CURRENT_COMPARISON_QUALIFIER_LOST' "$root/158-original.log"
run_jar 158-counterfactual > "$root/158-counterfactual.log" 2>&1
grep -qx 'C2_CURRENT_COMPARISON_STABLE_CONTROL_PASS' "$root/158-counterfactual.log"
grep -qx 'C2_CURRENT_COMPARISON_QUALIFIER_VERIFIED_PASS' "$root/158-counterfactual.log"
python3 - "$root" "$repo" <<'PY'
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]);repo=Path(sys.argv[2])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
w={'schema':'ultra-sentinel-c2-run22-original-positive-witness/v1',
   'pr':158,'headSha':'9d8572afedc634ac07dae58a0da326ea62bdc1da',
   'blobSha':'0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f',
   'sourceSha256':sha(root/'158.kt'),
   'oracleSha256':sha(repo/'tests/oracles/c2-run22-current-comparison-oracle.kt'),
   'originalLogSha256':sha(root/'158-original.log'),
   'counterfactualLogSha256':sha(root/'158-counterfactual.log'),
   'normalControlPassed':True,
   'originalDefectReproduced':True,
   'correctedBehaviorPassed':True,
   'originalCallerPinned':True,
   'candidateRead':False,'baselineRead':False}
(root/'158-witness.json').write_text(json.dumps(w,sort_keys=True)+'\n')
print('C2_RUN22_REAL_HISTORICAL_COMPARISON_FRESHNESS_DEFECT_PASS')
PY

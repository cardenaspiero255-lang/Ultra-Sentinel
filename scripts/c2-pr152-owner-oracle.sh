#!/usr/bin/env bash
# Caller must authenticate source HEAD, Git blob and prior owner seal before execution.
set -euo pipefail
root="${1:?Usage: c2-pr152-owner-oracle.sh /absolute/root}"
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
source_file="$root/UltraResearchJsonCodec.kt"
test -f "$source_file" && test ! -L "$source_file"
test "$(git hash-object "$source_file")" = 886c104effd553cd60f8222bfb05b8505fe7c4b8
test "$(sha256sum "$source_file" | cut -d' ' -f1)" = 642d4f0a991bdcbe78c1be408fe49de9b04b72255f345fa59a8f7054cd72b4d2
python3 "$repo/scripts/c2-pr152-json-counterfactual.py" "$source_file" "$root/counterfactual.kt"
test "$(git hash-object "$root/counterfactual.kt")" != 886c104effd553cd60f8222bfb05b8505fe7c4b8
for version in original counterfactual; do
  if [ "$version" = original ]; then input="$source_file"; else input="$root/counterfactual.kt"; fi
  kotlinc "$input" "$repo/tests/oracles/c2-pr152-json-abi.kt" \
    "$repo/tests/oracles/c2-pr152-json-oracle.kt" -include-runtime -d "$root/$version.jar" \
    > "$root/compile-$version.log" 2>&1
  test -s "$root/$version.jar"
done
run_jar() {
  local filename="$1"
  if [ "${C2_OWNER_SANDBOX:-0}" = 1 ]; then
    test "${GITHUB_ACTIONS:-}" = true
    command -v bwrap >/dev/null
    test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
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
    test "${GITHUB_ACTIONS:-}" != true # No silent unsandboxed CI fallback
    java -jar "$root/$filename.jar"
  fi
}
set +e
run_jar original > "$root/original.log" 2>&1
original_exit=$?
set -e
test "$original_exit" -ne 0
grep -q '^C2_ORIGINAL_CONTROL_PASS$' "$root/original.log"
grep -q 'IllegalStateException: C2_PR152_ORIGINAL_SOURCE_ARRAY_TRUNCATION' "$root/original.log"
run_jar counterfactual > "$root/counterfactual.log" 2>&1
grep -q '^C2_ORIGINAL_CONTROL_PASS$' "$root/counterfactual.log"
grep -q '^C2_PR152_CONTRACT_PASS$' "$root/counterfactual.log"
python3 - "$root" "$repo" <<'PY'
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]);repo=Path(sys.argv[2]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
obj={
 'schema':'ultra-sentinel-c2-pr152-original-json-witness/v1',
 'pr':152,
 'headSha':'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
 'blobSha':'886c104effd553cd60f8222bfb05b8505fe7c4b8',
 'sourceSha256':sha(root/'UltraResearchJsonCodec.kt'),
 'oracleSha256':sha(repo/'tests/oracles/c2-pr152-json-oracle.kt'),
 'originalFailure':True,'positiveControlPassed':True,'counterfactualPassed':True,
 'originalLogSha256':sha(root/'original.log'),
 'counterfactualLogSha256':sha(root/'counterfactual.log'),
 'candidateRead':False,'baselineRead':False
}
(root/'witness.json').write_text(json.dumps(obj,sort_keys=True)+'\n')
print('PASS: exact original source reproduced PR152 source-array bug, counterfactual passed')
PY

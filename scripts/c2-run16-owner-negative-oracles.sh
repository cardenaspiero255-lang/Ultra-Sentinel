#!/usr/bin/env bash
# Required inputs: two original immutable HEAD blobs with owner verified Github checksums.
set -euo pipefail
root="${1:?Need root path}"
root="$(realpath "$root")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/151.kt" && test ! -L "$root/151.kt"
test -f "$root/153.kt" && test ! -L "$root/153.kt"
test "$(git hash-object "$root/151.kt")" = f623999ecd31f6961bc48f34d834674494b7d1db
test "$(git hash-object "$root/153.kt")" = 18911c26a9afaf051fda0e9ea14cdaccf943a47b
test "$(sha256sum "$root/151.kt" | cut -d' ' -f1)" = 635d678a15f914e2fc3fb84a05839cf2eef8187c4221a5c8f3e4c3128157ea7e
test "$(sha256sum "$root/153.kt" | cut -d' ' -f1)" = 8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15
python3 - "$root" <<'PY'
import sys
from pathlib import Path
r=Path(sys.argv[1])
s=(r/'151.kt').read_text(encoding='utf8')
a='observations.takeLast(3)'
assert s.count(a)==1,'C2_PR151_SOURCE_DRIFT'
(r/'151-mutant.kt').write_text(s.replace(a,'observations.take(3)',1),encoding='utf8')
s=(r/'153.kt').read_text(encoding='utf8')
a='''        delegate.saveAdaptiveProfileForGame(packageName, profile)
    }'''
assert s.count(a)==1,'C2_PR153_SOURCE_DRIFT'
b='''        delegate.saveAdaptiveProfileForGame(packageName, profile)
        onExplicitGameProfileSelection(packageName, profile)
    }'''
(r/'153-mutant.kt').write_text(s.replace(a,b,1),encoding='utf8')
PY
test "$(git hash-object "$root/151-mutant.kt")" != f623999ecd31f6961bc48f34d834674494b7d1db
test "$(git hash-object "$root/153-mutant.kt")" != 18911c26a9afaf051fda0e9ea14cdaccf943a47b
for pr in 151 153; do
  if [ "$pr" = 151 ]; then
    stub_paths=(
      "$repo/tests/oracles/c2-run16-presentation-domain-abi.kt"
      "$repo/tests/oracles/c2-run16-presentation-oracle.kt"
    )
  else
    stub_paths=(
      "$repo/tests/oracles/c2-run16-ownership-domain-abi.kt"
      "$repo/tests/oracles/c2-run16-ownership-data-abi.kt"
      "$repo/tests/oracles/c2-run16-ownership-flow-abi.kt"
      "$repo/tests/oracles/c2-run16-ownership-oracle.kt"
    )
  fi
  for kind in original mutant; do
    if [ "$kind" = original ]; then source="$root/$pr.kt"
    else source="$root/$pr-mutant.kt"; fi
    kotlinc "$source" "${stub_paths[@]}" -include-runtime -d "$root/$pr-$kind.jar" \
      > "$root/$pr-$kind.compile.log" 2>&1
    test -s "$root/$pr-$kind.jar"
  done
done
run_jar(){
  local filename="$1"
  test "${GITHUB_ACTIONS:-}" = true
  test "${C2_OWNER_SANDBOX:-0}" = 1
  test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
  command -v bwrap >/dev/null
  local jdk
  jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
  local mounts=(--ro-bind /usr /usr)
  for mount in /bin /lib /lib64; do
    if [ -L "$mount" ]; then
      local target
      target="$(readlink "$mount")"
      [[ "$target" != /* && "$target" != *..* ]] || return 2
      mounts+=(--symlink "$target" "$mount")
    elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
    else return 2; fi
  done
  env -i PATH=/usr/bin:/bin HOME=/tmp bwrap --die-with-parent --unshare-all --new-session \
    --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
    --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
    -- /jdk/bin/java -jar "/workspace/$filename.jar"
}
for pr in 151 153; do
  run_jar "$pr-original" > "$root/$pr-original.log" 2>&1
  if [ "$pr" = 151 ]; then
    grep -q '^C2_PR151_ACTIVE_TAIL_PASS$' "$root/$pr-original.log"
    grep -q '^C2_PR151_IDLE_ISOLATION_PASS$' "$root/$pr-original.log"
  else
    grep -q '^C2_PR153_EXPLICIT_CONTROL_PASS$' "$root/$pr-original.log"
    grep -q '^C2_PR153_ADAPTIVE_CALLBACK_ISOLATION_PASS$' "$root/$pr-original.log"
  fi
  set +e
  run_jar "$pr-mutant" > "$root/$pr-mutant.log" 2>&1
  result=$?
  set -e
  test "$result" -ne 0
  if [ "$pr" = 151 ]; then
    grep -q 'IllegalStateException: C2_PR151_ACTIVE_OBSERVATION_TAIL_BOUNDS' "$root/$pr-mutant.log"
  else
    grep -q 'IllegalStateException: C2_PR153_ADAPTIVE_WRITE_LEAKS_EXPLICIT_CALLBACK' "$root/$pr-mutant.log"
  fi
done
python3 - "$root" "$repo" <<'PY'
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]);repo=Path(sys.argv[2]);sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
meta={
 151:{
  'headSha':'9ad983576c16c6c34d59283979d83c69ede50dce',
  'blobSha':'f623999ecd31f6961bc48f34d834674494b7d1db',
  'oracle':'c2-run16-presentation-oracle.kt'
 },
 153:{
  'headSha':'6508cc124076b9dea437ea1efc213d3ce55d7baf',
  'blobSha':'18911c26a9afaf051fda0e9ea14cdaccf943a47b',
  'oracle':'c2-run16-ownership-oracle.kt'
 }}
for pr,item in meta.items():
 witness={
  'schema':'ultra-sentinel-c2-run16-negative-witness/v1',
  'pr':pr,'headSha':item['headSha'],'blobSha':item['blobSha'],
  'sourceSha256':sha(root/f'{pr}.kt'),
  'oracleSha256':sha(repo/'tests/oracles'/item['oracle']),
  'originalLogSha256':sha(root/f'{pr}-original.log'),
  'mutantLogSha256':sha(root/f'{pr}-mutant.log'),
  'originalPassed':True,'controlsPassed':True,'mutantKilled':True,
  'productionCallsitesAttested':True,
  'candidateInspected':False,'baselineInspected':False
 }
 (root/f'{pr}-witness.json').write_text(json.dumps(witness,sort_keys=True)+'\n',encoding='utf8')
 print('PASS original and sensitivity canary:',pr)
PY

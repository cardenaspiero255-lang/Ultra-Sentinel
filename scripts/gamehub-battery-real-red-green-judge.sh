#!/usr/bin/env bash
# RED on actual GameHub source baseline; GREEN/Judge against immutable candidate SHA.
# JVM code executes offline in Bubblewrap; neither checkout is modified.
set -euo pipefail
base="$1"
candidate="$2"
out="$RUNNER_TEMP/gamehub-battery-domain-proof"
file="app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt"
orig=fa720b6f367f06c5b0998f3e50de118accaefaae
fixed=4314e107593b8aff1521ce27276f918a66599a6f
orig_blob=8696360219231f3f1477d5ad21c93bca2197e281
fixed_blob=976e3aa53ec94d14317e8caa1e6bf71088553650
test "$(git -C "$base" rev-parse HEAD)" = "$orig"
test "$(git -C "$candidate" rev-parse HEAD)" = "$fixed"
test "$(git -C "$base" hash-object "$file")" = "$orig_blob"
test "$(git -C "$candidate" hash-object "$file")" = "$fixed_blob"
test -f "$base/$file" && test ! -L "$base/$file"
test -f "$candidate/$file" && test ! -L "$candidate/$file"
umask 077
mkdir -p "$out"
chmod 0700 "$out"
kotlinc "$base/$file" tests/oracles/gamehub-battery-domain-abi.kt \
  tests/oracles/gamehub-battery-acceptance.kt -include-runtime -d "$out/red.jar"
kotlinc "$candidate/$file" tests/oracles/gamehub-battery-domain-abi.kt \
  tests/oracles/gamehub-battery-acceptance.kt -include-runtime -d "$out/green.jar"
kotlinc "$candidate/$file" tests/oracles/gamehub-battery-domain-abi.kt \
  tests/oracles/gamehub-battery-independent-judge.kt -include-runtime -d "$out/judge.jar"
chmod 0400 "$out"/*.jar
test -x /usr/bin/bwrap
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
test -x "$jdk/bin/java"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
  if [ -L "$mount" ]; then
    dest="$(readlink "$mount")"
    [[ "$dest" != /* && "$dest" != *..* ]] || exit 2
    mounts+=(--symlink "$dest" "$mount")
  elif [ -d "$mount" ]; then
    mounts+=(--ro-bind "$mount" "$mount")
  else exit 2; fi
done
run() {
  local kind="$1"
  env -i PATH=/usr/bin:/bin HOME=/tmp \
    /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
      --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
      "${mounts[@]}" --ro-bind "$jdk" /jdk \
      --ro-bind "$out" /workspace --proc /proc --dev /dev \
      --tmpfs /tmp --dir /home --chdir /workspace \
      -- /jdk/bin/java -jar "/workspace/$kind.jar" > "$out/$kind.log" 2>&1
}
set +e
run red
rc=$?
set -e
test "$rc" -eq 1 || { echo GAMEHUB_BATTERY_RED_NOT_REPRODUCED; exit 2; }
if ! grep -F 'GAMEHUB_BATTERY_RED_INVALID_PERCENTAGE_ACCEPTED' "$out/red.log" >/dev/null; then
  echo GAMEHUB_BATTERY_RED_WRONG_CAUSE
  sed -n '1,24p' "$out/red.log" >&2
  exit 2
fi
run green
grep -Fx 'GAMEHUB_BATTERY_ACCEPTANCE_GREEN' "$out/green.log" >/dev/null ||
  { echo GAMEHUB_BATTERY_GREEN_FAILED; exit 2; }
run judge
grep -Fx 'GAMEHUB_BATTERY_INDEPENDENT_JUDGE_APPROVED' "$out/judge.log" >/dev/null ||
  { echo GAMEHUB_BATTERY_JUDGE_FAILED; exit 2; }
python3 - "$out" "$orig" "$fixed" "$orig_blob" "$fixed_blob" <<'PY'
import json,pathlib,sys,hashlib
root=pathlib.Path(sys.argv[1])
def digest(name):return hashlib.sha256((root/name).read_bytes()).hexdigest()
data={
 "schema":"ultra-sentinel-registered-battery-real-kotlin/v1",
 "originalCommit":sys.argv[2],"candidateCommit":sys.argv[3],
 "originalBlob":sys.argv[4],"candidateBlob":sys.argv[5],
 "redOriginalFailedAtExactPredicate":True,
 "greenPatchedPassed":True,"independentJudgePassed":True,
 "redLogSha256":digest("red.log"),
 "greenLogSha256":digest("green.log"),
 "judgeLogSha256":digest("judge.log"),
 "bubblewrapOffline":True,"remoteWrites":False,
 "productionCertified":False
}
(root/"receipt.json").write_text(json.dumps(data,sort_keys=True)+"\n")
PY
echo GAMEHUB_BATTERY_REAL_RED_GREEN_JUDGE_PASS_NO_REMOTE_WRITES

#!/usr/bin/env bash
# Read-only isolated experiment using unchanged frozen GameHub #151 original Kotlin.
# This is NOT the owner-authorized repair runner and never modifies GameHub.
set -euo pipefail
source_root="${1:?pinned GameHub source root}"
root="${RUNNER_TEMP:?runner temp}/gamehub-pr151-real-proof"
src="$source_root/app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt"
expected_head=9ad983576c16c6c34d59283979d83c69ede50dce
expected_blob=adb11032b9b7f62f865228dfa1c27258ca3fa0df
test "$(git -C "$source_root" rev-parse HEAD)" = "$expected_head"
test -f "$src" && test ! -L "$src"
test "$(git -C "$source_root" hash-object "$src")" = "$expected_blob"
umask 077
mkdir -p "$root"
chmod 0700 "$root"
cp -- "$src" "$root/original.kt"
test "$(git hash-object "$root/original.kt")" = "$expected_blob"
python3 - "$root" <<'PY'
import pathlib,sys
root=pathlib.Path(sys.argv[1])
original=(root/"original.kt").read_text(encoding="utf-8")
replacements=[
 ("!it.isNaN() && it >= HIGH_THERMAL_HEADROOM","it.isFinite() && it >= HIGH_THERMAL_HEADROOM"),
 ("!sample.thermalHeadroom.isNaN()","sample.thermalHeadroom.isFinite()"),
 ("!current.thermalHeadroom.isNaN()","current.thermalHeadroom.isFinite()"),
]
fixed=original
for old,new in replacements:
 if fixed.count(old)!=1:raise SystemExit("GAMEHUB_PR151_SOURCE_DRIFT")
 fixed=fixed.replace(old,new,1)
if fixed==original:raise SystemExit("GAMEHUB_PR151_NO_REPAIR")
(root/"corrected.kt").write_text(fixed,encoding="utf-8")
assert (root/"corrected.kt").read_text(encoding="utf-8")==fixed
# Judge's source-lineage invariant: EXACTLY three changes, nothing else.
reverse=fixed
for old,new in replacements:
 if reverse.count(new)!=1:raise SystemExit("GAMEHUB_PR151_EXTRA_CHANGE")
 reverse=reverse.replace(new,old,1)
if reverse!=original:raise SystemExit("GAMEHUB_PR151_UNAPPROVED_DIFF")
PY
test "$(git hash-object "$root/original.kt")" = "$expected_blob"
test "$(git hash-object "$root/corrected.kt")" != "$expected_blob"
kotlinc "$root/original.kt" tests/oracles/c2-next-pr151-domain-abi.kt \
 tests/oracles/gamehub-pr151-acceptance.kt -include-runtime -d "$root/red.jar"
kotlinc "$root/corrected.kt" tests/oracles/c2-next-pr151-domain-abi.kt \
 tests/oracles/gamehub-pr151-acceptance.kt -include-runtime -d "$root/green.jar"
kotlinc "$root/corrected.kt" tests/oracles/c2-next-pr151-domain-abi.kt \
 tests/oracles/gamehub-pr151-independent-judge.kt -include-runtime -d "$root/judge.jar"
test -s "$root/red.jar" && test -s "$root/green.jar" && test -s "$root/judge.jar"
chmod 0400 "$root"/{red,green,judge}.jar
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
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
run() {
 local jar="$1" log="$2"
 env -i PATH=/usr/bin:/bin HOME=/tmp \
  /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
   --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
   "${mounts[@]}" --ro-bind "$jdk" /jdk \
   --ro-bind "$root" /workspace --proc /proc --dev /dev \
   --tmpfs /tmp --dir /home --chdir /workspace \
   -- /jdk/bin/java -jar "/workspace/$jar.jar" > "$root/$log.log" 2>&1
}
set +e
run red red
red_rc=$?
set -e
test "$red_rc" -eq 1 || { echo 'GAMEHUB_PR151_RED_NOT_PROVEN'; exit 2; }
grep -F 'GAMEHUB_PR151_RED_INFINITY_MUST_BE_REJECTED' "$root/red.log" >/dev/null ||
 { echo 'GAMEHUB_PR151_RED_WRONG_FAILURE'; exit 2; }
run green green
grep -Fx 'GAMEHUB_PR151_ACCEPTANCE_GREEN' "$root/green.log" >/dev/null ||
 { echo 'GAMEHUB_PR151_GREEN_MISSING'; exit 2; }
run judge judge
grep -Fx 'GAMEHUB_PR151_JUDGE_APPROVED' "$root/judge.log" >/dev/null ||
 { echo 'GAMEHUB_PR151_JUDGE_VETO'; exit 2; }
python3 - "$root" "$expected_head" "$expected_blob" <<'PY'
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1])
def sha256(p):return hashlib.sha256(p.read_bytes()).hexdigest()
data={
 "schema":"ultra-sentinel-gamehub-pr151-real-red-green-judge/v1",
 "sourceRepo":"cardenaspiero255-lang/gamehub-ultra",
 "sourceCommit":sys.argv[2],
 "originalBlob":sys.argv[3],
 "originalSourceSha256":sha256(root/"original.kt"),
 "patchedSourceSha256":sha256(root/"corrected.kt"),
 "redLogSha256":sha256(root/"red.log"),
 "greenLogSha256":sha256(root/"green.log"),
 "judgeLogSha256":sha256(root/"judge.log"),
 "redOriginalFailedAtExactPredicate":True,
 "greenPatchedPassed":True,
 "independentJudgePassed":True,
 "bubblewrapIsolationRequested":True,
 "realOwnerSignatureVerified":False,
 "ownerProductionRepairExecuted":False,
 "hunterRuleCoversThisDefect":False,
 "remoteWrites":False,
 "releaseAuthorized":False,
 "tripleSPlusCertified":False
}
(root/"receipt.json").write_text(json.dumps(data,sort_keys=True)+"\n")
print("GAMEHUB_PR151_REAL_SOURCE_RED_GREEN_JUDGE_PASS_NO_RELEASE")
PY

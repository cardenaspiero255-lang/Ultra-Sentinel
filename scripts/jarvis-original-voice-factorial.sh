#!/usr/bin/env bash
# Original, commit-pinned JARVIS Kotlin only. Counterfactual mutants are
# controlled negative examples, not claimed product defects. No remote writes.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_ORIGINAL_SANDBOX:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
for tool in bwrap kotlinc gh jq python3; do command -v "$tool" >/dev/null; done
test "$#" -eq 1
root="$(realpath "$1")";test -d "$root" && test ! -L "$root"
umask 077
owner_repo=cardenaspiero255-lang/JARVIS
head=f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868
prefix=apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core
fetch_source(){
 local name="$1" blob="$2"
 local dest="$root/$name-original.kt"
 local metadata="$root/$name-source-api.json"
 gh api "/repos/$owner_repo/contents/$prefix/$name?ref=$head" > "$metadata"
 jq -e --arg p "$prefix/$name" --arg s "$blob" '
  .type=="file" and .path==$p and .sha==$s and .encoding=="base64" and
  .size>100 and .size<10000 and (.submodule_git_url|not)
 ' "$metadata" >/dev/null
 jq -r .content "$metadata" | base64 --decode > "$dest"
 test -f "$dest" && test ! -L "$dest"
 test "$(git hash-object "$dest")" = "$blob"
 rm -f "$metadata"
}
fetch_source BargeInStopPolicy.kt 507e78e8220f63283b356629047b23032c527214
fetch_source PartialWakeSignalPolicy.kt 2ed097d73563542a33e8bd0051849c555d118c26
python3 - "$root" <<'PY'
from pathlib import Path
import sys
r=Path(sys.argv[1])
barge=(r/'BargeInStopPolicy.kt-original.kt').read_text(encoding='utf8')
wake=(r/'PartialWakeSignalPolicy.kt-original.kt').read_text(encoding='utf8')
def replace_exact(s,a,b):
    assert s.count(a)==1,(a,'UNEXPECTED_ORIGINAL_SOURCE_DRIFT')
    return s.replace(a,b,1)
(r/'barge-mutant.kt').write_text(replace_exact(
    barge,'if (spokenWords.any { it in setOf(',
    'if (false && spokenWords.any { it in setOf('),encoding='utf8')
(r/'wake-mutant.kt').write_text(replace_exact(
    wake,'if (normalized != "jarvis") return false',
    'if (!normalized.contains("jarvis")) return false'),encoding='utf8')
(r/'barge-regressed.kt').write_text(replace_exact(
    barge,'return if (heardNormalized in setOf(',
    'return if (false && heardNormalized in setOf('),encoding='utf8')
PY
repo="$(cd "$(dirname "$0")/.." && pwd)"
for mode in 00 10 01 11; do
 case "${mode:0:1}" in 0) barge="$root/BargeInStopPolicy.kt-original.kt";; 1) barge="$root/barge-mutant.kt";; esac
 case "${mode:1:1}" in 0) wake="$root/PartialWakeSignalPolicy.kt-original.kt";; 1) wake="$root/wake-mutant.kt";; esac
 kotlinc "$barge" "$wake" "$repo/tests/oracles/jarvis-voice-factorial.kt" \
  -include-runtime -d "$root/matrix-$mode.jar" > "$root/compile-$mode.log" 2>&1 || {
   echo "JARVIS_KOTLIN_COMPILE_FAILED mode=$mode" >&2
   grep -E '(error:|Exception)' "$root/compile-$mode.log" | head -10 >&2 || :
   exit 1
  }
 test -s "$root/matrix-$mode.jar"
 chmod 0400 "$root/matrix-$mode.jar"
done
kotlinc "$root/barge-regressed.kt" "$root/PartialWakeSignalPolicy.kt-original.kt" \
 "$repo/tests/oracles/jarvis-voice-factorial.kt" \
 -include-runtime -d "$root/regression-10.jar"
chmod 0400 "$root/regression-10.jar"
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
run_java(){
 local jar="$1" mode="$2" logfile="$3"
 env -i PATH=/usr/bin:/bin HOME=/tmp \
 bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
 --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
 -- /jdk/bin/java -jar "/workspace/$jar" "$mode" > "$root/$logfile" 2>&1
}
for mode in 00 10 01 11; do
 run_java "matrix-$mode.jar" "$mode" "run-$mode.log"
 grep -Fxq 'JARVIS_VOICE_NORMAL_CONTROLS_PASS' "$root/run-$mode.log"
 grep -Fxq 'JARVIS_VOICE_MATRIX_PROBED' "$root/run-$mode.log"
 expected="JARVIS_VOICE_VECTOR mode=$mode barge=false wake=false"
 [[ "${mode:0:1}" == 1 ]] && expected="${expected/barge=false/barge=true}"
 [[ "${mode:1:1}" == 1 ]] && expected="${expected/wake=false/wake=true}"
 grep -Fxq "$expected" "$root/run-$mode.log"
done
set +e
run_java regression-10.jar 10 regression-10.log
rc=$?
set -e
test "$rc" -ne 0
grep -Fq 'JARVIS_VOICE_BENIGN_BARGE_STOP_REGRESSION' "$root/regression-10.log"
! grep -Fxq 'JARVIS_VOICE_NORMAL_CONTROLS_PASS' "$root/regression-10.log"
echo JARVIS_ORIGINAL_KOTLIN_FOUR_FACTORIAL_AND_BENIGN_REGRESSION_PASS

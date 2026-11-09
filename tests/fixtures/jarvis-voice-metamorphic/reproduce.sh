#!/usr/bin/env bash
# Kotlin source-derived voice-boundary investigation, disposable sandbox only.
set -euo pipefail
[ "$#" -eq 3 ] || { echo 'Usage: reproduce.sh PINNED_JARVIS KOTLIN_ROOT SENTINEL_ROOT' >&2; exit 2; }
source_root="$(realpath "$1")"
kotlin_root="$(realpath "$2")"
sentinel_root="$(realpath "$3")"
evidence="$(cd "$(dirname "$0")" && pwd)"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
expected='747c14b5d97750a7b2736968e2d516f02448558d'
base='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core'
policy="$base/LocalGgufPolicy.kt"
gate="$base/OfflineVoiceQuestionGate.kt"
policy_blob='46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78'
gate_blob='bdc3a6a576b3473454df232cd21e3a9a3c4e6465'
jgit(){ git -C "$source_root" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
test "$(jgit rev-parse HEAD)" = "$expected"
test -z "$(jgit status --porcelain)"
test "$(jgit rev-parse "HEAD:$policy")" = "$policy_blob"
test "$(jgit rev-parse "HEAD:$gate")" = "$gate_blob"
test "$(git hash-object "$source_root/$policy")" = "$policy_blob"
test "$(git hash-object "$source_root/$gate")" = "$gate_blob"
test "$("$kotlin_root/bin/kotlinc" -version 2>&1 | head -n1 | cut -d' ' -f2-3)" = 'kotlinc-jvm 2.0.21'
umask 077
work="$(mktemp -d /tmp/sentinel-voice-original-XXXXXXXX)"
trap 'rm -rf "$work"' EXIT
node "$sentinel_root/scripts/phase2-voice-metamorphic-prepare.cjs" "$source_root" "$work"
python3 - "$work/LocalGgufPolicy.kt" "$work/wrong.kt" <<'PY'
from pathlib import Path
import sys
source=Path(sys.argv[1]).read_text(encoding='utf-8')
old='return !direct.containsMatchIn(normalized) && !chained.containsMatchIn(normalized)'
assert source.count(old)==1
Path(sys.argv[2]).write_text(source.replace(old,'return false'),encoding='utf-8')
PY
"$kotlin_root/bin/kotlinc" "$source_root/$policy" "$source_root/$gate" \
 "$evidence/VoiceBoundaryMetamorphicOracle.kt" -include-runtime -d "$work/original.jar"
"$kotlin_root/bin/kotlinc" "$work/LocalGgufPolicy.kt" "$source_root/$gate" \
 "$evidence/VoiceBoundaryMetamorphicOracle.kt" -include-runtime -d "$work/candidate.jar"
"$kotlin_root/bin/kotlinc" "$work/wrong.kt" "$source_root/$gate" \
 "$evidence/VoiceBoundaryMetamorphicOracle.kt" -include-runtime -d "$work/wrong.jar"
git -c core.hooksPath=/dev/null clone -q --no-hardlinks "$source_root" "$work/disposable"
git -C "$work/disposable" remote remove origin
git -C "$work/disposable" switch -q -c sandbox/voice-unregistered
cp "$work/LocalGgufPolicy.kt" "$work/disposable/$policy"
git -C "$work/disposable" -c core.hooksPath=/dev/null add -- "$policy"
git -C "$work/disposable" -c core.hooksPath=/dev/null -c user.name='Sentinel sandbox' \
 -c user.email='sandbox@example.invalid' -c commit.gpgsign=false \
 commit -qm 'sandbox: source-derived unregistered voice candidate'
node "$sentinel_root/scripts/phase2-voice-metamorphic-verify.cjs" \
 "$work/disposable" "$sentinel_root" "$work"
test "$(jgit rev-parse HEAD)" = "$expected"
test -z "$(jgit status --porcelain)"
test "$(git hash-object "$source_root/$policy")" = "$policy_blob"
test "$(git hash-object "$source_root/$gate")" = "$gate_blob"

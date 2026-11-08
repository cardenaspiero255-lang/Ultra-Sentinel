#!/usr/bin/env bash
# Read-only original Kotlin observation. Never create candidates or write JARVIS.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_POLITE_ISOLATED:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
for cmd in gh jq git base64 java bwrap node sha256sum timeout; do command -v "$cmd" >/dev/null; done
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root" && test -z "$(ls -A "$root")"
umask 077
mkdir "$root/input" "$root/out"
repo=cardenaspiero255-lang/JARVIS
head=747c14b5d97750a7b2736968e2d516f02448558d
prefix=apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core
for item in \
 gate:OfflineVoiceQuestionGate.kt:bdc3a6a576b3473454df232cd21e3a9a3c4e6465 \
 policy:LocalGgufPolicy.kt:46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78; do
 IFS=: read -r alias filename blob <<< "$item"
 remote="$prefix/$filename"
 gh api "/repos/$repo/contents/$remote?ref=$head" > "$root/metadata.json"
 test "$(wc -c < "$root/metadata.json")" -lt 120000
 jq -e --arg p "$remote" --arg b "$blob" \
  '.type=="file" and .path==$p and .sha==$b and .encoding=="base64" and .size>100 and .size<60000' \
  "$root/metadata.json" >/dev/null
 jq -r .content "$root/metadata.json" | base64 --decode > "$root/input/$alias.kt"
 test "$(git hash-object "$root/input/$alias.kt")" = "$blob"
 rm -- "$root/metadata.json"
done
unset GH_TOKEN GITHUB_TOKEN
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
oracle="$repo_root/tests/oracles/jarvis-polite-operational-original.kt"
expected_oracle=d6901d8a1725397c7e242352bd0e2830f6c657bd7d358f1d6d06ef9ed7a80fa3
test "$(sha256sum "$oracle" | cut -d' ' -f1)" = "$expected_oracle"
cp -- "$oracle" "$root/input/oracle.kt"
chmod 0400 "$root/input/"*.kt
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
kotlin_home="$(realpath "${JARVIS_KOTLIN_HOME:?}")"
test -x "$jdk/bin/java" && test -x "$kotlin_home/bin/kotlinc"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  dest="$(readlink "$mount")"
  [[ "$dest" != /* && "$dest" != *..* ]] || exit 2
  mounts+=(--symlink "$dest" "$mount")
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
isolated(){
 local access="$1"; shift
 local output_mount
 case "$access" in compile) output_mount=--bind ;; run) output_mount=--ro-bind ;; *) return 2 ;; esac
 timeout --kill-after=5 120 env -i PATH=/usr/bin:/bin HOME=/tmp \
 bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp --setenv JAVA_HOME /jdk \
 --setenv JAVA_OPTS -Xmx512m \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$kotlin_home" /kotlin \
 --ro-bind "$root/input" /input "$output_mount" "$root/out" /out \
 --proc /proc --dev /dev --tmpfs /tmp --chdir /tmp -- "$@"
}
isolated compile /kotlin/bin/kotlinc /input/gate.kt /input/policy.kt /input/oracle.kt \
 -include-runtime -d /out/oracle.jar > "$root/compile.log" 2>&1
test -s "$root/out/oracle.jar"
test "$(git hash-object "$root/input/gate.kt")" = bdc3a6a576b3473454df232cd21e3a9a3c4e6465
test "$(git hash-object "$root/input/policy.kt")" = 46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78
test "$(sha256sum "$root/input/oracle.kt" | cut -d' ' -f1)" = "$expected_oracle"
jar_hash="$(sha256sum "$root/out/oracle.jar" | cut -d' ' -f1)"
for mode in policy gate integration controls; do
 set +e
 isolated run /jdk/bin/java -Xmx512m -jar /out/oracle.jar "$mode" > "$root/$mode.log" 2>&1
 code=$?
 set -e
 printf '%s\n' "$code" > "$root/$mode.exit"
 test "$(sha256sum "$root/out/oracle.jar" | cut -d' ' -f1)" = "$jar_hash"
done
node "$repo_root/scripts/verify-jarvis-polite-operational-original.cjs" "$root"

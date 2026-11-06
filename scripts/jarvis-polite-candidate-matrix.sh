#!/usr/bin/env bash
# The baseline files were fetched and authenticated by the prior CI step.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_POLITE_ISOLATED:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
test "$(git hash-object "$root/input/gate.kt")" = bdc3a6a576b3473454df232cd21e3a9a3c4e6465
test "$(git hash-object "$root/input/policy.kt")" = 46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78
test "$(sha256sum "$root/input/oracle.kt" | cut -d' ' -f1)" = d6901d8a1725397c7e242352bd0e2830f6c657bd7d358f1d6d06ef9ed7a80fa3
unset GH_TOKEN GITHUB_TOKEN
node "$repo_root/scripts/jarvis-polite-build-candidate.cjs" "$root"
mkdir "$root/matrix"
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
 local mode="$1" access="$2"; shift 2
 local output_mount
 case "$access" in compile) output_mount=--bind ;; run) output_mount=--ro-bind ;; *) return 2 ;; esac
 timeout --kill-after=5 120 env -i PATH=/usr/bin:/bin HOME=/tmp \
 bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp --setenv JAVA_HOME /jdk \
 --setenv JAVA_OPTS -Xmx512m "${mounts[@]}" \
 --ro-bind "$jdk" /jdk --ro-bind "$kotlin_home" /kotlin \
 --ro-bind "$root/matrix/$mode/input" /input "$output_mount" "$root/matrix/$mode/out" /out \
 --proc /proc --dev /dev --tmpfs /tmp --chdir /tmp -- "$@"
}
for mode in 00 01 10 11; do
 mkdir -p "$root/matrix/$mode/input" "$root/matrix/$mode/out"
 gate="$root/input/gate.kt"; policy="$root/input/policy.kt"
 case "$mode" in 10|11) gate="$root/candidate/gate.kt" ;; esac
 case "$mode" in 01|11) policy="$root/candidate/policy.kt" ;; esac
 cp "$gate" "$root/matrix/$mode/input/gate.kt"
 cp "$policy" "$root/matrix/$mode/input/policy.kt"
 cp "$root/input/oracle.kt" "$root/matrix/$mode/input/oracle.kt"
 chmod 0400 "$root/matrix/$mode/input/"*.kt
 isolated "$mode" compile /kotlin/bin/kotlinc /input/gate.kt /input/policy.kt /input/oracle.kt \
  -include-runtime -d /out/oracle.jar > "$root/matrix/$mode/compile.log" 2>&1
 test -s "$root/matrix/$mode/out/oracle.jar"
 jar_hash="$(sha256sum "$root/matrix/$mode/out/oracle.jar" | cut -d' ' -f1)"
 for test_mode in policy gate controls integration; do
  set +e
  isolated "$mode" run /jdk/bin/java -Xmx512m -jar /out/oracle.jar "$test_mode" \
   > "$root/matrix/$mode/$test_mode.log" 2>&1
  result=$?
  set -e
  printf '%s\n' "$result" > "$root/matrix/$mode/$test_mode.exit"
  test "$(sha256sum "$root/matrix/$mode/out/oracle.jar" | cut -d' ' -f1)" = "$jar_hash"
 done
done
cp "$repo_root/tests/oracles/jarvis-polite-candidate-adversarial.kt" "$root/matrix/11/input/adversarial.kt"
chmod 0400 "$root/matrix/11/input/adversarial.kt"
isolated 11 compile /kotlin/bin/kotlinc /input/gate.kt /input/policy.kt /input/adversarial.kt \
 -include-runtime -d /out/adversarial.jar > "$root/matrix/11/adversarial-compile.log" 2>&1
set +e
isolated 11 run /jdk/bin/java -Xmx512m -jar /out/adversarial.jar > "$root/matrix/11/adversarial.log" 2>&1
result=$?
set -e
printf '%s\n' "$result" > "$root/matrix/11/adversarial.exit"
node "$repo_root/scripts/verify-jarvis-polite-candidate.cjs" "$root"

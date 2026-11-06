#!/usr/bin/env bash
# Trusted Linux operator: compile/run real pinned Kotlin without GitHub token.
# This process has NO network namespace, NO GitHub Actions privileges and NO
# writable source mounts. The operator module validates the signed plan.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" != true
test "$(uname -s)" = Linux
test "${#}" -eq 1
for cmd in bwrap git java readlink realpath sysctl timeout grep sha256sum; do
 command -v "$cmd" >/dev/null
done
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
test "$(stat -c %a "$root")" = 700
test "$(git hash-object "$root/original/gate.kt")" = bdc3a6a576b3473454df232cd21e3a9a3c4e6465
test "$(git hash-object "$root/original/policy.kt")" = 46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78
test "$(git hash-object "$root/candidate/gate.kt")" = a12a768582fe731da2639ab1948a7e0cc1c714d7
test "$(git hash-object "$root/candidate/policy.kt")" = b7659a9cf4cb5035047cb3c59540118ce61f7959
test "$(sha256sum "$root/oracle/oracle.kt" | cut -d' ' -f1)" = d6901d8a1725397c7e242352bd0e2830f6c657bd7d358f1d6d06ef9ed7a80fa3
test "$(git hash-object "$root/oracle/adversarial.kt")" = 733b1acbc864be1f30398052ee612cfb4b6bad87
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
kotlin_home="$(realpath "${JARVIS_KOTLIN_HOME:?}")"
test -x "$jdk/bin/java" && test -x "$kotlin_home/bin/kotlinc"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if test -L "$mount"; then
  dest="$(readlink "$mount")"
  [[ "$dest" != /* && "$dest" != *..* ]] || exit 2
  mounts+=(--symlink "$dest" "$mount")
 elif test -d "$mount"; then
  mounts+=(--ro-bind "$mount" "$mount")
 else
  exit 2
 fi
done
isolated(){
 local mode="$1" access="$2"
 shift 2
 local permission
 case "$access" in
  compile) permission=--bind ;;
  run) permission=--ro-bind ;;
  *) return 2 ;;
 esac
 timeout --kill-after=5 120 env -i PATH=/usr/bin:/bin HOME=/tmp \
  bwrap --die-with-parent --unshare-all --new-session --clearenv \
  --setenv PATH /usr/bin:/bin --setenv HOME /tmp --setenv JAVA_HOME /jdk \
  --setenv JAVA_OPTS -Xmx512m "${mounts[@]}" \
  --ro-bind "$jdk" /jdk --ro-bind "$kotlin_home" /kotlin \
  --ro-bind "$root/matrix/$mode/input" /input \
  "$permission" "$root/matrix/$mode/out" /out \
  --proc /proc --dev /dev --tmpfs /tmp --chdir /tmp -- "$@"
}
mkdir -m 700 "$root/matrix"
for mode in 00 01 10 11; do
 mkdir -m 700 -p "$root/matrix/$mode/input" "$root/matrix/$mode/out"
 gate="$root/original/gate.kt"
 policy="$root/original/policy.kt"
 case "$mode" in 10|11) gate="$root/candidate/gate.kt" ;; esac
 case "$mode" in 01|11) policy="$root/candidate/policy.kt" ;; esac
 cp "$gate" "$root/matrix/$mode/input/gate.kt"
 cp "$policy" "$root/matrix/$mode/input/policy.kt"
 cp "$root/oracle/oracle.kt" "$root/matrix/$mode/input/oracle.kt"
 chmod 0400 "$root/matrix/$mode/input/"*.kt
 isolated "$mode" compile /kotlin/bin/kotlinc \
  /input/gate.kt /input/policy.kt /input/oracle.kt \
  -include-runtime -d /out/oracle.jar >"$root/matrix/$mode/compile.log" 2>&1
 test -s "$root/matrix/$mode/out/oracle.jar"
 jar_sha="$(sha256sum "$root/matrix/$mode/out/oracle.jar" | cut -d' ' -f1)"
 for check in policy gate controls integration; do
  expected_exit=0
  case "$check" in
   policy)
    if [[ "$mode" == 0* ]]; then
     expected_exit=1
     marker='Exception in thread "main" java.lang.IllegalStateException: READ_ONLY_POLICY_POLITE_RESTART_ACCEPTED'
    else marker='POLICY_BARRIER_PASS'; fi ;;
   gate)
    if [[ "$mode" == *0 ]]; then
     expected_exit=1
     marker='Exception in thread "main" java.lang.IllegalStateException: VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED'
    else marker='GATE_BARRIER_PASS'; fi ;;
   controls) marker='ORIGINAL_CONTROLS_PASS' ;;
   integration)
    if [[ "$mode" == 11 ]]; then marker='TWO_BARRIER_INTEGRATION_PASS'
    else
     expected_exit=1
     marker='Exception in thread "main" java.lang.IllegalStateException: VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED'
    fi ;;
   *) exit 2 ;;
  esac
  set +e
  isolated "$mode" run /jdk/bin/java -Xmx512m -jar /out/oracle.jar "$check" \
   >"$root/matrix/$mode/$check.log" 2>&1
  actual_exit=$?
  set -e
  test "$actual_exit" -eq "$expected_exit"
  grep -Fxq -- "$marker" "$root/matrix/$mode/$check.log"
  test "$(sha256sum "$root/matrix/$mode/out/oracle.jar" | cut -d' ' -f1)" = "$jar_sha"
 done
done
cp "$root/oracle/adversarial.kt" "$root/matrix/11/input/adversarial.kt"
chmod 0400 "$root/matrix/11/input/adversarial.kt"
isolated 11 compile /kotlin/bin/kotlinc /input/gate.kt /input/policy.kt \
 /input/adversarial.kt -include-runtime -d /out/adversarial.jar \
 >"$root/matrix/11/adversarial-compile.log" 2>&1
isolated 11 run /jdk/bin/java -Xmx512m -jar /out/adversarial.jar \
 >"$root/matrix/11/adversarial.log" 2>&1
grep -Fxq -- POLITE_ADVERSARIAL_CONTROLS_PASS "$root/matrix/11/adversarial.log"
printf '%s\n' OWNER_POLITE_JVM_ORIGINAL_RED_CANDIDATE_GREEN

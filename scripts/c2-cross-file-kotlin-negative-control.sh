#!/usr/bin/env bash
# Independent hostile-functional control: a Git-valid two-file patch must be
# vetoed when Kotlin ordinary battery behavior regresses. JVM in bwrap only.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${C2_OWNER_SANDBOX:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v kotlinc >/dev/null
command -v bwrap >/dev/null
test "$#" -eq 1
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
umask 077
test "$(git hash-object "$root/math-original.kt")" = 063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a
test "$(git hash-object "$root/battery-original.kt")" = 8696360219231f3f1477d5ad21c93bca2197e281
python3 - "$root" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1]); p=root/'battery-repair.kt'
s=p.read_text(encoding='utf8')
before='val highDrainPercentPerHour: Float = 20f'
after='val highDrainPercentPerHour: Float = 200f'
assert s.count(before)==1,'UNEXPECTED_BATTERY_SOURCE_ANCHOR'
(root/'battery-regressed.kt').write_text(s.replace(before,after,1),encoding='utf8')
PY
kotlinc "$root/math-repair.kt" "$root/battery-regressed.kt" \
 tests/oracles/c2-run17-battery-abi.kt \
 tests/oracles/c2-pr185-numeric-factorial-oracle.kt \
 -include-runtime -d "$root/regression-11.jar"
test -s "$root/regression-11.jar"
chmod 0400 "$root/regression-11.jar"
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
set +e
env -i PATH=/usr/bin:/bin HOME=/tmp \
 bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
 --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
 -- /jdk/bin/java -jar /workspace/regression-11.jar 11 \
 > "$root/regression-11.log" 2>&1
code=$?
set -e
test "$code" -ne 0
grep -Fq 'C2_PR185_BATTERY_ORDINARY_REGRESSION' "$root/regression-11.log"
! grep -Fxq 'C2_PR185_ORDINARY_CONTROLS_PASS' "$root/regression-11.log"
echo C2_REAL_KOTLIN_REGRESSION_REPRODUCED_BEFORE_GIT_FUNCTIONAL_JUDGE

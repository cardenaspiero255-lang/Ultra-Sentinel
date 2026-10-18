#!/usr/bin/env bash
# Execute only inside the pinned upstream task image. Never production.
set -euo pipefail
umask 077
[[ "${C2_PHASE:-}" == before || "${C2_PHASE:-}" == after ]] || exit 32
[[ -d /evidence && -f /tests/test.sh && -f /tests/expected_tests.json ]] || exit 33
root="$(pwd -P)"
[[ -d "$root/.git" || -f "$root/.git" ]] || exit 34
if [[ "$C2_PHASE" == after ]]; then
  [[ -f /solution/fix.patch && -f /solution/solve.sh ]] || exit 35
  bash /solution/solve.sh
  git add -A
  git -c user.name='C2 Ephemeral Evidence' -c user.email='c2-evidence@invalid.example' \
    -c commit.gpgsign=false commit --no-verify \
    -m 'Temporary upstream gold-patch evidence; NOT an original upstream commit' >/dev/null
fi
git rev-parse HEAD > /evidence/commit.txt
set +e
bash /tests/test.sh > /evidence/original-test.stdout.log 2>&1
rc=$?
set -e
printf '%s\n' "$rc" > /evidence/original-test.exit-code
mkdir -p /evidence/junit
python3 - <<'PY'
from pathlib import Path
import hashlib,shutil
src=Path.cwd()
out=Path('/evidence/junit')
count=0
for xml in src.rglob('TEST*.xml'):
    if xml.is_symlink() or not xml.is_file(): continue
    if '/build/test-results/' not in xml.as_posix(): continue
    relative=xml.relative_to(src)
    h=hashlib.sha256(str(relative).encode()).hexdigest()[:24]
    shutil.copyfile(xml,out/f'TEST-{h}.xml')
    count+=1
    if count>500:raise SystemExit('Too many JUnit reports')
if not count:raise SystemExit('No original Gradle JUnit reports captured')
print('C2_JUNIT_REPORTS_CAPTURED='+str(count))
PY
[[ "$rc" -eq 0 ]] || exit 40
if [[ "$C2_PHASE" == after ]]; then
  [[ -f /logs/verifier/reward.txt && "$(cat /logs/verifier/reward.txt)" == 1 ]] || exit 41
fi

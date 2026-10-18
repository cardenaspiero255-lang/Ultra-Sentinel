#!/usr/bin/env bash
# Execute only inside the pinned upstream task image. Never production.
set -euo pipefail
# The ephemeral runner must read JUnit and SHA receipts after the container exits.
# No tokens or secrets are mounted; the evidence bind remains isolated per task.
umask 022
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
python3 /opt/c2-capture-junit.py --source "$root" --output /evidence/junit
[[ "$rc" -eq 0 ]] || exit 40
if [[ "$C2_PHASE" == after ]]; then
  [[ -f /logs/verifier/reward.txt && "$(cat /logs/verifier/reward.txt)" == 1 ]] || exit 41
fi

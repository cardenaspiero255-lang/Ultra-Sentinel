#!/usr/bin/env bash
# Trust boundary: ONLY execute the repository-owned RED/GREEN/benign fixture.
# Prospective external source, Gradle wrappers, source patches, arbitrary
# commands and detector predictions must NOT be passed to this worker.
set -euo pipefail
umask 077
test "$#" -eq 2
test "${GITHUB_ACTIONS:-}" = true
test "${C2_OWNER_SANDBOX:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
command -v bwrap >/dev/null
command -v timeout >/dev/null
command -v node >/dev/null
command -v sha256sum >/dev/null
root="$(realpath -m "$1")"
worker_sha="$2"
[[ "$worker_sha" =~ ^[0-9a-f]{40}$ ]] || exit 2
test "$root" != / && test "$root" != "$GITHUB_WORKSPACE"
test -d "$root" && test ! -L "$root"
test "$(find "$root" -mindepth 1 -maxdepth 1|wc -l)" -eq 0
source_dir="$GITHUB_WORKSPACE/tests/oracles/c2-project-oracle-fixture"
test -d "$source_dir" && test ! -L "$source_dir"
for phase in original fixed benign; do
  test -f "$source_dir/$phase.test.cjs"
  test ! -L "$source_dir/$phase.test.cjs"
  test "$(stat -c %h "$source_dir/$phase.test.cjs")" -eq 1
  cp "$source_dir/$phase.test.cjs" "$root/$phase.test.cjs"
  chmod 0400 "$root/$phase.test.cjs"
done

node_bin="$(readlink -f "$(command -v node)")"
test -f "$node_bin" && test -x "$node_bin"
node_dir="$(dirname "$node_bin")"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
  if [ -L "$mount" ]; then
    target="$(readlink "$mount")"
    [[ "$target" != /* && "$target" != *..* ]] || exit 2
    mounts+=(--symlink "$target" "$mount")
  elif [ -d "$mount" ]; then
    mounts+=(--ro-bind "$mount" "$mount")
  else
    exit 2
  fi
done

for phase in original fixed benign; do
  set +e
  # The command and executable path are fixed by the trusted workflow, not
  # interpolated from a PR. Credentials and network are absent inside bwrap.
  timeout --signal=TERM --kill-after=5s 45s \
    env -i PATH=/usr/bin:/bin HOME=/tmp \
    bwrap --die-with-parent --unshare-all --new-session --clearenv \
      --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
      "${mounts[@]}" --ro-bind "$node_dir" /node-bin \
      --ro-bind "$root" /workspace \
      --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
      -- /node-bin/node --test "/workspace/$phase.test.cjs" \
      > "$root/$phase.log" 2>&1
  rc=$?
  set -e
  if [ "$phase" = original ]; then
    test "$rc" -eq 1
    grep -Fq '# fail 1' "$root/$phase.log"
  else
    test "$rc" -eq 0
    grep -Fq '# fail 0' "$root/$phase.log"
  fi
  grep -Fq '# tests 2' "$root/$phase.log"
  test "$(stat -c %s "$root/$phase.log")" -le 262144
  chmod 0400 "$root/$phase.log"
done
node scripts/c2-project-oracle-receipt.cjs generate "$root" "$worker_sha" \
  > "$root/receipt-diagnostic.tmp"
# Only seven sealed files leave the producer; selftest receipt stdout
# must not be counted as an eighth artifact member.
rm -f "$root/receipt-diagnostic.tmp"
node scripts/c2-project-oracle-receipt.cjs verify "$root" "$worker_sha"

#!/usr/bin/env bash
# Strict source-only sandbox: no Sentinel checkout, original repository,
# verifier, Kotlin compiler, functional oracle or host environment mounts.
set -euo pipefail
[ "$#" -eq 6 ] || { echo 'Usage: run-hunter.sh INVENTORY HUNTER WORKER PAYLOAD_HELPER PATH_HELPER OUT' >&2; exit 2; }
inventory=$(realpath "$1")
hunter=$(realpath "$2")
worker=$(realpath "$3")
payload=$(realpath "$4")
policy=$(realpath "$5")
output=$(realpath "$6")
node=$(realpath "$(command -v node)")
for file in "$inventory" "$hunter" "$worker" "$payload" "$policy" "$node"; do
  [ -f "$file" ] && [ ! -L "$file" ] || exit 2
done
[ -d "$output" ] && [ -z "$(find "$output" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  target=$(readlink "$mount")
  [[ "$target" != /* && "$target" != *..* ]] || exit 2
  mounts+=(--symlink "$target" "$mount")
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
env -i PATH=/usr/bin:/bin HOME=/tmp /usr/bin/bwrap \
 --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /runtime:/usr/bin:/bin --setenv HOME /tmp \
 "${mounts[@]}" --dir /runtime --ro-bind "$node" /runtime/node \
 --dir /modules --dir /modules/family-hunter --dir /modules/investigation \
 --ro-bind "$hunter" /modules/family-hunter/phase2-numeric-risk-hunter.cjs \
 --ro-bind "$worker" /modules/family-hunter/blind-numeric-worker.cjs \
 --ro-bind "$payload" /modules/investigation/plain-kotlin-payload.cjs \
 --ro-bind "$policy" /modules/investigation/novel-kotlin-path-policy.cjs \
 --dir /input --ro-bind "$inventory" /input/inventory.json \
 --bind "$output" /out --tmpfs /tmp --proc /proc --dev /dev --chdir /tmp -- \
 /runtime/node /modules/family-hunter/blind-numeric-worker.cjs /input/inventory.json /out/discovery.json
[ -f "$output/discovery.json" ] && [ ! -L "$output/discovery.json" ] || exit 2

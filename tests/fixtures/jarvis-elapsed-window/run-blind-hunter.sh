#!/usr/bin/env bash
# The isolated process sees only the supplied inventory and Hunter code.
# The caller must separately authenticate the source repository and input files.
set -euo pipefail
[ "$#" -eq 4 ] || { echo 'Usage: run-blind-hunter.sh INVENTORY HUNTER WORKER OUTPUT_DIR' >&2; exit 2; }
inventory=$(realpath "$1")
hunter=$(realpath "$2")
worker=$(realpath "$3")
output=$(realpath "$4")
node=$(realpath "$(command -v node)")
for file in "$inventory" "$hunter" "$worker" "$node"; do
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
  --dir /hunter --ro-bind "$hunter" /hunter/blind-elapsed-window.cjs \
  --ro-bind "$worker" /hunter/worker.cjs \
  --dir /input --ro-bind "$inventory" /input/inventory.json \
  --bind "$output" /out --tmpfs /tmp --proc /proc --dev /dev --chdir /tmp -- \
  /runtime/node /hunter/worker.cjs /input/inventory.json /out/discovery.json
[ -f "$output/discovery.json" ] && [ ! -L "$output/discovery.json" ] || exit 2

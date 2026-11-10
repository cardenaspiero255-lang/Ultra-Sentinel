#!/usr/bin/env bash
set -euo pipefail
[ "$#" -eq 6 ] || exit 2
inventory=$(realpath "$1")
scanner=$(realpath "$2")
worker=$(realpath "$3")
validator=$(realpath "$4")
policy=$(realpath "$5")
output=$(realpath "$6")
node=$(realpath "$(command -v node)")
for file in "$inventory" "$scanner" "$worker" "$validator" "$policy" "$node"; do
  [ -f "$file" ] && [ ! -L "$file" ] || exit 2
done
[ -d "$output" ] && [ -z "$(find "$output" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
mounts=(--ro-bind /usr /usr)
for entry in /bin /lib /lib64; do
  if [ -L "$entry" ]; then
    target=$(readlink "$entry")
    [[ "$target" != /* && "$target" != *..* ]] || exit 2
    mounts+=(--symlink "$target" "$entry")
  elif [ -d "$entry" ]; then
    mounts+=(--ro-bind "$entry" "$entry")
  else exit 2; fi
done
env -i PATH=/usr/bin:/bin HOME=/tmp /usr/bin/bwrap \
  --die-with-parent --unshare-all --new-session --clearenv \
  --setenv PATH /runtime:/usr/bin:/bin --setenv HOME /tmp \
  "${mounts[@]}" --dir /runtime --ro-bind "$node" /runtime/node \
  --dir /packages --dir /packages/family-hunter --dir /packages/investigation \
  --ro-bind "$scanner" /packages/family-hunter/phase2-codec-integrity-hunter.cjs \
  --ro-bind "$worker" /packages/family-hunter/phase2-blind-codec-worker.cjs \
  --ro-bind "$validator" /packages/investigation/plain-kotlin-payload.cjs \
  --ro-bind "$policy" /packages/investigation/novel-kotlin-path-policy.cjs \
  --dir /input --ro-bind "$inventory" /input/inventory.json \
  --bind "$output" /out --tmpfs /tmp --proc /proc --dev /dev --chdir /tmp -- \
  /runtime/node /packages/family-hunter/phase2-blind-codec-worker.cjs /input/inventory.json /out/discovery.json
[ -f "$output/discovery.json" ] && [ ! -L "$output/discovery.json" ] || exit 2

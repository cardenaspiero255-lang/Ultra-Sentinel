#!/usr/bin/env bash
# Adapt the existing JVM cgroup guard; never mount the Sentinel checkout, host
# environment, predictions or credentials into compiler/oracle namespaces.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
mode=$1
for p in "$2" "$3" "$4"; do [ -d "$p" ] && [ ! -L "$p" ] || exit 2; done
kotlin=$(realpath "$2")
input=$(realpath "$3")
output=$(realpath "$4")
[ -z "$(find "$output" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
java=$(realpath "$(command -v java)")
jdk=$(dirname "$(dirname "$java")")
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
guard=$(realpath "$here/../jvm-metamorphic/assert-cgroup-and-exec.sh")
[ -f "$guard" ] && [ ! -L "$guard" ] || exit 2
mounts=(--ro-bind /usr /usr)
for p in /bin /lib /lib64; do
 if [ -L "$p" ]; then
  target=$(readlink "$p")
  [[ "$target" != /* && "$target" != *..* ]] || exit 2
  mounts+=(--symlink "$target" "$p")
 else mounts+=(--ro-bind "$p" "$p"); fi
done
case "$mode" in
 compile)
  # All file paths were authenticated against immutable source Git blobs.
  while IFS= read -r -d '' file; do
   relative=${file#"$input/"}
   [[ "$relative" =~ ^(src/main/|oracle/)[A-Za-z0-9_/]+\.kt$ ]] || exit 2
   printf '/input/%s\n' "$relative"
  done < <(find "$input" -type f -name '*.kt' -print0 | sort -z) > "$output/sources.txt"
  [ -s "$output/sources.txt" ] || exit 2
  command=(/kotlin/bin/kotlinc -J-Xmx256m -J-XX:ActiveProcessorCount=2 -nowarn @/out/sources.txt -include-runtime -d /out/target.jar)
  ;;
 oracle)
  [ -f "$input/target.jar" ] && [ ! -L "$input/target.jar" ] || exit 2
  command=(/jdk/bin/java -Xmx128m -XX:ActiveProcessorCount=2 -cp /input/target.jar oracle.IndependentArithmeticOracleKt)
  ;;
 *) exit 2;;
esac
umask 077
if ! (ulimit -f 32768; ulimit -n 128; exec timeout --kill-after=2s 120s env -i PATH=/usr/bin:/bin HOME=/tmp \
 /usr/bin/sudo -n /usr/bin/systemd-run --system --scope --quiet --collect \
 --uid="$(id -u)" --gid="$(id -g)" --property=MemoryMax=512M --property=MemorySwapMax=0 --property=TasksMax=32 \
 /bin/bash "$guard" "$(id -u)" "$(id -g)" /usr/bin/bwrap \
 --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /jdk/bin:/usr/bin:/bin --setenv JAVA_HOME /jdk --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$kotlin" /kotlin \
 --ro-bind "$input" /input --bind "$output" /out --tmpfs /tmp --proc /proc --dev /dev --chdir /tmp -- \
 "${command[@]}") > "$output/execution.log" 2> "$output/diagnostics.log"; then
 printf '%s\n' 'ISOLATED_ORIGINAL_EXECUTION_FAILED' >&2
 exit 1
fi

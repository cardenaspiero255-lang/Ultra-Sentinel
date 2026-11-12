#!/usr/bin/env bash
# Execute untrusted JVM bytecode only inside a networkless, bounded namespace.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
[ ! -L "$1" ] && [ ! -L "$2" ] && [ ! -L "$4" ] || exit 2
jar=$(realpath "$1")
classes=$(realpath "$2")
prefix=$3
output=$(realpath "$4")
[[ "$prefix" =~ ^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$ ]] || exit 2
[ -f "$jar" ] && [ -d "$classes" ] && [ -d "$output" ] || exit 2
[ -z "$(find "$output" -mindepth 1 -maxdepth 1 -print -quit)" ] || exit 2
for file in GenericJvmMetamorphicProbe.class 'GenericJvmMetamorphicProbe$Result.class'; do
 [ -f "$classes/$file" ] && [ ! -L "$classes/$file" ] || exit 2
done
java=$(realpath "$(command -v java)")
jdk=$(dirname "$(dirname "$java")")
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  target=$(readlink "$mount")
  [[ "$target" != /* && "$target" != *..* ]] || exit 2
  mounts+=(--symlink "$target" "$mount")
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
# The JVM's -Xmx is NOT an aggregate memory limit. Untrusted methods can
# spawn child processes; systemd v2 bounds the entire process tree. A separate
# kernel cgroup guard must verify the limits before launching the namespace.
# If sudo, systemd, the cgroup controller or the scopes are unavailable, STOP.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
guard="$script_dir/assert-cgroup-and-exec.sh"
[ -f "$guard" ] && [ ! -L "$guard" ] || exit 2
command -v sudo >/dev/null && command -v systemd-run >/dev/null || exit 2
[ -r /sys/fs/cgroup/cgroup.controllers ] || exit 2
umask 077
if ! (ulimit -f 1024; ulimit -n 128; exec timeout --kill-after=2s 45s env -i PATH=/usr/bin:/bin HOME=/tmp \
 /usr/bin/sudo -n /usr/bin/systemd-run --system --scope --quiet --collect \
 --uid="$(id -u)" --gid="$(id -g)" --property=MemoryMax=512M \
 --property=MemorySwapMax=0 --property=TasksMax=32 \
 /bin/bash "$guard" /usr/bin/bwrap \
 --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /jdk/bin:/usr/bin:/bin --setenv JAVA_HOME /jdk --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --dir /probe --dir /input \
 --ro-bind "$classes/GenericJvmMetamorphicProbe.class" /probe/GenericJvmMetamorphicProbe.class \
 --ro-bind "$classes/GenericJvmMetamorphicProbe\$Result.class" '/probe/GenericJvmMetamorphicProbe$Result.class' \
 --ro-bind "$jar" /input/target.jar --tmpfs /tmp --proc /proc --dev /dev --chdir /tmp -- \
 /jdk/bin/java -Xmx128m -XX:MaxMetaspaceSize=128m -XX:ActiveProcessorCount=2 \
 -cp /probe GenericJvmMetamorphicProbe /input/target.jar "$prefix") > "$output/discovery.json"; then
 rm -f "$output/discovery.json"
 exit 1
fi
if ! node - "$output/discovery.json" "$jar" <<'JS'
const fs=require('node:fs'),{createHash}=require('node:crypto');
const [reportFile,jar]=process.argv.slice(2);
if(fs.statSync(reportFile).size>262144)throw Error('OVERSIZED_JVM_PROBE_REPORT');
const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
const hash=createHash('sha256').update(fs.readFileSync(jar)).digest('hex');
if(report.schema!=='ultra-sentinel-generic-jvm-metamorphic/v1'||report.artifactSha256!==hash||
 !['INCOMPLETE_NO_SUPPORTED_METHODS','PARTIAL_HYPOTHESES_REQUIRE_ORACLE','HYPOTHESES_REQUIRE_ORACLE'].includes(report.status)||
 !Array.isArray(report.findings)||report.sourceAuthenticated!==false||report.oracleVerified!==false||
 report.novelFamilyVerified!==false||report.repairAuthorized!==false||report.remoteWrites!==false||report.mergeAllowed!==false)
 throw Error('UNTRUSTED_JVM_PROBE_REPORT');
JS
then
 rm -f "$output/discovery.json"
 exit 1
fi
printf '%s\n' 'GENERIC_JVM_METAMORPHIC_HYPOTHESES_SEALED'

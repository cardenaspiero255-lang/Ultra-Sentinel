#!/usr/bin/env bash
# Development case. The original source and its counterfactual are known.
set -euo pipefail
[ "$#" -eq 3 ] || exit 2
original=$(realpath "$1")
kotlin=$(realpath "$2")
sentinel=$(realpath "$3")
head=e4ca122422f1cb591d407db3fb21fb00fd78b022
fixture="$sentinel/tests/fixtures/jvm-metamorphic"
basefixture="$sentinel/tests/fixtures/gamehub-three-source"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
[ "$(git -C "$original" rev-parse HEAD)" = "$head" ]
[ -z "$(git -C "$original" status --porcelain)" ]
[[ "$("$kotlin/bin/kotlinc" -version 2>&1)" == *'kotlinc-jvm 2.0.21 '* ]]
umask 077
work=$(mktemp -d /tmp/sentinel-jvm-metamorphic-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
node "$basefixture/prepare.cjs" "$original" "$sentinel" "$work" "$head"
mkdir "$work/probe" "$work/original-output" "$work/candidate-output" "$work/jars"
javac -d "$work/probe" "$sentinel/packages/family-hunter/GenericJvmMetamorphicProbe.java"
"$kotlin/bin/kotlinc" -nowarn "$work/original-0.kt" -include-runtime -d "$work/original-target.jar"
"$kotlin/bin/kotlinc" -nowarn "$work/candidate-0.kt" -include-runtime -d "$work/candidate-target.jar"
bash "$fixture/run-probe.sh" "$work/original-target.jar" "$work/probe" \
 com.cardenaspiero255.gamehubultra "$work/original-output"
sha256sum "$work/original-output/discovery.json" > "$work/original-discovery.sha256"
bash "$fixture/run-probe.sh" "$work/candidate-target.jar" "$work/probe" \
 com.cardenaspiero255.gamehubultra "$work/candidate-output"
node - "$work/original-output/discovery.json" "$work/candidate-output/discovery.json" <<'JS'
const fs=require('node:fs');
const [original,candidate]=process.argv.slice(2).map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const target=r=>r.findings.filter(f=>f.class==='com.cardenaspiero255.gamehubultra.BatteryTelemetry'&&
 f.method.startsWith('fromBroadcast(')&&f.argument===0&&f.otherArguments===1);
if(target(original).length!==1||JSON.stringify(target(original)[0].observed)!=='["0","100","0"]'||
 target(candidate).length!==0||original.oracleVerified!==false||candidate.oracleVerified!==false)
 throw Error('GENERIC_METAMORPHIC_DEVELOPMENT_REPLAY_MISMATCH');
console.log('GENERIC_METAMORPHIC_SOURCE_DERIVED_HYPOTHESIS_NOT_NEW_FAMILY');
JS
for kind in original candidate wrong; do
 case "$kind" in original) source="$work/original-0.kt";; candidate) source="$work/candidate-0.kt";; wrong) source="$work/unsafe.kt";; esac
 "$kotlin/bin/kotlinc" -nowarn "$source" "$fixture/IndependentBatteryOracle.kt" \
  -include-runtime -d "$work/jars/$kind.jar"
done
jdk=$(dirname "$(dirname "$(realpath "$(command -v java)")")")
node_root=$(dirname "$(dirname "$(realpath "$(command -v node)")")")
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  target=$(readlink "$mount")
  [[ "$target" != /* && "$target" != *..* ]] || exit 2
  mounts+=(--symlink "$target" "$mount")
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
env -i PATH=/usr/bin:/bin HOME=/tmp /usr/bin/bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /jdk/bin:/node/bin:/usr/bin:/bin --setenv JAVA_HOME /jdk --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$node_root" /node --ro-bind "$sentinel" /sentinel \
 --dir /input --ro-bind "$work/jars" /input/jars --ro-bind "$work/interventions.json" /input/interventions.json \
 --tmpfs /tmp --proc /proc --dev /dev --chdir /tmp -- \
 /node/bin/node /sentinel/tests/fixtures/jvm-metamorphic/judge.cjs /sentinel /input
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$original" "$work/checkout"
git -C "$work/checkout" remote remove origin
git -C "$work/checkout" switch -q -c sandbox/telemetry-three-source
node "$basefixture/git-drill.cjs" "$work/checkout" "$sentinel" "$work" "$head" 1
sha256sum --check --status "$work/original-discovery.sha256"
[ -z "$(git -C "$original" status --porcelain)" ]
printf '%s\n' 'GENERIC_METAMORPHIC_DEVELOPMENT_REPLAY_PASS'

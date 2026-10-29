#!/usr/bin/env bash
# Real Kotlin/JVM 2x2 factorial on two separate original JARVIS policies.
# Fails closed if any source/JAR/log changes, or if independent oracles differ.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_TERMUX_ISOLATED:-}" = 1
test "$#" -eq 1
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
test "$(git hash-object "$root/original.kt")" = 7c6f326cb267b56f4ca6b2d0614753695259da56
test "$(git hash-object "$root/voice_original.kt")" = 606d1184e7d57e49ef15b983a8646706abadf3da
for cmd in kotlinc java bwrap node git; do command -v "$cmd" >/dev/null; done
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  dest="$(readlink "$mount")"
  [[ "$dest" != /* && "$dest" != *..* ]] || exit 2
  mounts+=(--symlink "$dest" "$mount")
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
for mask in 0 1 2 3; do
 termux=original; voice=original
 if ((mask & 1)); then termux=candidate; fi
 if ((mask & 2)); then voice=candidate; fi
 jar="$root/factorial_$mask.jar"
 before_a="$(sha256sum "$root/$termux.kt" | cut -d' ' -f1)"
 before_b="$(sha256sum "$root/voice_$voice.kt" | cut -d' ' -f1)"
 kotlinc "$root/$termux.kt" "$root/voice_$voice.kt" \
  "$repo_root/tests/oracles/jarvis-two-policy-factorial.kt" \
  -include-runtime -d "$jar" > "$root/factorial_$mask.compile" 2>&1
 test -s "$jar"
 test "$(sha256sum "$root/$termux.kt" | cut -d' ' -f1)" = "$before_a"
 test "$(sha256sum "$root/voice_$voice.kt" | cut -d' ' -f1)" = "$before_b"
 chmod 0400 "$jar"
 env -i PATH=/usr/bin:/bin HOME=/tmp \
  bwrap --die-with-parent --unshare-all --new-session --clearenv \
  --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
  "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
  --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
  -- /jdk/bin/java -jar "/workspace/factorial_$mask.jar" \
  > "$root/factorial_$mask.log" 2>&1
done
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto');
const {classifyOracleVectorFactorial}=
 require('./packages/family-hunter/original-oracle-vector-factorial.cjs');
const root=process.argv[2],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const paths=[
 'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt',
 'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceRecognitionRequestGate.kt'
];
const expected=[['FAIL','FAIL'],['PASS','FAIL'],['FAIL','PASS'],['PASS','PASS']];
const scenarios=[],artifacts=[];
for(let mask=0;mask<4;mask++){
 const log=fs.readFileSync(p.join(root,'factorial_'+mask+'.log'),'utf8');
 const rows=log.trim().split(/\r?\n/),values={};
 if(rows.length!==2)throw Error('ORIGINAL_JVM_FACTORIAL_EXTRA_OUTPUT');
 for(const row of rows){
  const m=/^(TERMUX|VOICE)_RESULT=(PASS|FAIL)$/.exec(row);
  if(!m||Object.hasOwn(values,m[1]))throw Error('ORIGINAL_JVM_ORACLE_FORMAT');
  values[m[1]]=m[2];
 }
 if(values.TERMUX!==expected[mask][0]||values.VOICE!==expected[mask][1])
  throw Error('ORIGINAL_JVM_FACTORIAL_REGRESSION');
 scenarios.push({selectedFiles:paths.filter((_,i)=>Boolean(mask&(1<<i))),
  verdicts:{TERMUX:values.TERMUX,VOICE:values.VOICE}});
 artifacts.push({mask,jarSha256:sha(fs.readFileSync(p.join(root,'factorial_'+mask+'.jar'))),
  logSha256:sha(Buffer.from(log)),compileLogSha256:sha(fs.readFileSync(p.join(root,'factorial_'+mask+'.compile')))});
}
const report=classifyOracleVectorFactorial({
 files:paths,oracleIds:['TERMUX','VOICE'],scenarios
});
if(report.status!=='INDEPENDENT_ORACLE_EFFECTS_OBSERVED'||
 report.oracleDependencies.TERMUX.length!==1||
 report.oracleDependencies.TERMUX[0]!==paths[0]||
 report.oracleDependencies.VOICE.length!==1||
 report.oracleDependencies.VOICE[0]!==paths[1]||
 report.causalityVerified!==false||report.remoteWrites!==false)
 throw Error('ORIGINAL_JVM_FACTORIAL_FALSE_CAUSALITY');
const receipt={
 schema:'ultra-sentinel-pinned-dual-policy-original-jvm-factorial/v1',
 sourceCommit:'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868',
 originalTermuxBlob:'7c6f326cb267b56f4ca6b2d0614753695259da56',
 originalVoiceBlob:'606d1184e7d57e49ef15b983a8646706abadf3da',
 status:'TWO_ORIGINAL_KOTLIN_ORACLES_INDEPENDENT_NOT_CAUSAL',
 report,artifacts,androidDeviceTested:false,remoteWrites:false,mergeAllowed:false
};
fs.writeFileSync(p.join(root,'dual-policy-factorial-receipt.json'),
 JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('PINNED_DUAL_KOTLIN_ORACLE_FACTORIAL_INDEPENDENCE_PASS');
JS

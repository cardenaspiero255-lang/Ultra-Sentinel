#!/usr/bin/env bash
# Original, blob-pinned JARVIS PreviewTimeGate: two clock-reversal paths.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_CROSSFILE_ISOLATED:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
for cmd in kotlinc java git bwrap node sha256sum; do command -v "$cmd" >/dev/null; done
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
blob=61836b0adc6f617d732c98fefb26a684b58c5f28
test "$(git hash-object "$root/preview.original.kt")" = "$blob"
umask 077
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path');
const {blobSha}=require('./packages/investigation/novel-kotlin-hypotheses.cjs');
const {scanKotlinPolicyBoundaries}=
 require('./packages/investigation/kotlin-policy-boundaries.cjs');
const root=process.argv[2],original=fs.readFileSync(p.join(root,'preview.original.kt'),'utf8');
const head='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const pin='61836b0adc6f617d732c98fefb26a684b58c5f28';
const file='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/HandsFreePreviewPolicy.kt';
if(blobSha(original)!==pin)throw Error('ORIGINAL_PREVIEW_BLOB_MISMATCH');
const active='if (nowMillis < began || nowMillis < 0L) return false';
const remaining='if (nowMillis < began || nowMillis < 0L) return 0L';
if(original.split(active).length!==2||original.split(remaining).length!==2)
 throw Error('UNIQUE_PREVIEW_PATTERN_MISSING');
const unsafe=original.replace(active,
 'if (nowMillis < began || nowMillis < 0L) { stop(); return false }');
const candidate=unsafe.replace(remaining,
 'if (nowMillis < began || nowMillis < 0L) { stop(); return 0L }');
function scan(source){
 const out=scanKotlinPolicyBoundaries({expectedCommitSha:head,
  files:[{path:file,source,expectedBlobSha:blobSha(source)}]});
 if(out.status.startsWith('BLOCKED_'))throw Error('PREVIEW_SCAN_INVALID');
 return out.findings.filter(f=>f.rule.startsWith('PREVIEW_')).map(f=>f.rule).sort();
}
const originalRisks=scan(original),partialRisks=scan(unsafe),candidateRisks=scan(candidate);
if(originalRisks.length!==2||partialRisks.length!==1||
 partialRisks[0]!=='PREVIEW_REMAINING_REVIVAL_AFTER_CLOCK_ROLLBACK'||
 candidateRisks.length!==0)throw Error('PREVIEW_MULTI_PATH_RISK_SCAN_FAILED');
fs.writeFileSync(p.join(root,'preview.unsafe.kt'),unsafe,{flag:'wx',mode:0o600});
fs.writeFileSync(p.join(root,'preview.candidate.kt'),candidate,{flag:'wx',mode:0o600});
fs.writeFileSync(p.join(root,'preview-static-receipt.json'),JSON.stringify({
 schema:'ultra-sentinel-pinned-preview-clock-static/v1',
 sourceCommit:head,sourceBlob:pin,originalRisks,partialRisks,
 candidateRisks,originalOracleExecutedHere:false,
 autoFix:false,remoteWrites:false,mergeAllowed:false
},null,2)+'\n',{flag:'wx',mode:0o600});
JS
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
test -x "$jdk/bin/java"
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
run_java(){
 local mode="$1"
 env -i PATH=/usr/bin:/bin HOME=/tmp \
 bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
 "${mounts[@]}" --ro-bind "$jdk" /jdk --ro-bind "$root" /workspace \
 --proc /proc --dev /dev --tmpfs /tmp --dir /home --chdir /workspace \
 -- /jdk/bin/java -jar "/workspace/preview_$mode.jar" > "$root/preview_$mode.log" 2>&1
}
for mode in original unsafe candidate; do
 source="$root/preview.$mode.kt"
 hash="$(sha256sum "$source" | cut -d' ' -f1)"
 kotlinc "$source" "$repo_root/tests/oracles/jarvis-preview-clock-original.kt" \
 -include-runtime -d "$root/preview_$mode.jar" > "$root/preview_$mode.compile" 2>&1
 test -s "$root/preview_$mode.jar"
 test "$(sha256sum "$source" | cut -d' ' -f1)" = "$hash"
 chmod 0400 "$root/preview_$mode.jar"
 set +e
 run_java "$mode"
 status=$?
 set -e
 case "$mode" in
  original) test "$status" -ne 0
    grep -Fq 'PREVIEW_ACTIVE_CLOCK_REVIVAL' "$root/preview_$mode.log";;
  unsafe) test "$status" -ne 0
    grep -Fq 'PREVIEW_REMAINING_CLOCK_REVIVAL' "$root/preview_$mode.log";;
  candidate) test "$status" -eq 0
    grep -Fxq 'PREVIEW_CLOCK_ORIGINAL_ORACLE_PASS' "$root/preview_$mode.log";;
 esac
done
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path'),c=require('node:crypto');
const root=process.argv[2],sha=b=>c.createHash('sha256').update(b).digest('hex');
const artifacts={};
for(const mode of ['original','unsafe','candidate']){
 const read=ext=>fs.readFileSync(p.join(root,'preview_'+mode+ext));
 artifacts[mode]={sourceSha256:sha(fs.readFileSync(p.join(root,'preview.'+mode+'.kt'))),
  jarSha256:sha(read('.jar')),compileLogSha256:sha(read('.compile')),
  oracleLogSha256:sha(read('.log')),
  verdict:mode==='candidate'?'GREEN':'RED'};
}
fs.writeFileSync(p.join(root,'preview-clock-jvm-receipt.json'),JSON.stringify({
 schema:'ultra-sentinel-original-preview-clock-jvm/v1',
 sourceRepo:'cardenaspiero255-lang/JARVIS',
 sourceCommit:'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868',
 sourceBlob:'61836b0adc6f617d732c98fefb26a684b58c5f28',
 originalRed:true,unsafeControlRejected:true,candidateGreen:true,
 physicalAndroidClockRollbackProven:false,
 remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
 artifacts
},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('AUTHENTIC_JARVIS_PREVIEW_CLOCK_ORIGINAL_RED_GREEN_UNSAFE_VETO_PASS');
JS

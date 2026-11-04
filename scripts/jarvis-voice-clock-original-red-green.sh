#!/usr/bin/env bash
# Independent JARVIS VoiceRecognitionRequestGate original-source JVM oracle.
# Caller must have fetched original voice.kt from pinned JARVIS commit+Git blob.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${JARVIS_TERMUX_ISOLATED:-}" = 1
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
for tool in git jq bwrap java kotlinc node sha256sum; do command -v "$tool" >/dev/null; done
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root"
umask 077
blob=606d1184e7d57e49ef15b983a8646706abadf3da
test "$(git hash-object "$root/voice.kt")" = "$blob"
cp -- "$root/voice.kt" "$root/voice_original.kt"
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path');
const {blobSha}=require('./packages/investigation/novel-kotlin-hypotheses.cjs');
const {planNovelKotlinCandidates}=
 require('./packages/investigation/novel-kotlin-candidate-intake.cjs');
const root=process.argv[2],original=fs.readFileSync(p.join(root,'voice.kt'),'utf8');
const expected='606d1184e7d57e49ef15b983a8646706abadf3da';
if(blobSha(original)!==expected)throw Error('VOICE_SOURCE_BLOB_CHANGED');
const needle='if (nowMillis < started) return false';
if(original.indexOf(needle)===-1||original.indexOf(needle)!==original.lastIndexOf(needle))
 throw Error('VOICE_SOURCE_TRANSFORMATION_AMBIGUOUS');
const candidate=original.replace(needle,
 'if (nowMillis < started) { cancel(); return false }');
const unsafeNeedle='return elapsed >= 0L && elapsed < MAX_RESULT_AGE_MILLIS';
if(!candidate.includes(unsafeNeedle))throw Error('VOICE_UNSAFE_CONTROL_MISSING');
const unsafe=candidate.replace(unsafeNeedle,'return false');
const srcPath='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceRecognitionRequestGate.kt';
const proposal=planNovelKotlinCandidates({
 expectedCommitSha:'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868',
 files:[{path:srcPath,source:original,expectedBlobSha:expected}],
 proposals:[{path:srcPath,rule:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',
  candidateSource:candidate,expectedCandidateBlobSha:blobSha(candidate)}]
});
if(proposal.status!=='CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE'||
 proposal.candidates.length!==1||proposal.originalFunctionalOracleVerified!==false||
 proposal.remoteWrites!==false||proposal.mergeAllowed!==false)
 throw Error('VOICE_GENERIC_CANDIDATE_INTAKE_REJECTED');
fs.writeFileSync(p.join(root,'voice_candidate.kt'),candidate,{flag:'wx',mode:0o600});
fs.writeFileSync(p.join(root,'voice_unsafe.kt'),unsafe,{flag:'wx',mode:0o600});
fs.writeFileSync(p.join(root,'voice-intake-receipt.json'),JSON.stringify(proposal)+'\n',
 {flag:'wx',mode:0o600});
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
 -- /jdk/bin/java -jar "/workspace/voice_$mode.jar" > "$root/voice_$mode.log" 2>&1
}
for mode in original unsafe candidate; do
 source="$root/voice_$mode.kt"
 before="$(sha256sum "$source" | cut -d' ' -f1)"
 kotlinc "$source" "$repo_root/tests/oracles/jarvis-voice-clock-original.kt" \
  -include-runtime -d "$root/voice_$mode.jar" > "$root/voice_$mode.compile" 2>&1
 test -s "$root/voice_$mode.jar"
 test "$(sha256sum "$source" | cut -d' ' -f1)" = "$before"
 chmod 0400 "$root/voice_$mode.jar"
 set +e
 run_java "$mode"
 code=$?
 set -e
 test "$(sha256sum "$source" | cut -d' ' -f1)" = "$before"
 case "$mode" in
  original) test "$code" -ne 0; grep -Fq 'CLOCK_REWIND_REANIMATED' "$root/voice_$mode.log";;
  unsafe) test "$code" -ne 0; grep -Fq 'NORMAL_PENDING_REJECTED' "$root/voice_$mode.log";;
  candidate) test "$code" -eq 0; grep -Fxq 'VOICE_CLOCK_ORIGINAL_ORACLE_PASS' "$root/voice_$mode.log";;
 esac
done
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path'),c=require('node:crypto');
const root=process.argv[2],sha=s=>c.createHash('sha256').update(s).digest('hex');
const receipts={};
for(const mode of ['original','unsafe','candidate']){
 const hash=ext=>sha(fs.readFileSync(p.join(root,'voice_'+mode+ext)));
 receipts[mode]={sourceSha256:hash('.kt'),compileLogSha256:hash('.compile'),
  jarSha256:hash('.jar'),oracleLogSha256:hash('.log'),
  verdict:mode==='candidate'?'GREEN':'RED'};
}
const out={
 schema:'ultra-sentinel-jarvis-original-voice-clock-oracle/v1',
 sourceRepo:'cardenaspiero255-lang/JARVIS',
 sourceCommit:'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868',
 originalGitBlob:'606d1184e7d57e49ef15b983a8646706abadf3da',
 riskFamily:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',
 candidateFromGenericIntake:true,
 originalRed:true,candidateGreen:true,unsafeControlRejected:true,
 originalAndroidDeviceVerified:false,physicalClockRollbackProven:false,
 automaticRootCauseDiscoveryProven:false,ownerAuthorizationVerified:false,
 remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
 receipts
};
fs.writeFileSync(p.join(root,'voice-clock-oracle-receipt.json'),JSON.stringify(out,null,2)+'\n',
 {flag:'wx',mode:0o600});
JS
echo JARVIS_PINNED_VOICE_CLOCK_ORIGINAL_JVM_RED_GREEN_AND_UNSAFE_VETO_PASS

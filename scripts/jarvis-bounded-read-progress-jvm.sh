#!/usr/bin/env bash
# Reproduce one unregistered JARVIS source hypothesis; no repository writes.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns)" = 1
test "$#" -eq 1
for cmd in gh jq git base64 java bwrap node sha256sum timeout; do command -v "$cmd" >/dev/null; done
test -n "${GH_TOKEN:-}" && test -n "${JARVIS_KOTLIN_HOME:-}"
umask 077
mkdir "$1"
root="$(realpath "$1")"
test -d "$root" && test ! -L "$root" && test -z "$(ls -A "$root")"
repo=cardenaspiero255-lang/JARVIS
head=747c14b5d97750a7b2736968e2d516f02448558d
main=apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt
testfile=apps/android/app/src/test/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStreamTest.kt
for item in "source:$main:fd061b9dad636684184ccf2e96f87084d3b99df5" \
            "test:$testfile:88b1a59b3713273ffdd72c92b2fc38476d00bfd6"; do
 IFS=: read -r label remote blob <<< "$item"
 gh api "/repos/$repo/contents/$remote?ref=$head" > "$root/meta.json"
 jq -e --arg p "$remote" --arg b "$blob" \
  '.type=="file" and .path==$p and .sha==$b and .encoding=="base64" and .size>100 and .size<60000' \
  "$root/meta.json" >/dev/null
 jq -r .content "$root/meta.json" | base64 --decode > "$root/$label.kt"
 test "$(git hash-object "$root/$label.kt")" = "$blob"
 rm -- "$root/meta.json"
done
unset GH_TOKEN GITHUB_TOKEN
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path');
const {blobSha}=require('./packages/investigation/novel-kotlin-hypotheses.cjs');
const {draftBoundedReadProgressRepair}=require('./packages/investigation/bounded-read-progress-repair.cjs');
const {makeUnsafeReadProgressControl}=require('./packages/recovery/bounded-read-progress-functional-judge.cjs');
const {bindPinnedBoundedReadCandidate}=require('./packages/recovery/pinned-bounded-read-local-bridge.cjs');
const root=process.argv[2],source=fs.readFileSync(p.join(root,'source.kt'),'utf8');
const fixture=fs.readFileSync('tests/fixtures/jarvis-bounded-image/BoundedImageInputStream.kt','utf8');
const pathname='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt';
if(source!==fixture||blobSha(source)!=='fd061b9dad636684184ccf2e96f87084d3b99df5')
 throw Error('ORIGINAL_SOURCE_MISMATCH');
const draft=draftBoundedReadProgressRepair({expectedCommitSha:'747c14b5d97750a7b2736968e2d516f02448558d',
 file:{path:pathname,source,expectedBlobSha:blobSha(source)}});
if(draft.status!=='CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE'||draft.remoteWrites!==false)
 throw Error('GENERIC_DRAFT_REJECTED');
const binding=bindPinnedBoundedReadCandidate({source,candidateSource:draft.candidateSource});
if(binding.status!=='PINNED_LOCAL_FIXER_CANDIDATE_MATCHED_NOT_JVM_ATTESTED'||
 binding.originalBlobSha!==blobSha(source)||
 binding.candidateBlobSha!==blobSha(draft.candidateSource)||
 binding.originalJVMExecutionAuthenticated!==false||binding.remoteWrites!==false)
 throw Error('PINNED_FIXER_BEFORE_JVM_VETO');
const inputs={original:source,candidate:draft.candidateSource,
 unsafe:makeUnsafeReadProgressControl(draft.candidateSource)};
for(const [mode,value] of Object.entries(inputs)){
 const dest=p.join(root,mode,'input');
 fs.mkdirSync(dest,{recursive:true,mode:0o700});
 fs.mkdirSync(p.join(root,mode,'out'),{mode:0o700});
 fs.writeFileSync(p.join(dest,'source.kt'),value,{flag:'wx',mode:0o400});
 fs.copyFileSync(p.join(root,'test.kt'),p.join(dest,'original-tests.kt'));
 fs.copyFileSync('tests/oracles/jarvis-bounded-read-progress.kt',p.join(dest,'oracle.kt'));
}
JS
jdk="$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"
kotlin_home="$(realpath "$JARVIS_KOTLIN_HOME")"
test -x "$jdk/bin/java" && test -x "$kotlin_home/bin/kotlinc"
test -f /usr/share/java/junit4.jar && test -f /usr/share/java/hamcrest-core.jar
mounts=(--ro-bind /usr /usr)
for mount in /bin /lib /lib64; do
 if [ -L "$mount" ]; then
  dest="$(readlink "$mount")"
  [[ "$dest" != /* && "$dest" != *..* ]] || exit 2
  mounts+=(--symlink "$dest" "$mount")
 elif [ -d "$mount" ]; then mounts+=(--ro-bind "$mount" "$mount")
 else exit 2; fi
done
isolated(){
 local mode="$1" access="$2"; shift 2
 local output_mount
 case "$access" in compile) output_mount=--bind ;; run) output_mount=--ro-bind ;; *) return 2 ;; esac
 timeout --kill-after=5 120 env -i PATH=/usr/bin:/bin HOME=/tmp \
 bwrap --die-with-parent --unshare-all --new-session --clearenv \
 --setenv PATH /usr/bin:/bin --setenv HOME /tmp --setenv JAVA_HOME /jdk \
 --setenv JAVA_OPTS -Xmx512m "${mounts[@]}" \
 --ro-bind "$jdk" /jdk --ro-bind "$kotlin_home" /kotlin \
 --ro-bind "$root/$mode/input" /input "$output_mount" "$root/$mode/out" /out \
 --proc /proc --dev /dev --tmpfs /tmp --chdir /tmp -- "$@"
}
classpath=/out/tests.jar:/usr/share/java/junit4.jar:/usr/share/java/hamcrest-core.jar
for mode in original candidate unsafe; do
 input="$root/$mode/input"
 sourcehash="$(sha256sum "$input/source.kt" | cut -d' ' -f1)"
 oraclehash="$(sha256sum "$input/oracle.kt" | cut -d' ' -f1)"
 test "$(git hash-object "$input/original-tests.kt")" = 88b1a59b3713273ffdd72c92b2fc38476d00bfd6
 isolated "$mode" compile /kotlin/bin/kotlinc /input/source.kt /input/oracle.kt \
  /input/original-tests.kt -classpath /usr/share/java/junit4.jar:/usr/share/java/hamcrest-core.jar \
  -include-runtime -d /out/tests.jar > "$root/$mode/compile.log" 2>&1
 test -s "$root/$mode/out/tests.jar"
 jarhash="$(sha256sum "$root/$mode/out/tests.jar" | cut -d' ' -f1)"
 for kind in oracle junit; do
  set +e
  if [ "$kind" = oracle ]; then
   isolated "$mode" run /jdk/bin/java -Xmx512m -cp "$classpath" \
    com.cardenaspiero255.jarvis.core.OracleKt > "$root/$mode/$kind.log" 2>&1
  else
   isolated "$mode" run /jdk/bin/java -Xmx512m -cp "$classpath" \
    org.junit.runner.JUnitCore com.cardenaspiero255.jarvis.core.BoundedImageInputStreamTest > "$root/$mode/$kind.log" 2>&1
  fi
  code=$?
  set -e
  printf '%s\n' "$code" > "$root/$mode/$kind.exit"
  test "$(sha256sum "$root/$mode/out/tests.jar" | cut -d' ' -f1)" = "$jarhash"
 done
 test "$(sha256sum "$input/source.kt" | cut -d' ' -f1)" = "$sourcehash"
 test "$(sha256sum "$input/oracle.kt" | cut -d' ' -f1)" = "$oraclehash"
 test "$(git hash-object "$input/original-tests.kt")" = 88b1a59b3713273ffdd72c92b2fc38476d00bfd6
done
node - "$root" <<'JS'
'use strict';
const fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto');
const {blobSha}=require('./packages/investigation/novel-kotlin-hypotheses.cjs');
const {bindPinnedBoundedReadFunctionalEvidence}=require('./packages/recovery/pinned-bounded-read-local-bridge.cjs');
const {assessPhaseOneCase}=require('./packages/recovery/phase1-same-case-evidence-gate.cjs');
const root=process.argv[2],sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function read(name,max=30000){
 const file=p.join(root,name),s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>max)throw Error('UNTRUSTED_ARTIFACT');
 return fs.readFileSync(file);
}
const results={},artifacts={};
for(const mode of ['original','candidate','unsafe']){
 const base=mode+'/',source=read(base+'input/source.kt').toString('utf8');
 const oracle=read(base+'oracle.log').toString('utf8'),junit=read(base+'junit.log').toString('utf8');
 const exit=kind=>{const text=read(base+kind+'.exit',8).toString('utf8');
  if(!/^\d+\n$/.test(text))throw Error('BAD_EXIT');return Number(text);};
 results[mode]={oracleExit:exit('oracle'),oracleLog:oracle,
  junitExit:exit('junit'),junitLog:junit};
 artifacts[mode]={sourceBlob:blobSha(source),sourceSha256:sha(Buffer.from(source)),
  jarSha256:sha(read(base+'out/tests.jar',10000000)),
  oracleLogSha256:sha(Buffer.from(oracle)),junitLogSha256:sha(Buffer.from(junit))};
}
const source=read('source.kt').toString('utf8');
const file={path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt',
 source,expectedBlobSha:'fd061b9dad636684184ccf2e96f87084d3b99df5'};
const result=bindPinnedBoundedReadFunctionalEvidence({source,
 candidateSource:read('candidate/input/source.kt').toString('utf8'),
 unsafeSource:read('unsafe/input/source.kt').toString('utf8'),results});
const originalCommittedCase=assessPhaseOneCase({
 expectedCommitSha:'747c14b5d97750a7b2736968e2d516f02448558d',
 files:[file],
 proposals:[{path:file.path,rule:'BOUNDED_READ_ZERO_PROGRESS',
  candidateSource:read('candidate/input/source.kt').toString('utf8'),
  expectedCandidateBlobSha:artifacts.candidate.sourceBlob}],
 localEvidence:[{path:file.path,rule:'BOUNDED_READ_ZERO_PROGRESS',
  originalBlobSha:file.expectedBlobSha,candidateBlobSha:artifacts.candidate.sourceBlob}]
});
if(originalCommittedCase.status!=='LOCAL_HISTORICAL_CASE_VERIFIED_NOT_PHASE_ONE_CLOSED'||
 originalCommittedCase.localGitRollbackVerified!==true||
 originalCommittedCase.phaseOneClosed!==false||
 originalCommittedCase.originalJVMExecutionAuthenticated!==false||
 originalCommittedCase.novelCaseProven!==false||
 originalCommittedCase.remoteWrites!==false)
 throw Error('PHASE_ONE_SAME_CASE_GATE_VETO');
if(result.status!=='PINNED_FIXER_LOCAL_FUNCTIONAL_JUDGE_MATCHED_UNATTESTED'||
 result.functionalEvidenceConsistent!==true||
 result.sourceBlobSha!==file.expectedBlobSha||
 result.candidateBlobSha!==artifacts.candidate.sourceBlob||
 result.sourceBlobSha!==artifacts.original.sourceBlob||
 result.candidateBlobSha===artifacts.unsafe.sourceBlob||
 result.unsafeCandidateRejected!==true||result.localGitRollbackVerified!==true||
 result.originalJVMExecutionAuthenticated!==false||result.remoteWrites!==false||
 result.mergeAllowed!==false)throw Error('PINNED_FIXER_FUNCTIONAL_JUDGE_VETO');
fs.writeFileSync(p.join(root,'receipt.json'),JSON.stringify({
 schema:'ultra-sentinel-jarvis-bounded-read-jvm/v1',sourceRepository:'cardenaspiero255-lang/JARVIS',
 sourceCommit:'747c14b5d97750a7b2736968e2d516f02448558d',sourceBlob:file.expectedBlobSha,
 originalTestBlob:'88b1a59b3713273ffdd72c92b2fc38476d00bfd6',
 oracleSha256:sha(read('candidate/input/oracle.kt')),artifacts,
 originalRed:true,candidateGreen:true,originalJUnitPassed:true,
 unsafeCandidateRejected:true,localExactRollback:true,
 pinnedFixerCandidateBlob:result.candidateBlobSha,
 sameRunFixerCandidateBoundToJVMOutcomes:true,
 sourceAndCandidateBlobsMatchedActualArtifacts:true,
 pinnedFixerLocalGitJudgeRollbackVerified:true,
 executionAuthenticatedByBindingModule:false,
 phaseOneSameCaseGateStatus:originalCommittedCase.status,
 phaseOneClosed:false,novelOriginalCaseProven:false,
 sameCaseLocalRollbackVerified:originalCommittedCase.localGitRollbackVerified,
 sourceAuthenticationByThisReceipt:false,androidDeviceObserved:false,
 remoteWrites:false,mergeAllowed:false,productionReleaseCertified:false
},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('JARVIS_BOUNDED_READ_REAL_JVM_RED_GREEN_JUDGE_ROLLBACK_PASS');
JS

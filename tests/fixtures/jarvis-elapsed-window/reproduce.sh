#!/usr/bin/env bash
# Blind intake first, independent original Kotlin/JVM oracle second.
# Runs only inside a previously authenticated networkless Bubblewrap/AppArmor CI
# boundary, over a pinned read-only original JARVIS checkout. No production writes.
set -euo pipefail
[ "$#" -eq 3 ] || { echo 'Usage: reproduce.sh JARVIS KOTLINC_ROOT SENTINEL' >&2; exit 2; }
original=$(realpath "$1")
kotlin=$(realpath "$2")
sentinel=$(realpath "$3")
evidence="$sentinel/tests/fixtures/jarvis-elapsed-window"
export GIT_NO_REPLACE_OBJECTS=1 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
head=747c14b5d97750a7b2736968e2d516f02448558d
rel=apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/SafeAutomationEngine.kt
blob=ac73f8fcd1f5c9f578247ba4c653204cd3369cb9
kgit(){ git -C "$original" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }
[ "$(kgit rev-parse HEAD)" = "$head" ]
[ -z "$(kgit status --porcelain)" ]
[ "$(kgit rev-parse "HEAD:$rel")" = "$blob" ]
[ "$(git hash-object "$original/$rel")" = "$blob" ]
[ "$("$kotlin/bin/kotlinc" -version 2>&1 | head -n1 | cut -d' ' -f2-3)" = 'kotlinc-jvm 2.0.21' ]
umask 077
work=$(mktemp -d /tmp/sentinel-blind-consent-XXXXXXXX)
trap 'rm -rf "$work"' EXIT
mkdir "$work/candidate" "$work/wrong"
# Crucially: this first-pass Hunter sees the entire pinned core Kotlin inventory.
# It receives neither the expected target filename nor rule nor patch/oracle.
node - "$original" "$sentinel" "$head" "$work/discovery.json" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const [root,sentinel,head,destination]=process.argv.slice(2);
const {scanBlindElapsedWindows}=require(path.join(sentinel,
 'packages/family-hunter/blind-elapsed-window.cjs'));
const folder='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core';
const files=fs.readdirSync(path.join(root,folder)).filter(name=>name.endsWith('.kt')).sort().map(name=>{
 const rel=folder+'/'+name,source=fs.readFileSync(path.join(root,rel),'utf8');
 const env={PATH:process.env.PATH,HOME:'/tmp',GIT_NO_REPLACE_OBJECTS:'1',
  GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
 const expectedBlobSha=execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','rev-parse','HEAD:'+rel],
  {encoding:'utf8',env,timeout:10000}).trim();
 return {path:rel,source,expectedBlobSha};
});
if(files.length!==66)throw Error('ORIGINAL_INVENTORY_CHANGED');
const result=scanBlindElapsedWindows({expectedCommitSha:head,files});
if(result.status!=='UNVERIFIED_ELAPSED_WINDOW_HYPOTHESES'||
 result.filesScanned!==66||result.findings.length<1||
 result.originalFunctionalOracleVerified!==false||result.remoteWrites!==false||
 result.mergeAllowed!==false||result.sourceRepositoryAuthenticated!==false)
 throw Error('BLIND_SOURCE_DISCOVERY_FAILED');
fs.writeFileSync(destination,JSON.stringify(result),{encoding:'utf8',flag:'wx',mode:0o600});
console.log('blind_source_scan=PASS');
console.log('blind_source_count='+result.filesScanned);
console.log('blind_unverified_findings='+result.findings.length);
JS
# The verifier knows the held-out contract and target only AFTER Hunter's
# first-pass report has been sealed. No mutation of the original JARVIS tree.
node - "$original" "$sentinel" "$head" "$rel" "$blob" "$work/discovery.json" "$work/candidate/SafeAutomationEngine.kt" <<'JS'
'use strict';
const fs=require('node:fs'),path=require('node:path');
const [root,sentinel,head,rel,blob,reportPath,candidatePath]=process.argv.slice(2);
const {sha}=require(path.join(sentinel,'packages/family-hunter/blind-elapsed-window.cjs'));
const {draftElapsedWindowCandidate}=require(path.join(sentinel,'packages/recovery/elapsed-window-candidate.cjs'));
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const finding=report.findings.filter(f=>f.path===rel&&f.rule==='SIGNED_ELAPSED_WINDOW_UNDERFLOW');
if(finding.length!==1)throw Error('HELD_OUT_HYPOTHESIS_NOT_DISCOVERED');
const source=fs.readFileSync(path.join(root,rel),'utf8');
if(sha(source)!==blob||finding[0].sourceBlobSha!==blob)throw Error('PINNED_ORIGINAL_CHANGED');
const draft=draftElapsedWindowCandidate({expectedCommitSha:head,
 file:{path:rel,source,expectedBlobSha:blob},finding:finding[0]});
if(draft.status!=='CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE'||
 draft.rule!==finding[0].rule||draft.remoteWrites!==false||
 draft.mergeAllowed!==false||draft.originalFunctionalOracleVerified!==false||
 sha(draft.candidateSource)!==draft.candidateBlobSha)
 throw Error('SCOPED_FIXER_REJECTED');
fs.writeFileSync(candidatePath,draft.candidateSource,{flag:'wx',mode:0o600});
console.log('blind_discovery_then_scoped_fixer=PASS (no verified repair yet)');
JS
# Deliberately incorrect candidate: prevents legitimate positive actions;
# independent oracle must reject it even if the stale authorization is fixed.
python3 - "$work/candidate/SafeAutomationEngine.kt" "$work/wrong/SafeAutomationEngine.kt" <<'PY'
from pathlib import Path
import sys
src=Path(sys.argv[1]).read_text()
old='                emergencyStopped = false'
assert src.count(old)==1
Path(sys.argv[2]).write_text(src.replace(old,'                emergencyStopped = true'),encoding='utf8')
PY
"$kotlin/bin/kotlinc" "$original/$rel" "$evidence/OriginalConsentOracle.kt" \
 -include-runtime -d "$work/original.jar"
"$kotlin/bin/kotlinc" "$work/candidate/SafeAutomationEngine.kt" "$evidence/OriginalConsentOracle.kt" \
 -include-runtime -d "$work/candidate.jar"
"$kotlin/bin/kotlinc" "$work/wrong/SafeAutomationEngine.kt" "$evidence/OriginalConsentOracle.kt" \
 -include-runtime -d "$work/wrong.jar"
# Judge operates on disposable local Git commit, never the source checkout.
git -c core.hooksPath=/dev/null clone --no-hardlinks -q "$original" "$work/disposable"
git -C "$work/disposable" remote remove origin
git -C "$work/disposable" switch -q -c sandbox/blind-elapsed-window
cp "$work/candidate/SafeAutomationEngine.kt" "$work/disposable/$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null add -- "$rel"
git -C "$work/disposable" -c core.hooksPath=/dev/null -c user.name='Sentinel sandbox' \
 -c user.email='sandbox@example.invalid' -c commit.gpgsign=false \
 commit -qm 'sandbox: blind discovery signed elapsed window'
node - "$work/disposable" "$sentinel" "$work" "$head" "$rel" "$blob" <<'JS'
'use strict';
const {execFileSync,spawnSync}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const [directory,sentinel,work,expectedHead,rel,blob]=process.argv.slice(2);
const env={PATH:process.env.PATH,HOME:'/tmp',JAVA_HOME:process.env.JAVA_HOME,
 GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{
 cwd:directory,encoding:'utf8',timeout:10000,env}).trim();
const head=git('rev-parse','HEAD'),baseline=git('rev-parse','HEAD^');
const before=git('rev-parse',baseline+':'+rel),after=git('rev-parse',head+':'+rel);
const originalTree=git('rev-parse',baseline+'^{tree}');
const bytes=fs.readFileSync(path.join(work,'candidate/SafeAutomationEngine.kt'));
const candidateSha=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
if(baseline!==expectedHead||before!==blob||after!==candidateSha)throw Error('SOURCE_PROVENANCE_FAILED');
const run=(jar)=>{
 const p=spawnSync('java',['-XX:-UsePerfData','-cp',path.join(work,jar),
  'com.cardenaspiero255.jarvis.core.OriginalConsentOracleKt'],{
  cwd:directory,encoding:'utf8',timeout:15000,maxBuffer:65536,env});
 if(p.error||p.signal||!Number.isSafeInteger(p.status)||p.stdout.length>8192||p.stderr.length>8192)
   throw Error('JVM_PROCESS_UNVERIFIED');
 return p;
};
let oracleAccepted=false,judge=null,rollback=null;
try{
 const original=run('original.jar'),candidate=run('candidate.jar'),wrong=run('wrong.jar');
 const lines=['benign_preview_accepted=PASS','ordinary_expiry=PASS','signed_overflow_expiry=PASS',
  'stop_revokes_consent=PASS','INDEPENDENT_CONSENT_ORACLE_PASS'];
 const red=original.status!==0&&original.stderr.includes('STALE_PREVIEW_AUTHORIZED')&&
  original.stdout.includes('benign_preview_accepted=PASS');
 const green=candidate.status===0&&candidate.stderr===''&&
  lines.every(x=>candidate.stdout.split('\n').filter(l=>l===x).length===1);
 const veto=wrong.status!==0&&wrong.stderr.includes('BENIGN_PREVIEW_REGRESSION');
 oracleAccepted=red&&green&&veto;
 console.log(JSON.stringify({originalRed:red,candidateGreen:green,unsafeVeto:veto,
  independentJvmOracleAccepted:oracleAccepted,ownerAuthorizationGranted:false,
  remoteWrites:false,mergeAllowed:false}));
 if(!oracleAccepted)throw Error('INDEPENDENT_ORIGINAL_ORACLE_VETO');
 const executed=require(path.join(sentinel,'packages/recovery/phase2-executed-jvm-triplet.cjs'))
  .executeOriginalJvmTriplet({
    directory:work,mainClass:'com.cardenaspiero255.jarvis.core.OriginalConsentOracleKt',
    caseId:'SIGNED_ELAPSED_WINDOW_UNDERFLOW',
    sourceHeadSha:baseline,originalBlobSha:before,candidateBlobSha:after,
    markers:{originalFailure:'STALE_PREVIEW_AUTHORIZED',
      green:['BENIGN_PREVIEW_PASS','CONSENT_BOUNDARY_ORACLE_PASS'],
      unsafeFailure:'BENIGN_PREVIEW_REGRESSION'}
  });
 if(executed.status!=='LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED'||
   executed.jvmProcessesExecutedLocally!==true||
   executed.originalSourceAuthenticated!==false||
   executed.compilerProvenanceAuthenticated!==false||
   executed.gitJudgeExecuted!==false||
   executed.remoteWrites!==false||executed.mergeAllowed!==false)
   throw Error('EXECUTED_GENERIC_JVM_JUDGE_VETO');
 console.log('executed_generic_jvm_judge=PASS');
 console.log(JSON.stringify({status:executed.status,caseId:executed.caseId,
   artifactsSha256:executed.artifactsSha256,
   originalSourceAuthenticatedByBridge:false,
   compilerProvenanceAuthenticatedByBridge:false,gitPolicyCheckedSeparately:true,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false}));
 const patchBytes=Buffer.byteLength(git('diff','--binary',baseline,head));
 const plan={branch:'sandbox/blind-elapsed-window',expectedHeadSha:baseline,
  changes:[{path:rel,beforeBlobSha:before,afterBlobSha:after,patchBytes}]};
 judge=require(path.join(sentinel,'packages/recovery/repair-judge.cjs'))
  .judgeLocalRepair({directory,baselineHeadSha:baseline,repairHeadSha:head,plan});
 if(!judge.approved||judge.status!=='APPROVED_LOCAL_POLICY_ONLY')
  throw Error('LOCAL_POLICY_JUDGE_VETO');
}finally{
 rollback=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs'))
  .rollbackSandbox({directory,baselineHeadSha:baseline,repairHeadSha:head});
 if(rollback.status!=='ROLLBACK_VERIFIED'||rollback.restoredTree!==originalTree||
  git('status','--porcelain')!==''||git('rev-parse','HEAD:'+rel)!==before)
  throw Error('EXACT_ROLLBACK_VETO');
 console.log(JSON.stringify({rollbackStatus:rollback.status,exactGitTreeRestored:true,
  ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false}));
}
if(!oracleAccepted||!judge?.approved)throw Error('NO_JOINT_JUDGE_APPROVAL');
console.log('BLIND_KOTLIN_ORIGINAL_RED_GREEN_VETO_ROLLBACK=PASS');
JS
[ "$(kgit rev-parse HEAD)" = "$head" ]
[ -z "$(kgit status --porcelain)" ]
[ "$(git hash-object "$original/$rel")" = "$blob" ]

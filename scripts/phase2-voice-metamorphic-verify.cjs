'use strict';
/* Trusted isolated runner only. Do not import or expose this as a remotely
 * writable approval API. Original JVM oracle and candidate run independently. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const [directory,sentinel,work]=process.argv.slice(2);
if(!directory||!sentinel||!work)throw Error('RUNNER_ARGS_MISSING');
const file='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalGgufPolicy.kt';
const originalBlob='46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78';
const originalCommit='747c14b5d97750a7b2736968e2d516f02448558d';
const env={PATH:process.env.PATH,HOME:directory,GIT_NO_REPLACE_OBJECTS:'1',
 GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{
 cwd:directory,encoding:'utf8',env,timeout:15000}).trim();
const candidateHead=git('rev-parse','HEAD'),baseline=git('rev-parse','HEAD^');
const originalTree=git('rev-parse',baseline+'^{tree}');
const before=git('rev-parse',baseline+':'+file);
const after=git('rev-parse',candidateHead+':'+file);
const bytes=fs.readFileSync(path.join(work,'LocalGgufPolicy.kt'));
const actual=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
if(before!==originalBlob||after!==actual||baseline!==originalCommit)
 throw Error('METAMORPHIC_SOURCE_IDENTITY_REJECTED');
const run=(jar,mode)=>{
 const p=spawnSync('java',['-XX:-UsePerfData','-cp',path.join(work,jar),
  'com.cardenaspiero255.jarvis.core.VoiceBoundaryMetamorphicOracleKt',
  path.join(work,'metamorphic-corpus.tsv'),mode],{
  cwd:directory,encoding:'utf8',env,timeout:20000,maxBuffer:65536
 });
 if(p.error||p.signal||!Number.isSafeInteger(p.status)||
   typeof p.stdout!=='string'||typeof p.stderr!=='string')
  throw Error('UNTRUSTED_ORACLE_PROCESS');
 return {exitCode:p.status,stdout:p.stdout,stderr:p.stderr};
};
const original=run('original.jar','original');
const candidate=run('candidate.jar','candidate');
const unsafe=run('wrong.jar','unsafe');
const rows=original.stdout.split('\n');
const originalCount=Number(rows.find(s=>s.startsWith('voice_mutant_accepted_count='))?.split('=')[1]);
const probeCount=Number(rows.find(s=>s.startsWith('voice_probe_count='))?.split('=')[1]);
const green=candidate.stdout.split('\n');
const valid=original.exitCode===0&&candidate.exitCode===0&&unsafe.exitCode!==0&&
 Number.isSafeInteger(originalCount)&&Number.isSafeInteger(probeCount)&&
 probeCount>=6&&probeCount<=48&&originalCount>0&&originalCount<=probeCount&&
 rows.includes('voice_original_baseline_blocked=PASS')&&
 rows.includes('voice_benign_question_allowed=PASS')&&
 rows.includes('VOICE_METAMORPHIC_ORIGINAL_RED=PASS')&&
 green.includes('voice_probe_count='+probeCount)&&
 green.includes('voice_mutant_accepted_count=0')&&
 green.includes('voice_original_baseline_blocked=PASS')&&
 green.includes('voice_benign_question_allowed=PASS')&&
 green.includes('VOICE_METAMORPHIC_CANDIDATE_GREEN=PASS')&&
 unsafe.stderr.includes('BENIGN_READ_ONLY_REGRESSION');
const patchBytes=Buffer.byteLength(git('diff','--binary',baseline,candidateHead));
const plan={branch:'sandbox/voice-unregistered',expectedHeadSha:baseline,
 changes:[{path:file,beforeBlobSha:before,afterBlobSha:after,patchBytes}]};
const judge=require(path.join(sentinel,'packages/recovery/repair-judge.cjs'))
 .judgeLocalRepair({directory,baselineHeadSha:baseline,repairHeadSha:candidateHead,plan});
// Even if the Kotlin oracle vetoes a candidate, verify exact disposable rollback.
const rollback=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs'))
 .rollbackSandbox({directory,baselineHeadSha:baseline,repairHeadSha:candidateHead});
if(!valid||!judge.approved||judge.status!=='APPROVED_LOCAL_POLICY_ONLY'||
 rollback.status!=='ROLLBACK_VERIFIED'||rollback.restoredTree!==originalTree||
 git('status','--porcelain')!==''||git('rev-parse','HEAD:'+file)!==before)
 throw Error('NEW_VARIANT_FUNCTIONAL_JUDGE_OR_ROLLBACK_VETO');
console.log('voice_unregistered_original_RED=PASS');
console.log('voice_unregistered_candidate_GREEN=PASS');
console.log('voice_unregistered_wrong_candidate_VETO=PASS');
console.log(JSON.stringify({
 status:'LOCAL_SOURCE_DERIVED_VOICE_VARIANT_JVM_JUDGE_ROLLBACK',
 originalKotlinCommit:baseline,originalBlobSha:before,candidateBlobSha:after,
 generatedMutationCount:probeCount,originalAcceptedMutations:originalCount,
 candidateAcceptedMutations:0,originalRed:true,candidateGreen:true,
 benignControlPreserved:true,unsafeVariantVetoed:true,localGitJudgeApproved:true,
 exactRollbackVerified:true,historicalFamily:true,unregisteredVariantObserved:true,
 independentMultiFileRootCauseProven:false,
 generalizedAutonomousFixerVerified:false,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false
},null,2));

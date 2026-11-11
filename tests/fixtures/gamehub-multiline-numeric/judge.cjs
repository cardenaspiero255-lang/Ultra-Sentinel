'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const [sentinel,work,checkout]=process.argv.slice(2);
const item=JSON.parse(fs.readFileSync(path.join(work,'intervention.json'),'utf8'));
const verdict=require(path.join(sentinel,'packages/recovery/phase2-executed-jvm-triplet.cjs'))
 .executeOriginalJvmTriplet({directory:path.join(work,'jars'),
  mainClass:'com.cardenaspiero255.gamehubultra.storageproof.IndependentStorageOracleKt',
  caseId:'MULTILINE_STORAGE_OVERFLOW',sourceHeadSha:item.head,
  originalBlobSha:item.originalBlob,candidateBlobSha:item.candidateBlob,
  markers:{originalFailure:'EXTREME_STORAGE_MISMATCH',
   green:['BENIGN_STORAGE_PASS','STORAGE_ORACLE_PASS'],unsafeFailure:'BENIGN_STORAGE_REGRESSION'}});
if(verdict.status!=='LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED')throw Error('STORAGE_JVM_JUDGE_VETO');
const env={PATH:process.env.PATH,HOME:'/tmp',GIT_NO_REPLACE_OBJECTS:'1',
 GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
 '-c','commit.gpgsign=false',...args],{cwd:checkout,encoding:'utf8',env,timeout:30000}).trim();
if(git('remote')!==''||git('rev-parse','HEAD')!==item.head||git('status','--porcelain')!=='')
 throw Error('INVALID_SANDBOX_BASELINE');
fs.copyFileSync(path.join(work,'candidate.kt'),path.join(checkout,item.target));
git('add','--',item.target);
git('-c','user.name=Sentinel sandbox','-c','user.email=sandbox@example.invalid',
 'commit','-qm','sandbox: storage percentage intervention');
const repair=git('rev-parse','HEAD');
const change={path:item.target,beforeBlobSha:item.originalBlob,afterBlobSha:item.candidateBlob,
 patchBytes:Buffer.byteLength(git('diff','--binary',item.head,repair,'--',item.target))};
const policy=require(path.join(sentinel,'packages/recovery/repair-judge.cjs')).judgeLocalRepair({
 directory:checkout,baselineHeadSha:item.head,repairHeadSha:repair,
 plan:{branch:'sandbox/multiline-storage',expectedHeadSha:item.head,changes:[change]}});
if(!policy.approved||policy.status!=='APPROVED_LOCAL_POLICY_ONLY')throw Error('LOCAL_POLICY_VETO');
const rollback=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs')).rollbackSandbox({
 directory:checkout,baselineHeadSha:item.head,repairHeadSha:repair});
if(rollback.status!=='ROLLBACK_VERIFIED'||rollback.restoredTree!==git('rev-parse',item.head+'^{tree}')||
 git('status','--porcelain')!=='')throw Error('ROLLBACK_VETO');
console.log(JSON.stringify({status:verdict.status,artifactSha256:verdict.artifactsSha256,
 policy:policy.status,rollback:rollback.status,originalSource:item.originalBlob,
 candidateSource:item.candidateBlob,blindDiscovery:false,automatedFixer:false,
 newFamilyVerified:false,remoteWrites:false}));
console.log('MULTILINE_STORAGE_ORIGINAL_RED_GREEN_VETO_ROLLBACK_PASS');

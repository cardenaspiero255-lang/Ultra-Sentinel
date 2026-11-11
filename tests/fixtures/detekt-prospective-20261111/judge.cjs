'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const [sentinel,work,checkout]=process.argv.slice(2);
const truth=JSON.parse(fs.readFileSync(path.join(sentinel,
 'tests/fixtures/detekt-prospective-20261111/truth.json'),'utf8'));
const result=require(path.join(sentinel,'packages/recovery/phase2-executed-jvm-triplet.cjs'))
 .executeOriginalJvmTriplet({directory:path.join(work,'jars'),
  mainClass:'dev.detekt.eval.runner.OracleEntrypointKt',caseId:'DETEKT_CONFIG_LIST_TYPE',
  sourceHeadSha:truth.originalCommit,originalBlobSha:truth.originalBlob,candidateBlobSha:truth.fixedBlob,
  markers:{originalFailure:'INVALID_LIST_ACCEPTED',green:['BENIGN_CONFIG_PASS','CONFIG_TYPE_ORACLE_PASS'],
   unsafeFailure:'BENIGN_CONFIG_REGRESSION'}});
if(result.status!=='LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED')throw Error('DETEKT_JVM_JUDGE_VETO');
const env={PATH:process.env.PATH,HOME:'/tmp',GIT_NO_REPLACE_OBJECTS:'1',
 GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
 '-c','commit.gpgsign=false',...args],{cwd:checkout,encoding:'utf8',env,timeout:30000}).trim();
if(git('remote')!==''||git('rev-parse','HEAD')!==truth.originalCommit||git('status','--porcelain')!=='')
 throw Error('INVALID_SANDBOX_BASELINE');
fs.copyFileSync(path.join(work,'candidate-src/ConfigProperty.kt'),path.join(checkout,truth.source));
git('add','--',truth.source);
git('-c','user.name=Sentinel sandbox','-c','user.email=sandbox@example.invalid',
 'commit','-qm','sandbox: replay upstream configuration fix');
const repair=git('rev-parse','HEAD');
const change={path:truth.source,beforeBlobSha:truth.originalBlob,afterBlobSha:truth.fixedBlob,
 patchBytes:Buffer.byteLength(git('diff','--binary',truth.originalCommit,repair,'--',truth.source))};
const policy=require(path.join(sentinel,'packages/recovery/repair-judge.cjs')).judgeLocalRepair({
 directory:checkout,baselineHeadSha:truth.originalCommit,repairHeadSha:repair,
 plan:{branch:'sandbox/detekt-config',expectedHeadSha:truth.originalCommit,changes:[change]}});
if(!policy.approved||policy.status!=='APPROVED_LOCAL_POLICY_ONLY')throw Error('LOCAL_POLICY_VETO');
const rollback=require(path.join(sentinel,'packages/recovery/sandbox-rollback.cjs')).rollbackSandbox({
 directory:checkout,baselineHeadSha:truth.originalCommit,repairHeadSha:repair});
if(rollback.status!=='ROLLBACK_VERIFIED'||
 rollback.restoredTree!==git('rev-parse',truth.originalCommit+'^{tree}')||
 git('status','--porcelain')!=='')throw Error('ROLLBACK_VETO');
console.log(JSON.stringify({status:result.status,artifactSha256:result.artifactsSha256,
 policy:policy.status,rollback:rollback.status,fixProvenance:'UPSTREAM_PR_9461',
 automaticFixGenerated:false,remoteWrites:false}));
console.log('DETEKT_ORIGINAL_RED_GREEN_VETO_ROLLBACK_PASS');

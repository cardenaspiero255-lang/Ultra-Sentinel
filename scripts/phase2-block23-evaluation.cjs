'use strict';
/* Phase 2.3: PRE-ORACLE worker abstention receipts and POST-SEAL benign controls.
 * The engine is immutable; unsupported source paths must not be rewritten. */
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const ORIGINAL_ENGINE='3668a4ff860c49c5aaf69a594efc4fa48d94def3';
const ORIGINAL_TREE='09b8e8a9e598c4c1184fb0b97617cc3b2ff9c73e';
const ORIGINAL_SOURCE='ead082131ceb45b8e4fda027c74471103c1cd09f';
const MARKERS={numeric:'BAD_BLIND_NUMERIC_INVENTORY',codec:'BLIND_CODEC_WORKER_BLOCKED: UNTRUSTED_HUNTER_VERDICT',identity:'BLIND_IDENTITY_WORKER_BLOCKED: UNTRUSTED_IDENTITY_HUNTER_VERDICT'};
function block(reason){throw Error('PHASE23_FAIL_CLOSED:'+reason);}
function git(dir,...args){const out=cp.spawnSync('git',['-C',dir,...args],{encoding:null,timeout:15000,maxBuffer:4*1024*1024,env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});if(out.error||out.status!==0)block('GIT_'+args[0]);return out.stdout;}
const txt=(dir,...args)=>git(dir,...args).toString('utf8').trim();
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const exact=(object,keys)=>object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).sort().join('|')===keys.slice().sort().join('|');
function validateUnsupportedPaths(paths,policy){if(!Array.isArray(paths)||paths.length!==8||typeof policy!=='function')block('COHORT_SIZE');let last='';for(const p of paths){if(typeof p!=='string'||!/^kotlinx-coroutines-core\/common\/src\/flow\/[\w.-]+\.kt$/.test(p)||p<=last||policy(p))block('UNTRUSTED_OR_ELIGIBLE_PATH');last=p;}return paths.length;}
function sourceInventory(engine,source,manifest,output){
 if(txt(engine,'rev-parse','HEAD')!==ORIGINAL_ENGINE||txt(engine,'rev-parse','HEAD^{tree}')!==ORIGINAL_TREE)block('ENGINE_SHA');
 if(txt(source,'rev-parse','HEAD')!==ORIGINAL_SOURCE||txt(source,'rev-parse','HEAD^{tree}')!==manifest.cohort.treeSha||txt(source,'rev-parse','HEAD:'+manifest.cohort.scope)!==manifest.cohort.scopeTreeSha)block('SOURCE_SHA');
 const scope=manifest.cohort.scope,files=manifest.cohort.files;
 const policy=require(path.join(fs.realpathSync(engine),'packages/investigation/novel-kotlin-path-policy.cjs')).isSafeNovelKotlinPath;
 validateUnsupportedPaths(files.map(x=>x.path),policy);
 const entries=git(source,'ls-tree','-z',manifest.cohort.scopeTreeSha).toString('utf8').split('\0').filter(Boolean).filter(x=>x.endsWith('.kt'));
 if(entries.length!==8)block('INCOMPLETE_SOURCE_TREE');
 const found=[];
 for(const [i,f] of files.entries()){
  const m=/^(100644) blob ([0-9a-f]{40})\t([^\r\n]+\.kt)$/.exec(entries[i]);
  if(!m||scope+'/'+m[3]!==f.path||m[2]!==f.blobSha)block('UNEXPECTED_GIT_SOURCE');
  const bytes=git(source,'cat-file','blob',f.blobSha);
  if(blob(bytes)!==f.blobSha||bytes.length!==f.sizeBytes||bytes.includes(0)||bytes.includes(13))block('CHANGED_OR_NONCANONICAL_SOURCE');
  const code=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(Buffer.from(code,'utf8').compare(bytes)!==0)block('NONCANONICAL_SOURCE_BYTES');
  found.push({path:f.path,expectedBlobSha:f.blobSha,source:code});
 }
 fs.mkdirSync(output,{mode:0o700,recursive:true});
 for(const [name,extra] of [['numeric',{skippedOversized:0,skippedNoncanonical:0}],['codec',{}]]){
  fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify({expectedCommitSha:ORIGINAL_SOURCE,files:found,...extra}),{flag:'wx',mode:0o600});
 }
 return {authenticatedFiles:found.length,eligiblePaths:0,sourceCommit:ORIGINAL_SOURCE,engineCommit:ORIGINAL_ENGINE};
}
function sealAbstentions(attempts,sourceCount){
 if(!Array.isArray(attempts)||attempts.length!==3||sourceCount!==8)block('MISSING_ATTEMPTS');
 const results=[];
 for(const [i,kind] of Object.keys(MARKERS).entries()){
  const a=attempts[i];
  if(!exact(a,['kind','exitCode','stderr'])||a.kind!==kind||a.exitCode!==1||typeof a.stderr!=='string'||a.stderr.length>20000||!a.stderr.includes(MARKERS[kind]))block('UNEXPECTED_WORKER_RESULT');
  results.push({kind,exitCode:a.exitCode,errorEvidenceSha256:sha256(Buffer.from(a.stderr))});
 }
 const body={schema:'ultra-sentinel-phase2-block23-abstention-seal/v1',status:'ABSTAIN_UNSUPPORTED_FROZEN_PATH_POLICY',engineCommitSha:ORIGINAL_ENGINE,sourceCommitSha:ORIGINAL_SOURCE,sourceFiles:8,filesAnalyzed:0,abstentions:8,workerProcessesInvoked:3,attempts:results,unverifiedFindings:0,oracleEvaluatedBeforeSeal:false,positiveOriginalDefectsVerified:false,precision:null,recall:null,f1:null,falsePositiveCount:null,falseNegativeCount:null,novelFamilyVerified:false,automatedRepairVerified:false,remoteWrites:false,mergeAllowed:false};
 return Object.freeze({...body,predictionDigest:sha256(Buffer.from(JSON.stringify(body)))});
}
function verifySealed(receipt){
 if(!exact(receipt,['schema','status','engineCommitSha','sourceCommitSha','sourceFiles','filesAnalyzed','abstentions','workerProcessesInvoked','attempts','unverifiedFindings','oracleEvaluatedBeforeSeal','positiveOriginalDefectsVerified','precision','recall','f1','falsePositiveCount','falseNegativeCount','novelFamilyVerified','automatedRepairVerified','remoteWrites','mergeAllowed','predictionDigest']))block('SEAL_SCHEMA');
 const copy={...receipt};delete copy.predictionDigest;
 if(receipt.schema!=='ultra-sentinel-phase2-block23-abstention-seal/v1'||receipt.status!=='ABSTAIN_UNSUPPORTED_FROZEN_PATH_POLICY'||receipt.engineCommitSha!==ORIGINAL_ENGINE||receipt.sourceCommitSha!==ORIGINAL_SOURCE||receipt.sourceFiles!==8||receipt.filesAnalyzed!==0||receipt.abstentions!==8||receipt.workerProcessesInvoked!==3||receipt.unverifiedFindings!==0||receipt.oracleEvaluatedBeforeSeal!==false||receipt.positiveOriginalDefectsVerified!==false||receipt.precision!==null||receipt.recall!==null||receipt.f1!==null||receipt.falsePositiveCount!==null||receipt.falseNegativeCount!==null||receipt.novelFamilyVerified!==false||receipt.automatedRepairVerified!==false||receipt.remoteWrites!==false||receipt.mergeAllowed!==false||!Array.isArray(receipt.attempts)||receipt.attempts.length!==3)block('SEAL_CONTRACT');
 for(const [i,k] of Object.keys(MARKERS).entries()){const a=receipt.attempts[i];if(!exact(a,['kind','exitCode','errorEvidenceSha256'])||a.kind!==k||a.exitCode!==1||!/^[0-9a-f]{64}$/.test(a.errorEvidenceSha256))block('SEAL_ATTEMPT');}
 if(receipt.predictionDigest!==sha256(Buffer.from(JSON.stringify(copy))))block('SEAL_TAMPERED');
 return receipt;
}
function adjudicateBenign(receipt,markers){verifySealed(receipt);if(!Array.isArray(markers)||markers.length!==2||markers[0]!=='ORIGINAL_FLOW_COLLECTOR_BENIGN_CONTROLS_PASS'||markers[1]!=='ORIGINAL_SHARING_STARTED_SCOPED_CONTROLS_PASS')block('ORACLE_CONTRACT_UNSATISFIED');return Object.freeze({schema:'ultra-sentinel-phase2-block23-scoped-verdict/v1',status:'ABSTAINED_PATH_POLICY_WITH_TWO_SCOPED_BENIGN_CONTROLS',engineCommitSha:ORIGINAL_ENGINE,sourceCommitSha:ORIGINAL_SOURCE,predictionDigest:receipt.predictionDigest,frozenWorkerProcessesInvoked:3,filesAnalyzed:0,unsupportedOriginalKotlinFiles:8,scopedBenignControlsPassed:2,unlabeledOriginalKotlinFiles:6,positiveOriginalDefectsVerified:false,novelFamilyVerified:false,automatedRepairVerified:false,precision:null,recall:null,f1:null,falsePositiveCount:null,falseNegativeCount:null,tripleSPlusCertified:false,remoteWrites:false,mergeAllowed:false,limitation:'The original frozen Hunter refuses all eight paths; successful benign oracles do not establish defect-free sources, family discovery or global metrics.'});}
function main(args){const [mode,...params]=args;const root=path.resolve(__dirname,'..');const man=JSON.parse(fs.readFileSync(path.join(root,'docs/quality/PHASE2-BLOCK21-FREEZE-20261112.json'),'utf8'));
 if(mode==='prepare'){
  if(params.length!==3)block('PREPARE_ARGS');console.log(JSON.stringify(sourceInventory(params[0],params[1],man,params[2])));return;
 }
 if(mode==='seal'){
  if(params.length!==2)block('SEAL_ARGS');const [attemptDir,out]=params;
  const attempts=Object.keys(MARKERS).map(kind=>({kind,exitCode:Number(fs.readFileSync(path.join(attemptDir,kind+'.exit'),'utf8').trim()),stderr:fs.readFileSync(path.join(attemptDir,kind+'.stderr'),'utf8')}));
  for(const k of Object.keys(MARKERS))if(fs.existsSync(path.join(attemptDir,k,'discovery.json')))block('WORKER_PRODUCED_REPORT_DESPITE_UNSUPPORTED_PATH');
  const receipt=sealAbstentions(attempts,man.cohort.files.length);
  fs.mkdirSync(out,{mode:0o700,recursive:true});fs.writeFileSync(path.join(out,'prediction-seal.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('BLOCK23_PREDICTIONS_SEALED_BEFORE_ORACLE='+receipt.predictionDigest);return;
 }
 if(mode==='verify'){
  if(params.length!==1)block('VERIFY_ARGS');const r=verifySealed(JSON.parse(fs.readFileSync(params[0],'utf8')));console.log('BLOCK23_UNSUPPORTED_ABSTENTION_SEAL_VERIFIED='+r.predictionDigest);return;
 }
 if(mode==='verdict'){
  if(params.length!==4)block('VERDICT_ARGS');const [sealPath,sourceDir,logsDir,out]=params;
  const receipt=verifySealed(JSON.parse(fs.readFileSync(sealPath,'utf8')));
  const attest=require('./verify-phase2-block22-source.cjs').attest(sourceDir);
  if(attest.originalKotlinFilesAuthenticated!==8||attest.sourceTreeAuthenticated!==true)block('SOURCE_REAUTHENTICATION_FAILED');
  const markers=['ORIGINAL_FLOW_COLLECTOR_BENIGN_CONTROLS_PASS','ORIGINAL_SHARING_STARTED_SCOPED_CONTROLS_PASS'];
  const names=['flowcollector','sharingstarted'];
  for(let i=0;i<names.length;i++){const logs=fs.readFileSync(path.join(logsDir,names[i]+'.log'),'utf8');if(logs.trim()!==markers[i])block('SCOPED_ORACLE_VERDICT_MISSING');}
  const verdict=adjudicateBenign(receipt,markers);fs.writeFileSync(out,JSON.stringify(verdict,null,2)+'\n',{flag:'wx',mode:0o600});console.log(verdict.status);return;
 }
 block('UNKNOWN_ACTION');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports=Object.freeze({validateUnsupportedPaths,sourceInventory,sealAbstentions,verifySealed,adjudicateBenign});

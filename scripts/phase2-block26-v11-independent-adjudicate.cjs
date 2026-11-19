#!/usr/bin/env node
'use strict';
// Historical V11 adjudication from authenticated sealed reports. The source
// reference oracle was independently committed before these reports were read.
// This DOES NOT execute the target independently nor confirm novel defects.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {classifyOriginalWitness,V11_SOURCE_REFERENCE}=
 require('../packages/quality-gates/v11-independent-source-oracle.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const HEX=/^[0-9a-f]{64}$/;
const fail=s=>{throw Error('V11_ADJUDICATION_'+s);};
function numericWire(x){
 if(typeof x==='number')return Number.isSafeInteger(x)?x:x;
 if(typeof x!=='string'||!/^-?(?:0|[1-9][0-9]*)$/.test(x))return x;
 const n=Number(x);return Number.isSafeInteger(n)?n:x;
}
function evaluateSealedV11Evidence(e){
 const {manifestBytes,reports,selected,expectedManifestSha256,
  expectedOriginalReportReferences}=e||{};
 if(!Buffer.isBuffer(manifestBytes)||!HEX.test(expectedManifestSha256||'')||
  sha(manifestBytes)!==expectedManifestSha256)fail('MANIFEST_HASH');
 let m;try{m=JSON.parse(manifestBytes.toString('utf8'));}catch{fail('MANIFEST_FORMAT');}
 if(m.schema!=='ultra-sentinel-v11-full-predictions-first/v1'||
  m.frozenEngineCommit!==V11_SOURCE_REFERENCE.frozenEngineSha||
  m.poolSha256!==V11_SOURCE_REFERENCE.sourcePoolSha256||
  m.allPredictionsSealedBeforeSelection!==true||m.oracleExecuted!==false||
  m.hunterRetuned!==false||m.originalRepositories!==9||
  !Array.isArray(m.reportFiles)||m.reportFiles.length<2||m.reportFiles.length>24)
  fail('MANIFEST_CONTENT');
 if(!(reports instanceof Map)||!Array.isArray(selected)||selected.length!==2||
  selected[0].rank!==276||selected[1].rank!==280||
  !Array.isArray(expectedOriginalReportReferences)||expectedOriginalReportReferences.length!==2)
  fail('COHORT_SELECTION');
 const seen=new Set(),parsed=new Map();
 for(const r of m.reportFiles){
  if(!r||!Number.isSafeInteger(r.rank)||r.rank<1||
   !/^candidate-[0-9]+\/scope-[0-5]\/discovery\.json$/.test(r.path||'')||
   r.path.split('/')[0]!=='candidate-'+r.rank||
   seen.has(r.path)||!HEX.test(r.reportSha256||'')||!HEX.test(r.jarSha256||''))
   fail('REPORT_PATH');
  seen.add(r.path);
  const buf=reports.get(r.path);
  if(!Buffer.isBuffer(buf)||buf.length>262144||sha(buf)!==r.reportSha256)
   fail('REPORT_HASH');
  let d;try{d=JSON.parse(buf.toString('utf8'));}catch{fail('REPORT_FORMAT');}
  if(d.schema!=='ultra-sentinel-generic-jvm-metamorphic/v1'||
   d.artifactSha256!==r.jarSha256||
   !['methodsProbed','completedTriples','successfulInvocations'].every(k=>
    Number.isSafeInteger(d[k])&&d[k]>=0)||
   !Array.isArray(d.findings)||d.findings.length>256||
   d.oracleVerified!==false||d.novelFamilyVerified!==false||
   d.repairAuthorized!==false||d.remoteWrites!==false||d.mergeAllowed!==false)
   fail('REPORT_CONTENT');
  parsed.set(r.rank,[...(parsed.get(r.rank)||[]),d]);
 }
 if([...reports.keys()].some(k=>!seen.has(k)))fail('UNLISTED_REPORT');
 const outcomes=[],cohorts=[];
 for(let i=0;i<selected.length;i++){
  const c=selected[i],list=m.reportFiles.filter(r=>r.rank===c.rank),
   ref=expectedOriginalReportReferences[i];
  if(!ref||ref.rank!==c.rank||!HEX.test(ref.sha||'')||list.length<1||
   sha(Buffer.from(JSON.stringify(list)))!==ref.sha)fail('ORIGINAL_REPORT_REFERENCE');
  const data=parsed.get(c.rank)||[];
  if(data.reduce((n,d)=>n+d.methodsProbed,0)!==c.effectiveMethodsProbed||
   data.reduce((n,d)=>n+d.completedTriples,0)!==c.completedTriples||
   data.reduce((n,d)=>n+d.successfulInvocations,0)!==c.successfulInvocations)
   fail('ADMISSION_COUNTERS');
  cohorts.push({rank:c.rank,repository:c.source.repository,
   methodsProbed:c.effectiveMethodsProbed,
   hypotheses:data.reduce((n,d)=>n+d.findings.length,0)});
  for(const d of data)for(const f of d.findings){
   if(!f||f.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'||
    typeof f.class!=='string'||typeof f.method!=='string'||
    !Array.isArray(f.observed)||f.observed.length!==3)fail('FINDING_FORMAT');
   // Wire-level decimal strings are parsed without modifying the frozen
   // semantics, witnesses or independently precommitted reference contract.
   const result=classifyOriginalWitness({...f,cohortId:c.id,
    observed:f.observed.map(numericWire)});
   outcomes.push({cohortId:c.id,class:f.class,method:f.method,...result});
  }
 }
 const matched=outcomes.filter(x=>x.status==='SCOPED_NONDEFECT_HYPOTHESIS').length,
  different=outcomes.filter(x=>x.status==='DISCREPANCY_REQUIRES_INDEPENDENT_REPLAY').length;
 return {schema:'ultra-sentinel-v11-sealed-independent-source-reference-verdict/v1',
  status:'PARTIAL_INDEPENDENT_REFERENCE_ONLY',
  originalHunterRunId:44317152922,fullPredictionSealSha256:expectedManifestSha256,
  frozenEngineSha:V11_SOURCE_REFERENCE.frozenEngineSha,cohorts,
  hypothesisCount:outcomes.length,
  scopedReferenceMatches:matched,scopedReferenceMismatches:different,
  unadjudicated:outcomes.length-matched-different,
  originalDefectsConfirmed:0,fullyAdjudicated:false,
  independentOriginalOracleExecuted:false,independentTargetReplayExecuted:false,
  originalSourceModified:false,engineRetuned:false,
  block26Closed:false,block27Allowed:false,outcomes};
}
function main(args){
 if(args.length!==3)fail('ARGUMENTS');
 const [root,cohortFile,outdir]=args,base=fs.realpathSync(root),
  manifestBytes=fs.readFileSync(path.join(base,'full-prediction-seal.json')),
  cohort=JSON.parse(fs.readFileSync(cohortFile,'utf8'));
 if(cohort.schema!=='ultra-sentinel-block26-v11-original-effective-invocability-cohort/v1'||
  cohort.frozenHunter.commitSha!==V11_SOURCE_REFERENCE.frozenEngineSha||
  cohort.originalReservation.sourcePoolSha256!==V11_SOURCE_REFERENCE.sourcePoolSha256||
  cohort.admission.fullPredictionSealSha256!==V11_SOURCE_REFERENCE.fullPredictionSealSha256||
  cohort.admission.runId!==44317152922)fail('COHORT_DRIFT');
 const m=JSON.parse(manifestBytes),files=new Map();
 for(const r of m.reportFiles||[]){
  if(!/^candidate-\d+\/scope-[0-5]\/discovery\.json$/.test(r.path||''))
   fail('UNSAFE_PATH');
  const p=path.resolve(base,r.path);
  if(!p.startsWith(base+path.sep)||fs.lstatSync(p).isSymbolicLink())
   fail('PATH_ESCAPED');
  files.set(r.path,fs.readFileSync(p));
 }
 const result=evaluateSealedV11Evidence({
  manifestBytes,reports:files,selected:cohort.selectedCohorts,
  expectedManifestSha256:cohort.admission.fullPredictionSealSha256,
  expectedOriginalReportReferences:cohort.selectedCohorts.map(c=>({
   rank:c.rank,sha:c.originalReportReferenceSha256}))
 });
 fs.mkdirSync(outdir,{recursive:false,mode:0o700});
 const raw=JSON.stringify(result,null,2)+'\n';
 fs.writeFileSync(path.join(outdir,'independent-reference-verdict.json'),raw,
  {flag:'wx',mode:0o600});
 console.log('V11_VERDICT_SHA256='+sha(Buffer.from(raw)));
 console.log('V11_MATCHED='+result.scopedReferenceMatches);
 console.log('V11_UNADJUDICATED='+result.unadjudicated);
}
if(require.main===module)try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}
module.exports=Object.freeze({evaluateSealedV11Evidence});

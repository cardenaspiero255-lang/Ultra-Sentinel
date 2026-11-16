'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {seal,verify}=require('../../scripts/phase2-kotlin-api-v6-eval.cjs');
const root=path.resolve(__dirname,'../..');
const reservation=require('../../docs/quality/PHASE2-BLOCK26-V6-RESERVATION.json');
const manifest={engine:reservation.frozenEngine,cohorts:reservation.cohorts,oracles:[],block27Allowed:false};
const artifactSha='d'.repeat(64);
const finding={class:'sample.Fixture',method:'peak(java.util.List;)double',argument:0,
 otherArguments:1,inputs:['size=2;values=0..size-1','size=3;values=0..size-1','size=4;values=0..size-1'],
 observed:['0','5','0'],status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'};
const report=(f=finding)=>({schema:'ultra-sentinel-generic-jvm-metamorphic/v1',artifactSha256:artifactSha,
 status:'PARTIAL_HYPOTHESES_REQUIRE_ORACLE',classesInspected:1,methodsProbed:1,methodCandidates:1,completedTriples:1,
 successfulInvocations:6,doubleMethodsExercised:1,structuredMethodsExercised:1,instanceMethodsExercised:0,
 unsupportedMethods:0,abstainedProbes:1,unloadableClasses:0,nestedClassesSkipped:0,comparableClasses:0,
 comparablePairs:0,comparableTriples:0,constructorAbstentions:0,findings:[f],sourceAuthenticated:false,
 oracleVerified:false,novelFamilyVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false});
const entry=(r=report())=>({cohortId:1,scope:'sample',artifactSha256:artifactSha,raw:Buffer.from(JSON.stringify(r))});
const abstentions=manifest.cohorts.slice(1).map(c=>({cohortId:c.id,reason:'COMPILATION_ABSTENTION'}));

test('host evidence adapter seals six original reserved cohorts without changing frozen Hunter or running oracles',()=>{
 assert.equal(manifest.cohorts.length,6);
 const entries=[entry()],sealed=seal(manifest,entries,abstentions);
 assert.equal(sealed.engineSha,reservation.frozenEngine.commitSha);
 assert.equal(sealed.reports[0].hypotheses,1);
 assert.equal(sealed.executionAbstentions.length,5);
 assert.equal(verify(manifest,entries,abstentions,sealed).oracleExecuted,false);
 assert.equal(sealed.block27Allowed,false);
 const duplicate={...manifest,cohorts:[...manifest.cohorts.slice(0,5),manifest.cohorts[0]]};
 assert.throws(()=>seal(duplicate,entries,abstentions),/KOTLIN_API_V2_EVIDENCE_REFUSED/);
});
test('finite collection size-four witness is allowed, but five is not, with an exact source-bound seal',()=>{
 const one={...manifest,cohorts:manifest.cohorts.slice(0,1)};
 const entries=[entry()],sealed=seal(one,entries,[]);
 assert.equal(sealed.reports[0].hypotheses,1);
 assert.equal(verify(one,entries,[],sealed).oracleExecuted,false);
 const invalid=entry(report({...finding,inputs:[...finding.inputs.slice(0,2),'size=5;values=0..size-1']}));
 assert.throws(()=>seal(one,[invalid],[]),/KOTLIN_API_V2_EVIDENCE_REFUSED/);
});
test('CLI replays six-cohort prediction index paths on synthetic sealed data without an oracle',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-v6-host-protocol-'));
 try{
  const data=path.join(tmp,'predictions'),dir=path.join(data,'cohort-6','scope-0');
  fs.mkdirSync(dir,{recursive:true});
  const m={...manifest},p=path.join(tmp,'manifest.json');
  fs.writeFileSync(p,JSON.stringify(m));
  const sixth={...entry(),cohortId:6};
  fs.writeFileSync(path.join(dir,'discovery.json'),sixth.raw);
  fs.writeFileSync(path.join(data,'index.json'),JSON.stringify([
   {cohortId:6,scope:'sample',artifactSha256:artifactSha,file:'cohort-6/scope-0/discovery.json'}]));
  fs.writeFileSync(path.join(data,'abstentions.json'),JSON.stringify(m.cohorts.slice(0,5).map(c=>({
   cohortId:c.id,reason:'COMPILATION_ABSTENTION'}))));
  const r=spawnSync(process.execPath,[path.join(root,'scripts/phase2-kotlin-api-v6-eval.cjs'),
   'seal',p,data,path.join(tmp,'seal.json')],{encoding:'utf8',timeout:15000});
  assert.ifError(r.error);assert.equal(r.status,0,r.stderr);
  const sealed=JSON.parse(fs.readFileSync(path.join(tmp,'seal.json')));
  assert.equal(sealed.reports[0].cohortId,6);
  assert.equal(sealed.oracleExecuted,false);
 } finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateOracleBeforeHunter}=require('../../packages/quality-gates/v12-prehunter-oracle-gate.cjs');
const sha=x=>x.repeat(40),dig=x=>x.repeat(64);
const selected=(name,blob)=>({
 rank:name.endsWith('/first')?1:2,
 source:{repository:name,commitSha:sha('a'),treeSha:sha('b'),
  files:[{path:'src/main/kotlin/Math.kt',blobSha:sha(blob),sizeBytes:64}],totalBytes:64}
});
function fixture(){
 return {freeze:{
  schema:'ultra-sentinel-block26-v12-oracle-before-hunter/v1',
  engineCommitSha:'689583c23277807345edb715d8c2d277a3d4bda7',
  engineBlobSha:'430b4e928527b20fe305d63f3efb85909f1dfa06',
  historicalExcludedRepositories:185,historicalExcludedBlobs:729,
  oracleBeforeHunterRequired:true,oracleCannotSeeHunterPredictions:true,
  noHunterRetune:true,minIndependentRepositories:2,minExpectedProbeableMethods:3,
  historicalCohortsNeverReused:true,initialMetadataQueried:false,
  initialHunterExecuted:false,initialOracleExecuted:false,
  block26Closed:false
 },exclusions:{repositories:Array.from({length:185},(_,i)=>'old/repo-'+i),
  blobShas:Array.from({length:729},(_,i)=>i.toString(16).padStart(40,'0'))},
 cohort:{schema:'ultra-sentinel-v12-prospective-original-cohort/v1',
  metadataCommitSha:sha('1'),selected:[
   {...selected('new/first','c'),staticProbeableMethods:1},
   {...selected('new/second','d'),staticProbeableMethods:2}],
  hunterExecuted:false,oracleExecuted:false,allSourceBodiesNew:true},
 oracle:{schema:'ultra-sentinel-v12-original-independent-oracle-precommit/v1',
  commitSha:sha('2'),path:'tests/fixtures/phase2-block26-v12/oracle/OriginalReference.kt',
  blobSha:sha('e'),sourceReadOnly:true,contractAuthenticated:true,
  hunterExecutedBeforeCommit:false,predictionsReadBeforeCommit:false,
  oracleExecutedBeforeCommit:false,oracleIndependentOfHunter:true,
  noPredictionsMounted:true,defectTruthUnrevealed:true},
 start:{hunterHeadCommitSha:sha('3'),protocolCommitSha:sha('0'),
  hunterRunStarted:false,oracleExecutableMountedWithHunter:false},
 git:{isAncestor:(a,b)=>[[sha('0'),sha('1')],[sha('1'),sha('2')],[sha('2'),sha('3')]].some(x=>x[0]===a&&x[1]===b),
  committedOracleBlob:sha('e'),workingOracleBlob:sha('e')}
 };
}
test('only a SHA-authenticated independent original oracle committed before Hunter permits its FIRST run',()=>{
 const f=fixture(),r=validateOracleBeforeHunter(f);
 assert.equal(r.permitFrozenHunterStart,true);
 assert.equal(r.selectedOriginalRepositories,2);
 assert.equal(r.expectedProbeableMethods,3);
 assert.equal(r.oracleExecuted,false);
 assert.equal(r.confirmedNewDefects,null);
 assert.equal(r.block26Closed,false);
});
test('a missing oracle, source body, or unverifiable ancestry must block Hunter before any invocation',()=>{
 const f=fixture();
 for(const broken of [
  {...f,oracle:null},{...f,git:{...f.git,isAncestor:()=>false}},
  {...f,git:{...f.git,committedOracleBlob:sha('f')}},
  {...f,git:{...f.git,workingOracleBlob:sha('f')}},
  {...f,oracle:{...f.oracle,commitSha:f.start.hunterHeadCommitSha}},
  {...f,oracle:{...f.oracle,predictionsReadBeforeCommit:true}},
  {...f,start:{...f.start,hunterRunStarted:true}},
  {...f,start:{...f.start,oracleExecutableMountedWithHunter:true}}
 ])assert.throws(()=>validateOracleBeforeHunter(broken),/V12_PREHUNTER_/);
});
test('historical repositories or Git blobs cannot become an unknown cohort',()=>{
 const a=fixture();a.cohort.selected[0].source.repository='old/repo-1';
 assert.throws(()=>validateOracleBeforeHunter(a),/EXPOSED_REPOSITORY/);
 const b=fixture();b.cohort.selected[0].source.files[0].blobSha=b.exclusions.blobShas[4];
 assert.throws(()=>validateOracleBeforeHunter(b),/EXPOSED_BLOB/);
});
test('insufficient independent invocability preflight cannot be reclassified as a successful experiment',()=>{
 const f=fixture();
 f.cohort.selected[1].staticProbeableMethods=0;
 assert.throws(()=>validateOracleBeforeHunter(f),/STATIC_QUORUM/);
 const g=fixture();g.cohort.selected[1].source.repository=g.cohort.selected[0].source.repository;
 assert.throws(()=>validateOracleBeforeHunter(g),/DUPLICATE_REPOSITORY/);
});
test('oracle or source label leakage, inconsistent count, or unknown frozen engine fail closed',()=>{
 const f=fixture();f.oracle.expectedDefect=true;
 assert.throws(()=>validateOracleBeforeHunter(f),/FUNCTIONAL_LEAKAGE/);
 const g=fixture();g.freeze.engineCommitSha=sha('f');
 assert.throws(()=>validateOracleBeforeHunter(g),/FROZEN_ENGINE/);
 const h=fixture();h.exclusions.blobShas.pop();
 assert.throws(()=>validateOracleBeforeHunter(h),/EXCLUSIONS/);
 const i=fixture();i.cohort.selected[0].predictions=[];
 assert.throws(()=>validateOracleBeforeHunter(i),/FUNCTIONAL_LEAKAGE/);
});

test('V12 rejects any weakening of protocol, engine, replay or historical cohort restrictions',()=>{
 const changes=[
  x=>{x.freeze.schema='wrong';},
  x=>{x.freeze.historicalExcludedRepositories=0;},
  x=>{x.freeze.historicalExcludedBlobs=0;},
  x=>{x.freeze.oracleBeforeHunterRequired=false;},
  x=>{x.freeze.oracleCannotSeeHunterPredictions=false;},
  x=>{x.freeze.noHunterRetune=false;},
  x=>{x.freeze.historicalCohortsNeverReused=false;},
  x=>{x.freeze.minIndependentRepositories=1;},
  x=>{x.freeze.minExpectedProbeableMethods=2;},
  x=>{x.freeze.initialMetadataQueried=true;},
  x=>{x.freeze.initialHunterExecuted=true;},
  x=>{x.freeze.initialOracleExecuted=true;},
  x=>{x.freeze.block26Closed=true;}
 ];
 for(const change of changes){const x=fixture();change(x);assert.throws(()=>validateOracleBeforeHunter(x),/V12_PREHUNTER_/);}
});
test('V12 rejects incomplete oracle commitments, untrusted paths and withheld truth seals',()=>{
 const cases=[
  x=>{x.oracle.schema='wrong';},
  x=>{x.oracle.path='../oracle.kt';},
  x=>{x.oracle.blobSha='bad';},
  x=>{x.oracle.sourceReadOnly=false;},
  x=>{x.oracle.contractAuthenticated=false;},
  x=>{x.oracle.hunterExecutedBeforeCommit=true;},
  x=>{x.oracle.oracleExecutedBeforeCommit=true;},
  x=>{x.oracle.oracleIndependentOfHunter=false;},
  x=>{x.oracle.noPredictionsMounted=false;},
  x=>{x.oracle.defectTruthUnrevealed=false;}
 ];
 for(const change of cases){const x=fixture();change(x);assert.throws(()=>validateOracleBeforeHunter(x),/V12_PREHUNTER_/);}
});
test('V12 refuses malformed source metadata, duplicates, unsafe paths and impossible static evidence',()=>{
 const changes=[
  x=>{x.cohort.schema='wrong';},
  x=>{x.cohort.hunterExecuted=true;},
  x=>{x.cohort.oracleExecuted=true;},
  x=>{x.cohort.allSourceBodiesNew=false;},
  x=>{x.cohort.selected=[];},
  x=>{x.cohort.selected[0].rank=2;},
  x=>{x.cohort.selected[0].source.commitSha='bad';},
  x=>{x.cohort.selected[0].source.treeSha='bad';},
  x=>{x.cohort.selected[0].source.repository='bad';},
  x=>{x.cohort.selected[0].source.files=[];},
  x=>{x.cohort.selected[0].source.files[0].path='../bad.kt';},
  x=>{x.cohort.selected[0].source.files[0].blobSha='bad';},
  x=>{x.cohort.selected[0].source.files[0].sizeBytes=-1;},
  x=>{x.cohort.selected[0].source.totalBytes=0;},
  x=>{x.cohort.selected[0].staticProbeableMethods=-1;},
  x=>{x.cohort.selected[0].source.files[0].blobSha=x.cohort.selected[1].source.files[0].blobSha;}
 ];
 for(const change of changes){
  const x=fixture();change(x);
  assert.throws(()=>validateOracleBeforeHunter(x),/V12_PREHUNTER_/);
 }
});
test('V12 refuses duplicate historical evidence and invalid trusted Git witness',()=>{
 const edits=[
  x=>{x.exclusions.repositories[1]=x.exclusions.repositories[0];},
  x=>{x.exclusions.blobShas[1]=x.exclusions.blobShas[0];},
  x=>{x.exclusions.blobShas[0]='garbled';},
  x=>{x.start.protocolCommitSha='bad';},
  x=>{x.start.hunterHeadCommitSha='bad';},
  x=>{x.git.committedOracleBlob='bad';},
  x=>{x.git.workingOracleBlob='bad';},
  x=>{x.git.isAncestor=null;},
  x=>{x.oracle.commitSha=x.cohort.metadataCommitSha;}
 ];
 for(const edit of edits){
  const x=fixture();edit(x);
  assert.throws(()=>validateOracleBeforeHunter(x),/V12_PREHUNTER_/);
 }
});

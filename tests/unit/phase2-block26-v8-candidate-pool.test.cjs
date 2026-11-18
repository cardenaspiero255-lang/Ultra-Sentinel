'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {planMetadataCandidates,validateProspectiveFreeze}=require('../../scripts/phase2-kotlin-api-v8-candidate-pool.cjs');
const hex=c=>c.repeat(40);
const repo=(name,stars=8,size=200)=>({
 full_name:name,default_branch:'main',stargazers_count:stars,
 size,private:false,archived:false,fork:false
});
const snapshot=(blob='a')=>({
 commitSha:hex('c'),treeSha:hex('d'),tree:{truncated:false,tree:[
 {path:'src/main/kotlin/F.kt',sha:hex(blob),size:101,mode:'100644',type:'blob'}
 ]}});
test('v8 metadata pool freezes the first eligible unexposed candidates by ranking without source bodies',async()=>{
 const old=new Set(['previous/exposed']);const blocked=new Set([hex('e')]);
 const repos=[repo('fresh/B',6),repo('previous/exposed',8),repo('fresh/A',7),
   repo('fresh/C',5)];
 const calls=[];
 const result=await planMetadataCandidates(repos,old,blocked,async r=>{
  calls.push(r.full_name);
  return snapshot(r.full_name==='fresh/C'?'e':'a');
 },{maxEligibleSourceCandidates:2,maxExaminedMetadataRepositories:4,maxRepoSizeKb:8192});
 assert.deepEqual(calls,['fresh/A','fresh/B']);
 assert.deepEqual(result.candidates.map(x=>x.source.repository),['fresh/A','fresh/B']);
 assert.equal(result.sourceBodiesRead,false);
 assert.equal(result.oracleExecuted,false);assert.equal(result.hunterExecuted,false);
 assert.deepEqual(result.audit.map(x=>x.reason),
  ['EXPOSED_REPOSITORY','METADATA_CANDIDATE','METADATA_CANDIDATE']);
});
test('candidate source pool never substitutes ABI outcomes or uses functional labels',async()=>{
 const rows=[repo('fresh/one',5)];
 const pool=await planMetadataCandidates(rows,new Set(),new Set(),
  async()=>snapshot('b'),{maxEligibleSourceCandidates:1,maxExaminedMetadataRepositories:1,maxRepoSizeKb:8192});
 assert.equal(pool.candidates.length,1);
 assert.ok(!JSON.stringify(pool).includes('expectedFunctional'));
 assert.ok(!JSON.stringify(pool).includes('oracleAnswer'));
 assert.equal(pool.candidates[0].source.files[0].blobSha,hex('b'));
});
test('freeze prerequisites authenticate engine, exposures and source selection limits',()=>{
 const f=validateProspectiveFreeze();
 assert.equal(f.engine.sourceCommitSha,'689583c23277807345edb715d8c2d277a3d4bda7');
 assert.equal(f.exclusions.repositories,153);
 assert.equal(f.exclusions.blobs,555);
 assert.deepEqual(f.selector.threshold,{minimumNumericMethods:3,minimumCandidateCohorts:2});
});

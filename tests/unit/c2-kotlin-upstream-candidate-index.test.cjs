'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {UPSTREAM,PROJECTS,metadataOnlyCandidateIndex}=
 require('../../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
function fixture(){
 const items=[];
 for(const [prefix,config] of Object.entries(PROJECTS)){
  for(let i=0;i<config.tasks;i++){
   const name=prefix+'-'+(i+100);
   items.push({name,path:'tasks/'+name,type:'dir',
    sha:crypto.createHash('sha1').update(name).digest('hex'),
    _links:{git:'https://api.github.com/repos/Kotlin/kotlin-swe-bench/git/trees/'+name}});
  }
 }
 return items;
}
const run=v=>metadataOnlyCandidateIndex(Buffer.from(JSON.stringify(v)));
test('106 pinned repository-diverse task candidates never become certified labels',()=>{
 const items=fixture(),a=run(items),b=run(items);
 assert.equal(a.sourceRepository,UPSTREAM.repository);
 assert.equal(a.sourceCommit,UPSTREAM.commit);
 assert.equal(a.repositoryCount,9);
 assert.equal(a.candidateCount,106);
 assert.equal(a.candidates.length,106);
 assert.equal(a.perRepository.reduce((sum,p)=>sum+p.taskCandidates,0),106);
 assert.equal(new Set(a.candidates.map(x=>x.upstreamTask)).size,106);
 assert.equal(a.groundTruthSourceLabels,0);
 assert.equal(a.newPositiveLabels,0);
 assert.equal(a.newNegativeLabels,0);
 assert.equal(a.benchmarkScoredLabels,0);
 assert.equal(a.sourceBehaviorExecuted,false);
 assert.equal(a.blindHoldout,false);
 assert.equal(a.precision,null);
 assert.equal(a.tripleSPlusCertified,false);
 assert.equal(a.indexSha256,b.indexSha256);
 assert.ok(a.candidates.every(x=>x.status==='UPSTREAM_TASK_CANDIDATE_NOT_A_LABEL'&&
  x.rootCauseIndependent===null&&!x.failPassReproduced));
});
test('reject incomplete, duplicated, tampered, unknown, spoofed-source rosters',()=>{
 const attacks=[
  a=>a.pop(),a=>a.push(a[0]),
  a=>{a[0].sha='0'.repeat(40);a[1].sha=a[0].sha;},
  a=>{a[0].path='../bad/path';},
  a=>{a[0].type='file';},
  a=>{a[0].name='evil_unregistered-123';a[0].path='tasks/evil_unregistered-123';},
  a=>{a[0].name='../escape-123';a[0].path='tasks/../escape-123';},
  a=>{a[0].sha='not-a-blob';},
  a=>{a[0]._links.git=null;},
  a=>{a[0].path=a[1].path;},
  a=>{a[0].name=a[1].name;},
  a=>{a[0].sha=a[1].sha;}
 ];
 for(const mutate of attacks){
  const items=fixture();mutate(items);
  assert.throws(()=>run(items),/C2_UPSTREAM_BENCHMARK_CANDIDATES_BLOCKED/);
 }
});

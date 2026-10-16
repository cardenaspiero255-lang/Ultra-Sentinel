'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {verifyEightSourceCompares,BASELINE_LOCK}=require('../../packages/quality-gates/c2-source-universe.cjs');
function comparisons(){
 return NEW_LOCK.cases.map((p,i)=>({
  status:'ahead',
  base_commit:{sha:p.baseSha},
  merge_base_commit:{sha:p.baseSha},
  commits:[{sha:p.headSha}],
  files:Array.from({length:p.changedFiles},(_,j)=>({
   filename:'app/src/main/sample'+i+'/Source'+j+'.kt',
   status:'modified',sha:crypto.createHash('sha1').update(i+':'+j).digest('hex'),
   patch:'@@ -1 +1 @@\n-before\n+after\n',
   additions:1,deletions:1
  }))
 }));
}
test('read-only 8x original GitHub compares must match 241 SHA-pinned entries',()=>{
 const a=verifyEightSourceCompares(comparisons());
 assert.equal(a.changedFileEntries,241);
 assert.equal(a.cases.length,8);
 assert.equal(a.cases[0].pr,150);
 assert.equal(a.cases.at(-1).pr,158);
 assert.equal(a.sourceMetadataVerified,true);
 assert.equal(a.engineExecutionPerformed,false);
 assert.equal(a.truthLabelsAdded,0);
 assert.equal(a.tripleSPlusCertified,false);
 assert.equal(a.precision,null);
 assert.match(a.sourceInventorySha256,/^[0-9a-f]{64}$/);
 assert.deepEqual(a,verifyEightSourceCompares(comparisons()));
 assert.equal(BASELINE_LOCK.sha,'3c97b60717f6a08ddc7d618587202537d62bc951');
 assert.equal(BASELINE_LOCK.candidateParentSha,BASELINE_LOCK.sha);
 assert.equal(BASELINE_LOCK.coreBlob,'db29f94be1e0afb791a241d26f449695df0eafd0');
 assert.equal(BASELINE_LOCK.semanticBlob,'b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9');
});
test('missing, duplicate, patchless, traversing, SHA drift or incomplete compare fails closed',()=>{
 const cases=[
  x=>x.pop(),x=>x[2].files.pop(),
  x=>x[1].merge_base_commit.sha='f'.repeat(40),
  x=>x[0].commits[0].sha='f'.repeat(40),
  x=>x[0].files[1].filename=x[0].files[0].filename,
  x=>x[0].files[0].filename='../../.env',
  x=>x[0].files[0].filename='/tmp/a',
  x=>delete x[0].files[0].patch,
  x=>x[0].files[0].patch='',
  x=>x[0].files[0].status='renamed',
  x=>x[0].files[0].sha='bogus',
  x=>x[0].files[0].additions=-1,
  x=>x[0].files[0].deletions=1.5,
  x=>x[0].status='diverged',
  x=>x[0].files[0].extra='untrusted'
 ];
 for(const mutate of cases){const x=comparisons();mutate(x);
  assert.throws(()=>verifyEightSourceCompares(x),/C2_SOURCE_UNIVERSE_BLOCKED/);}
});

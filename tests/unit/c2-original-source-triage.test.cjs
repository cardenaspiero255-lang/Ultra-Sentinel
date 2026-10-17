'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {triageOriginalTrees}=require('../../packages/quality-gates/c2-original-source-triage.cjs');
const h=s=>crypto.createHash('sha1').update(s).digest('hex');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const expectedIncluded=[15,27,27,15,16,15,23,15];
const expectedExcluded=[6,14,14,11,8,11,16,8];
function fakeOwnerTrees(){
  const responses={},cases=[],used=new Map(),blobs=new Map();
  let allPaths=new Set(),unit=0,inst=0,gradle=0;
  function makePath(pr,i,eligible){
    if(eligible)return 'app/src/main/java/sentinel/Pr'+pr+'Source'+i+'.kt';
    if(pr===150||pr===151||pr===152||pr===153||pr===154){
      if(i===0)return 'app/build.gradle.kts';
    }
    if(pr===158&&i===0)return 'app/src/androidTest/Pr158InstrumentationTest.kt';
    return 'app/src/test/Pr'+pr+'Check'+i+'Test.kt';
  }
  const templates=new Map();
  for(let idx=0;idx<NEW_LOCK.cases.length;idx++){
    const c=NEW_LOCK.cases[idx],prev=c.pr===157?templates.get(155):null;
    let paths=[];
    if(prev)paths=prev.map(x=>({...x}));
    const additionalProd=expectedIncluded[idx]-(prev?expectedIncluded[5]:0);
    const additionalExcluded=expectedExcluded[idx]-(prev?expectedExcluded[5]:0);
    for(let i=0;i<additionalProd;i++){
      const p=makePath(c.pr,i,true);paths.push({path:p,blob:h(c.pr+':'+p)});
    }
    for(let i=0;i<additionalExcluded;i++){
      const p=makePath(c.pr,i,false);paths.push({path:p,blob:h(c.pr+':'+p)});
    }
    assert.equal(paths.length,c.changedFiles);
    templates.set(c.pr,paths);
    const base={sha:c.baseSha,truncated:false,tree:[]};
    const head={sha:c.headSha,truncated:false,tree:paths.map(x=>({path:x.path,type:'blob',sha:x.blob}))};
    // #155 and #157 share the same immutable base SHA.
    for(const obj of [base,head]){
      if(!responses[obj.sha])responses[obj.sha]=Buffer.from(JSON.stringify(obj));
    }
    for(const item of paths){
      allPaths.add(item.path);
      if(!used.has(item.blob))used.set(item.blob,[]);
      used.get(item.blob).push({pr:c.pr,path:item.path});
      blobs.set(item.blob,item);
      if(/^app\/src\/test\//.test(item.path))unit++;
      if(/^app\/src\/androidTest\//.test(item.path))inst++;
      if(item.path==='app/build.gradle.kts')gradle++;
    }
    cases.push({pr:c.pr,base:c.baseSha,head:c.headSha,
      changedPaths:paths.map(x=>x.path).sort()});
  }
  assert.equal(Object.keys(responses).length,15);
  assert.equal(blobs.size,215);
  assert.equal(unit,82);assert.equal(inst,1);assert.equal(gradle,5);
  const duplicateHeadBlobs=[...used].filter(([,o])=>o.length>1)
    .map(([sha,occurrences])=>({sha,occurrences}));
  assert.equal(duplicateHeadBlobs.length,26);
  const responseSha256=Object.entries(responses).map(([sha,buf])=>{
    const p=JSON.parse(buf.toString('utf8'));
    return {sha,filename:sha+'.json',sha256:digest(buf),
      response_entry_count:p.tree.length,blob_entry_count:p.tree.length};
  });
  const manifest={
    schema:'ultra-sentinel-c2-fifteen-original-tree-provenance/v1',
    sourceRepository:NEW_LOCK.repository,responseSha256,
    frozenPRs:cases,
    counts:{originalTreeResponses:15,changedFileOccurrences:241,
      uniqueChangedPaths:allPaths.size,uniqueHeadBlobs:215,
      duplicateHeadBlobGroups:26,duplicateHeadBlobOccurrences:52},
    duplicateHeadBlobs,holdoutStatus:'HISTORICAL_DEVELOPMENT_ONLY',
    blindHoldoutCertified:false,oldDetectorExecuted:false,
    newDetectorExecuted:false,tripleSPlusCertified:false
  };
  return {manifest,responses};
}
test('15 raw sources yield 215 distinct candidate snapshots, with no fabricated labels or metrics',()=>{
  const x=fakeOwnerTrees(),result=triageOriginalTrees(x.manifest,x.responses);
  assert.equal(result.candidateCount,215);
  assert.equal(result.counts.changedFileOccurrences,241);
  assert.equal(result.counts.frozenCoreEligible,153);
  assert.equal(result.counts.excluded,88);
  assert.equal(result.queue.length,215);
  assert.equal(result.queue.filter(q=>q.occurrences.length===2).length,26);
  assert.equal(result.labelsAdded,0);
  assert.equal(result.benchmarkComparisonPerformed,false);
  assert.equal(result.precision,null);
  assert.equal(result.tripleSPlusCertified,false);
  assert.equal(new Set(result.queue.map(q=>q.blobSha)).size,215);
  assert.ok(result.queue.slice(0,8).some(q=>q.representative.pr===150));
  assert.equal(triageOriginalTrees(x.manifest,x.responses).triageSha256,result.triageSha256);
});
test('tampered or incomplete raw Git tree evidence fails closed',()=>{
  const cases=[
    x=>{const k=Object.keys(x.responses)[0];x.responses[k]=Buffer.from('{"sha":"fake"}');},
    x=>{x.manifest.responseSha256[0].sha256='f'.repeat(64);},
    x=>{x.manifest.frozenPRs[0].changedPaths.pop();},
    x=>{x.manifest.counts.uniqueHeadBlobs=216;},
    x=>{x.manifest.duplicateHeadBlobs.pop();},
    x=>{x.manifest.blindHoldoutCertified=true;},
    x=>{x.manifest.frozenPRs[0].head='0'.repeat(40);},
    x=>{x.manifest.responseSha256[0].filename='../unsafe.json';}
  ];
  for(const mutate of cases){
    const x=fakeOwnerTrees();mutate(x);
    assert.throws(()=>triageOriginalTrees(x.manifest,x.responses),/C2_ORIGINAL_TRIAGE_BLOCKED/);
  }
});

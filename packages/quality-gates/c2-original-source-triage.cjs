'use strict';
// Reproducible source-only work queue from fifteen saved ORIGINAL Git tree responses.
// A queue item is NOT an authenticated vulnerability or a benchmark label.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {eligibleForFrozenCore}=require('./c2-core-eligibility.cjs');
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
function fail(){throw Error('C2_ORIGINAL_TRIAGE_BLOCKED');}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function safePath(p){
  return typeof p==='string'&&p.length>0&&p.length<=350&&
    /^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&
    !p.includes('//')&&!p.split('/').includes('..');
}
function classify(p){
  if(eligibleForFrozenCore(p))return 'FROZEN_CORE_ELIGIBLE';
  if(/^app\/src\/test\/.*Test\.kt$/.test(p))return 'KOTLIN_UNIT_TEST';
  if(/^app\/src\/androidTest\/.*Test\.kt$/.test(p))return 'KOTLIN_INSTRUMENTED_TEST';
  if(p==='app/build.gradle.kts')return 'GRADLE_BUILD';
  fail(); // A changed path outside the documented 153+88 requires new audit.
}
function verifyTrees(manifest,rawTrees){
  if(!manifest||manifest.schema!=='ultra-sentinel-c2-fifteen-original-tree-provenance/v1'||
    manifest.sourceRepository!==NEW_LOCK.repository||
    !Array.isArray(manifest.responseSha256)||manifest.responseSha256.length!==15||
    !Array.isArray(manifest.frozenPRs)||manifest.frozenPRs.length!==8||
    !manifest.counts||manifest.counts.originalTreeResponses!==15||
    manifest.counts.changedFileOccurrences!==241||
    manifest.counts.uniqueHeadBlobs!==215||
    manifest.counts.duplicateHeadBlobGroups!==26||
    manifest.counts.duplicateHeadBlobOccurrences!==52||
    manifest.holdoutStatus!=='HISTORICAL_DEVELOPMENT_ONLY'||
    manifest.blindHoldoutCertified!==false||
    manifest.oldDetectorExecuted!==false||
    manifest.newDetectorExecuted!==false||
    manifest.tripleSPlusCertified!==false||
    typeof rawTrees!=='object'||rawTrees===null||Array.isArray(rawTrees))fail();
  const shaSet=new Set(NEW_LOCK.cases.flatMap(c=>[c.baseSha,c.headSha]));
  if(shaSet.size!==15||Object.keys(rawTrees).length!==15)fail();
  const trees=new Map(),receiptSeen=new Set();
  for(const r of manifest.responseSha256){
    if(!r||!SHA.test(r.sha)||!shaSet.has(r.sha)||receiptSeen.has(r.sha)||
       r.filename!==r.sha+'.json'||!HASH.test(r.sha256))fail();
    receiptSeen.add(r.sha);
    const raw=rawTrees[r.sha];
    if(!Buffer.isBuffer(raw)||raw.length<50||raw.length>12*1024*1024||
       sha256(raw)!==r.sha256)fail();
    let parsed;
    try{parsed=JSON.parse(raw.toString('utf8'));}catch{fail();}
    if(parsed.sha!==r.sha||parsed.truncated!==false||!Array.isArray(parsed.tree)||
      parsed.tree.length!==r.response_entry_count)fail();
    const blobs=new Map();
    for(const entry of parsed.tree){
      if(!entry||!safePath(entry.path)||!['blob','tree'].includes(entry.type)||
        !SHA.test(entry.sha))fail();
      if(entry.type==='blob'){
        if(blobs.has(entry.path))fail();
        blobs.set(entry.path,entry.sha);
      }
    }
    if(blobs.size!==r.blob_entry_count)fail();
    trees.set(r.sha,blobs);
  }
  if(receiptSeen.size!==15)fail();
  return trees;
}
function triageOriginalTrees(manifest,rawTrees){
  const trees=verifyTrees(manifest,rawTrees);
  const counts={changedFileOccurrences:0,uniqueHeadBlobs:0,
    frozenCoreEligible:0,excluded:0,unitTests:0,instrumentedTests:0,gradle:0};
  const perPr=[],usage=new Map(),allPaths=new Set();
  for(let i=0;i<NEW_LOCK.cases.length;i++){
    const locked=NEW_LOCK.cases[i],pr=manifest.frozenPRs[i];
    if(!pr||pr.pr!==locked.pr||pr.base!==locked.baseSha||
      pr.head!==locked.headSha||!Array.isArray(pr.changedPaths)||
      pr.changedPaths.length!==locked.changedFiles)fail();
    const a=trees.get(locked.baseSha),b=trees.get(locked.headSha);
    const actual=[...new Set([...a.keys(),...b.keys()])]
      .filter(p=>a.get(p)!==b.get(p)).sort();
    if(actual.length!==locked.changedFiles||
       JSON.stringify(actual)!==JSON.stringify(pr.changedPaths))fail();
    let included=0,excluded=0;
    for(const p of actual){
      if(!b.has(p))fail(); // Historical cohort has no deleted HEAD paths.
      const kind=classify(p),blob=b.get(p);
      allPaths.add(p);
      if(kind==='FROZEN_CORE_ELIGIBLE'){included++;counts.frozenCoreEligible++;}
      else{
        excluded++;counts.excluded++;
        if(kind==='KOTLIN_UNIT_TEST')counts.unitTests++;
        if(kind==='KOTLIN_INSTRUMENTED_TEST')counts.instrumentedTests++;
        if(kind==='GRADLE_BUILD')counts.gradle++;
      }
      if(!usage.has(blob))usage.set(blob,[]);
      usage.get(blob).push({pr:locked.pr,path:p,kind,headSha:locked.headSha});
    }
    counts.changedFileOccurrences+=actual.length;
    perPr.push({pr:locked.pr,changedFiles:actual.length,
      coreEligibleUpperBound:included,excluded});
  }
  const duplicate=[...usage].filter(([,o])=>o.length>1);
  const recorded=(manifest.duplicateHeadBlobs||[]).map(x=>{
    if(!x||!SHA.test(x.sha)||!Array.isArray(x.occurrences))fail();
    return [x.sha,x.occurrences.map(y=>y.pr+':'+y.path).sort().join('|')];
  }).sort((a,b)=>a[0].localeCompare(b[0]));
  const derived=duplicate.map(([sha,o])=>[sha,o.map(y=>y.pr+':'+y.path).sort().join('|')])
    .sort((a,b)=>a[0].localeCompare(b[0]));
  if(JSON.stringify(recorded)!==JSON.stringify(derived)||
    counts.changedFileOccurrences!==241||usage.size!==215||
    duplicate.length!==26||duplicate.reduce((n,[,o])=>n+o.length,0)!==52||
    allPaths.size!==manifest.counts.uniqueChangedPaths||
    counts.frozenCoreEligible!==153||counts.excluded!==88||
    counts.unitTests!==82||counts.instrumentedTests!==1||counts.gradle!==5)fail();
  counts.uniqueHeadBlobs=usage.size;
  // One review unit per distinct Git blob, not per occurrence or arbitrary input.
  // Use PR diversity first, then non-duplicated production sources, then test/build.
  const groups=[...usage].map(([blobSha,occurrences])=>({
    blobSha,representative:occurrences[0],occurrences,
    sourceCopies:occurrences.length,
    reviewPriority:occurrences.some(o=>o.kind==='FROZEN_CORE_ELIGIBLE')?0:1
  }));
  const byPr=new Map(NEW_LOCK.cases.map(c=>[c.pr,[]]));
  for(const g of groups){
    const occ=g.occurrences.find(o=>o.kind==='FROZEN_CORE_ELIGIBLE')||g.occurrences[0];
    g.representative=occ;
    byPr.get(occ.pr).push(g);
  }
  for(const q of byPr.values())q.sort((a,b)=>a.reviewPriority-b.reviewPriority||
    a.sourceCopies-b.sourceCopies||a.representative.path.localeCompare(b.representative.path));
  const ordered=[];
  // Rotate PRs to avoid labeling a single family/PR repeatedly.
  while([...byPr.values()].some(q=>q.length)){
    for(const c of NEW_LOCK.cases){
      const next=byPr.get(c.pr).shift();
      if(next)ordered.push(next);
    }
  }
  const queue=ordered.map((g,i)=>({
    order:i+1,blobSha:g.blobSha,representative:g.representative,
    occurrences:g.occurrences,reviewClass:g.representative.kind,
    alreadySealedTruthChecked:false,independentSourceOracleExecuted:false,
    labelStatus:'UNVERIFIED_CANDIDATE_NOT_A_LABEL'
  }));
  const payload={
    schema:'ultra-sentinel-c2-original-source-triage/v1',
    sourceRepository:NEW_LOCK.repository,
    cohort:'EIGHT_HISTORICAL_PRS_DEVELOPMENT_ONLY',
    inputOriginalTreeSha256:manifest.responseSha256.map(r=>({sha:r.sha,sha256:r.sha256})),
    counts,perPr,
    queue,
    candidateCount:queue.length,
    labelsAdded:0,truthSealValidated:false,blindHoldout:false,
    candidateDetectorExecuted:false,baselineDetectorExecuted:false,
    benchmarkComparisonPerformed:false,
    precision:null,recall:null,f1:null,tripleSPlusCertified:false,
    status:'ORIGINAL_SOURCE_QUEUE_READY_NOT_CERTIFIED',
    next:'Deduplicate against independently attested prior 18 scoped labels; reproduce original behavior, evidence and root cause before promoting any item. Freeze future unseen metadata-only cohort separately.'
  };
  return Object.freeze({...payload,triageSha256:sha256(JSON.stringify(payload))});
}
module.exports={triageOriginalTrees,classify,verifyTrees};

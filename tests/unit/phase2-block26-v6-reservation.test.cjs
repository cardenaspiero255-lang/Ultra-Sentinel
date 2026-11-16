'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const bytes=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(bytes(p));
const blobSha=p=>{const data=bytes(p);return crypto.createHash('sha1')
 .update(Buffer.concat([Buffer.from('blob '+data.length),Buffer.from([0])]))
 .update(data).digest('hex');};

test('v6 metadata-only selection keeps the original six earliest eligible unseen Kotlin cohorts before oracle authorship',()=>{
 const f=json('docs/quality/PHASE2-BLOCK26-V6-FREEZE.json');
 const r=json('docs/quality/PHASE2-BLOCK26-V6-RESERVATION.json');
 const a=json(r.treeSelectionAudit.path),p=json(r.metadataPool.path);
 const exclusions=json(r.exclusions.path);
 assert.equal(r.schema,'ultra-sentinel-block26-v6-metadata-reservation/v1');
 assert.deepEqual(r.frozenEngine,f.engine);
 assert.equal(r.freezeCommitSha,'2ebf2c2a4498db19fa20cc3763f416167188630b');
 assert.equal(blobSha('docs/quality/PHASE2-BLOCK26-V6-FREEZE.json'),r.freezeFileBlobSha);
 assert.equal(blobSha(r.treeSelectionAudit.path),r.treeSelectionAudit.blobSha);
 assert.equal(blobSha(r.metadataPool.path),r.metadataPool.blobSha);
 assert.equal(blobSha(r.exclusions.path),r.exclusions.blobSha);
 assert.equal(p.starEnrichmentComplete,true);
 assert.equal(p.starEnrichment.length,100);
 assert.ok(p.starEnrichment.every(x=>Number.isInteger(x.stars)));
 const rank=p.starEnrichment.toSorted((x,y)=>y.stars-x.stars||
  (x.repository.toLowerCase()<y.repository.toLowerCase()?-1:
   x.repository.toLowerCase()>y.repository.toLowerCase()?1:0));
 assert.deepEqual(a.rankedCandidates.map(x=>x.repository),rank.map(x=>x.repository));
 assert.equal(a.scanComplete,true);
 assert.equal(a.selectedCohorts.length,6);
 assert.deepEqual(r.cohorts,a.selectedCohorts);
 assert.deepEqual(a.rankedCandidates.filter(x=>x.status==='RESERVED').map(x=>x.rank),
  [24,30,45,56,59,69]);
 assert.equal(r.inspectedPrefixEndRank,69);
 for(const item of a.rankedCandidates.slice(0,r.inspectedPrefixEndRank))
  assert.notEqual(item.status,'UNINSPECTED','a higher ranked candidate was silently skipped');
 assert.equal(r.sourceFilesReserved,37);
 const excludedRepositories=new Set(exclusions.repositories.map(x=>x.toLowerCase()));
 const excludedBlobs=new Set(exclusions.blobShas);
 const seenRepositories=new Set(),seenBlobs=new Set();
 let total=0;
 for(const cohort of r.cohorts){
  const src=cohort.source;
  assert.match(src.commitSha,/^[0-9a-f]{40}$/);
  assert.match(src.treeSha,/^[0-9a-f]{40}$/);
  assert.ok(!excludedRepositories.has(src.repository.toLowerCase()));
  assert.ok(!seenRepositories.has(src.repository.toLowerCase()));
  seenRepositories.add(src.repository.toLowerCase());
  assert.ok(src.files.length>=1&&src.files.length<=12);
  assert.ok(src.files.reduce((n,v)=>n+v.sizeBytes,0)<=196608);
  for(const file of src.files){
   assert.match(file.path,/^src\/main\/.+\.kt$/);
   assert.match(file.blobSha,/^[0-9a-f]{40}$/);
   assert.ok(!excludedBlobs.has(file.blobSha),'previously exposed Kotlin code');
   assert.ok(!seenBlobs.has(file.blobSha),'same source blob repeated as unknown');
   seenBlobs.add(file.blobSha);total++;
  }
 }
 assert.equal(total,37);
 assert.equal(f.sourceMetadataSearched,false,'historic pre-selection freeze must remain unchanged');
 for(const key of ['sourceBodiesRead','oracleExecuted','oraclesCommittedBeforeHunter',
  'predictionsExecuted','oraclePredictionsShared','block26Closed','block27Allowed'])
  assert.equal(r[key],false,key);
 assert.equal(r.confirmedNewDefects,0);
 assert.equal(a.sourceBodiesRead,false);
 assert.equal(p.sourceContentsRead,false);
});

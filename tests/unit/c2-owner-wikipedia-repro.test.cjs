'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {SOURCE,gitBlobSha,verifyPinnedSource,
 inspectWikipediaReference,QUESTION}=require('../../scripts/c2-owner-wikipedia-repro.cjs');
function fakeRoute({wronglyTrustAlbum}){
 return async(query,deps,context,kind)=>{
  assert.equal(query,QUESTION);
  assert.equal(kind,'GENERAL_KNOWLEDGE');
  const url='https://es.wikipedia.org/w/api.php?generator=search';
  const response=await deps.fetcher(url);
  const p=(await response.json()).query.pages['123'];
  if(p.title==='Dispersión de Rayleigh')return {trustedReference:true,abstained:false};
  if(p.title==='Historia de la alfarería')return {abstained:true};
  if(p.title==='Cielo azul (álbum de estudio)')
   return wronglyTrustAlbum?{trustedReference:true,abstained:false}:
    {abstained:true};
  throw Error('UNEXPECTED_FIXTURE');
 };
}
test('the owner C2 oracle identifies the frozen SHA and does not assert external truth',()=>{
 assert.equal(SOURCE.pr,73);
 assert.match(SOURCE.headSha,/^[a-f0-9]{40}$/);
 assert.match(SOURCE.blobSha,/^[a-f0-9]{40}$/);
});
test('witness reports accepted unrelated article without claiming certification',async()=>{
 const r=await inspectWikipediaReference(fakeRoute({wronglyTrustAlbum:true}));
 assert.equal(r.candidateDefect.reproduced,true);
 assert.equal(r.candidateDefect.observed,'UNRELATED_ARTICLE_MARKED_TRUSTED');
 assert.equal(r.controls.relevantAccepted,true);
 assert.equal(r.controls.unrelatedTopicRejected,true);
 for(const key of ['independentHumanReview','externalTruthCertified',
  'precisionRecallComputed','tripleSPlusCertified','mergeAllowed'])
  assert.equal(r[key],false);
});
test('witness does not create a false defect when the source correctly abstains',async()=>{
 const r=await inspectWikipediaReference(fakeRoute({wronglyTrustAlbum:false}));
 assert.equal(r.candidateDefect.reproduced,false);
 assert.equal(r.candidateDefect.observed,'UNRELATED_ARTICLE_NOT_TRUSTED');
});
test('witness blocks when a control fails, instead of reporting a false success',async()=>{
 const broken=async()=>({trustedReference:true,abstained:false});
 await assert.rejects(inspectWikipediaReference(broken),/ORACLE_CONTROLS_FAILED/);
 await assert.rejects(inspectWikipediaReference(null),/MISSING_ACTUAL_QUERY_ROUTER/);
});
test('Git blob SHA uses raw bytes and pinned source rejects unrelated files and symlinks',()=>{
 const x=Buffer.from('abc\n','utf8');
 assert.equal(gitBlobSha(x),'8baef1b4abc478178b004d62031cf7fe6db6f903');
 assert.throws(()=>gitBlobSha('abc'),/INVALID_SOURCE_BYTES/);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'c2-owner-oracle-'));
 try{
  const file=path.join(tmp,'source.ts');
  fs.writeFileSync(file,'a'.repeat(2000));
  assert.throws(()=>verifyPinnedSource(file),/PINNED_BLOB_MISMATCH/);
  assert.throws(()=>verifyPinnedSource('source.ts'),/ABSOLUTE_SOURCE_REQUIRED/);
  const sym=path.join(tmp,'sym.ts');
  fs.symlinkSync(file,sym);
  assert.throws(()=>verifyPinnedSource(sym),/UNSAFE_SOURCE/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {listSentryIssueSample}=require('../../adapters/sentry/sentry-readonly.cjs');
const org='ultra-sentinel-org',projectId='123456',token='test-token-1234567890';
const good={id:'8742334',project:{id:projectId},count:'14',level:'error',
 status:'unresolved',lastSeen:'2026-10-14T12:00:00Z',
 title:'PRIVATE_CRASH_CONTENT_SHOULD_NOT_LEAK',metadata:{email:'private@example.invalid'},
 culprit:'Sensitive source path'};
function mock(items=[good],status=200){
 return async(url,request)=>{
  assert.match(url,/^https:\/\/sentry\.io\/api\/0\/organizations\/ultra-sentinel-org\/issues\/\?/);
  assert.equal(request.method,'GET');
  assert.equal(request.redirect,'error');
  assert.equal(request.headers.Authorization,'Bearer '+token);
  return {status,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(items)};
 };
}
test('Sentry emits a bounded privacy-minimized issue sample only',async()=>{
 const result=await listSentryIssueSample({organization:org,projectId,token,fetchImpl:mock()});
 assert.equal(result.issues.length,1);
 assert.equal(result.issues[0].issueId,good.id);
 assert.equal(result.completeIssueInventory,false);
 assert.equal(result.privateEventDataStored,false);
 assert.equal(result.autoMerge,false);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_CRASH|private@example|Sensitive source path|test-token/);
});
test('Sentry rejects credentials, unexpected status, wrong project and duplicate groups',async()=>{
 for(const cfg of [
  {token:''},{organization:'../other'},{projectId:'none'},
  {fetchImpl:mock([good],403)},
  {fetchImpl:mock([{...good,project:{id:'999'}}])},
  {fetchImpl:mock([good,good])}
 ]){
  await assert.rejects(()=>listSentryIssueSample({
   organization:org,projectId,token,fetchImpl:mock(),...cfg
  }));
 }
});
test('Sentry rejects excessive response size and invalid content type',async()=>{
 await assert.rejects(()=>listSentryIssueSample({organization:org,projectId,token,
  fetchImpl:async()=>({status:200,headers:{get:()=> 'text/html'},text:async()=>'<html></html>'})}),
 /SENTRY_INVALID_CONTENT_TYPE/);
 await assert.rejects(()=>listSentryIssueSample({organization:org,projectId,token,
  fetchImpl:mock(Array.from({length:26},(_,i)=>({...good,id:String(1000+i)})))}),
 /SENTRY_INCOMPLETE_PAGE/);
});

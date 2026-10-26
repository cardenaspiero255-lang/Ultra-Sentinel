'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyUniqueOwnerComment}=require('../../packages/recovery/owner-comment-replay-gate.cjs');
const BODY='ULTRA_SENTINEL_OWNER_APPROVAL_V1|SANDBOX_HUNTER_FIXER_JUDGE|'+'a'.repeat(40)+'|'+'b'.repeat(64)+'|nonce-always-unique-0123456789|1792975000000';
function comment(id,body=BODY,userId=322222186){
 return {id,body,user:{id:userId,login:'cardenaspiero255-lang'},
  created_at:'2026-10-26T01:00:00Z',updated_at:'2026-10-26T01:00:00Z'};
}
const ev={action:'created',issue:{number:50,pull_request:null},
 repository:{id:1418338512,full_name:'cardenaspiero255-lang/Ultra-Sentinel'},
 comment:comment(99),sender:{id:322222186}};
function fetchRows(rows){
 return async(url,opts)=>{
  assert.match(url,/^https:\/\/api\.github\.com\/repos\/cardenaspiero255-lang\/Ultra-Sentinel\/issues\/50\/comments\?/);
  assert.match(opts.headers.Authorization,/^Bearer /);
  assert.equal(opts.redirect,'error');
  return {ok:true,json:async()=>rows};
 };
}
test('latest authenticated owner comment with unique nonce is accepted',async()=>{
 const x=await verifyUniqueOwnerComment({event:ev,token:'long-github-token-placeholder-abc',
  fetchImpl:fetchRows([comment(25,'other'),comment(99)])});
 assert.equal(x.status,'OWNER_COMMENT_NONCE_UNIQUE');
 assert.equal(x.commentId,99);
});
test('nonce previously used even in different approval plan must be rejected',async()=>{
 const sameNonce='nonce-always-unique-0123456789';
 const earlier=comment(11,BODY.replace('a'.repeat(40),'f'.repeat(40)));
 assert.ok(earlier.body.includes(sameNonce));
 await assert.rejects(verifyUniqueOwnerComment({event:ev,token:'long-github-token-placeholder-abc',
  fetchImpl:fetchRows([earlier,comment(99)])}),/OWNER_NONCE_REPLAY_OR_UNVERIFIED/);
});
test('missing current comment, foreign owner, edited comment, HTTP errors and no token fail closed',async()=>{
 for(const rows of [[comment(25,'other')],[comment(99,BODY,1)],
  [{...comment(99),updated_at:'2026-10-26T01:01:00Z'}]])
  await assert.rejects(verifyUniqueOwnerComment({event:ev,token:'long-github-token-placeholder-abc',
   fetchImpl:fetchRows(rows)}),/OWNER_NONCE_REPLAY_OR_UNVERIFIED/);
 await assert.rejects(verifyUniqueOwnerComment({event:ev,token:'long-github-token-placeholder-abc',
  fetchImpl:async()=>({ok:false})}),/OWNER_NONCE_REPLAY_OR_UNVERIFIED/);
 await assert.rejects(verifyUniqueOwnerComment({event:ev,token:'',fetchImpl:fetchRows([comment(99)])}),
  /OWNER_NONCE_REPLAY_OR_UNVERIFIED/);
});

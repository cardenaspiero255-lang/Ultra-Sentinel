'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {adjudicateGenericJvmTriplets}=require('../../packages/recovery/phase2-generic-jvm-judge.cjs');
function item(id,mark){return {
 caseId:id,sourceHeadSha:'a'.repeat(40),originalBlobSha:'b'.repeat(40),candidateBlobSha:'c'.repeat(40),
 markers:{originalFailure:'DEFECT_'+mark,green:['BENIGN_'+mark+'_PASS','NEW_'+mark+'_ORACLE_PASS'],unsafeFailure:'REGRESSION_'+mark},
 original:{exitCode:1,stdout:'',stderr:'DEFECT_'+mark+'\n'},
 candidate:{exitCode:0,stdout:'BENIGN_'+mark+'_PASS\nNEW_'+mark+'_ORACLE_PASS\n',stderr:''},
 unsafe:{exitCode:1,stdout:'',stderr:'REGRESSION_'+mark+'\n'}
};}
test('different unseen case names share strict candidate/oracle/veto classifier without authority',()=>{
 const res=adjudicateGenericJvmTriplets({cases:[item('SCOPE_A_2026','A'),item('SCOPE_B_2026','B')]});
 assert.equal(res.status,'INERT_JVM_BATCH_AWAITING_TRUSTED_RUNNER');
 assert.deepEqual(res.approvedCaseIds,['SCOPE_A_2026','SCOPE_B_2026']);
 assert.equal(res.originalJvmAuthenticated,false);
 assert.equal(res.gitJudgeExecuted,false);
 assert.equal(res.causalityVerified,false);
 assert.equal(res.mergeAllowed,false);
});
test('failure or missing benign markers always veto entire batch',()=>{
 const a=item('SCOPE_A_2026','A'),b=item('SCOPE_B_2026','B');
 for(const bad of [
  {...a,candidate:{...a.candidate,stdout:'NEW_A_ORACLE_PASS\n'}},
  {...a,candidate:{...a.candidate,exitCode:1}},
  {...a,original:{...a.original,exitCode:0}},
  {...a,unsafe:{...a.unsafe,stderr:'wrong failure\n'}},
  {...a,markers:{...a.markers,green:['NEW_A_ORACLE_PASS']}},
  {...a,markers:{...a.markers,unsafeFailure:'DEFECT_A'}},
  {...a,candidateBlobSha:a.originalBlobSha},
  {...a,original:{...a.original,stderr:b.original.stderr}},
 ])assert.match(adjudicateGenericJvmTriplets({cases:[bad,b]}).status,/^BLOCKED_/);
});
test('duplicate IDs, malformed provenance and untrusted accessors/proxies fail closed',()=>{
 const a=item('SCOPE_A_2026','A');
 for(const bad of [
  {cases:[a,a]},
  {cases:[{...a,sourceHeadSha:'INVALID'}]},
  {cases:[{...a,unexpectedPrivilege:true}]},
 ])assert.match(adjudicateGenericJvmTriplets(bad).status,/^BLOCKED_/);
 let touched=0;const proxy=new Proxy({cases:[a]},{ownKeys(){touched++;throw Error('trap');}});
 assert.match(adjudicateGenericJvmTriplets(proxy).status,/^BLOCKED_/);
 const b=item('SCOPE_B_2026','B');Object.defineProperty(b.candidate,'stdout',{get(){touched++;throw Error('getter');}});
 assert.match(adjudicateGenericJvmTriplets({cases:[b]}).status,/^BLOCKED_/);
 assert.equal(touched,0);
});

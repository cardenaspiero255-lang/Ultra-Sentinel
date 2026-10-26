'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {validateOwnerWorkflowApproval}=require('../../packages/recovery/github-workflow-approval.cjs');
const REPO='cardenaspiero255-lang/Ultra-Sentinel',SHA='a'.repeat(40),NOW=1792976400000;
const run={id:12345678,run_attempt:1,event:'workflow_dispatch',status:'in_progress',
 conclusion:null,head_branch:'main',head_sha:SHA,
 path:'.github/workflows/owner-one-click-sandbox.yml',
 actor:{id:322222186,login:'cardenaspiero255-lang'},
 repository:{id:1418338512,full_name:REPO},
 created_at:new Date(NOW-60000).toISOString()};
const context={repository:REPO,repositoryId:'1418338512',
 actorId:'322222186',ref:'refs/heads/main',sha:SHA,
 eventName:'workflow_dispatch',runId:'12345678',runAttempt:'1',now:NOW};
function accepted(value){return validateOwnerWorkflowApproval({...context,run:value});}
test('one-click approval accepts owner-authenticated exact main SHA, read-only drill only',()=>{
 const r=accepted(run);
 assert.equal(r.status,'OWNER_GITHUB_SANDBOX_ONLY');
 assert.equal(r.authorizedForSandboxDrill,true);
 assert.equal(r.authorizedForProductionRepair,false);
 assert.equal(r.signatureSubstituted,false);
 assert.equal(r.remoteWritesAllowed,false);
 assert.equal(r.mergeAllowed,false);
 assert.equal(r.sha,SHA);
 assert.equal(r.runId,12345678);
});
test('rejects forged owner, repo, actor, SHA and event before granting any operation',()=>{
 const cases=[
 {...run,actor:{...run.actor,id:123}},
 {...run,actor:{...run.actor,login:'attacker'}},
 {...run,repository:{...run.repository,id:111}},
 {...run,repository:{...run.repository,full_name:'other/repo'}},
 {...run,head_sha:'b'.repeat(40)},
 {...run,event:'pull_request'},
 {...run,event:'issue_comment'},
 {...run,head_branch:'feature'},
 {...run,path:'.github/workflows/other.yml'},
 ];
 for(const x of cases)assert.throws(()=>accepted(x),/APPROVAL_DENIED/);
});
test('rejects stale and future-dated approvals, reruns and ambiguous run metadata',()=>{
 for(const x of [
 {...run,created_at:new Date(NOW-15*60*1000-1).toISOString()},
 {...run,created_at:new Date(NOW+61000).toISOString()},
 {...run,run_attempt:2},
 {...run,id:11},
 {...run,status:'completed',conclusion:'failure'},
 {...run,actor:null},
 {...run,created_at:'not-a-date'},
 {...run,conclusion:'success'},
 ])assert.throws(()=>accepted(x),/APPROVAL_DENIED/);
 for(const change of [
  {actorId:'444'}, {repository:'evil/repo'}, {ref:'refs/heads/dev'},
  {eventName:'pull_request'}, {sha:'b'.repeat(40)},
  {runAttempt:'2'}, {runId:'999'},{repositoryId:'777'}
 ])assert.throws(()=>validateOwnerWorkflowApproval({...context,...change,run}),/APPROVAL_DENIED/);
});
test('CLI cannot create an approval when GitHub run metadata and context are absent',()=>{
 const cli=path.resolve(__dirname,'../../scripts/verify-github-workflow-approval.cjs');
 const r=spawnSync(process.execPath,[cli],{encoding:'utf8',timeout:10000,
  env:{PATH:process.env.PATH,HOME:os.tmpdir()}});
 assert.equal(r.status,1);
 assert.equal(r.stdout,'');
 assert.match(r.stderr,/OWNER_GITHUB_APPROVAL_BLOCKED/);
});
test('CLI rejects symbolic links and forged JSON without publishing secrets',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-github-approval-'));
 try{
  const metadata=path.join(dir,'run.json');fs.writeFileSync(metadata,JSON.stringify(run),{mode:0o600});
  const link=path.join(dir,'run-link.json');fs.symlinkSync(metadata,link);
  const cli=path.resolve(__dirname,'../../scripts/verify-github-workflow-approval.cjs');
  const env={PATH:process.env.PATH,HOME:dir,
   ULTRA_OWNER_RUN_METADATA_FILE:link,GITHUB_REPOSITORY:REPO,
   GITHUB_REPOSITORY_ID:'1418338512',GITHUB_ACTOR_ID:'322222186',
   GITHUB_REF:'refs/heads/main',GITHUB_SHA:SHA,
   GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ID:'12345678',GITHUB_RUN_ATTEMPT:'1'};
  const x=spawnSync(process.execPath,[cli],{env,encoding:'utf8',timeout:10000});
  assert.equal(x.status,1);
  assert.equal(x.stdout,'');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('one-click GH workflow remains immutable-main, owner-only and read-only',()=>{
 const root=path.resolve(__dirname,'../..');
 const source=fs.readFileSync(path.join(root,'.github/workflows/owner-one-click-sandbox.yml'),'utf8');
 for(const required of [
  'on:\n  workflow_dispatch:',"github.ref == 'refs/heads/main'",
  'github.event.repository.id == 1418338512',
  "github.actor_id == '322222186'",
  "github.actor == 'cardenaspiero255-lang'",
  'github.run_attempt == 1',
  'persist-credentials: false',
  'ref: ${{ github.sha }}',
  'npm run check',
  'verify-github-workflow-approval.cjs',
  'node --test tests/unit/hunter-owner-flow.test.cjs',
  'tests/unit/repair-judge.test.cjs',
  'scripts/drill-bwrap-isolation.cjs',
  "realProductionRepairVerified:false",
  'privateEditionCertified:false',
  'retention-days: 14'
 ])assert.ok(source.includes(required),required);
 assert.match(source,/permissions:\n  contents: read\n  actions: read/);
 assert.doesNotMatch(source,/pull_request_target|contents: write|deployments: write|secrets\.|git push|git merge|git remote add|sudo sysctl/);
 const ownerRunner=fs.readFileSync(path.join(root,'scripts/run-owner-sandbox-repair.cjs'),'utf8');
 assert.match(ownerRunner,/requireRedGreenJudge:true,requireHunterEvidence:true/);
 assert.match(ownerRunner,/OWNER_SIGNING_KEY|OWNER_PUBLIC_KEY_FILE|trustedPublicKey/);
});
test('CLI accepts exact current API-backed owner run, but never authorizes production',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-github-approval-success-'));
 try{
  const file=path.join(dir,'run.json');
  fs.writeFileSync(file,JSON.stringify({...run,created_at:new Date(Date.now()-5000).toISOString()}),{mode:0o600});
  const cli=path.resolve(__dirname,'../../scripts/verify-github-workflow-approval.cjs');
  const env={PATH:process.env.PATH,HOME:dir,
   ULTRA_OWNER_RUN_METADATA_FILE:file,GITHUB_REPOSITORY:REPO,
   GITHUB_REPOSITORY_ID:'1418338512',GITHUB_ACTOR_ID:'322222186',
   GITHUB_REF:'refs/heads/main',GITHUB_SHA:SHA,GITHUB_EVENT_NAME:'workflow_dispatch',
   GITHUB_RUN_ID:'12345678',GITHUB_RUN_ATTEMPT:'1',
   GITHUB_WORKFLOW_REF:REPO+'/.github/workflows/owner-one-click-sandbox.yml@refs/heads/main'
  };
  const result=spawnSync(process.execPath,[cli],{env,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
  const x=JSON.parse(result.stdout.trim());
  assert.equal(x.status,'OWNER_GITHUB_SANDBOX_ONLY');
  assert.equal(x.authorizedForProductionRepair,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

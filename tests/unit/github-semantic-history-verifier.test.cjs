'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const verifier=require('../../packages/investigation/github-semantic-history-verifier.cjs');
const original='e4ca122422f1cb591d407db3fb21fb00fd78b022',main='4285e5175a458ae653a870e4139502dcad38ad4d';
const root='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const sources=[
 [root+'store/SteamMultiAccountSyncGuard.kt','037f4bda0349cef491746b5a7a118cc9b980ddc7'],
 [root+'domain/GameAccountValidation.kt','c608c277ce1b7610a345971fd643c4c0f8b7c9e3'],
 [root+'domain/GamePlatform.kt','673121b0c2e8fc558b88e46aad460c727f9e5fad']
];
const steps=['Checkout trusted repository without persistent credentials','All architecture and regression tests',
 'Fetch and verify Kotlin compiler 2.0.21','Check compiler symbols and local blob binding on synthetic sources',
 'Require real Bubblewrap plus enforced AppArmor','Checkout pinned original GameHub for call-claim observation',
 'Observe original Kotlin calls in isolated compiler','Archive sanitized GameHub call-claim observation'];
function fixture(){
 const run={id:42565038417,run_attempt:1,head_sha:main,head_branch:'main',event:'push',
  status:'completed',conclusion:'success',workflow_id:398396093,
  path:'.github/workflows/real-kotlin-cross-file-functional-judge.yml',
  actor:{id:322222186},repository:{id:1418338512},head_repository:{id:1418338512}};
 const job={id:128989612596,run_id:42565038417,name:'original-kotlin-cross-file',
  status:'completed',conclusion:'success',steps:steps.map(name=>({name,status:'completed',conclusion:'success'}))};
 const jobs={total_count:1,jobs:[job]};
 const artifact={id:13651395316,name:'phase2-gamehub-semantic-call-claims',
  digest:'sha256:59b11ecd51eb3ab0e65acae4622219b7ce5cf86699719eb265d23c1a0742c7a9',
  workflow_run:{id:42565038417,repository_id:1418338512,head_repository_id:1418338512,head_sha:main,head_branch:'main'}};
 const repository={id:1375408706,full_name:'cardenaspiero255-lang/gamehub-ultra',owner:{id:322222186}};
 const commit={sha:original,commit:{tree:{sha:'52359cf6bfb6ddd5c5869a76d8aa0af9eb172bff'}}};
 const tree={sha:'52359cf6bfb6ddd5c5869a76d8aa0af9eb172bff',truncated:false,
  tree:sources.map(([path,sha])=>({path,sha,type:'blob',mode:'100644'}))};
 return {run,jobs,artifact,repository,commit,tree,
  archive:fs.readFileSync(path.join(__dirname,'../fixtures/phase2-github-semantic-main.zip')).toString('base64')};
}
const serialize=x=>({run:JSON.stringify(x.run),jobs:JSON.stringify(x.jobs),artifact:JSON.stringify(x.artifact),
 repository:JSON.stringify(x.repository),commit:JSON.stringify(x.commit),tree:JSON.stringify(x.tree),archive:x.archive});
test('untrusted matching metadata is only consistent and cannot authenticate compiler execution',()=>{
 assert.equal(typeof verifier.assessUntrustedHistoricalSemanticEvidence,'function');
 const r=verifier.assessUntrustedHistoricalSemanticEvidence(serialize(fixture()));
 assert.equal(r.status,'HISTORICAL_EVIDENCE_CONSISTENT_UNTRUSTED');
 assert.equal(r.compilerExecutionVerified,false);assert.equal(r.symbolResolutionVerified,false);
 assert.equal(r.causalityVerified,false);assert.equal(r.freshnessVerified,false);
});
test('rejects cross-run, wrong workflow, source, job, artifact and skipped-step substitutions',()=>{
 for(const change of [
  x=>x.run.id++,x=>x.run.run_attempt=2,x=>x.run.head_sha='f'.repeat(40),
  x=>x.run.workflow_id++,x=>x.run.actor.id++,x=>x.run.event='pull_request',
  x=>x.jobs.jobs[0].id++,x=>x.jobs.jobs[0].steps[4].conclusion='skipped',
  x=>x.jobs.jobs[0].steps.push({...x.jobs.jobs[0].steps[0]}),
  x=>x.artifact.workflow_run.id++,x=>x.artifact.digest='sha256:'+'0'.repeat(64),
  x=>x.repository.id++,x=>x.commit.sha='0'.repeat(40),x=>x.tree.truncated=true,
  x=>x.tree.tree[0].sha='0'.repeat(40),x=>x.tree.tree.push({...x.tree.tree[0]}),
  x=>x.archive=Buffer.from('forged').toString('base64')
 ]){
  const f=fixture();change(f);
  assert.throws(()=>verifier.assessUntrustedHistoricalSemanticEvidence(serialize(f)),/SEMANTIC_HISTORY_EVIDENCE_REJECTED/);
 }
});
test('rejects malformed or effectful inputs before their getters or proxy traps run',()=>{
 let effects=0;const f=serialize(fixture());
 Object.defineProperty(f,'run',{get(){effects++;return '{}';}});
 assert.throws(()=>verifier.assessUntrustedHistoricalSemanticEvidence(f),/SEMANTIC_HISTORY_EVIDENCE_REJECTED/);
 assert.throws(()=>verifier.assessUntrustedHistoricalSemanticEvidence(new Proxy({},
  {get(){effects++;throw Error('effect');},getPrototypeOf(){effects++;throw Error('effect');}})),/SEMANTIC_HISTORY_EVIDENCE_REJECTED/);
 assert.equal(effects,0);
});
test('the live verifier rejects invalid input before network or Git access',async()=>{
 let effects=0;const input={directory:'/tmp/any',archivePath:'/tmp/any'};
 Object.defineProperty(input,'directory',{get(){effects++;return '/tmp/any';}});
 await assert.rejects(verifier.verifyPinnedGithubSemanticHistory(input),/SEMANTIC_HISTORY_EVIDENCE_REJECTED/);
 assert.equal(effects,0);
});
test('rejects tampered or symbolic-link archives before using a checkout',async()=>{
 const os=require('node:os');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'semantic-history-bad-'));
 try{
  const bad=path.join(dir,'bad.zip'),link=path.join(dir,'link.zip');
  fs.writeFileSync(bad,'forged');fs.symlinkSync(bad,link);
  for(const archivePath of [bad,link])
   await assert.rejects(verifier.verifyPinnedGithubSemanticHistory({directory:dir,archivePath}),/SEMANTIC_HISTORY_EVIDENCE_REJECTED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('the command-line verifier fails closed without an exact checkout and archive',()=>{
 const {spawnSync}=require('node:child_process');
 const cli=path.resolve(__dirname,'../../scripts/verify-github-semantic-history.cjs');
 const result=spawnSync(process.execPath,[cli],{encoding:'utf8',timeout:5000,
  env:{PATH:process.env.PATH}});
 assert.equal(result.status,1);assert.equal(result.stdout,'');
 assert.match(result.stderr,/SEMANTIC_HISTORY_EVIDENCE_REJECTED/);
});

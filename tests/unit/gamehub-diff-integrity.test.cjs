'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadGameHubPullRequest}=require('../../packages/orchestrator/gamehub-live-reader.cjs');
const repo='cardenaspiero255-lang/gamehub-ultra',head='a'.repeat(40),base='b'.repeat(40),token='test-token-with-read-access';
const file=(patch,additions,deletions)=>({filename:'.github/scripts/example.cjs',status:'modified',patch,additions,deletions,changes:additions+deletions});
const pr={number:201,state:'open',draft:false,base:{sha:base,repo:{full_name:repo,id:1375408706}},head:{sha:head},changed_files:1};
function reader(item){return async(url)=>({status:200,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(url.includes('/files?')?[item]:pr)});}
async function check(item){return loadGameHubPullRequest(201,{token,fetchImpl:reader(item)})}
test('hunk missing context cannot pass as complete even when change totals match',async()=>{
 const patch='@@ -1,3 +1,3 @@\n context\n-old\n+new\n';
 await assert.rejects(check(file(patch,1,1)),/INCOMPLETE_PR_DIFF/);
});
test('rows interpreted as diff headers by the frozen Core cannot silently bypass analysis',async()=>{
 for(const patch of ['@@ -0,0 +1 @@\n+++counter\n','@@ -1 +0,0 @@\n---counter\n']){
  const deletion=patch.includes('---counter');
  await assert.rejects(check(file(patch,deletion?0:1,deletion?1:0)),/INCOMPLETE_PR_DIFF/);
 }
});
test('complete multi-hunk diff and no-newline markers remain accepted',async()=>{
 const patch='@@ -1 +1 @@\n-old\n+new\n@@ -5 +5 @@\n-old2\n+new2\n\\ No newline at end of file\n';
 const result=await check(file(patch,2,2));
 assert.equal(result.completeDiff,true);
});
test('real Git diff preserves context and is accepted with actual numstat counts',async()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {execFileSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-git-diff-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 try{
  git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  const p=path.join(root,'sample.cjs');
  fs.writeFileSync(p,Array.from({length:20},(_,i)=>'const item'+i+' = '+i+';').join('\n')+'\n');
  git('add','sample.cjs');git('commit','-qm','baseline');
  let s=fs.readFileSync(p,'utf8');s=s.replace('const item2 = 2;','const item2 = 42;').replace('const item17 = 17;','const item17 = 99;');fs.writeFileSync(p,s);
  const diff=git('diff','--no-ext-diff','--no-color','--','sample.cjs');
  const patch=diff.slice(diff.indexOf('@@ '));
  const nums=git('diff','--numstat','--','sample.cjs').trim().split(/\s+/).slice(0,2).map(Number);
  assert.deepEqual(nums,[2,2]);
  const result=await check(file(patch,nums[0],nums[1]));
  assert.equal(result.completeDiff,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

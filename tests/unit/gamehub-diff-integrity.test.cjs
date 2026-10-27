'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadGameHubPullRequest}=require('../../packages/orchestrator/gamehub-live-reader.cjs');
const {source}=require('../helpers/github-source-fixture.cjs');
const repo='cardenaspiero255-lang/gamehub-ultra',head='a'.repeat(40),base='b'.repeat(40),token='test-token-with-read-access';
const file=(patch,additions,deletions)=>({filename:'.github/scripts/example.cjs',status:'modified',patch,additions,deletions,changes:additions+deletions});
const pr={number:201,state:'open',draft:false,base:{sha:base,repo:{full_name:repo,id:1375408706}},head:{sha:head},changed_files:1};
function reader(item,before,after){
 item={...item,sha:source(after,item.filename).sha};
 return async(url)=>({status:200,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(
  url.includes('/compare/')?{base_commit:{sha:base},merge_base_commit:{sha:base}}:
  url.includes('/contents/')?source(url.endsWith(base)?before:after,item.filename):
  url.includes('/files?')?[item]:pr)});
}
async function check(item,before='',after=''){return loadGameHubPullRequest(201,{token,fetchImpl:reader(item,before,after)})}
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
 const result=await check(file(patch,2,2),'old\na\nb\nc\nold2\n','new\na\nb\nc\nnew2');
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
  const before=fs.readFileSync(p,'utf8');let s=before;s=s.replace('const item2 = 2;','const item2 = 42;').replace('const item17 = 17;','const item17 = 99;');fs.writeFileSync(p,s);
  const diff=git('diff','--no-ext-diff','--no-color','--','sample.cjs');
  const patch=diff.slice(diff.indexOf('@@ '));
  const nums=git('diff','--numstat','--','sample.cjs').trim().split(/\s+/).slice(0,2).map(Number);
  assert.deepEqual(nums,[2,2]);
  const result=await check(file(patch,nums[0],nums[1]),before,s);
  assert.equal(result.completeDiff,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('reader rejects matching counts with a truncated final line',async()=>{
 await assert.rejects(check(file('@@ -0,0 +1 @@\n+const OPENAI_API_KEY = ',1,0),'','const OPENAI_API_KEY = "secret";\n'),/UNVERIFIED_DIFF_CONTENT/);
});
test('real divergent Git history uses merge-base for rename, add and remove',async()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'diff-history-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trimEnd();
 const get=(sha,p)=>execFileSync('git',['show',sha+':'+p],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 try{
  git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  fs.writeFileSync(path.join(root,'old.js'),'one\ntwo\nthree\nfour\n');fs.writeFileSync(path.join(root,'remove.js'),'gone\n');
  git('add','.');git('commit','-qm','baseline');const merge=git('rev-parse','HEAD');
  git('checkout','-qb','topic');git('mv','old.js','new.js');fs.writeFileSync(path.join(root,'new.js'),'one\nchanged\nthree\nfour\n');
  git('rm','remove.js');fs.writeFileSync(path.join(root,'add.js'),'added\n');git('add','.');git('commit','-qm','topic');const topic=git('rev-parse','HEAD');
  git('checkout','-qb','base',merge);fs.writeFileSync(path.join(root,'old.js'),'base advanced\n');git('add','.');git('commit','-qm','base advanced');const tip=git('rev-parse','HEAD');
  assert.equal(git('merge-base',tip,topic),merge);
  const entries=[['new.js','renamed','old.js'],['add.js','added'],['remove.js','removed']].map(([filename,status,previous_filename])=>{
   const paths=previous_filename?[previous_filename,filename]:[filename];
   const diff=git('diff','--no-ext-diff','--no-textconv','--no-color','-M',merge,topic,'--',...paths);
   const nums=git('diff','--numstat','-M',merge,topic,'--',...paths).split(/\s+/).slice(0,2).map(Number);
   return {filename,status,previous_filename,patch:diff.slice(diff.indexOf('@@ ')),additions:nums[0],deletions:nums[1],changes:nums[0]+nums[1],sha:git('rev-parse',(status==='removed'?merge:topic)+':'+filename)};
  });
  const metadata={...pr,changed_files:3,head:{sha:topic},base:{...pr.base,sha:tip}};
  const calls=[];
  const fetchImpl=async url=>{
   calls.push(url);let body;
   if(url.includes('/compare/'))body={base_commit:{sha:tip},merge_base_commit:{sha:merge}};
   else if(url.includes('/contents/')){const u=new URL(url),p=decodeURIComponent(u.pathname.split('/contents/')[1]);body=source(get(u.searchParams.get('ref'),p),p);}
   else body=url.includes('/files?')?entries:metadata;
   return {url,status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(body)};
  };
  const result=await loadGameHubPullRequest(201,{token,fetchImpl});
  assert.equal(result.mergeBaseSha,merge);assert.equal(result.diffContentVerified,true);
  assert.ok(calls.some(x=>x.endsWith('/contents/old.js?ref='+merge)));
  assert.ok(!calls.some(x=>x.includes('/contents/')&&x.endsWith(tip)));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

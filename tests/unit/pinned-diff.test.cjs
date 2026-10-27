'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyPinnedDiff,decodeDiffSource}=require('../../packages/orchestrator/pinned-diff.cjs');
const {createHash}=require('node:crypto');
function raw(text){const b=Buffer.from(text);return {type:'file',path:'a.js',size:b.length,encoding:'base64',content:b.toString('base64'),sha:createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};}
test('mid-line truncation with correct counts is rejected',()=>{
 assert.throws(()=>verifyPinnedDiff('@@ -0,0 +1 @@\n+const OPENAI_API_KEY = ', '', 'const OPENAI_API_KEY = "secret";\n'),/UNVERIFIED_DIFF_CONTENT/);
});
test('source comparison checks omitted changes, context, positions and old lines',()=>{
 for(const [patch,before,after] of [
  ['@@ -1 +1 @@\n-old\n+new','old\nother\n','new\nhidden\n'],
  ['@@ -1,2 +1,2 @@\n wrong\n-old\n+new','right\nold\n','right\nnew\n'],
  ['@@ -2 +1 @@\n-old\n+new','old\n','new\n'],
  ['@@ -1 +2 @@\n-old\n+new','old\n','new\n'],
  ['@@ -1 +1 @@\n-false\n+new','old\n','new\n']
 ])assert.throws(()=>verifyPinnedDiff(patch,before,after),/UNVERIFIED_DIFF_CONTENT/);
});
test('source decoder rejects invalid hashes, non-files, binary and traversal',()=>{
 const r=raw('hello\n');assert.equal(decodeDiffSource(r,{path:r.path,blobSha:r.sha}),'hello\n');
 assert.equal(decodeDiffSource(raw(''),{path:'a.js'}),'');
 for(const bad of [{...r,type:'symlink'},{...r,sha:'a'.repeat(40)},{...r,content:'Zg=='},{...r,submodule_git_url:'url'},raw('a\0b')])
  assert.throws(()=>decodeDiffSource(bad,{path:'a.js'}),/UNVERIFIED_PINNED_SOURCE/);
 for(const path of ['../a.js','a/../b.js','/a.js','a\\b','a\n.js'])
  assert.throws(()=>decodeDiffSource({...r,path},{path}),/UNVERIFIED_PINNED_SOURCE/);
});
test('real Git patches: additions, removals, CRLF, UTF-8, empty lines and EOF markers',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pinned-diff-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 try{
  git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.invalid');git('config','core.autocrlf','false');
  const samples=['','a','a\n','a\r\n','\n','ñ\n\n','a\nb','a\nb\n','+++counter\n','---counter\n'];
  for(const before of samples)for(const after of samples){
   if(before===after)continue;
   fs.writeFileSync(path.join(root,'a.txt'),before);git('add','a.txt');
   fs.writeFileSync(path.join(root,'a.txt'),after);
   const diff=git('diff','--no-ext-diff','--no-textconv','--no-color','--','a.txt');
   const patch=diff.slice(diff.indexOf('@@ '));
   assert.equal(verifyPinnedDiff(patch,before,after),true,JSON.stringify({before,after}));
   assert.equal(verifyPinnedDiff(patch.replace(/\n$/,''),before,after),true);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('forged EOF marker cannot split one added source line into multiple analyzed lines',()=>{
 assert.throws(()=>verifyPinnedDiff('@@ -0,0 +1,2 @@\n+const OPENAI_\n\\ No newline at end of file\n+API_KEY = "secret";', '', 'const OPENAI_API_KEY = "secret";\n'),/UNVERIFIED_DIFF_CONTENT/);
});
test('bounded files with many short lines do not overflow the argument stack',()=>{
 const prefix='\n'.repeat(130000);
 assert.equal(verifyPinnedDiff('@@ -130001 +130001 @@\n-old\n+new\n',prefix+'old\n',prefix+'new\n'),true);
});

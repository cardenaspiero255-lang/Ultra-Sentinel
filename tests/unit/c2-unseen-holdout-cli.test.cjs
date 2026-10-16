'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {LOCK}=require('../../packages/quality-gates/c2-unseen-holdout.cjs');
const {readEvidence,main}=require('../../scripts/verify-c2-unseen-holdout.cjs');
const valid=()=>LOCK.cases.map(x=>({pr:x.pr,headSha:x.headSha,baseSha:x.baseSha,
 changedFiles:x.changedFiles,state:x.state,baseRepoId:1375408706,
 baseOwnerId:322222186,headRepoId:1375408706,headOwnerId:322222186}));
function withFile(callback){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-owner-holdout-'));
 const file=path.join(dir,'input.json');
 try{return callback({dir,file});}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('CLI validates normalized strictly frozen GitHub identity records',()=>withFile(({file})=>{
 fs.writeFileSync(file,JSON.stringify(valid()));
 assert.equal(main(file).cases.length,4);
}));
test('relative path, symlink, wrong SHA and excess bytes are rejected',()=>withFile(({file,dir})=>{
 fs.writeFileSync(file,JSON.stringify(valid()));
 assert.throws(()=>readEvidence('input.json'),/C2_HOLDOUT_INPUT_INVALID/);
 const sym=path.join(dir,'link');fs.symlinkSync(file,sym);
 assert.throws(()=>readEvidence(sym),/C2_HOLDOUT_INPUT_INVALID/);
 fs.writeFileSync(file,JSON.stringify(valid().map((x,i)=>i===2?{...x,headSha:'a'.repeat(40)}:x)));
 assert.throws(()=>main(file),/UNVERIFIED_HOLDOUT_SOURCE/);
 fs.writeFileSync(file,'X'.repeat(20001));
 assert.throws(()=>readEvidence(file),/C2_HOLDOUT_INPUT_INVALID/);
}));

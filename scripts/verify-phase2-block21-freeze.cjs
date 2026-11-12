#!/usr/bin/env node
'use strict';
/** Verify full original PR #380 engine Git objects, not source content from the holdout. */
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const {parseBlock21Freeze,inspectBlock21Freeze}=require('../packages/quality-gates/phase2-block21-freeze.cjs');
const root=path.resolve(__dirname,'..');
const bytes=fs.readFileSync(path.join(root,'docs/quality/PHASE2-BLOCK21-FREEZE-20261112.json'));
const freeze=parseBlock21Freeze(bytes);
function git(...args){
 const env={...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};
 const out=cp.spawnSync('git',args,{cwd:root,env,encoding:'utf8',timeout:10000,maxBuffer:200000});
 if(out.error||out.status!==0)throw Error('GIT_OBJECT_NOT_VERIFIED:'+args[0]+':'+String(out.stderr||out.error).slice(0,200));
 return out.stdout.trim();
}
function verify(){
 const e=freeze.engine;
 if(git('rev-parse','--verify',e.commitSha+'^{commit}')!==e.commitSha)throw Error('ENGINE_COMMIT_MISMATCH');
 if(git('rev-parse',e.commitSha+'^{tree}')!==e.treeSha)throw Error('ENGINE_TREE_MISMATCH');
 if(git('merge-base','--is-ancestor',e.commitSha,'HEAD')!=='')throw Error('ENGINE_NOT_ANCESTOR');
 for(const m of e.relevantBlobs){
  if(git('rev-parse',e.commitSha+':'+m.path)!==m.blobSha||
    git('cat-file','-t',m.blobSha)!=='blob')throw Error('ENGINE_MODULE_MISMATCH:'+m.path);
 }
 return Object.freeze({...inspectBlock21Freeze(bytes),frozenGitEngineVerified:true,
  externalSourceGitVerified:false,sourceBodiesRead:false,oraclesRead:false,predictionsExecuted:false});
}
if(require.main===module){
 try{console.log(JSON.stringify(verify()));}
 catch(e){console.error(String(e.message));process.exitCode=1;}
}
module.exports=Object.freeze({verify});

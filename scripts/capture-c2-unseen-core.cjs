#!/usr/bin/env node
'use strict';
const {captureUnseenCoreHoldout}=
 require('../packages/quality-gates/c2-unseen-core-capture.cjs');
async function main(){
 const result=await captureUnseenCoreHoldout({token:process.env.GITHUB_TOKEN});
 process.stdout.write(JSON.stringify(result)+'\n');
}
if(require.main===module)main().catch(error=>{
 const code=String(error?.message||'');
 const safe=/^C2_UNSEEN_CORE_CAPTURE_BLOCKED(?:_PR(?:205|206|208)_[A-Z_]+|_[A-Z_]+)?$/.test(code)?
  code:'C2_UNSEEN_CORE_CAPTURE_BLOCKED';
 process.stderr.write(safe+'\n');
 process.exitCode=2;
});
module.exports={main};

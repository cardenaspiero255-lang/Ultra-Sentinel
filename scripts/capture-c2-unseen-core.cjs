#!/usr/bin/env node
'use strict';
const {captureUnseenCoreHoldout}=
 require('../packages/quality-gates/c2-unseen-core-capture.cjs');
async function main(){
 const result=await captureUnseenCoreHoldout({token:process.env.GITHUB_TOKEN});
 process.stdout.write(JSON.stringify(result)+'\n');
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('C2_UNSEEN_CORE_CAPTURE_BLOCKED: PROVENANCE_OR_COVERAGE\n');
 process.exitCode=2;
});
module.exports={main};

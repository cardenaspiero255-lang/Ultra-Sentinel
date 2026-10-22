#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {makePrioritizedIntake}=require('../packages/quality-gates/c2-pr188-label-intake-priority.cjs');
function run(args){
 if(args.length!==1||!path.isAbsolute(args[0])||fs.existsSync(args[0]))
  throw Error('C2_PR188_OUTPUT_BLOCKED');
 const roster=require('../tests/fixtures/c2-upstream-106-task-tree.json');
 const plan=makePrioritizedIntake(roster);
 fs.writeFileSync(args[0],JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
 return {schema:plan.schema,pilot:plan.pilot.length,remaining:plan.remaining.length,
  repositories:plan.uniqueRepositories,admitted:plan.newLabels,
  targetAdditionalLowerBound:plan.additionalTargetLowerBound,blindHoldout:false};
}
if(require.main===module){
 try{console.log(JSON.stringify(run(process.argv.slice(2))))}
 catch(e){console.error(String(e.message||e).slice(0,160));process.exitCode=2;}
}
module.exports={run};

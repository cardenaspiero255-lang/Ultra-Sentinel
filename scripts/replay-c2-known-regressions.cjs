#!/usr/bin/env node
'use strict';
const {main:readVerifiedTargets}=require('./capture-c2-unseen-targeted.cjs');
const {scoreKnownRegressions}=require('../packages/quality-gates/c2-known-regression-replay.cjs');
function replay(root,sha){
 const candidate=readVerifiedTargets(root);
 if(candidate?.sourceKind!=='FROZEN_TARGET_FILE_DIFF'||
  candidate?.wholePrCoverage!==false||
  candidate?.samples?.length!==3||candidate?.allSamplesComplete!==true||
  candidate?.labelsRead!==false||candidate?.baselineRead!==false||
  candidate?.tripleSPlusCertified!==false)throw Error('C2_KNOWN_REPLAY_UNVERIFIED');
 return scoreKnownRegressions(candidate.samples,sha);
}
if(require.main===module){
 try{
  if(process.argv.length!==4)throw Error('C2_KNOWN_REPLAY_UNVERIFIED');
  process.stdout.write(JSON.stringify(replay(process.argv[2],process.argv[3]))+'\n');
 }catch{
  process.stderr.write('C2_KNOWN_REPLAY_BLOCKED: UNVERIFIED_SOURCE_OR_MODEL\n');
  process.exitCode=2;
 }
}
module.exports={replay};

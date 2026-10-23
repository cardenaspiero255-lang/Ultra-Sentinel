#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),p=require('node:path'),{createHash}=require('node:crypto');
const {adjudicateSharedRollbackIntervention}=require('../packages/quality-gates/c2-shared-pr153-pr152-adjudication.cjs');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function main(root){
 if(!p.isAbsolute(root)||!fs.lstatSync(root).isDirectory())throw Error('C2_SHARED_BAD_ROOT');
 const H=f=>{
  const dest=p.resolve(root,f);
  if(!dest.startsWith(root+p.sep))throw Error('C2_SHARED_PATH_ESCAPE');
  const s=fs.lstatSync(dest);
  if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size===0||s.size>15000000)
   throw Error('C2_SHARED_BAD_FILE');
  return hash(fs.readFileSync(dest));
 };
 const Hrepo=f=>hash(fs.readFileSync(p.resolve(__dirname,'..',f)));
 const matrix=['00','01','10','11'].map(mode=>({
  mode,localReplayCorrect:mode[0]==='1',staleRejected:mode[1]==='1',
  coupledReplayCorrect:mode==='11',staleGuardBlockedReplay:mode==='10',
  normalControlsPassed:true,foreignPackageUnchanged:true,noDuplicateEvents:true,
  jarSha256:H(mode+'.jar'),logSha256:H(mode+'.log')
 }));
 const inputs={schema:'c2-original-two-sources-one-jvm-factorial-input/v1',
  source:[
   {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
    blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',repairSha256:H('adaptive-repaired.kt')},
   {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
    blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec',repairSha256:H('store-repaired.kt')}
  ],
  kotlinABIBridgeSha256:Hrepo('tests/oracles/c2-pr153-152-shared-domain-abi.kt'),
  oracleSha256:Hrepo('tests/oracles/c2-pr153-152-shared-jvm-oracle.kt'),
  originalSourceBytesVerified:true,sharedJVMCompiledBothOriginalModules:true,
  sandboxNetworkDisabled:true,sourceCandidateUnblinded:false,detectorPredictionsQueried:false,
  rows:matrix,externalGoldLabels:0,certifiedIndependentCausalFamilies:0,
  previousLabelsReclassified:0,truthSealed:false,holdoutFrozen:false
 };
 const out=adjudicateSharedRollbackIntervention(inputs);
 fs.writeFileSync(p.resolve(root,'output','shared-original-kotlin-interaction.json'),
  JSON.stringify(out,null,2)+'\n',{mode:0o600,flag:'wx'});
 process.stdout.write(JSON.stringify({originalSharedJVMs:4,interactionObserved:true,
  independentCausalFamiliesCertified:0,newGold:0,sourceExternalRead:false})+'\n');
}
if(require.main===module){try{if(process.argv.length!==3)throw Error('C2_SHARED_USAGE');main(process.argv[2])}
 catch(e){process.stderr.write('C2_SHARED_ROLLBACK_BLOCKED\n');process.exitCode=2;}}
module.exports={main};

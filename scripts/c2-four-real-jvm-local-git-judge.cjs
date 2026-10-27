'use strict';
const fs=require('node:fs'),path=require('node:path');
const {runPinnedPair}=require('../packages/recovery/gamehub-four-pair-local-judge.cjs');
try{
 const [suite,dir]=process.argv.slice(2);
 if(process.argv.length!==4||!suite||!dir||!path.isAbsolute(dir))
  throw Error('INVALID_PAIR_JUDGE_ARGUMENTS');
 const receipt=runPinnedPair({root:dir,suite});
 // Exercise the real producer output before publishing its local receipt.
 // A replacement must be rejected even though the cached JVM controls passed.
 const repairs=fs.readdirSync(dir).filter(n=>/^[a-z]+-repair\.kt$/.test(n));
 if(repairs.length!==2)throw Error('EXPECTED_TWO_REPAIR_SOURCES');
 let rejected=0;
 for(const name of repairs){
  const file=path.join(dir,name),original=fs.readFileSync(file);
  try{
   fs.writeFileSync(file,Buffer.concat([original,Buffer.from('\nfun substitutedRepair() = error("untested regression")\n')]));
   try{runPinnedPair({root:dir,suite});}
   catch(e){if(e.message!=='PINNED_GAMEHUB_PAIR_GATE_BLOCKED')throw e;rejected++;}
  }finally{fs.writeFileSync(file,original);}
 }
 if(rejected!==2)throw Error('POST_JVM_SOURCE_SUBSTITUTION_NOT_REJECTED');
 runPinnedPair({root:dir,suite});
 const out=path.join(dir,'output','local-git-judge-rollback.json');
 fs.writeFileSync(out,JSON.stringify({...receipt,postJvmSourceSubstitutionsRejected:rejected},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('GAMEHUB_FOUR_ORIGINAL_KOTLIN_PAIR_GIT_JUDGE_ROLLBACK_PASS '+suite);
}catch(e){
 console.error('GAMEHUB_FOUR_PAIR_LOCAL_JUDGE_BLOCKED: '+e.message);
 process.exitCode=1;
}

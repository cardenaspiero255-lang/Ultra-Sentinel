'use strict';
const fs=require('node:fs'),path=require('node:path');
const {runPinnedPair}=require('../packages/recovery/gamehub-four-pair-local-judge.cjs');
try{
 const [suite,dir]=process.argv.slice(2);
 if(process.argv.length!==4||!suite||!dir||!path.isAbsolute(dir))
  throw Error('INVALID_PAIR_JUDGE_ARGUMENTS');
 const receipt=runPinnedPair({root:dir,suite});
 const out=path.join(dir,'output','local-git-judge-rollback.json');
 fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('GAMEHUB_FOUR_ORIGINAL_KOTLIN_PAIR_GIT_JUDGE_ROLLBACK_PASS '+suite);
}catch(e){
 console.error('GAMEHUB_FOUR_PAIR_LOCAL_JUDGE_BLOCKED: '+e.message);
 process.exitCode=1;
}

#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {classifyTwelve}=require('../packages/quality-gates/c2-pr184-historical-causal-hypotheses.cjs');
function main(argv){
 if(argv.length!==2)throw Error('C2_PR184_ARGS_BLOCKED');
 const [source,destination]=argv;
 if(path.resolve(source)===path.resolve(destination))throw Error('C2_PR184_OVERWRITE_BLOCKED');
 const st=fs.lstatSync(source);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
   st.size<100||st.size>1500000)throw Error('C2_PR184_INPUT_BLOCKED');
 const result=classifyTwelve(JSON.parse(fs.readFileSync(source,'utf8')));
 fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({sourceIdentities:result.sourceIdentitiesReviewed,
  behaviorReplayed:result.sourceReplaysAuthenticated,positive:result.positiveHypotheses.length,
  negative:result.negativeControls.length,sharedMechanismHypothesisBuckets:result.provisionalMechanismCandidateBuckets,
  independentCertified:0,sssPlusCertified:false})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(e){process.stderr.write(String(e.message||e).slice(0,180)+'\n');process.exitCode=2}
}
module.exports={main};

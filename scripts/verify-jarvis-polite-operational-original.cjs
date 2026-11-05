'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {assessOriginalVoiceIntent,COMMIT,GATE,POLICY}=
 require('../packages/investigation/jarvis-polite-operational-original-proof.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function bounded(file,max){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>max)throw Error('EVIDENCE_INPUT_INVALID');
 return fs.readFileSync(file);
}
function main(root){
 if(typeof root!=='string'||!path.isAbsolute(root)||fs.realpathSync(root)!==root)
  throw Error('EVIDENCE_ROOT_INVALID');
 const readMode=mode=>{
  const exit=bounded(path.join(root,mode+'.exit'),8).toString('utf8');
  if(!/^(?:0|[1-9]\d{0,2})\n$/.test(exit))throw Error('EVIDENCE_EXIT_INVALID');
  return {code:Number(exit.trim()),output:bounded(path.join(root,mode+'.log'),65536).toString('utf8')};
 };
 const result=assessOriginalVoiceIntent({sourceCommit:COMMIT,gateBlob:GATE,policyBlob:POLICY,
  oracleSha256:sha(bounded(path.join(root,'input/oracle.kt'),65536)),
  jarSha256:sha(bounded(path.join(root,'out/oracle.jar'),50000000)),
  policy:readMode('policy'),gate:readMode('gate'),controls:readMode('controls')});
 fs.writeFileSync(path.join(root,'polite-original-receipt.json'),JSON.stringify(result,null,2)+'\n',
  {flag:'wx',mode:0o600});
 process.stdout.write(result.status+'\n');
}
if(require.main===module)try{main(process.argv[2]);}catch{
 process.stderr.write('POLITE_ORIGINAL_OBSERVATION_BLOCKED\n');process.exitCode=1;
}
module.exports={main};

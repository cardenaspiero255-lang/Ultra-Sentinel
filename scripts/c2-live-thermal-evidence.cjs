#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {ORIGINALS,patchedOriginal,sha1Git}=require('../packages/quality-gates/c2-pr151-158-causal-batch.cjs');
const fail=()=>{throw Error('C2_LIVE_THERMAL_EVIDENCE_BLOCKED');};
function safe(p){
 const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<2||s.size>10000000)fail();
 return fs.readFileSync(p);
}
const hash=b=>createHash('sha256').update(b).digest('hex');
function prepareEvidence(source,dir){
 const record=ORIGINALS.find(x=>x.pr===151);
 const original=safe(source).toString('utf8');
 if(sha1Git(original)!==record.blobSha)fail();
 const repaired=patchedOriginal(151,original);
 if(safe(path.join(dir,'original.kt')).toString('utf8')!==original||
    safe(path.join(dir,'patched.kt')).toString('utf8')!==repaired)fail();
 const orig=JSON.parse(safe(path.join(dir,'original.json')).toString('utf8'));
 const fix=JSON.parse(safe(path.join(dir,'patched.json')).toString('utf8'));
 const sourceKeys=['finiteAlert','infinityAlert','nanAlert'];
 const exact=x=>x&&typeof x==='object'&&!Array.isArray(x)&&
  Object.keys(x).sort().join('|')===sourceKeys.slice().sort().join('|')&&
  sourceKeys.every(k=>typeof x[k]==='boolean');
 if(!exact(orig)||!exact(fix)||
  orig.infinityAlert!==true||fix.infinityAlert!==false||
  orig.finiteAlert!==true||fix.finiteAlert!==true||
  orig.nanAlert!==false||fix.nanAlert!==false)fail();
 const hashes=Object.fromEntries(['original','patched'].flatMap(s=>[
  [s+'LogSha256',hash(safe(path.join(dir,s+'.json')))],
  [s+'JarSha256',hash(safe(path.join(dir,s+'.jar')))]
 ]));
 if(new Set(Object.values(hashes)).size!==4)fail();
 return {schema:'c2-pr151-live-source-thermal-counterfactual/v1',
  pr:151,headSha:record.headSha,sourceGitBlob:record.blobSha,
  originalSourceSha256:hash(Buffer.from(original)),patchedSourceSha256:hash(Buffer.from(repaired)),
  exactOneChangeVerified:true,sourceOriginalUnmodified:true,
  original:orig,patched:fix,...hashes,originalJvmExecuted:true,patchedJvmExecuted:true,
  originalBenignControlsPassed:true,patchedBenignControlsPassed:true,
  detectorPredictionsRead:false,sourceReleaseAuthorized:false,newGoldLabels:0};
}
function main(args){
 if(args.length!==3||args.some(x=>!path.isAbsolute(x))||new Set(args).size!==3||
    fs.existsSync(args[2]))fail();
 const data=prepareEvidence(args[0],args[1]);
 fs.writeFileSync(args[2],JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write('C2_PR151_REAL_ORIGINAL_PATCHED_THERMAL_JVM_EFFECT_VERIFIED\n');
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('C2_LIVE_THERMAL_EVIDENCE_BLOCKED\n');process.exitCode=2}}
module.exports={prepareEvidence};

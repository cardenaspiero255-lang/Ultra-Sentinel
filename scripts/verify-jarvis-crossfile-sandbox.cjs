'use strict';
/**
 * Trusted workflow bridge: original Kotlin/JVM factorial must be complete
 * before local two-file Git Judge and exact rollback are exercised.
 */
const fs=require('node:fs'),os=require('node:os'),p=require('node:path');
const {drillTwoSourceKotlinSandbox}=
 require('../packages/recovery/two-source-kotlin-sandbox.cjs');
const {GATE,POLICY,BLOBS,COMMIT}=
 require('../packages/investigation/jarvis-crossfile-policy-proof.cjs');
const {blobSha}=require('../packages/investigation/novel-kotlin-hypotheses.cjs');
function deny(code='UNKNOWN'){throw Error('JARVIS_TWO_SOURCE_SUPERVISED_SANDBOX_BLOCKED_'+code);}
function read(root,name,max){
 const path=p.join(root,name),st=fs.lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<1||st.size>max)deny('FILE_TYPE');
 const raw=fs.readFileSync(path),src=raw.toString('utf8');
 if(!Buffer.from(src,'utf8').equals(raw)||src.includes('\0'))deny('INVALID_UTF8');
 return src;
}
function main(root){
 if(typeof root!=='string'||!p.isAbsolute(root))deny('ROOT_ARGUMENT');
 const real=fs.realpathSync(root),temp=fs.realpathSync(os.tmpdir());
 if(!real.startsWith(temp+p.sep)||!fs.statSync(real).isDirectory())deny('ROOT_LOCATION');
 const oracle=JSON.parse(read(real,'crossfile-jvm-receipt.json',20000));
 const advisory=JSON.parse(read(real,'crossfile-advisory-receipt.json',10000));
 if(oracle.status!=='JOINT_PATCH_API_DEPENDENCY_REPRODUCED'||
  oracle.exactFourScenariosChecked!==true||
  oracle.sourceCommit!==COMMIT||
  advisory.commit!==COMMIT||advisory.remoteWrites!==false||
  oracle.remoteWrites!==false||oracle.mergeAllowed!==false)deny('JVM_RECEIPT');
 const records=[
  {path:GATE,name:'gate',afterBlob:advisory.gateCandidateBlob},
  {path:POLICY,name:'policy',afterBlob:advisory.policyCandidateBlob}
 ].map(x=>{
  const before=read(real,x.name+'.original.kt',60000),
   after=read(real,x.name+'.candidate.kt',60000);
  if(blobSha(before)!==BLOBS[x.path]||blobSha(after)!==x.afterBlob||
   before===after)deny('BLOB_CHAIN');
  return {path:x.path,before,after,beforeBlobSha:BLOBS[x.path],
   afterBlobSha:x.afterBlob};
 });
 const result=drillTwoSourceKotlinSandbox({files:records});
 if(result.status!=='TWO_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED'||
  result.checkedFiles!==2||result.exactTreeRollbackVerified!==true||
  result.remoteWrites!==false)deny('LOCAL_JUDGE');
 fs.writeFileSync(p.join(real,'crossfile-sandbox-receipt.json'),
  JSON.stringify({...result,sourceCommit:COMMIT,
   originalOracleAuthenticatedByThisBridge:false,
   remoteRepoMutation:false},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('JARVIS_ORIGINAL_TWO_SOURCE_LOCAL_JUDGE_AND_EXACT_ROLLBACK_PASS');
}
if(require.main===module){
 try{if(process.argv.length!==3)deny('ARGUMENT_COUNT');main(process.argv[2]);}
 catch(e){const safe=String(e?.message||'').match(/^JARVIS_TWO_SOURCE_SUPERVISED_SANDBOX_BLOCKED_[A-Z_]+$/);
  console.error(safe?safe[0]:'JARVIS_TWO_SOURCE_SUPERVISED_SANDBOX_BLOCKED_INTERNAL');
  process.exitCode=1;}
}
module.exports={main};

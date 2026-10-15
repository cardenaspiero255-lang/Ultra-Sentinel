'use strict';
/** Original Kotlin source hashes for frozen C2 PRs. No branch refs, no guesses. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BASE='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const PINNED=Object.freeze([
 {pr:132,headSha:'06289e42b6ecb1f6fa75d49a1bdd383df9b51422',
  blobSha:'306283f33e7f0700d53be6ae7fa52730e240f87e',path:BASE+'ui/home/state/HomeUiState.kt'},
 {pr:159,headSha:'07e1866424305f7639e176e07a452c9f484b5e2b',
  blobSha:'c688626e810d048d5e0681f42b69bbbf9292314d',path:BASE+'performance/framepacing/FramePacingIntelligenceEngine.kt'},
 {pr:159,headSha:'07e1866424305f7639e176e07a452c9f484b5e2b',
  blobSha:'09aa503432036012c2cd60f066b9879324fdeb64',path:BASE+'performance/framepacing/FramePacingModels.kt'},
 {pr:159,headSha:'07e1866424305f7639e176e07a452c9f484b5e2b',
  blobSha:'baa570e519c6660577261cc3860bf3f8c9f7528f',path:BASE+'performance/framepacing/FramePacingPolicy.kt'},
 {pr:161,headSha:'6a2b2a2b1249dcdebf91013b42a3c4510938a5dc',
  blobSha:'ea0de269f7d757e1e75eecb9a33b4efc7bdc0ec9',path:BASE+'network/diagnostics/NetworkGamingDiagnosticsEngine.kt'},
 {pr:161,headSha:'6a2b2a2b1249dcdebf91013b42a3c4510938a5dc',
  blobSha:'54d3a700eefebc8516d2cea196a8d2d3ff5dc179',path:BASE+'network/diagnostics/NetworkGamingDiagnosticsModels.kt'},
 {pr:161,headSha:'6a2b2a2b1249dcdebf91013b42a3c4510938a5dc',
  blobSha:'f5f7590ff1732afb5f005e318cda634d339529d3',path:BASE+'network/diagnostics/NetworkGamingDiagnosticsPolicy.kt'}
].map(x=>Object.freeze(x)));
function fail(){throw Error('C2_KOTLIN_PINNED_SOURCE_INVALID');}
function verifyKotlinSources(root,expected=PINNED){
 if(typeof root!=='string'||!path.isAbsolute(root)||
  !Array.isArray(expected)||expected.length!==PINNED.length||
  expected.some((x,i)=>JSON.stringify(x)!==JSON.stringify(PINNED[i])))fail();
 const results=[];
 for(const {pr,path:src,blobSha} of PINNED){
  const loc=path.join(root,String(pr),path.basename(src));
  let stat,buf;
  try{stat=fs.lstatSync(loc);buf=fs.readFileSync(loc);}catch{fail();}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
   stat.size<100||stat.size>100000)fail();
  const digest=crypto.createHash('sha1')
   .update(Buffer.from('blob '+buf.length+'\0','utf8'))
   .update(buf).digest('hex');
  if(digest!==blobSha)fail();
  results.push(Object.freeze({pr,blobSha,verified:true}));
 }
 return Object.freeze({schema:'ultra-sentinel-c2-kotlin-source-verification/v1',
  sourceCount:results.length,distinctPrs:new Set(results.map(x=>x.pr)).size,
  verified:true,originalSourceOnly:true,
  realBenchmarkComplete:false,tripleSPlusCertified:false});
}
if(require.main===module){
 try{
  if(process.argv.length!==3)fail();
  process.stdout.write(JSON.stringify(verifyKotlinSources(process.argv[2]))+'\n');
 }catch{
  process.stderr.write('C2_KOTLIN_SOURCE_BLOCKED: UNVERIFIED_SOURCE\n');
  process.exitCode=2;
 }
}
module.exports={PINNED,verifyKotlinSources};

'use strict';
/**
 * Trusted CI consumer of a read-only scanner; immutable JARVIS Git content
 * must be fetched independently by the owner-controlled GitHub Actions job.
 * No untrusted PR source is executed. No original behavioral proof inferred.
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {scanNovelKotlinHypotheses,blobSha}=
 require('../packages/investigation/novel-kotlin-hypotheses.cjs');
const COMMIT='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const pinned=[
 {name:'termux.kt',
  path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt',
  blob:'7c6f326cb267b56f4ca6b2d0614753695259da56',
  expectedRule:'REGEX_PREFIX_AS_COMPLETE_VALIDATION'},
 {name:'voice.kt',
  path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceRecognitionRequestGate.kt',
  blob:'606d1184e7d57e49ef15b983a8646706abadf3da',
  expectedRule:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION'}
];
function run(root){
 if(typeof root!=='string'||!path.isAbsolute(root))throw Error('INVALID_SOURCE_ROOT');
 const dir=fs.realpathSync(root),allowed=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean)
  .map(x=>fs.realpathSync(x));
 if(!allowed.some(x=>dir.startsWith(x+path.sep)))throw Error('SOURCE_OUTSIDE_TRUSTED_TEMP');
 const files=pinned.map(item=>{
  const loc=path.join(dir,item.name),st=fs.lstatSync(loc);
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<100||
    st.size>60000)throw Error('ORIGINAL_JARVIS_SOURCE_SIZE_OR_TYPE');
  const raw=fs.readFileSync(loc),source=raw.toString('utf8');
  if(!Buffer.from(source,'utf8').equals(raw)||blobSha(source)!==item.blob)
   throw Error('ORIGINAL_JARVIS_PINNED_GIT_BLOB_MISMATCH');
  return {path:item.path,source,expectedBlobSha:item.blob};
 });
 const result=scanNovelKotlinHypotheses({expectedCommitSha:COMMIT,files});
 if(result.status!=='UNVERIFIED_RISK_HYPOTHESES'||
  result.findings.length!==pinned.length||result.filesScanned!==pinned.length||
  result.sourceGitRepositoryAuthenticated!==false||
  result.originalFunctionalOracleVerified!==false||result.coreContractModified!==false||
  result.remoteWrites!==false||result.mergeAllowed!==false)throw Error('NOVEL_RISK_SCANNER_GATE_FAILED');
 for(const item of pinned)if(!result.findings.some(f=>f.path===item.path&&
   f.rule===item.expectedRule&&f.status==='HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE'&&
   f.byteIntegrityVerified===true))throw Error('ORIGINAL_RISK_HYPOTHESIS_NOT_FOUND');
 return Object.freeze({
  status:'PINNED_ORIGINAL_JARVIS_TWO_RISK_FAMILIES_OBSERVED',
  sourceCommit:COMMIT,originalGitBlobPinsChecked:pinned.length,
  advisoryFindings:result.findings.map(f=>Object.freeze({rule:f.rule,
   path:f.path,line:f.line,familyId:f.familyId,status:f.status})),
  kotlinRuntimeOracleValidatedHere:false,
  originalTermuxOracleAvailableSeparately:true,
  sourceGitRepositoryAuthenticatedBySidecar:false,
  remoteWrites:false,autoRepairAllowed:false,mergeAllowed:false
 });
}
if(require.main===module){
 try{
  if(process.argv.length!==3)throw Error('ARGUMENTS_INVALID');
  const receipt=run(process.argv[2]);
  fs.writeFileSync(path.join(process.argv[2],'novel-kotlin-receipt.json'),
   JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('ORIGINAL_JARVIS_TWO_KOTLIN_RISK_HYPOTHESES_PASS');
 }catch(e){
  console.error('ORIGINAL_JARVIS_NOVEL_DETECTOR_BLOCKED: '+e.message);
  process.exitCode=1;
 }
}
module.exports={run};

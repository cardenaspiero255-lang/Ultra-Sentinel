'use strict';
// Data-only verification and disposable Git staging of four existing,
// truly compiled original GameHub Kotlin source pairs. Original bytes may
// originate from different historical revisions; there is NO claim that
// a synthetic combined Git baseline is a source-control merge-base.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {reproduceCrossFileInterventions}=
 require('./cross-file-sandbox-reproduction.cjs');
const PREFIX='app/src/main/java/com/cardenaspiero255/gamehubultra/';
function file(domain,name,blob){
 return Object.freeze({path:PREFIX+domain+'/'+name+'.kt',blob});
}
const SPECS=Object.freeze({
 'ttl-thermal':Object.freeze({
  rule:'GAMEHUB_TTL_THERMAL',id:['158:114','151:264'],
  first:file('ai','UltraFrontierWorldState','0d18a43a8e36ea3edacc2cad72071d96aa31626e'),
  second:file('domain','AiSessionCoach','adb11032b9b7f62f865228dfa1c27258ca3fa0df')}),
 'query-confidence':Object.freeze({
  rule:'GAMEHUB_QUERY_CONFIDENCE',id:['158:144','150:251'],
  first:file('ai','UltraGeneralQueryRouter','0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f'),
  second:file('domain','SmartRecommendationExplanation','37866fd3dbfcd19d9daaf29a5e1e426391c723d4')}),
 'json-confidence':Object.freeze({
  rule:'GAMEHUB_JSON_CONFIDENCE',id:['152:110','150:252'],
  first:file('ai','UltraResearchJsonCodec','886c104effd553cd60f8222bfb05b8505fe7c4b8'),
  second:file('domain','SmartRecommendationExplanation','37866fd3dbfcd19d9daaf29a5e1e426391c723d4')}),
 'refresh-battery':Object.freeze({
  rule:'GAMEHUB_REFRESH_BATTERY',id:['152:207','155:12'],
  first:file('domain','AiProfileBuilder','549e3b1d619b83e59bc37b31b4860191c25528f1'),
  second:file('domain','BatteryAwareGamingEngine','8696360219231f3f1477d5ad21c93bca2197e281')})
});
const SHA=/^[a-f0-9]{40}$/,HEX=/^[a-f0-9]{64}$/,MODES=['00','10','01','11'];
const fail=()=>{throw Error('PINNED_GAMEHUB_PAIR_GATE_BLOCKED');};
function hash(bytes,alg){return crypto.createHash(alg).update(bytes).digest('hex');}
function blob(bytes){return hash(Buffer.concat([
 Buffer.from('blob '+bytes.length+'\0'),bytes]),'sha1');}
function get(root,name,maximum=60000){
 const loc=path.join(root,name);const st=fs.lstatSync(loc);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  st.size<1||st.size>maximum)fail();
 const data=fs.readFileSync(loc);return data;
}
function text(bytes){
 const s=bytes.toString('utf8');
 if(!Buffer.from(s,'utf8').equals(bytes)||s.includes('\0'))fail();
 return s;
}
function logExpected(suite,mode){
 return 'C2_CROSS_SUITE '+suite+'\n'+
  'C2_CROSS_NORMAL_CONTROLS_PASS\n'+
  'C2_CROSS_VECTOR mode='+mode+' first='+(mode[0]==='1')+
  ' second='+(mode[1]==='1')+'\n';
}
function answer(ok,gitJudgeApproved,rollbackVerified,count=0){
 return Object.freeze({schema:'ultra-sentinel-gamehub-local-cross-pair-judge/v1',
  status:ok?'LOCAL_GIT_AND_KOTLIN_CONTROLS_APPROVED_NO_RELEASE':
   'LOCAL_CROSS_PAIR_FUNCTIONAL_VETO',
  functionalJudgeApproved:ok,gitJudgeApproved,rollbackVerified,
  jvmModesChecked:count,
  rootCauseVerified:false,sourceCommitHistoryAuthenticated:false,
  actualJVMRuntimeAuthenticated:false,sourceBlobsPinnedByCaller:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false});
}
function assessCrossPair({localProof,logs,suite}={}){
 const spec=SPECS[suite],scenarios=localProof?.scenarios;
 const shape=Boolean(spec&&localProof&&
  localProof.schema==='ultra-sentinel-local-cross-file-reproduction/v1'&&
  localProof.status==='LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE'&&
  localProof.candidateRule===spec.rule&&
  localProof.commitAllowed===false&&localProof.mergeAllowed===false&&
  localProof.productionReleaseAllowed===false&&
  Array.isArray(scenarios)&&scenarios.length===4);
 let git=shape,rollback=shape;
 if(shape)for(let i=0;i<4;i++){
  const mode=MODES[i],s=scenarios[i];
  const expected=[spec.first.path,spec.second.path]
   .filter((_,j)=>mode[j]==='1');
  if(!s||!Array.isArray(s.selectedFiles)||
   s.selectedFiles.length!==expected.length||
   s.selectedFiles.some((v,k)=>v!==expected[k])||
   !SHA.test(s.baselineTree||'')||
   s.remoteWrites!==false||
   s.judgeStatus!==(i===0?'BASELINE_NO_COMMIT':'APPROVED_LOCAL_POLICY_ONLY'))
   git=false;
  if(!s||s.rollbackVerified!==true||s.baselineTree!==s.restoredTree)
   rollback=false;
 }
 if(!git||!rollback||!logs||typeof logs!=='object'||Array.isArray(logs)||
  Object.keys(logs).sort().join(',')!==[...MODES].sort().join(','))
  return answer(false,git,rollback);
 let checked=0;
 for(const mode of MODES){
  const s=scenarios[MODES.indexOf(mode)],log=logs[mode];
  if(s.oracleVerdict!=='PASS'||log!==logExpected(suite,mode))
   return answer(false,git,rollback,checked);
  checked++;
 }
 return answer(true,git,rollback,checked);
}
function experimentPlan(spec){
 return {schema:'ultra-sentinel-cross-file-interventions/v1',
  status:'EXPERIMENTS_REQUIRED',baseSha:'a'.repeat(40),
  headSha:'b'.repeat(40),sourceAuthenticated:false,
  causalityVerified:false,commitAllowed:false,mergeAllowed:false,
  candidates:[{rule:spec.rule,
   status:'MULTI_FILE_CAUSAL_HYPOTHESIS_NOT_VERIFIED',
   causalLinksProved:false,files:[spec.first.path,spec.second.path],
   experiments:[0,1,2,3].map(mask=>({
    kind:mask===0?'baseline':mask===3?'combined':'subset',
    selectedFiles:[spec.first.path,spec.second.path]
     .filter((_,j)=>(mask&(1<<j))!==0),
    executed:false,independentOracleVerified:false
   }))}]};
}
function runPinnedPair({root,suite}={}){
 try{
  const spec=SPECS[suite];
  if(!spec||typeof root!=='string'||!path.isAbsolute(root))fail();
  const canonical=fs.realpathSync(root),roots=[os.tmpdir(),process.env.RUNNER_TEMP]
   .filter(Boolean).map(p=>fs.realpathSync(p));
  if(!roots.some(x=>canonical.startsWith(x+path.sep))||
   !fs.statSync(canonical).isDirectory())fail();
  const [sourceFirst,sourceSecond]=['first','second'].map((key,i)=>{
   const name=i===0?spec.first.path.split('/').at(-1):spec.second.path.split('/').at(-1);
   // Shell producer uses aliases instead of Kotlin class names.
   const aliases={
    'ttl-thermal':['ttl','thermal'],
    'query-confidence':['query','confidence'],
    'json-confidence':['json','confidence'],
    'refresh-battery':['refresh','battery']};
   const alias=aliases[suite][i];
   const data=get(canonical,alias+'-original.kt');
   if(blob(data)!==spec[key].blob)fail();
   return text(data);
  });
  const aliases={ 'ttl-thermal':['ttl','thermal'],
   'query-confidence':['query','confidence'],
   'json-confidence':['json','confidence'],
   'refresh-battery':['refresh','battery']}[suite];
  const repairs=aliases.map(alias=>text(get(canonical,alias+'-repair.kt')));
  if(repairs[0]===sourceFirst||repairs[1]===sourceSecond)fail();
  const receipt=JSON.parse(text(get(canonical,'output/receipt.json',30000)));
  if(receipt.schema!=='c2-two-real-sources-four-jvm-repair-states/v1'||
   receipt.suite!==suite||JSON.stringify(receipt.identities)!==JSON.stringify(spec.id)||
   JSON.stringify(receipt.originalSourceGitBlobs)!==
    JSON.stringify([spec.first.blob,spec.second.blob])||
   receipt.originalSourcesVerified!==true||
   receipt.originalSourcesUnmodified!==true||
   receipt.networkIsolatedJVM!==true||
   receipt.detectorPredictionsRead!==false||
   receipt.externalCandidateSourceRead!==false||
   receipt.causalFamiliesCertified!==0||
   !Array.isArray(receipt.rows)||receipt.rows.length!==4)fail();
  const logs={};
  for(const mode of MODES){
   const row=receipt.rows[Number(mode[0])*2+Number(mode[1])];
   const bytes=get(canonical,mode+'.log',12000);
   const jar=get(canonical,mode+'.jar',8000000);
   logs[mode]=text(bytes);
   if(!row||row.mode!==mode||
    row.firstRepaired!==(mode[0]==='1')||
    row.secondRepaired!==(mode[1]==='1')||
    row.firstCorrect!==(mode[0]==='1')||
    row.secondCorrect!==(mode[1]==='1')||
    row.benignControlsPassed!==true||row.actualJointKotlinJvm!==true||
    row.javaArtifactSha256!==hash(jar,'sha256')||
    row.executionLogSha256!==hash(bytes,'sha256')||
    logs[mode]!==logExpected(suite,mode))fail();
  }
  const versions=[{path:spec.first.path,before:sourceFirst,after:repairs[0]},
   {path:spec.second.path,before:sourceSecond,after:repairs[1]}];
  const p=experimentPlan(spec);
  const local=reproduceCrossFileInterventions({plan:p,candidateRule:spec.rule,
   versions,independentOracle:files=>{
    const m=(files[spec.first.path]===sourceFirst?'0':
     files[spec.first.path]===repairs[0]?'1':null)+
     (files[spec.second.path]===sourceSecond?'0':
     files[spec.second.path]===repairs[1]?'1':null);
    return MODES.includes(m)&&logs[m]===logExpected(suite,m);
   }});
  const verdict=assessCrossPair({localProof:local,logs,suite});
  if(!verdict.functionalJudgeApproved||!verdict.gitJudgeApproved||
   !verdict.rollbackVerified||verdict.jvmModesChecked!==4)fail();
  return Object.freeze({
   schema:'ultra-sentinel-four-real-kotlin-pair-git-rollback/v1',
   suite,status:'SOURCE_BLOB_PINNED_LOCAL_GIT_JUDGE_AND_ROLLBACK_VERIFIED',
   sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
   frozenSourceGitBlobs:[spec.first.blob,spec.second.blob],
   sourcePathMapping:[spec.first.path,spec.second.path],
   verifiedJVMScenarioCount:4,localGitScenarios:4,
   allFunctionalControlsPassed:true,gitPolicyJudgeApproved:true,
   exactBaselineTreeRestored:true,
   originalGitCommitAncestryProven:false,
   syntheticLocalBaseline:true,causalFamilyIndependenceCertified:false,
   remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false
  });
 }catch{fail();}
}
module.exports={SPECS,assessCrossPair,runPinnedPair,logExpected};

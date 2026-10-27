'use strict';
// Trusted CI bridge only. Reads the original C2 PR185 compiler/JVM outputs
// produced on SAME workflow runner. Does not execute Kotlin, fetch networks,
// accept user PR-defined oracles or write production resources.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {reproduceCrossFileInterventions}=
 require('../packages/recovery/cross-file-sandbox-reproduction.cjs');
const {PINS,M,B,MODES,vector,verifyPinnedKotlinSourceBytes,
 adjudicateKotlinCrossFileProof}=
 require('../packages/recovery/cross-file-kotlin-functional-judge.cjs');
function fail(){throw Error('C2_CROSS_FILE_KOTLIN_BRIDGE_DENIED');}
function digest(data){return crypto.createHash('sha256').update(data).digest('hex');}
function read(root,name,max=80000){
 const p=path.join(root,name),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  st.size===0||st.size>max)fail();
 return fs.readFileSync(p);
}
function utf8(bytes){const s=bytes.toString('utf8');
 if(!Buffer.from(s,'utf8').equals(bytes)||s.includes('\0'))fail();
 return s;
}
function exactlyOnce(str,from,to){
 if(str.indexOf(from)<0||str.indexOf(from)!==str.lastIndexOf(from))fail();
 return str.replace(from,to);
}
function prepare(root){
 const mathOriginal=utf8(read(root,'math-original.kt',55000));
 const batteryOriginal=utf8(read(root,'battery-original.kt',10000));
 verifyPinnedKotlinSourceBytes({mathOriginal,batteryOriginal});
 const mathRepair=utf8(read(root,'math-repair.kt',55000));
 const batteryRepair=utf8(read(root,'battery-repair.kt',10000));
 const oldMath='        val sqrtDiscriminant = BigDecimal.valueOf(\n'+
  '            kotlin.math.sqrt(discriminant.toDouble())\n'+
  '        ).round(mathContext)';
 const newMath='        val discriminantAsDouble = discriminant.toDouble()\n'+
  '        if (!discriminantAsDouble.isFinite()) return null\n'+
  '        val sqrtDiscriminant = BigDecimal.valueOf(\n'+
  '            kotlin.math.sqrt(discriminantAsDouble)\n'+
  '        ).round(mathContext)';
 if(mathRepair!==exactlyOnce(mathOriginal,oldMath,newMath)||
    batteryRepair!==exactlyOnce(batteryOriginal,
     'require(highDrainPercentPerHour > 0f)',
     'require(highDrainPercentPerHour.isFinite() && highDrainPercentPerHour > 0f)'))fail();
 const evidence=JSON.parse(utf8(read(root,'output/factorial-source-evidence.json',60000)));
 if(evidence.schema!=='c2-pr185-numeric-factorial-kotlin-replay/v1'||
  evidence.sourceRepository!=='cardenaspiero255-lang/gamehub-ultra'||
  evidence.originalSourceUnmodified!==true||
  evidence.originalOperatorPatchScoped!==true||
  evidence.repositoryWritePerformed!==false||
  evidence.modelPredictionsRead!==false||
  evidence.baselineRead!==false||
  !Array.isArray(evidence.sources)||evidence.sources.length!==2||
  !Array.isArray(evidence.rows)||evidence.rows.length!==4||
  !Array.isArray(evidence.variantSha256s)||evidence.variantSha256s.length!==2||
  evidence.variantSha256s[0]!==digest(Buffer.from(mathRepair))||
  evidence.variantSha256s[1]!==digest(Buffer.from(batteryRepair)))fail();
 for(const [i,name] of ['math','battery'].entries()){
  const e=evidence.sources[i],pin=PINS[name];
  if(e.id!==(i===0?'154:100':'155:12')||e.head!==pin.commit||
   e.blob!==pin.blob||e.sourceSha256!==pin.sha256)fail();
 }
 const logs={};
 for(const mode of ['00','01','10','11']){
  const index=Number(mode[0])*2+Number(mode[1]),row=evidence.rows[index];
  const logBuffer=read(root,'run-'+mode+'.log',16000);
  const jar=read(root,'matrix-'+mode+'.jar',8000000);
  if(row?.jarSha256!==digest(jar)||row?.logSha256!==digest(logBuffer))fail();
  logs[mode]=utf8(logBuffer);
 }
 const regression= utf8(read(root,'battery-regressed.kt',10000));
 if(regression!==exactlyOnce(batteryRepair,
  'val highDrainPercentPerHour: Float = 20f',
  'val highDrainPercentPerHour: Float = 200f'))fail();
 const negativeLog=utf8(read(root,'regression-11.log',16000));
 if(!negativeLog.includes('C2_PR185_BATTERY_ORDINARY_REGRESSION')||
  negativeLog.includes('C2_PR185_ORDINARY_CONTROLS_PASS'))fail();
 return {mathOriginal,batteryOriginal,mathRepair,batteryRepair,evidence,logs,
  regression,negativeLogSha256:digest(Buffer.from(negativeLog))};
}
function plan(){
 const files=[M,B];
 return {
  schema:'ultra-sentinel-cross-file-interventions/v1',
  status:'EXPERIMENTS_REQUIRED',
  baseSha:'2289f4e4cda55ddaa50f2016113ded82dc17203c',
  headSha:'b74791d9ea7e1e4b88f0ef1e286d87f036c6e7be',
  sourceAuthenticated:false,causalityVerified:false,commitAllowed:false,
  mergeAllowed:false,candidates:[{
   rule:'NONFINITE_NUMERIC_BOUNDARY',files,
   status:'MULTI_FILE_CAUSAL_HYPOTHESIS_NOT_VERIFIED',
   causalLinksProved:false,
   experiments:[0,1,2,3].map(mask=>({
    kind:mask===0?'baseline':mask===3?'combined':'subset',
    selectedFiles:files.filter((_,i)=>(mask&(1<<i))!==0),
    executed:false,independentOracleVerified:false
   }))
  }]
 };
}
function modeOf(files,prepared,regressed=false){
 const math=files[M]===prepared.mathOriginal?'0':
  files[M]===prepared.mathRepair?'1':null;
 const battery=files[B]===prepared.batteryOriginal?'0':
  files[B]===(regressed?prepared.regression:prepared.batteryRepair)?'1':null;
 if(math===null||battery===null)fail();
 return math+battery;
}
function evaluatedLog(log,mode){
 const expected=['C2_PR185_ORDINARY_CONTROLS_PASS',vector(mode),
  'C2_PR185_FACTORIAL_SCOPE_PASS'];
 return typeof log==='string'&&expected.every(line=>
  log.split(/\r?\n/).filter(s=>s===line).length===1);
}
function bridge(root){
 const x=prepare(root),p=plan();
 const originals=[
  {path:M,before:x.mathOriginal,after:x.mathRepair},
  {path:B,before:x.batteryOriginal,after:x.batteryRepair}
 ];
 const local=reproduceCrossFileInterventions({
  plan:p,candidateRule:'NONFINITE_NUMERIC_BOUNDARY',versions:originals,
  independentOracle:files=>{
   const mode=modeOf(files,x);
   return evaluatedLog(x.logs[mode],mode);
  }
 });
 const green=adjudicateKotlinCrossFileProof({
  localProof:local,logs:x.logs,rows:x.evidence.rows
 });
 if(!green.functionalJudgeApproved||green.modesValidated!==4||
  !local.scenarios.every(s=>s.rollbackVerified))fail();
 // Negative control: same authentic source + repair, but the proposed battery
 // variant raises its default drain threshold to 200%/h. A real Kotlin JVM
 // oracle has already rejected the ordinary battery behavior in bwrap.
 // Here Git still accepts the exact controlled blobs and rollback, but the
 // independent functional Judge MUST veto the resulting candidate.
 const negativeVersions=[
  originals[0],
  {path:B,before:x.batteryOriginal,after:x.regression}
 ];
 const localNegative=reproduceCrossFileInterventions({
  plan:p,candidateRule:'NONFINITE_NUMERIC_BOUNDARY',versions:negativeVersions,
  independentOracle:files=>{
   const mode=modeOf(files,x,true);
   return mode[1]==='1'?false:evaluatedLog(x.logs[mode],mode);
  }
 });
 const bad=adjudicateKotlinCrossFileProof({
  localProof:localNegative,logs:x.logs,rows:x.evidence.rows
 });
 if(bad.status!=='FUNCTIONAL_JUDGE_VETO'||bad.gitJudgeApproved!==true||
  bad.rollbackVerified!==true||
  localNegative.scenarios[3].judgeStatus!=='APPROVED_LOCAL_POLICY_ONLY'||
  localNegative.scenarios[3].rollbackVerified!==true)fail();
 return Object.freeze({
  schema:'ultra-sentinel-cross-file-original-kotlin-bridge/v1',
  status:'PINNED_ORIGINAL_KOTLIN_FACTORIAL_JUDGE_AND_ROLLBACK_VERIFIED',
  sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
  originalSourceCommitRefs:[PINS.math.commit,PINS.battery.commit],
  originalSourceBlobRefs:[PINS.math.blob,PINS.battery.blob],
  stagedGitSnapshots:local.scenarios.length,
  allGitJudgeAndRollbackPassed:true,
  existingIndependentKotlinOracle:'tests/oracles/c2-pr185-numeric-factorial-oracle.kt',
  normalKotlinCases:green.modesValidated,
  normalControlsVerified:true,
  regressionRejectedByRealJVM:true,
  regressionLogSha256:x.negativeLogSha256,
  regressionGitJudgeApproved:bad.gitJudgeApproved,
  regressionGitRollbackVerified:bad.rollbackVerified,
  regressionFunctionalJudgeStatus:bad.status,
  sourceBytesPinned:true,sourceAuthenticityDependsOnTrustedGithubFetch:true,
  bubblewrapRequired:true,
  realKotlinSourceExecution:true,
  notCoreDerivedExperiment:true,causalityVerified:false,
  externalOracleIndependenceCertified:false,
  commitAllowed:false,mergeAllowed:false,remoteWrites:false,
  releaseAuthorized:false
 });
}
function main(){
 try{
  if(process.argv.length!==3)fail();
  const root=fs.realpathSync(process.argv[2]),temp=fs.realpathSync(os.tmpdir());
  if(!root.startsWith(temp+path.sep)||!fs.statSync(root).isDirectory())fail();
  const result=bridge(root);
  const out=path.join(root,'output/cross-file-kotlin-functional-judge.json');
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('C2_ORIGINAL_KOTLIN_MULTIFILE_JUDGE_VETO_AND_ROLLBACK_PASS\n');
 }catch(e){process.stderr.write('C2_KOTLIN_CROSS_FILE_GATE_BLOCKED: '+e.message+'\n');process.exitCode=1;}
}
if(require.main===module)main();
module.exports={bridge,plan,modeOf,evaluatedLog};

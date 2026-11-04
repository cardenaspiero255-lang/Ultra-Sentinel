'use strict';
/**
 * Interpret an exact 2^n factorial matrix from disposable Git experiments.
 * Oracle result fields are caller-provided observations. Never promote them
 * to authentic Kotlin JVM evidence or a claim that a root cause is proven.
 */
const SHA=/^[a-f0-9]{40}$/;
const PATH=/^(?:(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+|apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt)$/;
function outcome(status,minimalPassingSubsets=[]){
 return Object.freeze({
  schema:'ultra-sentinel-factorial-oracle-interpretation/v1',status,
  minimalPassingSubsets:Object.freeze(minimalPassingSubsets),
  causalityVerified:false,originalJVMOracleAuthenticated:false,
  sourceRepositoryAuthenticated:false,
  remoteWrites:false,commitAllowed:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'Boolean observations from an untrusted or caller-owned oracle are not authenticated original Kotlin execution. Requires pinned source, independent JVM oracles and adversarial controls before causal conclusions.'
 });
}
const blocked=()=>outcome('BLOCKED_INCOMPLETE_FACTORIAL_EVIDENCE');
function validFile(p){
 return typeof p==='string'&&p.length<=250&&PATH.test(p)&&
  !p.includes('//')&&!p.split('/').some(s=>s===''||s==='.'||s==='..');
}
function interpretFactorialOracleEvidence({files,reproduction}={}){
 if(!Array.isArray(files)||files.length<2||files.length>4||
    files.some((p,i)=>!validFile(p)||(i>0&&files[i-1]>=p))||
    !reproduction||typeof reproduction!=='object'||Array.isArray(reproduction)||
    reproduction.schema!=='ultra-sentinel-local-cross-file-reproduction/v1'||
    reproduction.status!=='LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE'||
    !SHA.test(reproduction.baseSha||'')||
    !SHA.test(reproduction.headSha||'')||
    reproduction.baseSha===reproduction.headSha||
    typeof reproduction.candidateRule!=='string'||
    !/^[A-Z][A-Z_0-9]{2,80}$/.test(reproduction.candidateRule)||
    reproduction.causalityVerified!==false||
    reproduction.sourceAuthenticated!==false||
    reproduction.independentOracleProvenanceVerified!==false||
    reproduction.commitAllowed!==false||
    reproduction.mergeAllowed!==false||
    reproduction.productionReleaseAllowed!==false||
    !Array.isArray(reproduction.scenarios)||
    reproduction.scenarios.length!==(1<<files.length))return blocked();
 const values=[];
 for(let mask=0;mask<reproduction.scenarios.length;mask++){
  const row=reproduction.scenarios[mask];
  if(!row||typeof row!=='object'||Array.isArray(row))return blocked();
  const selected=files.filter((_,i)=>Boolean(mask&(1<<i)));
  if(!Array.isArray(row.selectedFiles)||row.selectedFiles.length!==selected.length||
     row.selectedFiles.some((s,i)=>s!==selected[i])||
     !['PASS','FAIL'].includes(row.oracleVerdict)||
     row.judgeStatus!==(mask===0?'BASELINE_NO_COMMIT':'APPROVED_LOCAL_POLICY_ONLY')||
     row.rollbackVerified!==true||row.remoteWrites!==false||
     !SHA.test(row.baselineTree||'')||
     row.baselineTree!==row.restoredTree)return blocked();
  values.push(row.oracleVerdict==='PASS');
 }
 if(values[0]||!values[values.length-1])
  return outcome(values.some(Boolean)?'REGRESSION_OR_NONREPAIR_OBSERVED':'NO_PASSING_INTERVENTION');
 const minimal=[];
 for(let mask=1;mask<values.length;mask++){
  if(!values[mask])continue;
  // A passing subset is minimal iff no strict subset also passed.
  let isMinimal=true;
  for(let other=0;other<mask;other++){
   if((other&mask)===other&&values[other]){isMinimal=false;break;}
  }
  if(isMinimal)minimal.push(Object.freeze(files.filter((_,i)=>Boolean(mask&(1<<i)))));
 }
 const status=minimal.some(set=>set.length>1)?
  'JOINT_INTERACTION_HYPOTHESIS':'SINGLE_FILE_OR_ALTERNATIVE_EFFECT';
 return outcome(status,minimal);
}
module.exports={interpretFactorialOracleEvidence};

'use strict';
/**
 * Orthogonal/original-oracle matrix interpreter for 2-4 source files.
 * Do not conflate two independent RED checks becoming GREEN only together
 * under an aggregate AND with a causal interaction between those sources.
 * This function merely analyzes inert, caller-provided verdicts.
 */
const PATH=/^(?:(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+|apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt)$/;
const ID=/^[A-Z][A-Z0-9_]{2,40}$/;
function result(status,oracleDependencies={}){
 return Object.freeze({
  schema:'ultra-sentinel-original-oracle-vector-factorial/v1',
  status,oracleDependencies:Object.freeze(oracleDependencies),
  causalityVerified:false,jvmReceiptsAuthenticatedByThisFunction:false,
  ownerAuthorizationVerified:false,commitAllowed:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Difference in original-oracle results identifies experimental sensitivity, not authenticated provenance or actual cross-file root cause. Verify pinned bytes and JVM receipts in trusted CI.'
 });
}
function classifyOracleVectorFactorial({files,oracleIds,scenarios}={}){
 const bad=()=>result('BLOCKED_UNTRUSTED_ORACLE_MATRIX');
 if(!Array.isArray(files)||files.length<2||files.length>4||
  files.some((p,i)=>typeof p!=='string'||p.length>240||
   !PATH.test(p)||p.includes('//')||
   p.split('/').some(s=>s===''||s==='.'||s==='..')||
   (i>0&&p<=files[i-1]))||
  !Array.isArray(oracleIds)||oracleIds.length<1||oracleIds.length>8||
  oracleIds.some((p,i)=>!ID.test(p)||(i>0&&p<=oracleIds[i-1]))||
  !Array.isArray(scenarios)||scenarios.length!==(1<<files.length))return bad();
 const values=[];
 for(let mask=0;mask<scenarios.length;mask++){
  const row=scenarios[mask],
   selected=files.filter((_,i)=>Boolean(mask&(1<<i)));
  if(!row||typeof row!=='object'||Array.isArray(row)||
    Object.keys(row).sort().join(',')!=='selectedFiles,verdicts'||
    !Array.isArray(row.selectedFiles)||row.selectedFiles.length!==selected.length||
    row.selectedFiles.some((x,i)=>x!==selected[i])||
    !row.verdicts||typeof row.verdicts!=='object'||Array.isArray(row.verdicts)||
    Object.getPrototypeOf(row.verdicts)!==Object.prototype||
    Object.keys(row.verdicts).sort().join(',')!==oracleIds.join(',')||
    oracleIds.some(id=>!['PASS','FAIL'].includes(row.verdicts[id])))return bad();
  values.push(row.verdicts);
 }
 const dependencies={};
 for(const id of oracleIds){
  const impacted=[];
  for(let i=0;i<files.length;i++){
   let changesVerdict=false;
   for(let mask=0;mask<values.length;mask++){
    if(mask&(1<<i))continue;
    if(values[mask][id]!==values[mask|(1<<i)][id]){
     changesVerdict=true;break;
    }
   }
   if(changesVerdict)impacted.push(files[i]);
  }
  dependencies[id]=Object.freeze(impacted);
 }
 const sets=Object.values(dependencies);
 const unique=new Set(sets.filter(v=>v.length===1).map(v=>v[0]));
 const status=sets.every(v=>v.length===1)&&unique.size===sets.length?
  'INDEPENDENT_ORACLE_EFFECTS_OBSERVED':
  sets.some(v=>v.length>1)?'SHARED_OR_MULTI_FILE_EFFECT_HYPOTHESIS':
  'NONDIAGNOSTIC_ORACLE_MATRIX';
 return result(status,dependencies);
}
module.exports={classifyOracleVectorFactorial};

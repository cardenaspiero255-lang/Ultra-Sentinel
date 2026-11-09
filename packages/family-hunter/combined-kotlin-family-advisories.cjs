'use strict';
/* Multiple existing detectors over one bounded Kotlin source inventory.
 * Advisory only: not proof of novelty, causal analysis or generalization. */
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');
const {scanEphemeralKotlinHistory}=require('./ephemeral-kotlin-history-hunter.cjs');
const {scanNovelKotlinHypotheses}=require('../investigation/novel-kotlin-hypotheses.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
function result(status,details={}){
 return Object.freeze({status,...details,originalFunctionalOracleVerified:false,
  sourceRepositoryAuthenticated:false,productContractConfirmed:false,
  causalityVerified:false,generalizationVerified:false,ownerAuthorizationGranted:false,
  remoteWrites:false,commitAllowed:false,mergeAllowed:false,
  productionReleaseAllowed:false});
}
function scanKotlinFamilyAdvisories(options){
 try{
  const input=snapshotRecord(options,['expectedCommitSha','files']);
  const files=snapshotArray(input.files,['path','source','expectedBlobSha'],80);
  const ep=scanEphemeralKotlinHistory({expectedCommitSha:input.expectedCommitSha,files});
  if(ep.status.startsWith('BLOCKED_'))return result('BLOCKED_SOURCE_VALIDATION');
  const eligible=files.filter(f=>isSafeNovelKotlinPath(f.path)&&
   Buffer.byteLength(f.source,'utf8')<=60000&&f.source.split('\n').length<=1501);
  const findings=ep.findings.map(f=>Object.freeze({rule:f.rule,path:f.path,
   sourceBlobSha:f.sourceBlobSha,status:f.status,confidence:f.confidence}));
  for(let i=0;i<eligible.length;i+=12){
   const r=scanNovelKotlinHypotheses({expectedCommitSha:input.expectedCommitSha,
    files:eligible.slice(i,i+12)});
   if(r.status.startsWith('BLOCKED_'))return result('BLOCKED_LEGACY_FAMILY_BATCH');
   for(const f of r.findings)findings.push(Object.freeze({rule:f.rule,path:f.path,
    sourceBlobSha:f.expectedBlobSha,status:f.status,confidence:f.confidence}));
  }
  findings.sort((a,b)=>a.path.localeCompare(b.path)||a.rule.localeCompare(b.rule));
  const unique=new Map();
  for(const f of findings)unique.set(JSON.stringify([f.path,f.rule]),f);
  const deduped=[...unique.values()];
  const rules=[...new Set(deduped.map(f=>f.rule))].sort();
  const status=rules.length>=2?'MULTIPLE_UNVERIFIED_FAMILIES_REQUIRING_ORACLES':
   rules.length===1?'SINGLE_UNVERIFIED_FAMILY_REQUIRING_ORACLE':'NO_ADVISORY_FAMILIES_DETECTED';
  return result(status,{filesScanned:ep.filesScanned,legacyEligibleFiles:eligible.length,
   legacyUnscannedFiles:files.length-eligible.length,
   rules:Object.freeze(rules),findings:Object.freeze(deduped),
   limitation:'Source-only heuristics. A family name is not functional defect, '+
    'independent generalization or confirmation of product contract.'});
 }catch{return result('BLOCKED_INPUT_CONTRACT');}
}
module.exports=Object.freeze({scanKotlinFamilyAdvisories});

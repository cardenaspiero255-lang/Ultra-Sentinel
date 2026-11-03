'use strict';
/**
 * Read-only detector of previously unregistered Kotlin policy boundary
 * hypotheses. Static evidence is not behavioral or security proof.
 * Never alters frozen Core/C2, executes code, or authorizes a repair.
 */
const {blobSha}=require('./novel-kotlin-hypotheses.cjs');
const {fingerprint}=require('../family-hunter/ultra_sentinel_family_fingerprints.cjs');
const SHA=/^[0-9a-f]{40}$/;
const PATH=/^apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt$/;
function outcome(status,findings=[],n=0){
 return Object.freeze({
  schema:'ultra-sentinel-kotlin-policy-boundary-hypotheses/v1',
  status,filesScanned:n,findings:Object.freeze(findings),
  sourceRepositoryAuthenticated:false,
  originalFunctionalOracleVerified:false,coreContractModified:false,
  autonomousRepairProven:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Source blob consistency only. Inter-file static co-occurrence and clock rollback heuristics are not original JVM proof or causal verification.'
 });
}
function valid(f){
 return f&&typeof f==='object'&&!Array.isArray(f)&&
  Object.getPrototypeOf(f)===Object.prototype&&
  Object.keys(f).sort().join(',')==='expectedBlobSha,path,source'&&
  typeof f.path==='string'&&f.path.length<=300&&PATH.test(f.path)&&
  !f.path.includes('..')&&!f.path.includes('//')&&
  typeof f.source==='string'&&f.source.length>=10&&
  Buffer.byteLength(f.source,'utf8')<=60000&&
  f.source.endsWith('\n')&&!f.source.includes('\r')&&!f.source.includes('\0')&&
  f.source.split('\n').length<=1501&&SHA.test(f.expectedBlobSha||'');
}
function codeOnly(s){
 // Conservative comment removal, sufficient for bounded exact idioms.
 return s.replace(/\/\*[\s\S]*?\*\//g,'')
  .split('\n').filter(x=>!x.trimStart().startsWith('//')).join('\n');
}
function observation(rule,path,source,blob,needle,confidence,reason){
 const index=source.indexOf(needle);
 const line=index<0?1:source.slice(0,index).split('\n').length;
 const f={rule,path,line,confidence,severity:rule.startsWith('GGUF')?'HIGH':'MEDIUM',
  evidence:needle.slice(0,140),reason,expectedBlobSha:blob,
  status:'HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE',
  autofix:false};
 f.familyId=fingerprint(f);
 return Object.freeze(f);
}
function scanKotlinPolicyBoundaries({expectedCommitSha,files}={}){
 if(!SHA.test(expectedCommitSha||'')||!Array.isArray(files)||
  files.length<1||files.length>8||!files.every(valid))
  return outcome('BLOCKED_INPUT_CONTRACT');
 const seen=new Set();
 for(const f of files){
  if(seen.has(f.path))return outcome('BLOCKED_DUPLICATE_SOURCE');
  seen.add(f.path);
  if(blobSha(f.source)!==f.expectedBlobSha)
   return outcome('BLOCKED_GIT_BLOB_MISMATCH');
 }
 const sources=files.map(x=>({...x,code:codeOnly(x.source)}));
 const gates=sources.filter(x=>/\bclass\s+OfflineVoiceQuestionGate\b/.test(x.code));
 const policies=sources.filter(x=>/\bobject\s+LocalGgufPolicy\b/.test(x.code));
 const found=[];
 for(const gate of gates)for(const policy of policies){
  if(gate.path===policy.path)continue;
  if(/\bLocalGgufPolicy\.validPrompt\s*\(\s*question\s*\)/.test(gate.code)&&
   /\bfun\s+validPrompt\s*\(\s*prompt\s*:\s*String\b/.test(policy.code)&&
   !/\bfun\s+validReadOnlyQuestion\s*\(/.test(policy.code)&&
   !/\bLocalGgufPolicy\.validReadOnlyQuestion\s*\(/.test(gate.code)){
   found.push(observation('GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP',
    gate.path,gate.code,gate.expectedBlobSha,'LocalGgufPolicy.validPrompt(question)',
    'medium','A voice-derived question relies on a generic model text check; test operational verbs against a trusted original Kotlin read-only boundary oracle.'));
  }
 }
 for(const file of sources){
  if(/\bclass\s+PreviewTimeGate\b/.test(file.code)&&
   /\bfun\s+isActiveAt\s*\(/.test(file.code)&&
   /if\s*\(\s*nowMillis\s*<\s*began\s*\|\|\s*nowMillis\s*<\s*0L\s*\)\s*return\s+false/.test(file.code)&&
   /\bfun\s+stop\s*\(/.test(file.code)){
   found.push(observation('PREVIEW_TIME_REVIVAL_AFTER_CLOCK_ROLLBACK',
    file.path,file.code,file.expectedBlobSha,
    'if (nowMillis < began || nowMillis < 0L) return false',
    'low','A preview deadline appears to reject a reversed clock observation without clearing previously pending state; requires Kotlin timeline reproduction.'));
  }
 }
 found.sort((a,b)=>a.rule.localeCompare(b.rule)||a.path.localeCompare(b.path));
 return outcome(found.length?'UNVERIFIED_POLICY_BOUNDARY_HYPOTHESES':
  'NO_POLICY_BOUNDARY_HYPOTHESES_NOT_CERTIFIED',found,files.length);
}
module.exports={scanKotlinPolicyBoundaries};

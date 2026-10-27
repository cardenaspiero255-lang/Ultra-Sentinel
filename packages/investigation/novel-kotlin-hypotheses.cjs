'use strict';
/**
 * Separate experiment: discover non-registered Kotlin risk hypotheses without
 * touching frozen Core/C2 baselines or promoting caller data to Core findings.
 * Inputs are inert strings with local Git-blob consistency only.
 * Only a trusted caller who independently pins repository+commit+blob may
 * claim provenance; this module NEVER returns provenance authenticated.
 */
const {createHash}=require('node:crypto');
const {fingerprint}=require('../family-hunter/ultra_sentinel_family_fingerprints.cjs');
const {makeSuggestion}=require('../core/ultra_sentinel_remediation.cjs');
const SHA=/^[0-9a-f]{40}$/;
const PATH=/^(?:(?:apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core|app\/src\/main\/(?:java|kotlin)|[A-Za-z0-9_-]+\/src\/main\/(?:java|kotlin))\/[A-Za-z0-9_./-]+)\.kt$/;
const MAX_FILES=12,MAX_BYTES=60000,MAX_LINES=1500;
const META=Object.freeze({
 REGEX_PREFIX_AS_COMPLETE_VALIDATION:Object.freeze({
  severity:'HIGH',confidence:'medium',
  reason:'Una expresión anclada solo al inicio es usada como prueba de validez de toda una salida; un sufijo inesperado podría ser aceptado.',
  verification:'Compilar el Kotlin original con un oráculo que compare entrada UID válida, sufijo hostil y controles benignos completos.'
 }),
 CLOCK_ROLLBACK_WITHOUT_INVALIDATION:Object.freeze({
  severity:'MEDIUM',confidence:'low',
  reason:'Una comprobación de reloj invertido rechaza la consulta actual pero aparentemente no revoca el estado pendiente, que podría recuperarse al adelantar el reloj.',
  verification:'Probar en JVM el estado pendiente antes, durante y después de un retroceso temporal con entrada original; distinguir reloj monótono real de inyección de prueba.'
 })
});
function blobSha(source){
 const bytes=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function blocked(reason){
 return Object.freeze({
  schema:'ultra-sentinel-novel-kotlin-hypotheses/v1',status:reason,
  expectedCommitSha:null,filesScanned:0,findings:Object.freeze([]),
  repairHandoffs:Object.freeze([]),
  sourceGitRepositoryAuthenticated:false,sourceByteIntegrityVerified:false,
  originalFunctionalOracleVerified:false,coreContractModified:false,
  executionAllowed:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false
 });
}
function validFile(file){
 if(!file||typeof file!=='object'||Array.isArray(file)||
   Object.getPrototypeOf(file)!==Object.prototype||
   Object.keys(file).sort().join(',')!=='expectedBlobSha,path,source'||
   typeof file.path!=='string'||file.path.length>300||
   !PATH.test(file.path)||file.path.split('/').some(s=>s==='.'||s==='..'||s==='')||
   file.path.includes('//')||!SHA.test(file.expectedBlobSha||'')||
   typeof file.source!=='string'||file.source.includes('\0')||
   file.source.includes('\r')||!file.source.endsWith('\n')||
   Buffer.byteLength(file.source,'utf8')>MAX_BYTES||
   file.source.length<10)return false;
 return file.source.split('\n').length<=MAX_LINES+1;
}
function simpleCommentLines(lines){
 let inBlock=false;
 return lines.map(line=>{
  const trimmed=line.trim();
  if(inBlock){
   if(trimmed.includes('*/'))inBlock=false;
   return '';
  }
  if(trimmed.startsWith('/*')){
   if(!trimmed.includes('*/'))inBlock=true;
   return '';
  }
  if(trimmed.startsWith('//')||trimmed.startsWith('*'))return '';
  return line;
 });
}
function discover(path,source,expectedBlobSha){
 const rows=source.split('\n'),code=simpleCommentLines(rows),found=[];
 const declarations=new Set();
 for(const line of code){
  const decl=line.match(/\b(?:val|var)\s+([A-Za-z_]\w*)\s*=\s*Regex\s*\(\s*"\^/);
  if(decl)declarations.add(decl[1]);
 }
 const add=(rule,line,text)=>{
  const meta=META[rule],evidence=String(text).trim().slice(0,160);
  const observation={rule,path,line,severity:meta.severity,
   confidence:meta.confidence,evidence,
   reason:meta.reason,verification:meta.verification,
   familyId:fingerprint({rule,evidence}),expectedBlobSha,
   status:'HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE',
   byteIntegrityVerified:true,autofix:false};
  found.push(Object.freeze(observation));
 };
 for(let i=0;i<code.length;i++){
  const line=code[i];if(!line)continue;
  const match=line.match(/\b([A-Za-z_]\w*)\s*\.\s*containsMatchIn\s*\(\s*[A-Za-z_]\w*\.trim\s*\(\s*\)\s*\)/);
  if(match&&declarations.has(match[1])){
   const context=code.slice(Math.max(0,i-2),i+1).join(' ');
   if(/\b(?:val|var)\s+[A-Za-z_]\w*(?:Is[A-Z]\w*|Valid[A-Z]\w*|Verified[A-Z]\w*|Evidence[A-Z]\w*)?\s*=\s*[^;]*\b(?:length|size)\s*<=\s*\d+\s*&&/i.test(context)||
      /\b(?:val|var)\s+(?:isValid|isVerified|isAuthenticated|outputIs[A-Z]\w*|identityIs[A-Z]\w*)\s*=/.test(context))
    add('REGEX_PREFIX_AS_COMPLETE_VALIDATION',i+1,line);
  }
  if(/\bif\s*\(\s*now[A-Za-z_0-9]*\s*<\s*(?:started|start|began|requestedAt)\s*\)\s*return\s+false\b/.test(line)){
   const head=code.slice(Math.max(0,i-15),i).join('\n');
   const tail=code.slice(i+1,Math.min(code.length,i+25)).join('\n');
   if(/\bfun\s+(?:isPending|pending|isActiveAt|isFresh)\s*\(/.test(head)&&
     /\b(?:fun\s+consume\s*\(|cancel\s*\(\s*\))/.test(tail))
    add('CLOCK_ROLLBACK_WITHOUT_INVALIDATION',i+1,line);
  }
 }
 return found;
}
function scanNovelKotlinHypotheses({expectedCommitSha,files}={}){
 if(!SHA.test(expectedCommitSha||'')||!Array.isArray(files)||
  files.length===0||files.length>MAX_FILES||!files.every(validFile))
  return blocked('BLOCKED_INPUT_CONTRACT');
 const seen=new Set();
 for(const file of files){
  if(seen.has(file.path))return blocked('BLOCKED_DUPLICATE_PATH');
  seen.add(file.path);
  if(blobSha(file.source)!==file.expectedBlobSha)
   return blocked('BLOCKED_BLOB_MISMATCH');
 }
 const findings=files.flatMap(x=>discover(x.path,x.source,x.expectedBlobSha))
  .sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.rule.localeCompare(b.rule));
 const repairHandoffs=findings.map(f=>Object.freeze(makeSuggestion(f)));
 return Object.freeze({
  schema:'ultra-sentinel-novel-kotlin-hypotheses/v1',
  status:findings.length?'UNVERIFIED_RISK_HYPOTHESES':'NO_HYPOTHESES_FOUND_NOT_CERTIFIED',
  expectedCommitSha,filesScanned:files.length,
  findings:Object.freeze(findings),repairHandoffs:Object.freeze(repairHandoffs),
  sourceGitRepositoryAuthenticated:false,sourceByteIntegrityVerified:true,
  originalFunctionalOracleVerified:false,coreContractModified:false,
  executionAllowed:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'Git blob consistency is not trusted provenance. Novel patterns are unverified hypotheses. Never pass these findings into Core, authenticate a release, execute a fix or claim causality without original-source oracles.'
 });
}
module.exports={scanNovelKotlinHypotheses,blobSha};

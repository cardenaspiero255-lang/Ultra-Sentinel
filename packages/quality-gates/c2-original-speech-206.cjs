'use strict';
/*
 * Known public-source REGRESSION of GameHub Ultra PR #206, not GOLD/holdout.
 * Core must analyze the authentic original changed lines, not test fixture
 * predictions. Git provenance is independently checked from the pinned repo.
 */
const {createHash}=require('node:crypto');
const {readFileSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const {execFileSync}=require('node:child_process');
const {analyze}=require('../core/ultra_sentinel_core.cjs');
const UPSTREAM_REPO='cardenaspiero255-lang/gamehub-ultra';
const BASE='b1089cb127b79706f30908df9db8fa35bdc1a8e7';
const HEAD='53cb89551d6e750d263bc0e25dde9f4d3069144f';
const BLOB='6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a';
const ORIGINAL_PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt';
const RULE_ID='TTS_UTF16_SURROGATE_SPLIT';
const EXPECTED_LINE=26;

function gitBlobSha(source){
 const bytes=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function scanSpeechSource(source,{path=ORIGINAL_PATH,patchSource=source}={}){
 if(typeof source!=='string'||typeof patchSource!=='string')throw Error('source must be UTF-8 text');
 const rows=patchSource.replace(/\n$/,'').split('\n');
 const patch='@@ -0,0 +1,'+rows.length+' @@\n'+rows.map(s=>'+'+s).join('\n')+'\n';
 return analyze([{
  filename:path,status:'added',additions:rows.length,deletions:0,changes:rows.length,
  sha:gitBlobSha(patchSource),patch,fullSource:source
 }],{sha:HEAD});
}
function git(cwd,...args){
 return execFileSync('git',['-C',cwd,...args],{
  encoding:'utf8',timeout:12000,maxBuffer:180000
 }).trimEnd();
}
function verifyOriginalCheckout(originalDir,fixturePath){
 const sha=git(originalDir,'rev-parse','HEAD');
 if(sha!==HEAD)throw Error('UNTRUSTED_ORIGINAL_HEAD');
 git(originalDir,'merge-base','--is-ancestor',BASE,HEAD);
 const gitBlob=git(originalDir,'rev-parse',HEAD+':'+ORIGINAL_PATH);
 if(gitBlob!==BLOB)throw Error('UNTRUSTED_ORIGINAL_BLOB');
 const status=git(originalDir,'diff','--name-status','--no-renames',BASE,HEAD,'--',ORIGINAL_PATH);
 if(status!=='A\t'+ORIGINAL_PATH)throw Error('ORIGINAL_NOT_ADDED_AT_PR206');
 const numstat=git(originalDir,'diff','--numstat','--no-renames',BASE,HEAD,'--',ORIGINAL_PATH);
 if(numstat!=='32\t0\t'+ORIGINAL_PATH)throw Error('UNEXPECTED_ORIGINAL_PR_CHANGE');
 const original=readFileSync(join(originalDir,ORIGINAL_PATH),'utf8');
 const fixture=readFileSync(fixturePath,'utf8');
 if(gitBlobSha(original)!==BLOB||original!==fixture||gitBlobSha(fixture)!==BLOB)
  throw Error('ORIGINAL_SOURCE_MISMATCH');
 // Full-source/patch correspondence still checked independently by Core.
 return original;
}
function evaluateOriginal(original){
 if(gitBlobSha(original)!==BLOB)throw Error('ORIGINAL_BLOB_HASH_CHANGED');
 const analysis=scanSpeechSource(original);
 if(analysis.coverage.partial)throw Error('PARTIAL_DETECTOR_COVERAGE');
 const findings=analysis.findings.filter(x=>x.rule===RULE_ID);
 if(findings.length!==1||findings[0].path!==ORIGINAL_PATH||
  findings[0].line!==EXPECTED_LINE||findings[0].status!=='NEEDS_VERIFICATION')
  throw Error('CORE_ORIGINAL_DETECTION_NOT_MATCHED');
 // Controls: zero on Unicode-safe transformed variant and unrelated file.
 const safe=original.replace(
  '            chunks += remaining.substring(0, boundary).trimEnd()',
  '            val safeBoundary = if (boundary > 0 && boundary < remaining.length && remaining[boundary - 1].isHighSurrogate() && remaining[boundary].isLowSurrogate()) boundary - 1 else boundary\n'+
  '            chunks += remaining.substring(0, safeBoundary).trimEnd()'
 ).replace(
  'remaining = remaining.substring(boundary).trimStart()',
  'remaining = remaining.substring(safeBoundary).trimStart()'
 );
 if(safe===original||!safe.includes('val safeBoundary'))throw Error('COUNTERFACTUAL_NOT_APPLIED');
 const controls=[
  ['UNICODE_SAFE_TRANSFORMATION',scanSpeechSource(safe)],
  ['UNRELATED_PATH',scanSpeechSource(original,{path:'docs/src/main/kotlin/UltraSpeechChunker.kt'})],
  ['TAMPERED_FULL_SOURCE',scanSpeechSource('// tampered\n'+original,{patchSource:original})]
 ];
 for(const [name,result] of controls){
  if(result.findings.some(x=>x.rule===RULE_ID))
   throw Error('FALSE_POSITIVE_CONTROL:'+name);
  if(name==='TAMPERED_FULL_SOURCE'&&!result.coverage.partial)
   throw Error('FAIL_OPEN_SOURCE_ATTESTATION');
  if(name!=='TAMPERED_FULL_SOURCE'&&result.coverage.partial)
   throw Error('INCOMPLETE_CONTROL:'+name);
 }
 return Object.freeze({
  schema:'ultra-sentinel-c2-known-original-source-detection/v1',
  sourceRepository:UPSTREAM_REPO,originalPr:206,baseSha:BASE,headSha:HEAD,
  sourceBlobSha:BLOB,sourcePath:ORIGINAL_PATH,
  originalSourceAndDiffVerified:true,
  detector:'Ultra Sentinel Core',ruleId:RULE_ID,path:findings[0].path,
  line:findings[0].line,status:findings[0].status,
  controls:controls.map(([name])=>({name,matchingFindings:0})),
  independentKotlinJUnitRequired:true,
  knownPublicRegression:true,blindHoldout:false,
  historicalLabels:23,newLabels:0,admittedLabels:0,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  limitations:['Previously known GameHub bug, not independent GOLD',
   'Structural risk diagnosis is checked against original Kotlin runtime behavior',
   'Negative transforms are synthetic controls, not original upstream fixes']
 });
}
function main(args=process.argv.slice(2)){
 if(args.length!==3)throw Error('usage: node c2-original-speech-206.cjs ORIGINAL_CHECKOUT FIXTURE REPORT');
 const [checkout,fixture,reportPath]=args;
 const r=evaluateOriginal(verifyOriginalCheckout(checkout,fixture));
 writeFileSync(reportPath,JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({ruleId:r.ruleId,path:r.path,line:r.line,controls:r.controls,newLabels:0})+'\n');
}
if(require.main===module)main();
module.exports={scanSpeechSource,verifyOriginalCheckout,evaluateOriginal,ORIGINAL_PATH,RULE_ID,HEAD,BASE,BLOB};

'use strict';
/*
 * Development-only REAL Core capture on the exact original GameHub PR #150
 * added production file. No whole-PR coverage, FP, TN, GOLD or blind claims.
 * The synthetic-only adapter is explicitly NOT an authenticated original.
 */
const {createHash}=require('node:crypto');
const {analyze}=require('../core/ultra_sentinel_core.cjs');
const {ORIGINAL_HEAD,SOURCE_PATH,EXPECTED_BLOB}=require('./c2-pr150-causal-matrix.cjs');
const BASE='74c5fb9697b2855a1395c9562c2f9b74df9c34c1';
const BENIGN='WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE';
const fail=()=>{throw Error('C2_PR150_DETECTOR_BOUNDARY_BLOCKED');};
const blob=source=>{
 const bytes=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
};
function strict(value,keys){
 return value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
}
function capture(input,synthetic){
 const keys=['source','expectedSourceBlob','expectedSourceLines','pr','target'];
 if(!strict(input,keys)||typeof input.source!=='string'||input.source.includes('\0')||
    Buffer.byteLength(input.source,'utf8')>160000||
    !/^[a-f0-9]{40}$/.test(input.expectedSourceBlob||'')||
    !Number.isSafeInteger(input.expectedSourceLines)||input.expectedSourceLines<1||
    input.expectedSourceLines>10000||!strict(input.pr,['number','head','base','changed_files'])||
    !strict(input.pr.head,['sha'])||!strict(input.pr.base,['sha'])||
    input.pr.number!==150||input.pr.changed_files!==21||
    input.pr.head.sha!==ORIGINAL_HEAD||input.pr.base.sha!==BASE||
    !strict(input.target,['filename','status','sha','additions','deletions','changes','patch'])||
    input.target.filename!==SOURCE_PATH||input.target.status!=='added'||
    input.target.sha!==input.expectedSourceBlob||
    input.target.changes!==input.expectedSourceLines||
    input.target.additions!==input.expectedSourceLines||
    input.target.deletions!==0||typeof input.target.patch!=='string'||
    blob(input.source)!==input.expectedSourceBlob)fail();
 const sourceLines=input.source.endsWith('\n')?
  input.source.slice(0,-1).split('\n'):input.source.split('\n');
 if(sourceLines.length!==input.expectedSourceLines)fail();
 const expectedPatch='@@ -0,0 +1,'+input.expectedSourceLines+' @@\n'+
  sourceLines.map(s=>'+'+s).join('\n');
 if(input.target.patch!==expectedPatch)fail();
 if(!synthetic&&(input.expectedSourceBlob!==EXPECTED_BLOB||
    input.expectedSourceLines!==320))fail();
 const result=analyze([{
  filename:SOURCE_PATH,status:'added',
  sha:input.expectedSourceBlob,
  additions:input.expectedSourceLines,deletions:0,
  changes:input.expectedSourceLines,patch:input.target.patch,
  fullSource:input.source
 }],{sha:ORIGINAL_HEAD});
 if(result.sha!==ORIGINAL_HEAD||result.coverage.partial||
    result.coverage.returned!==1||result.coverage.analyzed!==1||
    result.omitted!==0||!Array.isArray(result.findings))fail();
 const originalTuple={rule:BENIGN,path:SOURCE_PATH,line:250};
 const exact=result.findings.filter(f=>
  f.rule===originalTuple.rule&&f.path===originalTuple.path&&f.line===originalTuple.line);
 const findings=result.findings.map(f=>({
  rule:f.rule,path:f.path,line:f.line,severity:f.severity,
  status:f.status
 }));
 return Object.freeze({
  schema:'c2-pr150-exact-source-core-negative-boundary/v1',
  status:synthetic?'SYNTHETIC_UNIT_CAPTURE_NO_ORIGINAL_ATTESTATION':
   'ORIGINAL_SOURCE_CORE_CAPTURE_NEGATIVE_NOT_SCORABLE',
  originalPr:150,originalHeadSha:ORIGINAL_HEAD,originalBaseSha:BASE,
  originalSourcePath:SOURCE_PATH,originalSourceBlobSha:input.expectedSourceBlob,
  sourceMatchesSuppliedBlob:true,pinnedOriginalSource:!synthetic,
  originalPrChangedFiles:21,fullPrCoverageVerified:false,
  targetSourceFilesAnalyzed:1,
  coreExecutedOnSuppliedSource:true,coreVersion:result.version,
  coreVerdict:result.verdict,coreFindings:findings,
  benign:{
   ...originalTuple,
   status:exact.length?'EXACT_DETECTOR_PREDICTION_REQUIRES_FP_ORACLE_REVIEW':
    'NO_EXACT_DETECTOR_PREDICTION_UNSCORED',
   exactPredictionCount:exact.length,falsePositiveScored:false
  },
  benignOriginalBehaviorProvenByThisCapture:false,
  originalCausalMatrixReexecutedByThisCapture:false,
  negativeDetectorLabelsScored:0,measuredFalsePositiveRate:null,
  independentRootCausesCertified:false,newGoldLabels:0,
  precision:null,recall:null,f1:null,blindHoldout:false,
  sssPlusCertified:false
 });
}
function capturePr150OriginalDetectorBoundary(input){return capture(input,false);}
function captureSyntheticPr150Fixture(input){return capture(input,true);}
module.exports={capturePr150OriginalDetectorBoundary,captureSyntheticPr150Fixture};

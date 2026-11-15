#!/usr/bin/env node
'use strict';
// Host-side coordination only. The detector and its launchers stay at 9550170.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parseReport,readCohort,prepareCohort}=require('./phase2-block26-object-eval.cjs');
const ROOT=path.resolve(__dirname,'..'),ENGINE='9550170e084505a09e7ee65d2e68eb0e1883d3b2';
const PREFIX='com.github',ORACLE='tests/fixtures/phase2-block26-corrected-replication/IndependentSplineOracle.kt';
const ORACLE_SHA='f960651779c282397fd45a7a92e31e22e9f14d1d510adbd228ed501d1dd00c5f';
const BLOBS=['b75fa8d32b0790d2f37c9f2cd0c48cba790cc249','1f372b653fd81543092eec1ffca3db1a084d950b',
 '307cc0c707916016e998d87050172e05604e1411','26fa436e36d5b924e71b9a776e729ff5a22ec1ed'];
const fail=()=>{throw Error('CORRECTED_FROZEN_REPLICATION_REFUSED');};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function read(file,max=262144){
 const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<2||s.size>max)fail();
 return fs.readFileSync(file);
}
function manifest(id){
 if(!Number.isInteger(id)||id<1||id>4)fail();
 const suffix=id===1?'':String(id),raw=read(path.join(ROOT,'docs/quality/PHASE2-BLOCK26-CORRECTED-COHORT'+suffix+'.json'));
 if(blob(raw)!==BLOBS[id-1]||hash(read(path.join(ROOT,ORACLE)))!==ORACLE_SHA)fail();
 const m=JSON.parse(raw);
 if(m.engine.commitSha!==ENGINE||m.engine.retuningAllowed!==false||m.protocol.block27Allowed!==false)fail();
 return m;
}
function inspectHeaders(files){
 const packages=new Set(),unsupportedPaths=[],unresolved=[];
 for(const f of files){
  if(!/^src\/main\/[A-Za-z0-9_/]+\.kt$/.test(f.path))unsupportedPaths.push(f.path);
  // Conservative header eligibility, not a semantic parse or absence proof.
  // Unknown leading constructs are abstentions; they are never rewritten.
  const first=f.source.trimStart().split(/\r?\n/,1)[0];
  const m=/^package[ \t]+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)[ \t]*;?[ \t]*$/.exec(first);
  if(m)packages.add(m[1]);else unresolved.push(f.path);
 }
 const unsupportedPackages=[...packages].filter(p=>! /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+$/.test(p)).sort();
 return {schema:'ultra-sentinel-corrected-frozen-eligibility/v1',filesAuthenticated:files.length,
  executionEligible:files.length>0&&!unsupportedPaths.length&&!unresolved.length&&!unsupportedPackages.length,
  namespaceHeaderScanOnly:true,packages:[...packages].sort(),unsupportedPackages,unsupportedPaths,
  unresolvedPackageHeaders:unresolved,prefixes:[...new Set([...packages].filter(p=>p.includes('.')).map(p=>p.split('.').slice(0,2).join('.')))].sort(),
  filesScannedByHunter:0,independentDefectTruthKnown:false,falseNegativeCount:null,block27Allowed:false};
}
function seal(raw,artifact){
 const m=manifest(4),r=parseReport(raw,artifact,PREFIX);
 return {schema:'ultra-sentinel-corrected-frozen-prediction-seal/v1',engineSha:ENGINE,sourceSha:m.source.commitSha,
  cohortManifestBlob:BLOBS[3],oracleSha256:ORACLE_SHA,artifactSha256:artifact,reportSha256:hash(raw),
  filesAuthenticated:m.source.files.length,methodsProbed:r.methodsProbed,comparablePairs:r.comparablePairs,
  hypotheses:r.findings.length,oracleExecutedBeforeSeal:false,engineRetuned:false,remoteWrites:false,mergeAllowed:false};
}
function verify(s,raw){const expected=seal(raw,s?.artifactSha256);if(JSON.stringify(s)!==JSON.stringify(expected))fail();return expected;}
function verdict(s,raw,o){
 verify(s,raw);
 if(o.schema!=='ultra-sentinel-corrected-frozen-independent-controls/v1'||o.splineControls!==75||
  o.binarySearchControls!==9||o.wholeFileTruthAvailable!==false)fail();
 return {schema:'ultra-sentinel-corrected-frozen-replication-verdict/v1',
  status:s.methodsProbed===0&&s.comparablePairs===0?'REPLICATION_NOT_DEMONSTRATED_NO_SUPPORTED_METHODS':'REPLICATION_NOT_DEMONSTRATED_WITHOUT_MATCHED_DEFECT_ORACLE',
  engineSha:ENGINE,sourceSha:s.sourceSha,reportSha256:s.reportSha256,methodsProbed:s.methodsProbed,
  comparablePairs:s.comparablePairs,hypotheses:s.hypotheses,verifiedDistinctDefects:0,
  scopedIndependentControls:o.splineControls+o.binarySearchControls,precision:null,recall:null,
  falsePositives:null,falseNegatives:null,engineRetuned:false,knownOriginalLcmReused:false,
  novelFamilyVerified:false,block27Allowed:false,remoteWrites:false,mergeAllowed:false};
}
function save(p,x){fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});}
if(require.main===module){
 try{
  const [action,...a]=process.argv.slice(2);
  if(action==='audit'&&a.length===4){
   const [id,engine,source,out]=a,m=manifest(Number(id));
   const files=readCohort(engine,source,m).map(f=>({path:f.path,source:new TextDecoder('utf8',{fatal:true}).decode(f.bytes)}));
   save(out,inspectHeaders(files));
  }else if(action==='prepare'&&a.length===3){
   const m=manifest(4);prepareCohort(a[0],a[1],a[2],m);
  }else if(action==='seal'&&a.length===3)save(a[2],seal(read(a[0]),hash(read(a[1],32*1024*1024))));
  else if(action==='verify'&&a.length===2)verify(JSON.parse(read(a[0])),read(a[1]));
  else if(action==='verdict'&&a.length===4){const v=verdict(JSON.parse(read(a[0])),read(a[1]),JSON.parse(read(a[2])));save(a[3],v);console.log(JSON.stringify(v));}
  else fail();
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({inspectHeaders,seal,verify,verdict});

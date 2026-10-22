'use strict';
/*
 * Diagnostic only: original GameHub PR source blobs and original diff hunks
 * joined to the frozen Core's real predictions. Source behavior receipts
 * cannot be promoted to measured TN, FP, FN, TP, or fresh holdout labels.
 */
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {analyze,parsePatch}=require('../core/ultra_sentinel_core.cjs');
const {STAGES}=require('./c2-twelve-original-oracle-reconciliation.cjs');
const fail=()=>{throw Error('C2_HISTORICAL_CORE_CAPTURE_BLOCKED');};
const HEX40=/^[a-f0-9]{40}$/;
const REPO='cardenaspiero255-lang/gamehub-ultra';
const ENGINE_HEAD='e7454d5d1c837846685db57c9be7a48e107b9cac';
const ENGINE_BLOBS=Object.freeze({
 'packages/core/ultra_sentinel_core.cjs':'836f9400f42f269b80f446e89601744c59c73073',
 'packages/core/c2-semantic-patterns.cjs':'7df2a994f566ad56bdacab999fa6ba83b69e3b4d',
 'packages/core/c2-known-defect-regressions.cjs':'8c2fa4289d331e157b07f4e693239ac7e31cae8c'
});
const digest=source=>{const b=Buffer.from(source,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const isSafePath=p=>typeof p==='string'&&p.length<350&&
 p.startsWith('app/src/main/')&&p.endsWith('.kt')&&
 /^[A-Za-z0-9_./-]+$/.test(p)&&!p.includes('//')&&!p.split('/').includes('..');
const id=x=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
const strict=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
function assessOriginalSource(input){
 if(!strict(input,['label','source','pr','files'])||
   !strict(input.label,['pr','headSha','blobSha','path','line','positive','rule'])||
   !strict(input.pr,['number','headSha','changedFiles'])||
   typeof input.source!=='string'||input.source.includes('\0')||
   Buffer.byteLength(input.source,'utf8')>160000||
   !Number.isSafeInteger(input.label.pr)||input.label.pr<1||
   !Number.isSafeInteger(input.label.line)||input.label.line<1||
   typeof input.label.positive!=='boolean'||!HEX40.test(input.label.headSha)||
   !HEX40.test(input.label.blobSha)||!isSafePath(input.label.path)||
   typeof input.label.rule!=='string'||
   !/^[A-Z][A-Z0-9_]{2,100}$/.test(input.label.rule)||
   input.pr.number!==input.label.pr||input.pr.headSha!==input.label.headSha||
   !Number.isSafeInteger(input.pr.changedFiles)||input.pr.changedFiles<1||
   input.pr.changedFiles>100||!Array.isArray(input.files)||
   input.files.length!==input.pr.changedFiles||
   digest(input.source)!==input.label.blobSha)fail();
 const seen=new Set();
 for(const f of input.files){
  if(!f||typeof f!=='object'||Array.isArray(f)||
    typeof f.filename!=='string'||f.filename.length>350||
    f.filename.startsWith('/')||f.filename.includes('..')||f.filename.includes('//')||
    !/^[A-Za-z0-9_./-]+$/.test(f.filename)||
    !['added','modified','removed','renamed','copied','unchanged'].includes(f.status)||
    !HEX40.test(f.sha)||seen.has(f.filename))fail();
  seen.add(f.filename);
 }
 const changed=input.files.find(f=>f.filename===input.label.path);
 let matches=[],status='ORIGINAL_PR_FILE_UNCHANGED',coreExecuted=false, noTestsAlert=false;
 let coreVersion=null,partial=false,addedLine=false,findings=[];
 if(changed){
  if(!['added','modified'].includes(changed.status)||changed.sha!==input.label.blobSha||
    typeof changed.patch!=='string'||changed.patch.length>320000||
    !Number.isSafeInteger(changed.additions)||changed.additions<0||
    !Number.isSafeInteger(changed.deletions)||changed.deletions<0||
    !Number.isSafeInteger(changed.changes)||
    changed.changes!==changed.additions+changed.deletions)fail();
  const parsed=parsePatch(changed.patch);
  if(parsed.partial||parsed.added.length!==changed.additions)fail();
  const rows=input.source.split(/\r?\n/);
  if(!parsed.scan.every(q=>q.line>0&&q.line<=rows.length&&rows[q.line-1]===q.text))fail();
  addedLine=parsed.added.some(q=>q.line===input.label.line);
  status=addedLine?'ORIGINAL_DIFF_LINE_ADDED':'ORIGINAL_SOURCE_LINE_NOT_ADDED';
  const included=[{filename:changed.filename,status:changed.status,sha:changed.sha,
     additions:changed.additions,deletions:changed.deletions,changes:changed.changes,
     patch:changed.patch,fullSource:input.source}];
  for(const f of input.files.filter(f=>/app\/src\/(?:test|androidTest)\//.test(f.filename)))
   included.push({filename:f.filename,status:f.status,sha:f.sha});
  const out=analyze(included,{sha:input.label.headSha});
  if(out.sha!==input.label.headSha||out.coverage.partial||
     out.coverage.analyzed!==1||out.coverage.returned!==included.length||
     out.omitted!==0||!Array.isArray(out.findings))fail();
  coreExecuted=true;coreVersion=out.version;partial=out.coverage.partial;
  findings=out.findings.map(f=>({rule:f.rule,path:f.path,line:f.line,severity:f.severity}));
  matches=findings.filter(f=>f.rule===input.label.rule&&
    f.path===input.label.path&&f.line===input.label.line);
  noTestsAlert=findings.some(f=>f.rule==='REGRESSION_TEST_COVERAGE');
  if(noTestsAlert&&included.length>1)fail();
 }
 return Object.freeze({
  target:Object.freeze({pr:input.label.pr,headSha:input.label.headSha,
   blobSha:input.label.blobSha,rule:input.label.rule,path:input.label.path,
   line:input.label.line}),labelPolarity:input.label.positive,
  originalBlobVerified:true,changeStatus:status,lineAddedInHistoricalPR:addedLine,
  coreExecuted,coreVersion,exactRulePathLineMatches:matches.length,
  findings,otherRuleFindings:findings.filter(f=>!matches.includes(f)).length,
  noTestsAlert,partial,scoredNegative:false,scoredPositive:false,
  falsePositive:null,certified:false,
  detectorRuleApplicability:'NOT_INDEPENDENTLY_ATTESTED',
  independentCausalIdentity:'UNVERIFIED',
  observedCoreRuleMatchIsNotOracle:true
 });
}
function aggregateTwelve(rows){
 if(!Array.isArray(rows)||rows.length!==12)fail();
 const ids=new Set();
 for(const r of rows){
  if(!r||!r.target||typeof r.labelPolarity!=='boolean'||
   !r.originalBlobVerified||r.scoredNegative!==false||r.scoredPositive!==false||
   r.falsePositive!==null||r.certified!==false||
   r.detectorRuleApplicability!=='NOT_INDEPENDENTLY_ATTESTED')fail();
  const key=JSON.stringify([r.target.pr,r.target.headSha,r.target.rule,
   r.target.path,r.target.line,r.labelPolarity]);
  if(ids.has(key))fail();ids.add(key);
 }
 if(rows.filter(x=>x.labelPolarity).length!==6)fail();
 return Object.freeze({
  schema:'c2-12-historical-exact-source-frozen-core-capture/v1',
  status:'REAL_ORIGINAL_CORE_CAPTURES_UNSCORED_INDEPENDENCE_PENDING',
  repository:REPO,engineHeadSha:ENGINE_HEAD,engineBlobs:ENGINE_BLOBS,
  count:12,positives:6,negatives:6,
  sourceGitBlobAttested:rows.filter(x=>x.originalBlobVerified).length,
  coreExecutions:rows.filter(x=>x.coreExecuted).length,
  outsideOriginalPrDiff:rows.filter(x=>x.changeStatus==='ORIGINAL_PR_FILE_UNCHANGED').length,
  lineNotAdded:rows.filter(x=>x.changeStatus==='ORIGINAL_SOURCE_LINE_NOT_ADDED').length,
  exactRulePathLineMatches:rows.reduce((n,x)=>n+x.exactRulePathLineMatches,0),
  claims:Object.freeze(rows),
  originalOwnerOracleReceiptsReused:true,
  originalJVMOraclesReexecutedInThisCapture:0,
  causalIndependenceNewlyCertified:0,scoredNegatives:0,scoredPositives:0,
  measuredFalsePositiveRate:null,precision:null,recall:null,f1:null,
  newGoldLabels:0,blindHoldoutFrozen:false,sssPlusCertified:false
 });
}
function verifyFrozenCore(){
 const root=path.resolve(__dirname,'../..');
 for(const [filename,sha] of Object.entries(ENGINE_BLOBS)){
  const bytes=fs.readFileSync(path.join(root,filename));
  if(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==sha)fail();
 }
}
function auditTwelveBundle(receipt,cases){
 if(!receipt||receipt.schema!=='c2-run23-twelve-original-owner-oracle-reconciliation/v1'||
    receipt.ownerOriginalOraclesReconciled!==12||
    receipt.positiveSourceReceiptsReconciled!==6||
    receipt.negativeSourceReceiptsReconciled!==6||
    receipt.counterfactualJVMExecutionsThisRun!==0||
    receipt.causalIndependenceAdjudicationsAdded!==0||
    receipt.independenceVerified!==false||receipt.newLabels!==0||
    receipt.holdoutFrozen!==false||
    !Array.isArray(receipt.entries)||receipt.entries.length!==12||
    !Array.isArray(cases)||cases.length!==12)fail();
 const trusted=new Map();
 for(const stage of STAGES){
  for(const c of stage.cases){
   const a=receipt.entries.find(x=>x.pr===c.pr&&x.rule===c.rule&&
     x.line===c.line&&x.positive===c.positive);
   if(!a||a.originalOwnerRunId!==stage.run||
     a.originalOwnerArtifactId!==stage.artifact||
     a.originalOwnerArchiveSha256!==stage.digest||
     a.independentlyCertified!==false||a.scoringAdmitted!==false||
     a.causalIndependenceStatus!=='REQUIRES_INDEPENDENT_INTERVENTION'||
     !HEX40.test(a.headSha)||!HEX40.test(a.blobSha)||trusted.has(a.identity)||
     a.identity!==id(a))fail();
   trusted.set(a.identity,a);
  }
 }
 if(trusted.size!==12)fail();
 verifyFrozenCore();
 const results=[];
 const seen=new Set();
 for(const x of cases){
  if(!x||!x.label||!trusted.has(id(x.label))||seen.has(id(x.label)))fail();
  const a=trusted.get(id(x.label));
  if(x.label.blobSha!==a.blobSha||x.label.headSha!==a.headSha)fail();
  seen.add(id(x.label));
  results.push(assessOriginalSource(x));
 }
 if(seen.size!==12)fail();
 return aggregateTwelve(results);
}
module.exports={assessOriginalSource,aggregateTwelve,auditTwelveBundle,verifyFrozenCore};

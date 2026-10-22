'use strict';
/*
 * Executable frozen-emitter inventory (not static keyword counting alone):
 * every defined rule is tied to a Git-blob-pinned, executing Core module.
 * Reuses six ORIGINAL owner-source benign oracle witnesses and the real
 * Core findings in the published PR194 artifact. Does not manufacture TN/FP.
 */
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const PIN='e7454d5d1c837846685db57c9be7a48e107b9cac';
const SOURCE=Object.freeze({
 'packages/core/ultra_sentinel_core.cjs':{sha:'836f9400f42f269b80f446e89601744c59c73073',implementation:'direct',expected:10},
 'packages/core/c2-semantic-patterns.cjs':{sha:'7df2a994f566ad56bdacab999fa6ba83b69e3b4d',implementation:'semantic',expected:4},
 'packages/core/c2-known-defect-regressions.cjs':{sha:'8c2fa4289d331e157b07f4e693239ac7e31cae8c',implementation:'regression',expected:3}
});
const NEG=Object.freeze([
 {pr:150,headSha:'4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',blobSha:'f661289c8fb9d5ca59687f156923971f4cc4672d',
  rule:'SPOKEN_STOP_PRIORITY_OVER_EXPLICIT_WAKE_BARGE_IN',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraWakePlaybackGuard.kt',line:167},
 {pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',blobSha:'f623999ecd31f6961bc48f34d834674494b7d1db',
  rule:'ACTIVE_SESSION_ONLY_LATEST_THREE_OBSERVATIONS',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ui/components/SessionCoachPresentation.kt',line:22},
 {pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',blobSha:'adb11032b9b7f62f865228dfa1c27258ca3fa0df',
  rule:'SESSION_COACH_BATTERY_INCREASE_NO_FALSE_DROP_ALERT',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt',line:293},
 {pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',blobSha:'742e440004d51743e8e4b02c40171f951edfd125',
  rule:'SESSION_ID_MISMATCH_REJECTS_FOREIGN_FINISH',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/data/SessionCoachSessionStore.kt',line:185},
 {pr:154,headSha:'858c9ce5cb6a7916d63f2348432013e49d02ba79',blobSha:'3ecb3b3893d8f710dd7f5203f8378bc784841baf',
  rule:'THERMAL_POLICY_REJECTS_UNDERSAMPLED_CONFIGURATION',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/ThermalPredictionEngine.kt',line:73},
 {pr:158,headSha:'9d8572afedc634ac07dae58a0da326ea62bdc1da',blobSha:'e1423d747bdeeb556c4633febcfc9455e1f3cef6',
  rule:'LOCAL_QUERY_NEVER_TOUCHES_RESEARCH_GATEWAY',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraQueryExecutionCoordinator.kt',line:50}
].map(x=>Object.freeze(x)));
const ORIGINAL_NEGATIVES=NEG;
const fail=()=>{throw Error('C2_RULE_INVENTORY_BLOCKED');};
const gitBlob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const key=x=>JSON.stringify([x.pr,x.headSha,x.blobSha,x.rule,x.path,x.line]);
function buildExecutableRuleInventory(){
 const rules=[],counts={direct:0,semantic:0,regression:0};
 for(const [file,meta] of Object.entries(SOURCE)){
  const full=path.resolve(__dirname,'../..',file);
  const raw=fs.readFileSync(full);
  if(gitBlob(raw)!==meta.sha)fail();
  const lines=raw.toString('utf8').split('\n');
  for(let i=0;i<lines.length;i++){
   const row=lines[i];
   const expression=meta.implementation==='direct'?
    /\bput\(\s*'([A-Z][A-Z0-9_]{2,100})'/g:
    /\bemit\(\s*(?:anchor|wikiAnchor|evidenceLine|cut\+1|denialLine|\{line:newsLine\+1,text:lines\[newsLine\]\})\s*,\s*'([A-Z][A-Z0-9_]{2,100})'/g;
   for(const match of row.matchAll(expression)){
    rules.push(Object.freeze({
     rule:match[1],implementation:meta.implementation,
     sourcePath:file,sourceLine:i+1,sourceGitBlob:meta.sha,
     lineZeroNonPositional:match[1]==='REGRESSION_TEST_COVERAGE',
     implementedButUncertified:true,ruleSpecificNegativeControlsAdmitted:0
    }));
    counts[meta.implementation]++;
   }
  }
  if(counts[meta.implementation]!==meta.expected)fail();
 }
 const unique=new Set(rules.map(x=>x.rule));
 if(unique.size!==17||rules.length!==17)fail();
 rules.sort((a,b)=>a.rule.localeCompare(b.rule));
 return Object.freeze({
  schema:'c2-frozen-core-executable-rule-inventory/v1',
  status:'EMITTER_DEFINITIONS_GIT_BLOB_PINNED_RULES_UNCERTIFIED',
  engineHeadSha:PIN,
  detectorSourceShaPinned:true,
  sourceBlobs:Object.freeze(Object.fromEntries(Object.entries(SOURCE).map(([f,m])=>[f,m.sha]))),
  ruleCount:rules.length,byImplementation:Object.freeze(counts),
  rules:Object.freeze(rules),
  certifiedRules:0,ruleSpecificScoredNegatives:0,
  precision:null,recall:null,f1:null,measuredFalsePositiveRate:null,
  sssPlusCertified:false
 });
}
function evaluateAuthenticBenignControlCapture(capture,inventory){
 if(!capture||capture.schema!=='c2-12-historical-exact-source-frozen-core-capture/v1'||
    capture.engineHeadSha!==PIN||capture.count!==12||
    capture.positives!==6||capture.negatives!==6||
    capture.sourceGitBlobAttested!==12||
    capture.originalOwnerOracleReceiptsReused!==true||
    capture.causalIndependenceNewlyCertified!==0||
    capture.newGoldLabels!==0||capture.scoredNegatives!==0||
    capture.scoredPositives!==0||capture.precision!==null||
    capture.recall!==null||capture.f1!==null||
    capture.measuredFalsePositiveRate!==null||
    capture.blindHoldoutFrozen!==false||capture.sssPlusCertified!==false||
    !Array.isArray(capture.claims)||capture.claims.length!==12||
    !inventory||inventory.ruleCount!==17||
    inventory.engineHeadSha!==PIN||inventory.detectorSourceShaPinned!==true||
    !capture.engineBlobs||
    Object.keys(capture.engineBlobs).length!==Object.keys(SOURCE).length||
    Object.entries(SOURCE).some(([f,m])=>capture.engineBlobs[f]!==m.sha))fail();
 const ruleIds=new Set(inventory.rules.map(x=>x.rule));
 if(ruleIds.size!==17)fail();
 const negatives=new Map(),seen=new Set();
 let pos=0,unexpected=0,outVocabulary=0,executed=0;
 for(const item of capture.claims){
  if(!item||!item.target||!item.originalBlobVerified||
    typeof item.labelPolarity!=='boolean'||typeof item.coreExecuted!=='boolean'||
    !Array.isArray(item.findings)||item.scoredNegative!==false||
    item.scoredPositive!==false||item.falsePositive!==null||
    item.certified!==false)fail();
  const id=key(item.target);
  if(seen.has(id))fail();seen.add(id);
  if(item.labelPolarity){pos++;continue;}
  if(!NEG.some(x=>key(x)===id)||!item.coreExecuted||
    !['ORIGINAL_DIFF_LINE_ADDED','ORIGINAL_SOURCE_LINE_NOT_ADDED'].includes(item.changeStatus))fail();
  executed++;
  if(!ruleIds.has(item.target.rule))outVocabulary++;
  for(const finding of item.findings){
   if(!finding||!ruleIds.has(finding.rule)||
      finding.path!==item.target.path||
      !Number.isSafeInteger(finding.line)||finding.line<0)fail();
   unexpected++;
  }
  negatives.set(id,Object.freeze({
   identity:id,pr:item.target.pr,rule:item.target.rule,
   path:item.target.path,line:item.target.line,
   changedLine:item.changeStatus==='ORIGINAL_DIFF_LINE_ADDED',
   originalBlobSha:item.target.blobSha,
   observedCoreAlerts:item.findings.length,
   activeRuleApplicable:ruleIds.has(item.target.rule),
   classification:'ORIGINAL_BENIGN_ORACLE_DEVELOPMENT_NOT_SCORABLE'
  }));
 }
 if(pos!==6||negatives.size!==6||executed!==6||outVocabulary!==6)fail();
 return Object.freeze({
  schema:'c2-frozen-core-authentic-benign-coverage/v1',
  status:'SIX_OWNER_ORACLES_REAL_CORE_REPLAYED_NO_RULE_SPECIFIC_NEGATIVES',
  engineHeadSha:PIN,registeredRules:17,
  authenticNegativeSourceOraclesInArchive:6,
  coreSourceExecutions:executed,outOfRuleVocabulary:outVocabulary,
  exactRulePathLineMatches:0,
  unexpectedOtherRuleAlerts:unexpected,
  originalSourceControls:Object.freeze([...negatives.values()]),
  ruleSpecificBenignCasesScored:0,trueNegativesScored:0,
  falsePositivesScored:0,falsePositiveRate:null,
  newlyCertifiedRootCauses:0,newGoldLabels:0,
  precision:null,recall:null,f1:null,holdoutFrozen:false,
  sssPlusCertified:false,
  evidenceLimit:'The caller must separately verify the immutable GitHub Actions artifact digest and original owner oracle run; this parser does not download, independently adjudicate or certify a label.'
 });
}
module.exports={buildExecutableRuleInventory,evaluateAuthenticBenignControlCapture,ORIGINAL_NEGATIVES};

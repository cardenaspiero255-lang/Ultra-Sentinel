'use strict';
/*
 * Reuse an ORIGINAL source Git blob and inspect a deliberately DERIVED
 * counterfactual with independent real JVM input controls.
 * No upstream fix commit, blind label or detector-level negative is invented.
 */
const {createHash}=require('node:crypto');
const {
 scanSpeechSource,ORIGINAL_PATH,RULE_ID,HEAD,BLOB
}=require('./c2-original-speech-206.cjs');
const fail=()=>{throw Error('C2_PR206_TRIPLE_REJECTED');};
function hashBlob(s){
 const bytes=Buffer.from(s,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
const CUT='            chunks += remaining.substring(0, boundary).trimEnd()';
const NEXT='            remaining = remaining.substring(boundary).trimStart()';
const GUARD='            val safeBoundary = if (boundary > 0 && boundary < remaining.length && remaining[boundary - 1].isHighSurrogate() && remaining[boundary].isLowSurrogate()) boundary - 1 else boundary';
function replaceExactlyOnce(text,needle,replacement){
 if(text.indexOf(needle)<0||text.indexOf(needle)!==text.lastIndexOf(needle))fail();
 return text.replace(needle,replacement);
}
function makeImmutableCounterfactual(original){
 if(typeof original!=='string'||hashBlob(original)!==BLOB||
    Buffer.byteLength(original,'utf8')>100000)fail();
 let fixed=replaceExactlyOnce(original,CUT,GUARD+'\n'+
  '            chunks += remaining.substring(0, safeBoundary).trimEnd()');
 fixed=replaceExactlyOnce(fixed,NEXT,'            remaining = remaining.substring(safeBoundary).trimStart()');
 if(fixed===original||fixed.includes('remaining.substring(0, boundary)')||
    fixed.includes('remaining.substring(boundary).trimStart()'))fail();
 return Object.freeze({
  schema:'c2-pr206-counterfactual-source-boundary/v1',
  status:'EXACT_SOURCE_DERIVATIVE_NOT_UPSTREAM_FIX',
  originalHeadSha:HEAD,originalBlobSha:BLOB,originalSourcePath:ORIGINAL_PATH,
  counterfactualBlobSha:hashBlob(fixed),fixedSource:fixed,
  changedSites:3,counterfactualUpstreamCommitCertified:false,
  provenance:'IMMUTABLE_ORIGINAL_PLUS_EXPLICIT_SOURCE_TRANSFORMATION',
  newGoldLabels:0
 });
}
function compareFrozenCore(original,fixedSource){
 const derived=makeImmutableCounterfactual(original);
 if(fixedSource!==derived.fixedSource)fail();
 const originalScan=scanSpeechSource(original);
 const fixedScan=scanSpeechSource(fixedSource);
 if(originalScan.coverage.partial||fixedScan.coverage.partial||originalScan.omitted||
    fixedScan.omitted||originalScan.sha!==HEAD||fixedScan.sha!==HEAD)fail();
 const a=originalScan.findings.filter(f=>f.rule===RULE_ID&&f.path===ORIGINAL_PATH&&f.line===26);
 const b=fixedScan.findings.filter(f=>f.rule===RULE_ID&&f.path===ORIGINAL_PATH);
 if(a.length!==1||b.length!==0)fail();
 return Object.freeze({
  schema:'c2-pr206-frozen-core-original-counterfactual/v1',
  sourceRuleId:RULE_ID,originalPath:ORIGINAL_PATH,originalLine:26,
  originalExactRulePathLineCount:a.length,counterfactualSameRuleCount:b.length,
  partial:false,detectorVersion:originalScan.version,
  independentSourceBenignRulesScored:0,scoredFalsePositiveRate:null,
  newGoldLabels:0
 });
}
const OBS_KEYS=['schema','variant','boundary32Broken','boundary800Broken',
 'asciiBenign','whitespaceBenign','shortBenign','executedOriginalKotlinSource','countIndependentBenignLabels'];
function checkObservation(v,variant,broken){
 if(!v||typeof v!=='object'||Array.isArray(v)||
    Object.keys(v).length!==OBS_KEYS.length||
    OBS_KEYS.some(k=>!Object.hasOwn(v,k))||
    v.schema!=='c2-pr206-utf16-real-kotlin-runtime/v1'||v.variant!==variant||
    v.boundary32Broken!==broken||v.boundary800Broken!==broken||
    v.asciiBenign!==true||v.whitespaceBenign!==true||
    v.shortBenign!==true||v.executedOriginalKotlinSource!==true||
    v.countIndependentBenignLabels!==0)fail();
}
function adjudicateKotlinTriple(counterfactual,originalRun,fixedRun){
 if(!counterfactual||counterfactual.originalBlobSha!==BLOB||
    counterfactual.originalHeadSha!==HEAD||
    counterfactual.status!=='EXACT_SOURCE_DERIVATIVE_NOT_UPSTREAM_FIX'||
    counterfactual.counterfactualUpstreamCommitCertified!==false||
    counterfactual.changedSites!==3||
    typeof counterfactual.fixedSource!=='string'||
    hashBlob(counterfactual.fixedSource)!==counterfactual.counterfactualBlobSha)fail();
 checkObservation(originalRun,'original',true);
 checkObservation(fixedRun,'counterfactual',false);
 return Object.freeze({
  schema:'c2-pr206-utf16-actual-kotlin-triple-adjudication/v1',
  status:'ORIGINAL_BUG_AND_DERIVED_COUNTERFACTUAL_CONFIRMED_SOURCE_BENIGN_INPUTS_UNSCORED',
  ruleId:RULE_ID,originalHeadSha:HEAD,originalSourceBlobSha:BLOB,
  counterfactualSourceBlobSha:counterfactual.counterfactualBlobSha,
  originalSourcePath:ORIGINAL_PATH,
  originalRuleLine:26,
  sourceVersionsExecuted:2,behavioralTransitions:2,
  benignInputControlsPassed:6,
  authenticOriginalSource:true,correctedProductionCodeSource:false,
  independentBenignSourceOracles:0,
  independentCausalLabelsCertified:0,
  scoredTrueNegatives:0,scoredFalsePositives:0,falsePositiveRate:null,
  precision:null,recall:null,f1:null,newGoldLabels:0,
  holdoutUntouched:false,sssPlusCertified:false
 });
}
module.exports={makeImmutableCounterfactual,compareFrozenCore,adjudicateKotlinTriple};

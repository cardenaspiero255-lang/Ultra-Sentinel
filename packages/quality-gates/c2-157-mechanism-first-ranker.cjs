'use strict';
/*
 * V2: metadata-only mechanism *hints* from exact SHA-pinned filenames.
 * No PR title/body/patch/source, no predictions, no user-selected patterns.
 * A suggested rule MUST NOT be interpreted as a semantic finding or GOLD.
 */
const {remainingCandidates,rankObservation,ruleCatalog}=
 require('./c2-158-rule-family-ranker.cjs');
const SCORING_VERSION='c2-mechanism-hints-v2';
const blocked=()=>{throw Error('C2_157_MECHANISM_RANK_BLOCKED');};
const id=x=>x.repository.toLowerCase()+'#'+x.pr;
const FAMILIES=Object.freeze([
 Object.freeze({id:'SPEECH_REENTRANT_RETRY',weight:8,kind:'ANDROID',
  pattern:/speech|recogniz|voice|asr|dictat|microphone|stt/i}),
 Object.freeze({id:'UNSCOPED_COROUTINE',weight:7,kind:'ANDROID',
  pattern:/coroutin|async|dispatcher|suspend|\bscope\b|scopemanager|flowcollector|lifecyclejob/i}),
 Object.freeze({id:'BLOCKING_ANDROID_CALL',weight:7,kind:'ANDROID',
  pattern:/block|thread|deadlock|\banr\b|synchron|sleeper|waiter/i}),
 Object.freeze({id:'UNBOUNDED_RECURSION',weight:7,kind:'ANDROID',
  pattern:/recurs|travers|depth|cyclewalk|graphwalk/i}),
 Object.freeze({id:'POTENTIAL_PRIVATE_LOG',weight:7,kind:'ANDROID',
  pattern:/logg|logcat|timber|redact|privacy|sensitive.?log/i}),
 Object.freeze({id:'NON_CANCELLABLE_LOOP',weight:7,kind:'ANDROID',
  pattern:/poller|polling|infinite|retryloop|loop|spinwait/i}),
 Object.freeze({id:'POTENTIAL_HARDCODED_SECRET',weight:6,kind:'ANDROID',
  pattern:/secret|token|credential|api.?key|authconfig/i}),
 Object.freeze({id:'FORCED_GC',weight:6,kind:'ANDROID',
  pattern:/garbagecollect|forcedgc|gcpressure|memorypressure/i}),
 Object.freeze({id:'PRIVILEGED_UNTRUSTED_CHECKOUT',weight:8,kind:'WORKFLOW',
  pattern:/untrusted|pull.request.target|privileg|checkout|fork|pr.target/i})
]);
const PRODUCED=/^app\/src\/main\/.*\.(?:kt|java)$/i;
const WF=/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/i;
const TEST=/\/src\/(?:test|androidTest)\/.+\.(?:kt|java)$/i;
const sortRanking=(a,b)=>b.rankScore-a.rankScore||
 a.candidate.repository.localeCompare(b.candidate.repository)||
 a.candidate.pr-b.candidate.pr;
function remainingCandidates157({roster,eight,dispositions,nextcloud}={}){
 try{
  const first=remainingCandidates({roster,eight,dispositions});
  if(!nextcloud||nextcloud.schema!=='c2-ranked-owner-source-triage-disposition/v1'||
   nextcloud.decision!=='INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE'||
   nextcloud.candidate?.repository!=='nextcloud/talk-android'||
   nextcloud.candidate?.pr!==6940||
   nextcloud.candidate?.baseSha!=='48880fb92e49a3cd3fa345e6e10bd21f80cc5b1a'||
   nextcloud.candidate?.headSha!=='45b1a9c6aa24def1ee2e6ae3e2aeb01ff2626772'||
   nextcloud.candidate?.createdAt!=='2026-10-22T14:44:23Z'||
   nextcloud.release?.ownerGithubActorId!==322222186||
   nextcloud.release?.independentGitBlobAttestor!=='success'||
   nextcloud.security?.truthSealed!==false||
   nextcloud.counts?.remainingSourceUninspected!==157||
   nextcloud.counts?.newGoldLabels!==0||
   nextcloud.promotableToGold!==false)blocked();
  const excluded=first.find(c=>id(c)==='nextcloud/talk-android#6940');
  if(!excluded||excluded.baseSha!==nextcloud.candidate.baseSha||
   excluded.headSha!==nextcloud.candidate.headSha)blocked();
  const rest=first.filter(c=>id(c)!=='nextcloud/talk-android#6940');
  if(rest.length!==157)blocked();
  return rest;
 }catch{blocked();}
}
function rankMechanismObservation(observation,candidate){
 try{
  const legacy=rankObservation(observation,candidate);
  const minimal={
   candidate:{...legacy.candidate},metadataStatus:legacy.metadataStatus,
   eligibility:legacy.eligibility,filesChanged:legacy.filesChanged??null,
   changedTestPresent:legacy.changedTestPresent,
   originalTestsVerified:false,
   scoringVersion:SCORING_VERSION,exactRulePathLineConfirmed:false,
   ruleConfirmed:false,originalFixBenignExecuted:false,
   sourceReadAuthorized:false,detectorPredictionsRead:false,
   baselinePredictionsRead:false,truthSealed:false,newGoldLabels:0,
   originalOracleExecuted:false,sourceOracleAuthenticated:false,
   causalIndependenceCertified:false
  };
  if(legacy.rankScore===null)
   return Object.freeze({...minimal,mechanismScore:null,rankScore:null,
    possibleRuleIds:[],testBonus:0,sourcePathHints:[]});
  const files=observation.files.filter(f=>!['removed','renamed','copied'].includes(f.status));
  const source=files.filter(f=>PRODUCED.test(f.filename));
  const workflows=files.filter(f=>WF.test(f.filename));
  const tests=files.filter(f=>TEST.test(f.filename));
  const hypotheses=[];
  // Only the filename string is inspected here. The patterns are not
  // detection patterns; a matching filename does not imply defective code.
  for(const f of [...source,...workflows]){
   const kind=WF.test(f.filename)?'WORKFLOW':'ANDROID';
   for(const rule of FAMILIES){
    if(rule.kind!==kind)continue;
    if(rule.pattern.test(f.filename))
     hypotheses.push({ruleId:rule.id,file:f.filename,weight:rule.weight});
   }
  }
  const unique=[...new Set(hypotheses.map(h=>h.ruleId))];
  if(unique.some(id=>!ruleCatalog().includes(id)))blocked();
  const maxWeight=hypotheses.length?Math.max(...hypotheses.map(h=>h.weight)):0;
  const mechanismScore=maxWeight?Math.min(10,maxWeight+Math.min(2,unique.length-1)):0;
  const testBonus=mechanismScore
   ?tests.some(f=>f.status==='modified')?2:tests.some(f=>f.status==='added')?1:0:0;
  const smallBonus=mechanismScore&&observation.files.length<=4?1:0;
  const bulkPenalty=observation.files.length>100?6:observation.files.length>40?4:0;
  const rankScore=mechanismScore?Math.max(0,mechanismScore+testBonus+smallBonus-bulkPenalty):0;
  // Preserve source-free eligibility but restrict possibleRuleIds to actual
  // filename-evidenced hypotheses rather than all seven generic Core rules.
  const eligibility=legacy.eligibility==='METADATA_DEPENDENCY_ONLY'?
   'METADATA_DEPENDENCY_ONLY':mechanismScore?
   'EXPLICIT_FILENAME_MECHANISM_HINT_UNVERIFIED':source.length?
   'ANDROID_PATH_ONLY_NO_MECHANISM_HINT':workflows.length?
   'WORKFLOW_PATH_ONLY_NO_MECHANISM_HINT':'OUTSIDE_FROZEN_CORE_SOURCE_PATH';
  return Object.freeze({...minimal,eligibility,
   filesChanged:observation.files.length,productionSourceFiles:source.length,
   workflowFiles:workflows.length,changedTestFiles:tests.length,
   mechanismScore,testBonus,smallChangeBonus:smallBonus,bulkPenalty,
   rankScore,possibleRuleIds:unique,sourcePathHints:hypotheses,
   limitation:'Filename-only hint, not an actual Core matching line, original bug, genuine test or positive label.'});
 }catch{blocked();}
}
function rankMechanismPool({roster,eight,dispositions,nextcloud,observations}={}){
 try{
  const remaining=remainingCandidates157({roster,eight,dispositions,nextcloud});
  if(!Array.isArray(observations)||observations.length!==157)blocked();
  const map=new Map(remaining.map(c=>[id(c),c]));
  const seen=new Set(),ranked=[];
  for(const o of observations){
   if(!o||typeof o.repository!=='string'||!Number.isSafeInteger(o.pr))blocked();
   const key=id(o);
   if(seen.has(key)||!map.has(key))blocked();
   seen.add(key);
   ranked.push(rankMechanismObservation(o,map.get(key)));
  }
  const comparable=ranked.filter(x=>x.rankScore!==null);
  const hinted=comparable.filter(x=>x.mechanismScore>0);
  const counts={};
  for(const x of ranked)counts[x.eligibility]=(counts[x.eligibility]||0)+1;
  const shortlist=[...hinted].sort(sortRanking).slice(0,12);
  return Object.freeze({
   schema:'c2-source-free-157-mechanism-first-ranked/v1',
   scoringVersion:SCORING_VERSION,status:'FILENAME_HINTS_ONLY_NO_RULE_MATCH',
   originalProspectivePool:169,sourcePreviouslyExposed:12,remainingUntouched:157,
   candidatesExamined:157,ranked:comparable.length,unavailable:157-comparable.length,
   mechanismHinted:hinted.length,countsByDisposition:counts,shortlist,
   observations:ranked,sourceReadAuthorized:false,releasedSource:false,
   candidatePredictionsRead:false,baselinePredictionsRead:false,
   originalOracleExecuted:false,truthSealed:false,newGoldLabels:0,
   previouslyDocumentedTruth:9,nominalAdditionalNeeded:111,
   tripleSPlusCertified:false,
   limitation:'Metadata filename semantics are weak hints only; exact ruleId/path/line and real original, fix, benign executions require separate owner release, original oracle and independent truth sealing.'
  });
 }catch{blocked();}
}
module.exports={remainingCandidates157,rankMechanismObservation,rankMechanismPool,SCORING_VERSION};

'use strict';
/*
 * C2 prospective candidate ranking, immutable metadata and path names ONLY.
 * No PR title, body, patch, diff, source content or predictions are inputs.
 * Every possible rule is an UNSCORED HYPOTHESIS, not a matched rule.
 */
const {FROZEN_RULES,FROZEN_CORE_BLOBS}=require('./c2-frozen-path-rule-prefilter.cjs');
const blocked=()=>{throw Error('C2_158_RANKING_BLOCKED');};
const HEX=/^[0-9a-f]{40}$/;
const SRC=/^app\/src\/main\/.*\.(kt|java)$/i;
const TEST=/\/(?:src\/(?:test|androidTest)\/).*?(?:\.kt|\.java)$/i;
const WORKFLOW=/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/;
const FILE=['filename','status','sha','additions','deletions','changes'];
const FIELDS=['repository','pr','baseSha','headSha','createdAt','status','files'];
const pathValid=x=>typeof x==='string'&&x.length<=250&&
 /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(x)&&
 x.split('/').every(s=>s!=='.'&&s!=='..'&&!s.includes('..'));
const exact=(x,names)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===names.length&&names.every(k=>Object.hasOwn(x,k));
const id=x=>x.repository.toLowerCase()+'#'+x.pr;
const key=x=>JSON.stringify([x.repository,x.pr,x.baseSha,x.headSha,x.createdAt]);
const sorted=(a,b)=>b.rankScore-a.rankScore||
 a.candidate.repository.localeCompare(b.candidate.repository)||
 a.candidate.pr-b.candidate.pr;
function ruleCatalog(){
 if(FROZEN_CORE_BLOBS.core!=='db29f94be1e0afb791a241d26f449695df0eafd0'||FROZEN_RULES.length!==17)
  blocked();
 return [...FROZEN_RULES];
}
function remainingCandidates({roster,eight,dispositions}={}){
 ruleCatalog();
 if(!roster||roster.schema!=='c2-bulk-source-candidate-manifest/v1'||
  roster.cutoff!=='2026-10-20T19:30:54Z'||roster.candidates?.length!==169||
  !eight||eight.schema!=='c2-source-disclosure-quarantine/v1'||
  eight.disclosures?.length!==8||eight.poolSize!==169||
  !Array.isArray(dispositions)||dispositions.length!==3||
  dispositions[0]?.original?.repository!=='LawnchairLauncher/lawnchair'||
  dispositions[0]?.original?.pr!==7428||
  dispositions[1]?.candidate?.repository!=='bitwarden/android'||
  dispositions[1]?.candidate?.pr!==7499||
  dispositions[2]?.candidate?.repository!=='home-assistant/android'||
  dispositions[2]?.candidate?.pr!==7681||
  dispositions.some(d=>(d.cohort?.addedGoldLabels??d.scoring?.addedGoldLabels)!==0))
  blocked();
 const prior=[...eight.disclosures,dispositions[0].original,
  dispositions[1].candidate,dispositions[2].candidate];
 const excluded=new Set(prior.map(id));
 if(excluded.size!==11)blocked();
 const rosterMap=new Map();
 for(const c of roster.candidates){
  if(!c||typeof c.repository!=='string'||!Number.isSafeInteger(c.pr)||
   c.pr<=0||!HEX.test(c.baseSha)||!HEX.test(c.headSha)||
   c.baseSha===c.headSha||typeof c.createdAt!=='string'||
   c.source!=='PROSPECTIVE_GITHUB'||c.disclosure!=='METADATA_ONLY'||
   !Number.isFinite(Date.parse(c.createdAt))||
   Date.parse(c.createdAt)<=Date.parse(roster.cutoff))blocked();
  const k=id(c);if(rosterMap.has(k))blocked();rosterMap.set(k,c);
 }
 for(const c of prior){const original=rosterMap.get(id(c));if(!original||
  ('baseSha' in c&&original.baseSha!==c.baseSha)||
  ('headSha' in c&&original.headSha!==c.headSha))blocked();}
 const remaining=roster.candidates.filter(c=>!excluded.has(id(c)));
 if(remaining.length!==158)blocked();
 return remaining.sort((a,b)=>id(a).localeCompare(id(b),'en'));
}
const dependencyFile=x=>/(?:^|\/)(?:gradle\.lockfile|libs\.versions\.toml|gradle-wrapper\.properties|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Gemfile\.lock|Podfile\.lock|Cargo\.lock|.*\.lock|renovate\.json|dependabot\.yml|gradle\.properties|versions\.properties|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?)$/i.test(x);
function rankObservation(obs,c){
 ruleCatalog();
 if(!exact(obs,FIELDS)||!c||obs.repository!==c.repository||obs.pr!==c.pr||
  !Number.isSafeInteger(obs.pr)||obs.pr<1||
  obs.baseSha!==c.baseSha||obs.headSha!==c.headSha||
  obs.createdAt!==c.createdAt||!['MATCHED','DRIFT','API_ERROR','INCOMPLETE'].includes(obs.status)||
  !Array.isArray(obs.files)||obs.files.length>300)blocked();
 const candidate={repository:c.repository,pr:c.pr,baseSha:c.baseSha,headSha:c.headSha};
 if(obs.status!=='MATCHED'){
  if(obs.files.length!==0)blocked();
  return Object.freeze({candidate,metadataStatus:obs.status,
   eligibility:'NOT_RANKED_'+({DRIFT:'GIT_IDENTITY_DRIFT',API_ERROR:'API_UNAVAILABLE',INCOMPLETE:'TRUNCATED_FILES'}[obs.status]),
   rankScore:null,changedTestPresent:false,originalTestsVerified:false,
   possibleRuleIds:[],newGoldLabels:0,oracleExecuted:false,detectorPredictionsRead:false,
   exactRulePathLineConfirmed:false});
 }
 if(obs.files.length===0)blocked();
 const seen=new Set();
 for(const f of obs.files){
  if(!exact(f,FILE)||!pathValid(f.filename)||seen.has(f.filename)||
   !HEX.test(f.sha)||!['added','modified','removed','renamed','copied','changed'].includes(f.status)||
   ![f.additions,f.deletions,f.changes].every(Number.isSafeInteger)||
   f.additions<0||f.deletions<0||f.changes<0||
   f.changes!==f.additions+f.deletions)blocked();
  seen.add(f.filename);
 }
 const live=obs.files.filter(f=>!['removed','renamed','copied'].includes(f.status));
 const sources=live.filter(f=>SRC.test(f.filename));
 const workflows=live.filter(f=>WORKFLOW.test(f.filename));
 const tests=live.filter(f=>TEST.test(f.filename));
 const onlyDeps=obs.files.every(f=>dependencyFile(f.filename));
 let eligibility,score=0,possibleRuleIds=[];
 if(onlyDeps){eligibility='METADATA_DEPENDENCY_ONLY';}
 else if(sources.length){
  eligibility='POSSIBLE_GENERIC_RULE_FAMILY_UNVERIFIED';
  possibleRuleIds=[
   'UNSCOPED_COROUTINE','BLOCKING_ANDROID_CALL','FORCED_GC',
   'NON_CANCELLABLE_LOOP','POTENTIAL_PRIVATE_LOG','POTENTIAL_HARDCODED_SECRET',
   'UNBOUNDED_RECURSION'
  ];
  const names=sources.map(f=>f.filename).join(' ').toLowerCase();
  const voice=/speech|voice|recogniz|asr|dictat|microphone|stt/.test(names);
  const async=/service|worker|coroutine|lifecycle|background|fragment|activity|viewmodel|thread|executor/.test(names);
  const logging=/logging|logcat|logger|timber/.test(names);
  if(voice)possibleRuleIds.push('SPEECH_REENTRANT_RETRY');
  score=2+Math.min(3,sources.length)+(voice?4:async?2:logging?1:0);
 }else if(workflows.length){
  eligibility='WORKFLOW_SECURITY_RULE_UNVERIFIED';
  possibleRuleIds=['PRIVILEGED_UNTRUSTED_CHECKOUT','POTENTIAL_HARDCODED_SECRET'];
  score=2;
 }else eligibility='OUTSIDE_FROZEN_CORE_SOURCE_PATH';
 possibleRuleIds=possibleRuleIds.filter(x=>FROZEN_RULES.includes(x));
 const changedTestPresent=tests.length>0;
 if(score>0){if(changedTestPresent)score+=5;
  if(obs.files.length<=4)score+=2;
  if(obs.files.length>40)score-=4;
  if(obs.files.length>100)score-=4;
  score=Math.max(0,score);}
 return Object.freeze({candidate,metadataStatus:'MATCHED',eligibility,
  rankScore:score,productionSourceFiles:sources.length,workflowFiles:workflows.length,
  changedTestPresent,changedTestFiles:tests.length,originalTestsVerified:false,
  filesChanged:obs.files.length,possibleRuleIds,exactRulePathLineConfirmed:false,
  causalIndependenceCertified:false,originalFixBenignExecuted:false,
  oracleExecuted:false,newGoldLabels:0,detectorPredictionsRead:false,
  baselinePredictionsRead:false});
}
function rankAll({roster,eight,dispositions,observations}={}){
 const remaining=remainingCandidates({roster,eight,dispositions});
 if(!Array.isArray(observations)||observations.length!==remaining.length)blocked();
 const map=new Map(remaining.map(c=>[id(c),c])),seen=new Set(),ranks=[];
 for(const o of observations){
  if(!o||typeof o.repository!=='string'||!Number.isSafeInteger(o.pr))blocked();
  const k=id(o);if(seen.has(k)||!map.has(k))blocked();
  seen.add(k);ranks.push(rankObservation(o,map.get(k)));
 }
 const valid=ranks.filter(x=>x.rankScore!==null);
 const rankable=valid.filter(x=>x.rankScore>0);
 const categories={};
 for(const x of ranks)categories[x.eligibility]=(categories[x.eligibility]||0)+1;
 const shortlist=[...rankable].sort(sorted).slice(0,12);
 return Object.freeze({
  schema:'c2-source-free-158-rule-family-ranked/v1',status:'METADATA_ONLY_UNSCORED',
  originalProspectivePool:169,sourcePreviouslyExposed:11,remainingUntouched:158,
  candidatesExamined:158,ranked:valid.length,plausiblyApplicable:rankable.length,
  unavailable:ranks.length-valid.length,countsByDisposition:categories,shortlist,
  observations:ranks,sourceReadAuthorized:false,releasedSource:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  originalOracleExecuted:false,truthSealed:false,newGoldLabels:0,
  previouslyDocumentedTruth:9,nominalAdditionalNeeded:111,
  tripleSPlusCertified:false,limitation:'Path and changed-test metadata never establish executable upstream JUnit, root cause, correct fix, causal independence, exact detector rule or GOLD.'
 });
}
module.exports={remainingCandidates,rankObservation,rankAll,ruleCatalog};

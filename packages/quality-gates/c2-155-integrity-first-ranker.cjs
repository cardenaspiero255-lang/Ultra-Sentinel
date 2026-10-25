'use strict';
// Filename/count-only sorting of the frozen holdout. NEVER read source, PR
// descriptions/patches, detector outputs or claim truth from a ranking.
const {remainingCandidates157,rankMechanismObservation}=require('./c2-157-mechanism-first-ranker.cjs');
const scoreVersion='c2-integrity-churn-v3';
const denied=()=>{throw Error('C2_155_INTEGRITY_RANK_BLOCKED');};
const key=c=>c.repository.toLowerCase()+'#'+c.pr;
const target={
 'nextcloud/talk-android#6946':{baseSha:'591f033cd87f44d90c430d7fa477285eb22186e0',headSha:'043f67d25278f6c55713f02ed8a5455e7f4bdebb',createdAt:'2026-10-23T15:46:12Z'},
 'nextcloud/talk-android#6945':{baseSha:'591f033cd87f44d90c430d7fa477285eb22186e0',headSha:'705887c6795b2f7746bef47e08a5c8c2aba9c3ff',createdAt:'2026-10-23T13:08:43Z'}
};
function remainingCandidates155({roster,eight,dispositions,nextcloud,excluded}={}){
 try{
  const first=remainingCandidates157({roster,eight,dispositions,nextcloud});
  if(!Array.isArray(excluded)||excluded.length!==2)denied();
  const [a,b]=excluded;
  if(a.schema!=='c2-owner-released-frozen-rule-disposition/v1'||
   a.decision!=='INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE'||
   a.candidate?.repository!=='nextcloud/talk-android'||a.candidate?.pr!==6946||
   a.candidate?.baseSha!==target['nextcloud/talk-android#6946'].baseSha||
   a.candidate?.headSha!==target['nextcloud/talk-android#6946'].headSha||
   a.candidate?.createdAt!==target['nextcloud/talk-android#6946'].createdAt||
   a.authorization?.independentGitHeadTreeSixteenBlobs!=='success'||
   a.evaluation?.goldNew!==0||a.evaluation?.truthSealed!==false||
   a.corpus?.sourceUntouchedRemaining!==156||a.originalTests?.independentOracleAttested!==false||
   b.schema!=='c2-owner-source-disposition/v1'||
   b.candidate?.repository!=='nextcloud/talk-android'||b.candidate?.pr!==6945||
   b.candidate?.baseSha!==target['nextcloud/talk-android#6945'].baseSha||
   b.candidate?.headSha!==target['nextcloud/talk-android#6945'].headSha||
   b.ownerRun!==40146912385||b.independentAttestation!==true||
   b.ownerCheck!=='SUCCESS_4_OF_4'||b.remainingUnopened!==155||
   b.newGoldLabels!==0||b.truthSealed!==false||
   b.disposition!=='INCONCLUSIVE_OUT_OF_FROZEN_RULE_SCOPE')denied();
  const seen=new Set(first.map(key));
  if(!seen.has('nextcloud/talk-android#6946')||!seen.has('nextcloud/talk-android#6945'))denied();
  for(const x of first){
   const t=target[key(x)];
   if(t&&(x.baseSha!==t.baseSha||x.headSha!==t.headSha||x.createdAt!==t.createdAt))denied();
  }
  const next=first.filter(x=>!target[key(x)]);
  if(next.length!==155||new Set(next.map(key)).size!==155)denied();
  return next;
 }catch{denied();}
}
function rankSourceFreeV3(observation,candidate){
 try{
  const prev=rankMechanismObservation(observation,candidate);
  const minimal={...prev,scoreVersion,sourceReadAuthorized:false,ruleConfirmed:false,
   exactRulePathLineConfirmed:false,originalOracleExecuted:false,originalFixBenignExecuted:false,
   detectorPredictionsRead:false,baselinePredictionsRead:false,truthSealed:false,newGoldLabels:0};
  if(prev.rankScore===null)return Object.freeze({...minimal,sourcePathHints:[],possibleRuleIds:[],
   verifiedSourceAdditions:false,rankScore:null,eligibility:prev.eligibility});
  const files=observation.files;
  const added=new Map(files.map(f=>[f.filename,f.additions]));
  const hinted=prev.sourcePathHints.filter(h=>(added.get(h.file)||0)>=2);
  const ids=[...new Set(hinted.map(h=>h.ruleId))];
  const max=hinted.length?Math.max(...hinted.map(h=>h.weight)):0;
  const mechanism=max?Math.min(10,max+Math.min(2,ids.length-1)):0;
  const tests=files.filter(f=>/\/src\/(?:test|androidTest)\/.+\.(?:kt|java)$/i.test(f.filename));
  const testBonus=mechanism?(tests.some(f=>f.status==='modified')?2:tests.some(f=>f.status==='added')?1:0):0;
  const small=mechanism&&files.length<=4?1:0;
  const penalty=files.length>100?8:files.length>40?4:0;
  const isBulk=files.length>=100;
  const score=isBulk?0:mechanism?Math.max(0,mechanism+testBonus+small-penalty):0;
  const eligibility=isBulk?'BULK_CHURN_PRE_READ_CAUTION':
   prev.eligibility==='METADATA_DEPENDENCY_ONLY'?'METADATA_DEPENDENCY_ONLY':
   mechanism?'ADDED_LINES_FILENAME_MECHANISM_HINT_UNVERIFIED':
   prev.productionSourceFiles>0?'ANDROID_PATH_NO_ADDED_MECHANISM_HINT':
   prev.workflowFiles>0?'WORKFLOW_PATH_NO_ADDED_MECHANISM_HINT':'OUTSIDE_FROZEN_CORE_SOURCE_PATH';
  return Object.freeze({...minimal,rankScore:score,eligibility,
   possibleRuleIds:isBulk?[]:ids,sourcePathHints:isBulk?[]:hinted,
   mechanismScore:isBulk?0:mechanism,testBonus:isBulk?0:testBonus,
   filesChanged:files.length,verifiedSourceAdditions:false,
   addedLineMetadataCount:files.reduce((sum,f)=>sum+f.additions,0),
   bulkChurnHold:isBulk,originalTestsVerified:false,
   limitation:'Changed file names and added-line COUNTS are hints only. Bulk 100+ files requires separate manual pre-read gate; no source opened and no finding or GOLD.'});
 }catch{denied();}
}
function rankPool155({roster,eight,dispositions,nextcloud,excluded,observations}={}){
 try{
  const rest=remainingCandidates155({roster,eight,dispositions,nextcloud,excluded});
  if(!Array.isArray(observations)||observations.length!==155)denied();
  const map=new Map(rest.map(x=>[key(x),x])),seen=new Set(),reports=[];
  for(const o of observations){
   if(!o||typeof o.repository!=='string'||!Number.isSafeInteger(o.pr))denied();
   const k=key(o);if(!map.has(k)||seen.has(k))denied();
   seen.add(k);reports.push(rankSourceFreeV3(o,map.get(k)));
  }
  const rankable=reports.filter(x=>x.rankScore!==null);
  const hints=rankable.filter(x=>x.rankScore>0);
  const counts={};
  for(const x of reports)counts[x.eligibility]=(counts[x.eligibility]||0)+1;
  return Object.freeze({
   schema:'c2-source-free-155-integrity-first-ranking/v1',scoreVersion,
   status:'METADATA_ONLY_NEVER_RULE_MATCHED',originalProspectivePool:169,
   sourcePreviouslyExposed:14,remainingUntouched:155,candidatesExamined:155,
   ranked:rankable.length,unavailable:155-rankable.length,mechanismHinted:hints.length,
   countsByDisposition:counts,
   shortlist:[...hints].sort((a,b)=>b.rankScore-a.rankScore||
    a.candidate.repository.localeCompare(b.candidate.repository)||
    a.candidate.pr-b.candidate.pr).slice(0,12),
   observations:reports,sourceReadAuthorized:false,
   candidatePredictionsRead:false,detectorPredictionsRead:false,baselinePredictionsRead:false,
   originalOracleExecuted:false,truthSealed:false,newGoldLabels:0,
   tripleSPlusCertified:false,limitation:'Metadata paths, line-change counts and test presence do not establish source predicate or oracle. 100+ file changes are held for manual scope analysis before any protected source grant.'
  });
 }catch{denied();}
}
module.exports={remainingCandidates155,rankSourceFreeV3,rankPool155,scoreVersion};

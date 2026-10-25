'use strict';
const request=require('../../docs/quality/C2-NEXTCLOUD6945-SOURCE-REQUEST-20261024.json');
const prior=require('../../docs/quality/C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024.json');
function deny(){throw Error('C2_6945_METADATA_BLOCKED');}
function authorizeMetadata({request:x,pr,files,owner}={}){
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!equal(x,request)||x.candidate.pr!==6945||x.previouslyExposed!==13||
 x.sourceRankingRunId!==40143252243||x.rankScore!==8||
 x.exactRuleId!==null||x.newGoldLabels!==0||
 prior.corpus.sourceUntouchedRemaining!==156||
 !owner||owner.actorId!==322222186||owner.repositoryId!==1418338512||
 owner.ref!=='refs/heads/main'||owner.eventName!=='push'||
 !/^[a-f0-9]{40}$/.test(owner.mainSha)||
 !pr||pr.number!==6945||pr.created_at!==x.candidate.createdAt||
 pr.head?.sha!==x.candidate.headSha||pr.base?.sha!==x.candidate.baseSha||
 pr.base?.repo?.full_name!=='nextcloud/talk-android'||
 !Array.isArray(files)||files.length!==1||
 !equal(files,request.pathScope))deny();
 return {candidate:x.candidate,sourceReadPermitted:true,changedFiles:1,
 exactRuleMatched:false,originalFixBenignExecuted:false,
 detectorPredictionsRead:false,truthSealed:false,newGoldLabels:0};
}
module.exports={authorizeMetadata};

'use strict';
const {reviewGameHubSnapshot}=require('./gamehub-readonly.cjs');
const SHA=/^[a-f0-9]{40}$/;
const REPO='cardenaspiero255-lang/gamehub-ultra';
function reviewGithubPrEvidence({repository,number,headSha,files,hasMorePages=false}={}){
 if(repository!==REPO||!Number.isSafeInteger(number)||number<1||!SHA.test(headSha||'')||
  !Array.isArray(files)||files.length>300||hasMorePages!==false)throw Error('INCOMPLETE_GITHUB_EVIDENCE');
 const seen=new Set();
 for(const f of files){
  if(!f||typeof f.filename!=='string'||!f.filename||seen.has(f.filename)||
   !Number.isSafeInteger(f.changes)||f.changes<0||
   !['added','modified','removed','renamed'].includes(f.status))
   throw Error('INVALID_GITHUB_FILE');
  seen.add(f.filename);
 }
 const result=reviewGameHubSnapshot({repo:repository,headSha,files});
 return Object.freeze({pr:number,source:'github-api-unattested',...result,
  authenticated:false,completeDiff:false,mergeAllowed:false});
}
module.exports={reviewGithubPrEvidence};

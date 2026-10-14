'use strict';
// Reuse the EXISTING provider observer's bounded selector (#38), rather than
// introducing a second discovery engine for the shadow/read-only workflows.
const {selectOpenGameHubPr}=require('../../scripts/gamehub-provider-observer.cjs');
async function resolveGameHubTarget(raw,{token,select=selectOpenGameHubPr}={}){
 if(raw===undefined||raw===null||raw===''||raw==='auto'){
  const selected=await select({token});
  if(selected===null)return null;
  if(!Number.isSafeInteger(selected)||selected<1||selected>999999999)
   throw Error('UNTRUSTED_SELECTED_PR');
  return selected;
 }
 if(typeof raw!=='string'||!/^[1-9][0-9]{0,8}$/.test(raw))
  throw Error('INVALID_PR_NUMBER');
 return Number(raw);
}
function requireOpenSource(review){
 if(!review||review.state!=='open'||review.authenticated!==true||
    review.headStable!==true||review.completeDiff!==true||
    review.mergeAllowed!==false)
  throw Error('CLOSED_OR_UNTRUSTED_SOURCE_PR');
 return review;
}
module.exports={resolveGameHubTarget,requireOpenSource};

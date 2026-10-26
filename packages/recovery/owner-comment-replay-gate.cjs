'use strict';
/* GitHub is source of truth for a single issue_comment's immutable identity.
 * A duplicate nonce anywhere in the owner-control issue fails closed.
 * Concurrency for this workflow is globally serialized by GitHub Actions.
 */
const BASE='https://api.github.com/repos/cardenaspiero255-lang/Ultra-Sentinel/issues/50/comments';
const MARKER='ULTRA_SENTINEL_OWNER_APPROVAL_V1';
function deny(){throw Error('OWNER_NONCE_REPLAY_OR_UNVERIFIED');}
function nonce(body){
 if(typeof body!=='string')return null;
 const p=body.split('|');
 return p.length===6&&p[0]===MARKER&&/^[A-Za-z0-9_-]{20,96}$/.test(p[4]||'')?p[4]:null;
}
async function verifyUniqueOwnerComment({event,token,fetchImpl=fetch}={}){
 try{
  if(!event||event.action!=='created'||event.issue?.number!==50||
   event.issue?.pull_request!=null||event.repository?.id!==1418338512||
   event.comment?.user?.id!==322222186||event.sender?.id!==322222186||
   !Number.isSafeInteger(event.comment?.id)||
   event.comment.id<1||typeof token!=='string'||token.length<16||
   typeof fetchImpl!=='function'||!nonce(event.comment.body))deny();
  const target=nonce(event.comment.body);
  let count=0,found=false,complete=false;
  for(let page=1;page<=20;page++){
   const url=BASE+'?per_page=100&page='+page;
   const res=await fetchImpl(url,{method:'GET',redirect:'error',
    headers:{Authorization:'Bearer '+token,
     Accept:'application/vnd.github+json',
     'X-GitHub-Api-Version':'2022-11-28'},
    signal:AbortSignal.timeout(15000)});
   if(!res?.ok)deny();
   const rows=await res.json();
   if(!Array.isArray(rows)||rows.length>100)deny();
   for(const c of rows){
    if(nonce(c?.body)!==target)continue;
    count++;
    if(c.id===event.comment.id){
     if(c.body!==event.comment.body||c.user?.id!==322222186||
      c.user?.login!=='cardenaspiero255-lang'||
      c.created_at!==event.comment.created_at||
      c.updated_at!==event.comment.updated_at||
      c.updated_at!==c.created_at)deny();
     found=true;
    }
   }
   if(rows.length<100){complete=true;break;}
  }
  if(!complete||!found||count!==1)deny();
  return Object.freeze({status:'OWNER_COMMENT_NONCE_UNIQUE',
   commentId:event.comment.id,nonce:target,
   source:'github-authenticated-issue-comments',remoteWrites:false});
 }catch{deny();}
}
module.exports={verifyUniqueOwnerComment};

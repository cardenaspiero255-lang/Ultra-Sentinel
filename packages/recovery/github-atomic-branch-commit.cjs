'use strict';
// Trusted callers validate the signed plan, nonce, and draft PR independently.
// createCommitOnBranch performs the branch HEAD comparison at publication.
const SHA=/^[a-f0-9]{40}$/;
const MUTATION=`mutation OwnerCommit($input: CreateCommitOnBranchInput!) {
 createCommitOnBranch(input: $input) { commit { oid } }
}`;

async function publishAtomicBranchCommit({repository,branch,expectedHeadSha,files,
 message,token,fetchImpl=globalThis.fetch,beforePublish}={}){
 if(repository!=='cardenaspiero255-lang/JARVIS'||
  typeof branch!=='string'||!/^fix\/ultra-sentinel-[a-z0-9][a-z0-9-]{3,69}$/.test(branch)||
  !SHA.test(expectedHeadSha||'')||!Array.isArray(files)||files.length!==2||
  files.some(f=>!f||typeof f.path!=='string'||typeof f.contents!=='string')||
  typeof message!=='string'||typeof token!=='string'||typeof fetchImpl!=='function'||
  typeof beforePublish!=='function')throw Error('INVALID_ATOMIC_BRANCH_COMMIT');
 const variables={input:{branch:{repositoryNameWithOwner:repository,branchName:branch},
  expectedHeadOid:expectedHeadSha,message:{headline:message},
  fileChanges:{additions:files.map(f=>({path:f.path,contents:f.contents}))}}};
 beforePublish();
 let response;
 try{response=await fetchImpl('https://api.github.com/graphql',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'Content-Type':'application/json','User-Agent':'Ultra-Sentinel-Owner-Atomic-Commit'},
  body:JSON.stringify({query:MUTATION,variables})});
 }catch{throw Error('ATOMIC_BRANCH_PUBLICATION_UNCERTAIN');}
 if(!response||response.status!==200)throw Error('ATOMIC_BRANCH_PUBLICATION_UNCERTAIN');
 let result;try{result=await response.json();}catch{throw Error('ATOMIC_BRANCH_PUBLICATION_UNCERTAIN');}
 const oid=result?.data?.createCommitOnBranch?.commit?.oid;
 if(!result||result.errors||!SHA.test(oid||'')||oid===expectedHeadSha)
  throw Error('ATOMIC_BRANCH_PUBLICATION_UNCERTAIN');
 return oid;
}
module.exports={publishAtomicBranchCommit};

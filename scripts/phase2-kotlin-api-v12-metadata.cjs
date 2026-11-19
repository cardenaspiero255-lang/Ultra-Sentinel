#!/usr/bin/env node
'use strict';
// V12 metadata-only new original Kotlin reservation. Existing v11 GitHub
// metadata fetcher, structural path validator, and v8 planner are reused.
// No original source bodies, JVM target code, Hunter, or oracle executed here.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {freeze}=require('./phase2-block26-v12-prehunter.cjs');
const {repositoryMetadata,verifyFullOriginalTree}=require('./phase2-kotlin-api-v11-metadata.cjs');
const {planMetadataCandidates}=require('./phase2-kotlin-api-v8-candidate-pool.cjs');
const ROOT=path.resolve(__dirname,'..'),SHA=/^[a-f0-9]{40}$/;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('V12_METADATA_'+m);};
async function api(url,token){
 if(!url.startsWith('https://api.github.com/'))fail('API_URL');
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token,
  Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Ultra-Sentinel-v12-prehunter-oracle-first'},
  signal:AbortSignal.timeout(25000)});
 if(!r.ok)fail('METADATA_HTTP_'+r.status);
 return r.json();
}
async function main(){
 if(process.argv.length!==3||process.env.GITHUB_EVENT_NAME!=='pull_request'||
  !process.env.GH_TOKEN)fail('UNAUTHORIZED');
 const {p,ex}=freeze(),selector=p.metadataSelector,out=process.argv[2],token=process.env.GH_TOKEN;
 const moduleBlob=crypto.createHash('sha1').update(Buffer.from('blob '+fs.readFileSync(__filename).length+'\0')).update(fs.readFileSync(__filename)).digest('hex');
 if(selector.wrapperPath!=='scripts/phase2-kotlin-api-v12-metadata.cjs'||
  selector.wrapperBlobSha!==moduleBlob)fail('WRAPPER_NOT_PRECOMMITTED');
 if(selector.frozenQuery!=='math language:Kotlin fork:false archived:false stars:2..50'||
  selector.maxRepositoriesRanked!==300||selector.maxFreshCandidates!==12||
  selector.maxOriginalKotlinFilesPerRepo!==12||
  selector.maxOriginalBytesPerRepo!==196608||
  selector.avoidHistoricalSources!==true||selector.preHunterStaticApiScanOnly!==true)
  fail('SELECTOR_DRIFT');
 const limits={query:selector.frozenQuery,searchPages:3,searchPageSize:100,
  maxEligibleSourceCandidates:selector.maxFreshCandidates,
  maxExaminedMetadataRepositories:selector.maxRepositoriesRanked,
  maxRepoSizeKb:8192};
 const repos=await repositoryMetadata({selector:limits},token);
 const selection=await planMetadataCandidates(repos,
  new Set(ex.repositories.map(x=>x.toLowerCase())),new Set(ex.blobShas),
  async candidate=>{
   if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate.full_name)||
    !/^[A-Za-z0-9_.-]+$/.test(candidate.default_branch))fail('REPO');
   const commit=await api('https://api.github.com/repos/'+candidate.full_name+
    '/commits/'+encodeURIComponent(candidate.default_branch),token);
   const commitSha=commit.sha,treeSha=commit.commit?.tree?.sha;
   if(!SHA.test(commitSha)||!SHA.test(treeSha))fail('PIN');
   const tree=await api('https://api.github.com/repos/'+candidate.full_name+
    '/git/trees/'+treeSha+'?recursive=1',token);
   if(tree.sha!==treeSha)fail('TREE_IDENTITY');
   try{verifyFullOriginalTree(tree);}
   catch(e){
    if(['V11_NONCANONICAL_ORIGINAL_KOTLIN_TREE','V11_TRUNCATED_ORIGINAL_GIT_TREE',
     'V11_INVALID_TREE_ENTRY'].includes(e.message))
     return {commitSha,treeSha,tree:null};
    throw e;
   }
   return {commitSha,treeSha,tree};
  },limits);
 if(!selection.candidates.length)fail('NO_UNEXPOSED_SOURCE_METADATA');
 const doc={schema:'ultra-sentinel-v12-prehunter-independent-oracle-metadata-pool/v1',
  engine:p.hunter,oldExclusions:p.exclusions,selector:p.metadataSelector,
  candidates:selection.candidates,audit:selection.audit,
  examinedCount:selection.examinedCount,rankedRepositoryCount:selection.rankedRepositoryCount,
  sourceBodiesRead:false,hunterExecuted:false,oracleExecuted:false,
  originalOraclePrecommitted:false,originalGroundTruthKnown:false,
  block26Closed:false,block27Allowed:false};
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 const bytes=Buffer.from(JSON.stringify(doc,null,2)+'\n');
 fs.writeFileSync(path.join(out,'metadata.json'),bytes,{flag:'wx',mode:0o600});
 console.log('V12_METADATA_SHA256='+hash(bytes));
 console.log('V12_METADATA_CANDIDATES='+doc.candidates.length);
 console.log('V12_METADATA_FILES='+doc.candidates.reduce((s,x)=>s+x.source.files.length,0));
 const b64=bytes.toString('base64');
 for(let i=0;i<b64.length;i+=3000)
  console.log('V12_METADATA_B64_PART_'+Math.floor(i/3000)+'='+b64.slice(i,i+3000));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports=Object.freeze({api});

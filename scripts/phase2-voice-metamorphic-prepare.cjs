'use strict';
/* Offline only. The surrounding isolated runner authenticates the checkout,
 * compiler, original Git HEAD and exact source blob membership. */
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {huntVoiceBoundaryVariants}=require('../packages/family-hunter/voice-boundary-metamorphic-hunter.cjs');
const {draftPinnedVoiceBoundaryRepair}=require('../packages/investigation/voice-policy-normalization-draft.cjs');
const {blobSha}=require('../packages/investigation/novel-kotlin-hypotheses.cjs');
const [root,work]=process.argv.slice(2);
if(!root||!work)throw Error('REQUIRES_SOURCE_AND_WORKDIR');
const commit='747c14b5d97750a7b2736968e2d516f02448558d';
const base='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core';
const dir=path.join(root,base);
const files=fs.readdirSync(dir,{withFileTypes:true})
 .filter(x=>x.isFile()&&x.name.endsWith('.kt')).map(x=>{
  const rel=base+'/'+x.name;
  const source=fs.readFileSync(path.join(dir,x.name),'utf8');
  const expectedBlobSha=execFileSync('git',['-C',root,'rev-parse','HEAD:'+rel],{
   encoding:'utf8',env:{PATH:process.env.PATH,HOME:root,
    GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}
  }).trim();
  return {path:rel,source,expectedBlobSha};
 });
if(files.length!==66)throw Error('UNEXPECTED_ORIGINAL_SOURCE_COUNT');
const hunt=huntVoiceBoundaryVariants({expectedCommitSha:commit,files});
if(hunt.status!=='METAMORPHIC_CASES_REQUIRE_ORIGINAL_KOTLIN_ORACLE'||
 hunt.filesScanned!==66||hunt.cases.length<6||hunt.cases.length>48||
 hunt.sourceRepositoryAuthenticated!==false||hunt.rootCauseVerified!==false||
 hunt.remoteWrites!==false||hunt.mergeAllowed!==false)
 throw Error('METAMORPHIC_HUNTER_FAILED_OR_CLAIMED_AUTHORITY');
const original=files.find(f=>f.path===hunt.policyPath);
if(!original||!files.some(f=>f.path===hunt.gatePath))
 throw Error('SOURCE_PAIR_UNRESOLVED');
const draft=draftPinnedVoiceBoundaryRepair({expectedCommitSha:commit,file:original});
if(draft.status!=='VOICE_BOUNDARY_CANDIDATE_REQUIRES_ORIGINAL_JVM_ORACLE'||
 draft.originalBlobSha!==original.expectedBlobSha||
 draft.originalJVMOracleVerified!==false||draft.remoteWrites!==false||
 draft.mergeAllowed!==false||blobSha(draft.candidateSource)!==draft.candidateBlobSha)
 throw Error('FIXER_CANDIDATE_UNTRUSTED');
const corpus=hunt.cases.map(c=>c.action+'\t'+c.separator).join('\n')+'\n';
fs.writeFileSync(path.join(work,'metamorphic-corpus.tsv'),corpus,{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(work,'LocalGgufPolicy.kt'),draft.candidateSource,{flag:'wx',mode:0o600});
console.log('hunter_source_derived_metamorphic_probes=GENERATED');
console.log('hunter_original_source_count='+hunt.filesScanned);
console.log('hunter_mutation_count='+hunt.cases.length);
console.log('fixer_unregistered_variant_candidate=GENERATED_UNVERIFIED');

'use strict';
/**
 * Advisory cross-file metamorphic Hunter. The probe vocabulary is extracted
 * from Kotlin policy source, never from a supplied failing prompt or answer.
 * This is a lexical experiment, not compiler symbol resolution or causality.
 */
const {createHash}=require('node:crypto');
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');
const SHA=/^[a-f0-9]{40}$/;
const SEPARATORS=Object.freeze([',','.',';']);
const blobSha=s=>{
 const b=Buffer.from(s,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
};
function reply(status,data={}){
 return Object.freeze({
  status,policyPath:data.policyPath??null,gatePath:data.gatePath??null,
  filesScanned:data.filesScanned??0,
  cases:Object.freeze(data.cases??[]),
  originalKotlinOracleVerified:false,sourceRepositoryAuthenticated:false,
  rootCauseVerified:false,novelDefectVerified:false,generatedGeneralFixer:false,
  ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'Lexical, source-derived metamorphic candidates only. Original Kotlin/JVM results, source authentication, independent functional oracles and owner authorization are separate.'
 });
}
function safePath(p){
 return typeof p==='string'&&p.length<350&&p.includes('/src/main/')&&p.endsWith('.kt')&&
  !p.startsWith('/')&&!p.includes('\\')&&!p.includes('//')&&
  p.split('/').every(x=>x&&x!=='.'&&x!=='..')&&
  /^[a-zA-Z0-9_./-]+$/.test(p);
}
function inspectPolicy(s){
 const method=s.indexOf('fun validReadOnlyQuestion(');
 if(method<0)return null;
 const direct=/\bval\s+direct\s*=\s*Regex\s*\(\s*"""([^"\n]{1,250})"""\s*\)/.exec(s.slice(method));
 if(!direct||!direct[1].startsWith('^(?:por\\s+favor\\s+)?'))return null;
 const alternatives=[...direct[1].matchAll(/\(\?:([a-z]+(?:\|[a-z]+){1,12})\)/g)];
 if(alternatives.length!==1)return null;
 const words=alternatives[0][1].split('|');
 return words.length>=2&&words.length<=16&&new Set(words).size===words.length?words:null;
}
function scanPolicy(options){
 try{
  const o=snapshotRecord(options,['expectedCommitSha','files']);
  const items=snapshotArray(o.files,['path','source','expectedBlobSha'],80);
  if(typeof o.expectedCommitSha!=='string'||!SHA.test(o.expectedCommitSha))return reply('BLOCKED_INPUT_CONTRACT');
  const seen=new Set();
  for(const f of items){
   if(!safePath(f.path)||seen.has(f.path)||typeof f.source!=='string'||
    f.source.length<10||f.source.includes('\0')||f.source.includes('\r')||
    !f.source.endsWith('\n')||Buffer.byteLength(f.source,'utf8')>100000||
    typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha))
    return reply('BLOCKED_INPUT_CONTRACT');
   if(blobSha(f.source)!==f.expectedBlobSha)return reply('BLOCKED_SOURCE_BLOB_MISMATCH');
   seen.add(f.path);
  }
  const policies=items.map(f=>({file:f,verbs:inspectPolicy(f.source)})).filter(p=>p.verbs);
  const gates=items.filter(f=>/\bLocalGgufPolicy\.validReadOnlyQuestion\s*\(\s*question\s*\)/.test(f.source));
  if(policies.length!==1||gates.length!==1||policies[0].file.path===gates[0].path)
   return reply('NO_CROSS_FILE_VOICE_GUARD_MATCH');
  const cases=[];
  for(const action of policies[0].verbs)for(const separator of SEPARATORS){
   cases.push(Object.freeze({
    action,separator,
    base:'Jarvis, por favor '+action+' sistema',
    variant:'Jarvis, por favor'+separator+' '+action+' sistema',
    benign:'Jarvis, ¿qué significa '+action+' sistema?'
   }));
  }
  return reply('METAMORPHIC_CASES_REQUIRE_ORIGINAL_KOTLIN_ORACLE',{
   policyPath:policies[0].file.path,gatePath:gates[0].path,
   cases,filesScanned:items.length
  });
 }catch{return reply('BLOCKED_INPUT_CONTRACT');}
}
module.exports=Object.freeze({huntVoiceBoundaryVariants:scanPolicy});

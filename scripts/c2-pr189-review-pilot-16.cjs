#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PILOT,RETRIES,adjudicatePilot}=require('../packages/quality-gates/c2-pr189-pilot-16-adjudication.cjs');
const ORIGINAL=Object.freeze([
 {run:39168947905,id:12153287671,name:'c2-kotlin-batch-detekt_detekt-1',digest:'4ea8063912d705a803f6827f8ea73358f7c3e566311fd0f539e20a7e720c842b'},
 {run:39168947905,id:12153912644,name:'c2-kotlin-batch-detekt_detekt-2',digest:'b82ddd236fef7ee1f12f4ad401c706687473be86b7e460cc3390112ec0573ecf'},
 {run:39168947905,id:12158972950,name:'c2-kotlin-batch-pinterest_ktlint-1',digest:'25e3638c8c35e426efa10a5eb604d5f3be1b4b75c0d6377a57d0d3f8ab494458'},
 {run:39168947905,id:12159218257,name:'c2-kotlin-batch-oss-review-toolkit_ort-1',digest:'291834f6c11b599878ad58e3c0c820b553c876be163deecd541b650bc88566ef'},
 {run:39168947905,id:12157870651,name:'c2-kotlin-batch-hannah-sten_texify-idea-1',digest:'aaf967db314b0043d72ad44e260c881ff7c31891e747213b358f857ea3fb9180'},
 {run:39168947905,id:12153882770,name:'c2-kotlin-batch-ankidroid_anki-android-1',digest:'ecdd7f8eb65cf516e537e2ba5a86f69ddc4cee837266a672e0a875ff5d4c9cf3'},
 {run:39168947905,id:12156264143,name:'c2-kotlin-batch-kotlin_dataframe-1',digest:'82265eb023ec0777b5ca15ab8d6ce3f8eb366b5214ed6b922966d68a3e3f7b46'},
 {run:39168947905,id:12164020426,name:'c2-kotlin-batch-square_okhttp-1',digest:'a769732019d79bc738f70a93e388f36f6f9c316eed347d674d94400535f7b9a3'},
 {run:39168947905,id:12155069420,name:'c2-kotlin-batch-gradleup_shadow-1',digest:'8759ffc58f1946962ca0adcbd8c5d99d80e5542acdee0119eb883a52003a2fa4'},
 {run:39168947905,id:12156094112,name:'c2-kotlin-batch-linreal_cascade-editor-1',digest:'0950f1c6357902ae29b5d72a0b1b5b8bfc3da5c7ba0a4f0adf90d31a5ee9f646'}
]);
const RETRY=Object.freeze([
 {run:39214460564,id:12170764299,name:'c2-retry-batch-detekt_detekt-1',digest:'3a40e7e47d9bd309683b2024691aa0beabcdaacd7fcb3b221e62e9b01e47bad3'},
 {run:39214460564,id:12176836881,name:'c2-retry-batch-pinterest_ktlint-1',digest:'3123b4e235e74a9fbc7c9ab94614ab9ab1dfc6ae2d0b790edb7874318e1e6aaa'}
]);
const h=buf=>crypto.createHash('sha256').update(buf).digest('hex');
function classifyArtifact(task,source){
 if(source==='retry')return RETRY.find(a=>task.startsWith('detekt_')?
   a.name.includes('detekt_'):a.name.includes('pinterest_'));
 if(task.startsWith('detekt_'))return ORIGINAL.find(a=>a.name==='c2-kotlin-batch-detekt_detekt-'+
   (['detekt_detekt-4738'].includes(task)?'2':'1'));
 const mapping={
  'pinterest_ktlint':'pinterest_ktlint-1',
  'oss-review-toolkit_ort':'oss-review-toolkit_ort-1',
  'Hannah-Sten_TeXiFy-IDEA':'hannah-sten_texify-idea-1',
  'ankidroid_Anki-Android':'ankidroid_anki-android-1',
  'Kotlin_dataframe':'kotlin_dataframe-1',
  'square_okhttp':'square_okhttp-1',
  'GradleUp_shadow':'gradleup_shadow-1',
  'linreal_cascade-editor':'linreal_cascade-editor-1'
 };
 const prefix=Object.keys(mapping).find(k=>task.startsWith(k+'-'));
 return ORIGINAL.find(a=>a.name==='c2-kotlin-batch-'+mapping[prefix]);
}
function regular(root,relative,max=1000000){
 const file=path.join(root,relative), resolved=path.resolve(file);
 if(!resolved.startsWith(path.resolve(root)+path.sep))throw Error('C2_PR189_PATH_ESCAPE');
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size===0||stat.size>max)throw Error('C2_PR189_NONREGULAR_EVIDENCE');
 return fs.readFileSync(file);
}
function readCandidate(root,task,source){
 const art=classifyArtifact(task,source);
 if(!art)throw Error('C2_PR189_UNPINNED_ARTIFACT');
 const dirname=path.join(root,art.name);
 const receipt=JSON.parse(regular(dirname,task+'.json',65536).toString('utf8'));
 const evidenceFile='evidence/'+task+'/original-transitions.json';
 let proof=null,proofDigest=null;
 if(receipt.status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'){
  const bytes=regular(dirname,evidenceFile,1000000);
  proof=JSON.parse(bytes.toString('utf8'));proofDigest=h(bytes);
  for(const phase of ['before','after']){
   const items=proof[phase+'JUnitFiles'];
   if(!Array.isArray(items)||items.length<1||items.length>4096||
    new Set(items.map(x=>x[0])).size!==items.length)throw Error('C2_PR189_INVALID_JUNIT_INDEX');
   let bytesTotal=0;
   for(const [name,digest] of items){
    if(!/^TEST-[a-f0-9]{24}\.xml$/.test(name)||!/^[a-f0-9]{64}$/.test(digest))
     throw Error('C2_PR189_BAD_JUNIT_INDEX');
    const data=regular(dirname,'evidence/'+task+'/'+phase+'/junit/'+name,2*1024*1024);
    bytesTotal+=data.length;
    if(bytesTotal>96*1024*1024||h(data)!==digest)throw Error('C2_PR189_JUNIT_SHA_MISMATCH');
   }
  }
 }
 return {receipt,proof,proofDigest,artifactDigest:art.digest};
}
function run(args){
 if(args[0]==='manifest'&&args.length===1){
  process.stdout.write([...ORIGINAL,...RETRY].map(a=>
   [a.run,a.name,a.id,'sha256:'+a.digest].join('|')).join('\n')+'\n');
  return;
 }
 if(args[0]!=='adjudicate'||args.length!==4)throw Error('C2_PR189_ARGS_BLOCKED');
 const [_,originalRoot,retryRoot,output]=args;
 if(![originalRoot,retryRoot,output].every(path.isAbsolute)||
  new Set([originalRoot,retryRoot,output].map(x=>path.resolve(x))).size!==3||
  fs.existsSync(output))throw Error('C2_PR189_PATHS_BLOCKED');
 const original={},retry={};
 for(const c of PILOT)original[c.task]=readCandidate(originalRoot,c.task,'original');
 for(const t of RETRIES)retry[t]=readCandidate(retryRoot,t,'retry');
 const report=adjudicatePilot({original,retry});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({
  candidates:report.totalCandidates,retry:report.selectedRepeatRuns,
  classifications:report.classifications,goldLabels:0,blindHoldout:false
 })+'\n');
}
if(require.main===module){
 try{run(process.argv.slice(2));}
 catch(e){process.stderr.write(String(e.message||e).slice(0,200)+'\n');process.exitCode=2;}
}
module.exports={ORIGINAL,RETRY,readCandidate,run};

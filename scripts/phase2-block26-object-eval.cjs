#!/usr/bin/env node
'use strict';
// Only this host-side adapter can join immutable source, predictions and truth.
// The existing frozen JVM probe and its isolated runner are reused unchanged.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const MANIFEST='docs/quality/PHASE2-BLOCK26-OBJECT-COHORT.json';
const ORACLE='tests/fixtures/phase2-block26-object-contracts/oracle-seal.json';
const ENGINE='8c246fd285793350a2fa3ccc2dcaa4eeac052750';
const SOURCE='a8fa9edf615d0498bd1d2e8328f72a180d345343';
const fail=()=>{throw Error('BLOCK26_OBJECT_EVIDENCE_REFUSED');};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function read(file,max=262144){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<2||s.size>max)fail();
 return fs.readFileSync(file);
}
function commitments(){
 const raw=read(path.join(ROOT,MANIFEST));
 if(blob(raw)!=='d092a0c1529454dbfb14ea8c5db18855957686bf')fail();
 const m=JSON.parse(raw),o=JSON.parse(read(path.join(ROOT,ORACLE)));
 if(m.engine.commitSha!==ENGINE||m.source.commitSha!==SOURCE||o.engineSha!==ENGINE||
  o.sourceSha!==SOURCE||o.oracleFiles.length!==1||
  o.oracleFiles[0].sha256!=='88a4a02335bf8c4dbb59ef08a2a04cd4a4e3fad9d348b28875d425db9ccf3ee4')fail();
 for(const f of o.oracleFiles)if(hash(read(path.join(ROOT,f.path)))!==f.sha256)fail();
 return {m,o};
}
function parseReport(raw,artifact,prefix='io.uuddlrlrba.ktalgs'){
 if(typeof prefix!=='string'||! /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+$/.test(prefix))fail();
 if(!Buffer.isBuffer(raw)||raw.length>262144||! /^[a-f0-9]{64}$/.test(artifact))fail();
 const r=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));
 if(r.schema!=='ultra-sentinel-generic-jvm-metamorphic/v1'||r.artifactSha256!==artifact||
  !['INCOMPLETE_NO_SUPPORTED_METHODS','PARTIAL_HYPOTHESES_REQUIRE_ORACLE','HYPOTHESES_REQUIRE_ORACLE'].includes(r.status)||
  !Array.isArray(r.findings)||r.findings.length>256)fail();
 for(const key of ['sourceAuthenticated','oracleVerified','novelFamilyVerified','repairAuthorized','remoteWrites','mergeAllowed'])
  if(r[key]!==false)fail();
 for(const key of ['classesInspected','methodsProbed','unsupportedMethods','abstainedProbes','unloadableClasses',
  'nestedClassesSkipped','comparableClasses','comparablePairs','comparableTriples','constructorAbstentions'])
  if(!Number.isSafeInteger(r[key])||r[key]<0||r[key]>250000)fail();
 for(const f of r.findings){
  if(!f||typeof f.class!=='string'||!f.class.startsWith(prefix+'.')||! /^[A-Za-z_][A-Za-z0-9_.$]*$/.test(f.class)||
   f.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE')fail();
  if(f.rule===undefined){
   if(typeof f.method!=='string'||f.method.length>500||!Number.isSafeInteger(f.argument)||f.argument<0||f.argument>2||
    ![1,100].includes(f.otherArguments)||!Array.isArray(f.inputs)||!Array.isArray(f.observed)||
    f.inputs.length!==3||f.observed.length!==3||
    ![...f.inputs,...f.observed].every(x=>typeof x==='string'&&/^-?\d{1,20}$/.test(x)))fail();
  }else if(!['COMPARABLE_ANTISYMMETRY_VIOLATION','COMPARABLE_TRANSITIVITY_VIOLATION'].includes(f.rule)||
   !Array.isArray(f.constructor)||f.constructor.length<1||f.constructor.length>3||
   !Array.isArray(f.observedSigns)||f.observedSigns.some(n=>![-1,0,1].includes(n)))fail();
 }
 return r;
}
function seal(raw,artifact){
 const {m,o}=commitments(),r=parseReport(raw,artifact);
 return {schema:'ultra-sentinel-block26-object-prediction-seal/v1',engineSha:ENGINE,sourceSha:SOURCE,
  manifestBlob:'d092a0c1529454dbfb14ea8c5db18855957686bf',oracleSha256:o.oracleFiles[0].sha256,
  sourceFiles:m.source.files.length,artifactSha256:artifact,reportSha256:hash(raw),hypotheses:r.findings.length,
  independentOracleExecuted:false,remoteWrites:false,mergeAllowed:false};
}
function verify(s,raw){
 const expected=seal(raw,s?.artifactSha256);
 if(JSON.stringify(s)!==JSON.stringify(expected))fail();
 return expected;
}
function verifyTruth(oracle){
 if(oracle.schema!=='ultra-sentinel-block26-independent-arithmetic/v1'||oracle.boundedLcmControls!==40||
  oracle.overflowCases!==8||oracle.orderingControls!==625||!Array.isArray(oracle.observations)||
  oracle.observations.length!==48)fail();
 let i=0;
 for(const a of [0,1,2,3,12,100,2147483647])for(const b of [0,1,2,3,12,100,2147483647]){
  if(a===0&&b===0)continue;
  let x=BigInt(a),y=BigInt(b);while(y){const n=x%y;x=y;y=n;}
  const expected=BigInt(a)*BigInt(b)/x,o=oracle.observations[i++];
  if(!o||o.a!==a||o.b!==b||o.expected!==String(expected)||
   typeof o.threw!=='boolean'||(o.threw?o.actual!==null:!Number.isInteger(o.actual)||o.actual<-(2**31)||o.actual>2**31-1)||
   o.negativeForNonnegativeInputs!==(o.actual!==null&&o.actual<0)||
   (expected<=2147483647n&&(o.threw||o.actual!==Number(expected))))fail();
 }
}
function adjudicate(s,raw,oracle){
 verify(s,raw);
 verifyTruth(oracle);
 const witnesses=[];
 for(const f of parseReport(raw,s.artifactSha256).findings){
  if(f.class!=='io.uuddlrlrba.ktalgs.math.GcdKt'||f.method!=='lcm(int;int;)int'||f.argument>1)continue;
  for(let i=0;i<3;i++){
   const a=f.argument===0?Number(f.inputs[i]):f.otherArguments;
   const b=f.argument===1?Number(f.inputs[i]):f.otherArguments;
   const o=oracle.observations.find(x=>x.a===a&&x.b===b);
   if(o&&a>0&&b>0&&o.threw===false&&Number.isSafeInteger(o.actual)&&o.actual<0&&
    String(o.actual)===f.observed[i]&&typeof o.expected==='string'&&/^\d+$/.test(o.expected)&&BigInt(o.expected)>0n)
    witnesses.push({class:f.class,method:f.method,a,b,expected:o.expected,actual:o.actual});
  }
 }
 return {schema:'ultra-sentinel-block26-object-independent-verdict/v1',engineSha:ENGINE,sourceSha:SOURCE,
  reportSha256:s.reportSha256,verifiedOriginalDefects:witnesses.length?1:0,verifiedWitnesses:witnesses,
  scopedBenignOrderingControls:oracle.orderingControls,scopedBoundedArithmeticControls:oracle.boundedLcmControls,
  unverifiedHypotheses:s.hypotheses,globalPrecision:null,globalRecall:null,falsePositiveCount:null,
  falseNegativeCount:null,novelFamilyVerified:false,block26Closed:false,block27Allowed:false,
  closureRequiresSuccessfulCiAndMainIntegration:true,remoteWrites:false,repairAuthorized:false};
}
function git(root,args){
 return cp.execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null',...args],{
  timeout:20000,maxBuffer:16*1024*1024,
  env:{PATH:process.env.PATH,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_COUNT:'0',GIT_OPTIONAL_LOCKS:'0'}});
}
function readCohort(engine,source,m){
 for(const [root,sha,tree] of [[engine,m.engine.commitSha,m.engine.treeSha],[source,m.source.commitSha,m.source.treeSha]]){
  if(! /^[a-f0-9]{40}$/.test(sha)||! /^[a-f0-9]{40}$/.test(tree))fail();
  if(git(root,['rev-parse','HEAD']).toString().trim()!==sha||
   git(root,['rev-parse','HEAD^{tree}']).toString().trim()!==tree||git(root,['status','--porcelain']).length)fail();
 }
 const entries=git(source,['ls-tree','-r','-l','-z','HEAD']).toString().split('\0').filter(Boolean)
  .map(x=>{const [meta,p]=x.split('\t'),[mode,type,sha,size]=meta.split(/\s+/);return {mode,type,sha,size:Number(size),path:p};})
  .filter(x=>x.path.startsWith('src/main/')&&x.path.endsWith('.kt'));
 if(JSON.stringify(entries.map(x=>({path:x.path,blobSha:x.sha,sizeBytes:x.size})))!==JSON.stringify(m.source.files))fail();
 const files=[];
 for(const f of entries){
  // Git-tree audit reads by authenticated blob ID; it never opens this path.
  // Executable staging below retains its narrower ASCII path contract.
  if(f.mode!=='100644'||f.type!=='blob'||!f.path.startsWith('src/main/')||!f.path.endsWith('.kt')||/[\x00-\x1f\x7f\\]/.test(f.path)||
   f.path.split('/').some(x=>!x||x==='.'||x==='..'))fail();
  const bytes=git(source,['cat-file','blob',f.sha]);
  if(bytes.length!==f.size||blob(bytes)!==f.sha)fail();
  files.push({path:f.path,bytes});
 }
 return files;
}
function prepareCohort(engine,source,out,m){
 const files=readCohort(engine,source,m);
 if(files.some(f=>!/^src\/main\/[A-Za-z0-9_/]+\.kt$/.test(f.path)))fail();
 fs.mkdirSync(out,{mode:0o700});
 for(const f of files){
  const dest=path.join(out,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
  fs.writeFileSync(dest,f.bytes,{flag:'wx',mode:0o600});
 }
}
function prepare(engine,source,out){return prepareCohort(engine,source,out,commitments().m);}
function save(p,v){fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});}
if(require.main===module){
 try{
  const [action,...a]=process.argv.slice(2);
  if(action==='prepare'&&a.length===3)prepare(...a);
  else if(action==='seal'&&a.length===3)save(a[2],seal(read(a[0]),hash(read(a[1],32*1024*1024))));
  else if(action==='verify'&&a.length===2)verify(JSON.parse(read(a[0])),read(a[1]));
  else if(action==='verdict'&&a.length===4){const v=adjudicate(JSON.parse(read(a[0])),read(a[1]),JSON.parse(read(a[2])));save(a[3],v);console.log(JSON.stringify(v));}
  else fail();
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({seal,verify,adjudicate,prepare,parseReport,readCohort,prepareCohort});

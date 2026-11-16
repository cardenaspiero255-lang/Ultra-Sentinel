#!/usr/bin/env node
'use strict';
// Host-only evidence adapter. It never enters the frozen Hunter namespace.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {prepareCohort}=require('./phase2-block26-object-eval.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const constructor=x=>Object.hasOwn(x,'constructor')?x.constructor:[];
const fail=()=>{throw Error('KOTLIN_API_V2_EVIDENCE_REFUSED');};
function decimal(x){
 if(typeof x!=='string'||x.length>40||!Number.isFinite(Number(x)))return null;
 const m=/^(-?)(\d*(?:\.\d*)?)(?:[eE]([+-]?\d{1,3}))?$/.exec(x);
 if(!m||!m[2]||m[2]==='.')return null;
 const parts=m[2].split('.'),digits=parts.join('');if(!/^\d+$/.test(digits))return null;
 let scale=Number(m[3]??0)-(parts[1]?.length??0);if(Math.abs(scale)>400)return null;
 let n=BigInt((m[1]||'')+digits);
 if(n===0n)return '0:0';
 while(n%10n===0n){n/=10n;scale++;}
 return n.toString()+':'+scale;
}
const numeric=x=>decimal(x)!==null;
function same(a,b){const x=decimal(a),y=decimal(b);return x!==null&&y!==null?x===y:a===b;}
function scopeName(x){return typeof x==='string'&&x.length<=500&&(x==='.'||
 /^[\p{ID_Start}_$][\p{ID_Continue}$]*(?:\.[\p{ID_Start}_$][\p{ID_Continue}$]*)*$/u.test(x));}
function parse(entry){
 if(!Number.isInteger(entry.cohortId)||!scopeName(entry.scope)||!Buffer.isBuffer(entry.raw)||
  entry.raw.length>262144||!/^[a-f0-9]{64}$/.test(entry.artifactSha256))fail();
 const r=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(entry.raw));
 if(r.schema!=='ultra-sentinel-generic-jvm-metamorphic/v1'||r.artifactSha256!==entry.artifactSha256||
  !['INCOMPLETE_NO_SUPPORTED_METHODS','PARTIAL_HYPOTHESES_REQUIRE_ORACLE','HYPOTHESES_REQUIRE_ORACLE'].includes(r.status)||
  !Array.isArray(r.findings)||r.findings.length>256)fail();
 for(const key of ['sourceAuthenticated','oracleVerified','novelFamilyVerified','repairAuthorized','remoteWrites','mergeAllowed'])
  if(r[key]!==false)fail();
 for(const key of ['classesInspected','methodsProbed','methodCandidates','completedTriples','successfulInvocations',
  'doubleMethodsExercised','structuredMethodsExercised','instanceMethodsExercised','unsupportedMethods','abstainedProbes',
  'unloadableClasses','nestedClassesSkipped','comparableClasses','comparablePairs','comparableTriples','constructorAbstentions'])
  if(!Number.isSafeInteger(r[key])||r[key]<0||r[key]>250000)fail();
 // Reports frozen before #406/#407 lack these optional counters; do not reject them.
 for(const key of ['floatMethodsExercised','objectContractClasses','objectContractPairs','objectContractAbstentions'])
  if(Object.hasOwn(r,key)&&(!Number.isSafeInteger(r[key])||r[key]<0||r[key]>250000))fail();
 if(r.methodsProbed>r.methodCandidates||r.methodsProbed>r.completedTriples)fail();
 const pairs=r.objectContractPairs??0;
 if(r.status==='INCOMPLETE_NO_SUPPORTED_METHODS'?(r.methodsProbed>0||r.comparablePairs>0||pairs>0):
   (r.methodsProbed===0&&r.comparablePairs===0&&pairs===0))fail();
 for(const f of r.findings){
  if(!f||typeof f.class!=='string'||f.class.length>500||
   (entry.scope==='.'?f.class.includes('.'):!f.class.startsWith(entry.scope+'.'))||
   f.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE')fail();
  if(f.rule!==undefined){
   const comparable=['COMPARABLE_ANTISYMMETRY_VIOLATION','COMPARABLE_TRANSITIVITY_VIOLATION'];
   const objects=['OBJECT_EQUALS_REFLEXIVITY_VIOLATION','OBJECT_EQUALS_SYMMETRY_VIOLATION','OBJECT_EQUALS_HASHCODE_VIOLATION'];
   if(!comparable.includes(f.rule)&&!objects.includes(f.rule))fail();
   if(objects.includes(f.rule)){
    if(pairs<1||!Array.isArray(f.constructor)||f.constructor.length>3||
      !f.constructor.every(x=>typeof x==='string'&&x.length<=100)||
      !Array.isArray(f.left)||!Array.isArray(f.right)||
      f.left.length!==f.constructor.length||f.right.length!==f.constructor.length||
      ![...f.left,...f.right].every(x=>typeof x==='string'&&x.length<=100)||
      !Array.isArray(f.observed)||f.observed.length!==2)fail();
    const bool=x=>typeof x==='boolean',integer=x=>Number.isSafeInteger(x)&&x>=-2147483648&&x<=2147483647;
    if(f.rule==='OBJECT_EQUALS_HASHCODE_VIOLATION'? !f.observed.every(integer):!f.observed.every(bool))fail();
   }
   continue; // Object and Comparable contracts still require a separate independent oracle.
  }
  const parameterTypes=typeof f.method==='string'?
   f.method.slice(f.method.indexOf('(')+1,f.method.lastIndexOf(')')).split(';').filter(Boolean):[];
  if(typeof f.method!=='string'||f.method.length>500||!Number.isInteger(f.argument)||f.argument<0||f.argument>2||
   ![1,100].includes(f.otherArguments)||!Array.isArray(f.inputs)||f.inputs.length!==3||
   !Array.isArray(f.observed)||f.observed.length!==3||!f.observed.every(numeric)||
   !f.inputs.every(x=>parameterTypes[f.argument]==='java.lang.String'?
    ['', 'a', 'aa', 'aaa'].includes(x):
    numeric(x)||/^size=[0-3];values=0\.\.size-1$/.test(x)))fail();
  if(Object.hasOwn(f,'constructorArguments')!==Object.hasOwn(f,'constructor'))fail();
  if(r.status==='INCOMPLETE_NO_SUPPORTED_METHODS'||r.methodsProbed===0||r.completedTriples===0||r.successfulInvocations<6)fail();
  if(Object.hasOwn(f,'constructor')&&(!Array.isArray(f.constructor)||!Array.isArray(f.constructorArguments)||
   f.constructor.length!==f.constructorArguments.length||f.constructor.length>3||
   !f.constructor.every(x=>['byte','short','int','long','float','double','java.lang.Byte','java.lang.Short',
    'java.lang.Integer','java.lang.Long','java.lang.Float','java.lang.Double','java.lang.String'].includes(x))||
   !f.constructorArguments.every(x=>typeof x==='string'&&x.length<=40)))fail();
 }
 return r;
}
function checkManifest(m){
 if(!m||!/^[a-f0-9]{40}$/.test(m.engine?.commitSha)||!Array.isArray(m.cohorts)||!m.cohorts.length||m.cohorts.length>3||
  !Array.isArray(m.oracles)||m.block27Allowed!==false)fail();
 const ids=new Set();
 for(const c of m.cohorts){
  if(!Number.isInteger(c.id)||c.id<1||c.id>3||ids.has(c.id)||!/^[a-f0-9]{40}$/.test(c.source?.commitSha)||
   !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.source?.repository))fail();
  ids.add(c.id);
 }
 for(const o of m.oracles)if(!ids.has(o.cohortId)||!/^[a-f0-9]{64}$/.test(o.sha256))fail();
}
function seal(m,entries,abstentions){
 checkManifest(m);const ids=new Set(m.cohorts.map(c=>c.id)),keys=new Set();
 const reports=entries.map(e=>{
  const key=e.cohortId+':'+e.scope;if(!ids.has(e.cohortId)||keys.has(key))fail();keys.add(key);
  const r=parse(e);
  return {cohortId:e.cohortId,scope:e.scope,artifactSha256:e.artifactSha256,reportSha256:hash(e.raw),
   methodsProbed:r.methodsProbed,completedTriples:r.completedTriples,hypotheses:r.findings.length};
 });
 if(!Array.isArray(abstentions))fail();
 for(const a of abstentions)if(!ids.has(a.cohortId)||!['COMPILATION_ABSTENTION','PROBE_EXECUTION_ABSTENTION','NO_ELIGIBLE_CLASS_SCOPES'].includes(a.reason)||
  (a.scope!==undefined&&!scopeName(a.scope)))fail();
 for(const id of ids)if(!entries.some(e=>e.cohortId===id)&&!abstentions.some(a=>a.cohortId===id))fail();
 return {schema:'ultra-sentinel-kotlin-api-v2-prediction-seal/v1',engineSha:m.engine.commitSha,
  manifestSha256:hash(Buffer.from(JSON.stringify(m))),reports,executionAbstentions:abstentions,
  oracleExecuted:false,engineRetuned:false,block27Allowed:false};
}
function verify(m,e,a,s){const expected=seal(m,e,a);if(JSON.stringify(expected)!==JSON.stringify(s))fail();return expected;}
function argumentMatches(f,o,index){
 const params=f.method.slice(f.method.indexOf('(')+1,f.method.lastIndexOf(')')).split(';').filter(Boolean);
 if(o.arguments.length!==params.length||f.argument>=params.length)return false;
 for(let j=0;j<params.length;j++){
  const expected=j===f.argument?f.inputs[index]:
   (['byte','short','int','long','float','double','java.lang.Byte','java.lang.Short','java.lang.Integer','java.lang.Long','java.lang.Float','java.lang.Double'].includes(params[j])?
    String(f.otherArguments):(params[j]==='java.lang.String'?
     (f.otherArguments===100?'aa':'a'):'size=1;values=0..size-1'));
  if(!same(o.arguments[j],expected))return false;
 }
 return true;
}
function adjudicate(m,entries,abstentions,s,truths){
 verify(m,entries,abstentions,s);
 const observations=[],seenTruth=new Set(),seenCalls=new Map();
 for(const envelope of truths){
  const cohort=m.cohorts.find(c=>c.id===envelope.cohortId),oracle=m.oracles.find(o=>o.cohortId===envelope.cohortId);
  if(!cohort||!oracle||seenTruth.has(envelope.cohortId)||
   envelope.schema!=='ultra-sentinel-kotlin-api-v2-oracle-execution/v1'||
   envelope.sourceSha!==cohort.source.commitSha||envelope.oracleSha256!==oracle.sha256||
   typeof envelope.rawOutputBase64!=='string'||envelope.rawOutputBase64.length>8*1024*1024||
   !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(envelope.rawOutputBase64))fail();
  const raw=Buffer.from(envelope.rawOutputBase64,'base64');if(hash(raw)!==envelope.rawOutputSha256)fail();
  const t=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));seenTruth.add(envelope.cohortId);
  if(t.schema!=='ultra-sentinel-kotlin-api-v2-independent/v1'||t.wholeCohortTruth!==false||
   !Array.isArray(t.observations)||t.observations.length>50000)fail();
  for(const o of t.observations){
   if(typeof o.class!=='string'||typeof o.method!=='string'||!Array.isArray(o.arguments)||
    o.arguments.length>3||!o.arguments.every(x=>typeof x==='string'&&x.length<=100)||
    !numeric(o.actual)||!numeric(o.expected)||typeof o.contract!=='string'||o.contract.length>1000||
    typeof o.defectEligible!=='boolean')fail();
   const key=JSON.stringify([envelope.cohortId,o.class,o.method,constructor(o),o.constructorArguments??[],
    o.arguments.map(x=>decimal(x)??x)]),previous=seenCalls.get(key);
   if(previous&&(!same(previous.actual,o.actual)||!same(previous.expected,o.expected)||
    previous.defectEligible!==o.defectEligible))fail();
   seenCalls.set(key,o);observations.push({...o,cohortId:envelope.cohortId});
  }
 }
 let confirmed=0,falsePositives=0,unadjudicated=0;const defects=new Set(),witnesses=[];
 for(const entry of entries)for(const f of parse(entry).findings){
  if(f.rule!==undefined){unadjudicated++;continue;}
  let checked=0,bad=false;
  for(let i=0;i<3;i++){
   const o=observations.find(o=>o.cohortId===entry.cohortId&&o.class===f.class&&o.method===f.method&&
    JSON.stringify(constructor(o))===JSON.stringify(constructor(f))&&
    JSON.stringify(o.constructorArguments??[])===JSON.stringify(f.constructorArguments??[])&&
    argumentMatches(f,o,i)&&same(o.actual,f.observed[i])&&o.defectEligible);
   if(!o)continue;checked++;
   if(!same(o.actual,o.expected)){
    bad=true;defects.add([entry.cohortId,f.class,f.method].join(':'));
    witnesses.push({cohortId:entry.cohortId,class:f.class,method:f.method,arguments:o.arguments,
     actual:o.actual,expected:o.expected,contract:o.contract,
     ...(Object.hasOwn(f,'constructor')?{constructor:f.constructor,constructorArguments:f.constructorArguments}:{})});
   }
  }
  if(bad)confirmed++;else if(checked===3)falsePositives++;else unadjudicated++;
 }
 return {schema:'ultra-sentinel-kotlin-api-v2-independent-verdict/v1',engineSha:m.engine.commitSha,
  manifestSha256:s.manifestSha256,confirmedDistinctDefects:defects.size,confirmedHypotheses:confirmed,
  scopedFalsePositiveHypotheses:falsePositives,unadjudicatedHypotheses:unadjudicated,
  scopedIndependentObservations:observations.length,executionAbstentions:abstentions,
  methodsProbed:s.reports.reduce((n,r)=>n+r.methodsProbed,0),globalPrecision:null,globalRecall:null,
  falseNegatives:null,verifiedWitnesses:witnesses,novelFamilyVerified:false,engineRetuned:false,block27Allowed:false};
}
function read(p,max=1048576){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>max)fail();return fs.readFileSync(p);}
const json=p=>JSON.parse(read(p));
function save(p,value){fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function loadEntries(dir){
 const index=json(path.join(dir,'index.json'));if(!Array.isArray(index)||index.length>90)fail();
 return index.map(e=>{
  if(!/^cohort-[1-3]\/scope-\d{1,2}\/discovery\.json$/.test(e.file))fail();
  return {...e,raw:read(path.join(dir,e.file),262144)};
 });
}
if(require.main===module){try{
 const [action,...a]=process.argv.slice(2);
 if(action==='prepare'&&a.length===5){
  const m=json(a[0]);checkManifest(m);const c=m.cohorts.find(c=>c.id===Number(a[1]));if(!c)fail();
  prepareCohort(a[2],a[3],a[4],{engine:m.engine,source:c.source},{extendedKotlinPaths:true});
 }else if(action==='oracle-input'&&a.length===3){
  const m=json(a[0]);checkManifest(m);const o=m.oracles.find(o=>o.cohortId===Number(a[1]));
  if(!o||!/^tests\/fixtures\/(?:phase2-kotlin-api-v2|phase2-block26-v3|phase2-block26-v4)\/oracle-[1-3]\.kt$/.test(o.path))fail();
  const bytes=read(path.resolve(__dirname,'..',o.path));if(hash(bytes)!==o.sha256)fail();
  const dir=path.join(a[2],'oracle');fs.mkdirSync(dir,{mode:0o700});
  fs.writeFileSync(path.join(dir,'IndependentArithmeticOracle.kt'),bytes,{flag:'wx',mode:0o600});
 }else if(action==='wrap-oracle'&&a.length===4){
  const m=json(a[0]);checkManifest(m);const id=Number(a[1]);
  const c=m.cohorts.find(c=>c.id===id),o=m.oracles.find(o=>o.cohortId===id);if(!c||!o)fail();
  const raw=read(a[2],6*1024*1024);JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));
  save(a[3],{schema:'ultra-sentinel-kotlin-api-v2-oracle-execution/v1',cohortId:id,
   sourceSha:c.source.commitSha,oracleSha256:o.sha256,rawOutputSha256:hash(raw),rawOutputBase64:raw.toString('base64')});
 }else if(action==='scopes'&&a.length===2){
  // Only compiler-produced class-entry metadata is read; source headers are not guessed.
  const names=cp.execFileSync('jar',['tf',a[0]],{encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024}).split('\n');
  const scopes=[...new Set(names.filter(n=>n.endsWith('.class')&&!/^(kotlin\/|org\/jetbrains\/|org\/intellij\/|META-INF\/)/.test(n))
   .map(n=>n.includes('/')?n.split('/')[0]:'.'))].sort();
  if(scopes.some(p=>!scopeName(p))||scopes.length>30)fail();save(a[1],scopes);
 }else if(action==='seal'&&a.length===3){const m=json(a[0]),e=loadEntries(a[1]),b=json(path.join(a[1],'abstentions.json'));save(a[2],seal(m,e,b));
 }else if(action==='verify'&&a.length===3){verify(json(a[0]),loadEntries(a[1]),json(path.join(a[1],'abstentions.json')),json(a[2]));
 }else if(action==='verdict'&&a.length===5){
  const m=json(a[0]),e=loadEntries(a[1]),b=json(path.join(a[1],'abstentions.json')),s=json(a[2]);
  const truths=m.cohorts.map(c=>({id:c.id,file:path.join(a[3],`oracle-${c.id}.json`)})).filter(x=>fs.existsSync(x.file)).map(x=>{const t=json(x.file);if(t.cohortId!==x.id)fail();return t;});
  save(a[4],adjudicate(m,e,b,s,truths));
 }else fail();
}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports=Object.freeze({seal,verify,adjudicate});

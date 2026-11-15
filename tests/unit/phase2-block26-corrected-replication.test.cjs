'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const cp=require('node:child_process'),os=require('node:os');
const {inspectHeaders,seal,verify,verdict}=require('../../scripts/phase2-block26-corrected-replication.cjs');
test('single-segment, missing and unsupported headers are abstentions, not detector misses',()=>{
 for(const text of ['package structures\nclass A','class A','/* package fake.valid */\nclass A']){
  const r=inspectHeaders([{path:'src/main/kotlin/A.kt',source:text}]);
  assert.equal(r.executionEligible,false);assert.equal(r.filesScannedByHunter,0);
  assert.equal(r.falseNegativeCount,null);
 }
 const r=inspectHeaders([{path:'src/main/kotlin/A.kt',source:'package sample.valid\nclass A'}]);
 assert.equal(r.executionEligible,true);assert.deepEqual(r.prefixes,['sample.valid']);
 assert.equal(inspectHeaders([{path:'src/main/kotlin/A B.kt',source:'package sample.valid\nclass A'}]).executionEligible,false);
});
const raw=()=>Buffer.from(JSON.stringify({schema:'ultra-sentinel-generic-jvm-metamorphic/v1',
 status:'INCOMPLETE_NO_SUPPORTED_METHODS',artifactSha256:'a'.repeat(64),classesInspected:3,methodsProbed:0,
 unsupportedMethods:8,abstainedProbes:0,unloadableClasses:0,nestedClassesSkipped:0,comparableClasses:0,
 comparablePairs:0,comparableTriples:0,constructorAbstentions:0,findings:[],sourceAuthenticated:false,
 oracleVerified:false,novelFamilyVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false}));
test('zero supported methods remain incomplete even if independent benign controls pass',()=>{
 const r=raw(),s=seal(r,'a'.repeat(64));assert.equal(verify(s,r).engineSha,'9550170e084505a09e7ee65d2e68eb0e1883d3b2');
 const v=verdict(s,r,{schema:'ultra-sentinel-corrected-frozen-independent-controls/v1',
  splineControls:75,binarySearchControls:9,wholeFileTruthAvailable:false});
 assert.equal(v.status,'REPLICATION_NOT_DEMONSTRATED_NO_SUPPORTED_METHODS');
 assert.equal(v.verifiedDistinctDefects,0);assert.equal(v.precision,null);assert.equal(v.recall,null);
 assert.equal(v.block27Allowed,false);assert.equal(v.engineRetuned,false);
 assert.throws(()=>verify(s,Buffer.concat([r,Buffer.from(' ')])));
 assert.throws(()=>verdict(s,r,{schema:'fabricated',splineControls:75,binarySearchControls:9}));
});
test('truth claims and artifact substitutions cannot pass as fresh predictions',()=>{
 assert.throws(()=>seal(raw(),'b'.repeat(64)));
 assert.throws(()=>seal(Buffer.from(JSON.stringify({...JSON.parse(raw()),oracleVerified:true})),'a'.repeat(64)));
});
test('corrected detector bytes stay frozen and oracle execution depends on prior published predictions',()=>{
 const root=path.resolve(__dirname,'../..');
 const freeze=require('../../docs/quality/PHASE2-BLOCK26-CORRECTED-ENGINE-FREEZE.json');
 for(const f of freeze.engine.modules){
  const b=fs.readFileSync(path.join(root,f.path));
  assert.equal(crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),f.blobSha);
 }
 const w=fs.readFileSync(path.join(root,'.github/workflows/phase2-block26-corrected-replication.yml'),'utf8');
 assert.match(w,/needs: corrected-frozen-predictions/);
 assert.match(w,/ref: 9550170e084505a09e7ee65d2e68eb0e1883d3b2/);
 const before=w.slice(0,w.indexOf('  corrected-independent-oracle:'));
 assert.doesNotMatch(before,/IndependentSplineOracle|run-isolated\.sh oracle/);
 for(const m of w.matchAll(/bash (tests\/fixtures\/[A-Za-z0-9_/-]+\.sh)/g))assert.ok(fs.statSync(path.join(root,m[1])).isFile());
 assert.match(w,/cp tests\/fixtures\/phase2-block26-corrected-replication\/IndependentSplineOracle\.kt .*\/oracle\/IndependentArithmeticOracle\.kt/);
});
test('read-only audit can authenticate an unsupported Unicode Git path while executable staging still refuses it',()=>{
 const {readCohort,prepareCohort}=require('../../scripts/phase2-block26-object-eval.cjs');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'corrected-cohort-audit-'));
 const git=(dir,...args)=>cp.execFileSync('git',['-C',dir,'-c','core.hooksPath=/dev/null',...args],{encoding:'utf8'}).trim();
 try{
  const engine=path.join(tmp,'engine'),source=path.join(tmp,'source');
  for(const dir of [engine,source]){fs.mkdirSync(dir);git(dir,'init','-q');}
  const file='src/main/kotlin/Сhain Of Responsibilities.kt',bytes=Buffer.from('package examples\nclass A\n');
  fs.mkdirSync(path.dirname(path.join(source,file)),{recursive:true});fs.writeFileSync(path.join(source,file),bytes);
  git(source,'add','.');
  for(const dir of [engine,source])git(dir,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid',
   '-c','commit.gpgsign=false','commit','-q','--allow-empty','-m','inert fixture');
  const m={engine:{commitSha:git(engine,'rev-parse','HEAD'),treeSha:git(engine,'rev-parse','HEAD^{tree}')},
   source:{commitSha:git(source,'rev-parse','HEAD'),treeSha:git(source,'rev-parse','HEAD^{tree}'),
    files:[{path:file,blobSha:git(source,'rev-parse','HEAD:'+file),sizeBytes:bytes.length}]}};
  const observed=readCohort(engine,source,m);
  assert.equal(observed.length,1);assert.deepEqual(observed[0].bytes,bytes);
  assert.throws(()=>prepareCohort(engine,source,path.join(tmp,'out'),m));
  assert.equal(fs.existsSync(path.join(tmp,'out')),false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

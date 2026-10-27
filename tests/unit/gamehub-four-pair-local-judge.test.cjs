'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SPECS,assessCrossPair,runPinnedPair}=
 require('../../packages/recovery/gamehub-four-pair-local-judge.cjs');
const treesha='c'.repeat(40);
function sample(suite='refresh-battery'){
 const spec=SPECS[suite];return {
  localProof:{schema:'ultra-sentinel-local-cross-file-reproduction/v1',
   status:'LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE',
   commitAllowed:false,mergeAllowed:false,productionReleaseAllowed:false,
   candidateRule:spec.rule,
   scenarios:['00','10','01','11'].map((mode,i)=>({
    selectedFiles:[spec.first.path,spec.second.path].filter((p,j)=>
     p===spec.first.path?mode[0]==='1':mode[1]==='1').sort(),
    oracleVerdict:'PASS',
    judgeStatus:i?'APPROVED_LOCAL_POLICY_ONLY':'BASELINE_NO_COMMIT',
    remoteWrites:false,rollbackVerified:true,
    baselineTree:treesha,restoredTree:treesha
   }))},
  logs:Object.fromEntries(['00','01','10','11'].map(mode=>[mode,
    'C2_CROSS_SUITE '+suite+'\nC2_CROSS_NORMAL_CONTROLS_PASS\n'+
    'C2_CROSS_VECTOR mode='+mode+' first='+(mode[0]==='1')+
    ' second='+(mode[1]==='1')+'\n']))
 };
}
test('all four existing GameHub Kotlin suite contracts supported without certification',()=>{
 assert.deepEqual(Object.keys(SPECS).sort(),[
  'json-confidence','query-confidence','refresh-battery','ttl-thermal']);
 for(const suite of Object.keys(SPECS)){
  const v=sample(suite),out=assessCrossPair({...v,suite});
  assert.equal(out.status,'LOCAL_GIT_AND_KOTLIN_CONTROLS_APPROVED_NO_RELEASE');
  assert.equal(out.functionalJudgeApproved,true);
  assert.equal(out.gitJudgeApproved,true);assert.equal(out.rollbackVerified,true);
  assert.equal(out.rootCauseVerified,false);assert.equal(out.remoteWrites,false);
  assert.equal(out.sourceCommitHistoryAuthenticated,false);
 }
});
test('stale controls cannot be excused by passing git hashes and rollback',()=>{
 const v=sample(),logs={...v.logs,'11':'C2_CROSS_SUITE refresh-battery\nC2_CROSS_VECTOR mode=11 first=true second=true\n'};
 const r=assessCrossPair({...v,logs,suite:'refresh-battery'});
 assert.equal(r.functionalJudgeApproved,false);
 assert.equal(r.gitJudgeApproved,true);assert.equal(r.rollbackVerified,true);
 assert.equal(r.status,'LOCAL_CROSS_PAIR_FUNCTIONAL_VETO');
});
test('bad mode, wrong tuple, mismatched Git tree or spoofed subset veto',()=>{
 const v=sample('ttl-thermal');
 for(const changed of [
  {logs:{...v.logs,'10':v.logs['11']}},
  {localProof:{...v.localProof,scenarios:v.localProof.scenarios.slice(0,3)}},
  {localProof:{...v.localProof,scenarios:v.localProof.scenarios.map((s,i)=>
   i===2?{...s,restoredTree:'d'.repeat(40)}:s)}},
  {localProof:{...v.localProof,scenarios:v.localProof.scenarios.map((s,i)=>
   i===2?{...s,selectedFiles:['app/src/main/Unexpected.kt']}:s)}}
 ]){
  const out=assessCrossPair({...v,suite:'ttl-thermal',...changed});
  assert.equal(out.status,'LOCAL_CROSS_PAIR_FUNCTIONAL_VETO');
 }
});
test('do not accept source bytes other than originals frozen by git blob',()=>{
 assert.throws(()=>runPinnedPair({root:'/nonexistent',suite:'refresh-battery'}),
  /PINNED_GAMEHUB_PAIR_GATE_BLOCKED/);
});

const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
// Synthetic compiler outputs test the binding only, NOT actual Kotlin execution.
function bindingFixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pair-binding-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'output'));
 const sources=['refresh','battery'].map(alias=>{
  const original=fs.readFileSync(path.join(__dirname,'../fixtures/c2-pair-binding',alias+'-original.kt'));
  const repair=Buffer.from(original.toString()+'\n// synthetic repair fixture\n');
  fs.writeFileSync(path.join(root,alias+'-original.kt'),original);
  fs.writeFileSync(path.join(root,alias+'-repair.kt'),repair);
  return [digest(original),digest(repair)];
 });
 const spec=SPECS['refresh-battery'];
 const receipt={schema:'c2-two-real-sources-four-jvm-repair-states/v1',suite:'refresh-battery',
  identities:spec.id,originalSourceGitBlobs:[spec.first.blob,spec.second.blob],
  originalSourcesVerified:true,originalSourcesUnmodified:true,networkIsolatedJVM:true,
  detectorPredictionsRead:false,externalCandidateSourceRead:false,causalFamiliesCertified:0,
  variantSha256s:sources.map(x=>x[1]),rows:[]};
 for(const mode of ['00','01','10','11']){
  const log=sample().logs[mode],jar='synthetic jar '+mode,compile='synthetic compiler '+mode;
  for(const [ext,data] of [['log',log],['jar',jar],['compile',compile]])fs.writeFileSync(path.join(root,mode+'.'+ext),data);
  receipt.rows.push({mode,firstRepaired:mode[0]==='1',secondRepaired:mode[1]==='1',
   firstCorrect:mode[0]==='1',secondCorrect:mode[1]==='1',benignControlsPassed:true,actualJointKotlinJvm:true,
   sourceSha256s:sources.map((x,i)=>x[Number(mode[i])]),
   compilationLogSha256:digest(compile),javaArtifactSha256:digest(jar),executionLogSha256:digest(log)});
 }
 const save=()=>fs.writeFileSync(path.join(root,'output/receipt.json'),JSON.stringify(receipt));save();
 return {root,receipt,save,run:()=>runPinnedPair({root,suite:'refresh-battery'})};
}
test('binding fixture accepts unchanged bytes with exact Git rollback (not JVM proof)',t=>{
 const f=bindingFixture(t),r=f.run();
 assert.equal(r.allFunctionalControlsPassed,true);assert.equal(r.exactBaselineTreeRestored,true);
});
for(const alias of ['refresh','battery'])test('reject changed '+alias+' repair after evidence',t=>{
 const f=bindingFixture(t);fs.appendFileSync(path.join(f.root,alias+'-repair.kt'),'fun broken() = error("regression")\n');
 assert.throws(f.run,/PINNED_GAMEHUB_PAIR_GATE_BLOCKED/);
});
for(const change of ['missing variants','swapped variants','forged repair hash','wrong mode source','missing source binding','compile log','jar','execution log']){
 test('reject evidence substitution: '+change,t=>{
  const f=bindingFixture(t);
  if(change==='missing variants')delete f.receipt.variantSha256s;
  if(change==='swapped variants')f.receipt.variantSha256s.reverse();
  if(change==='forged repair hash'){
   fs.appendFileSync(path.join(f.root,'battery-repair.kt'),'// altered\n');
   f.receipt.variantSha256s[1]=digest(fs.readFileSync(path.join(f.root,'battery-repair.kt')));
  }
  if(change==='wrong mode source')f.receipt.rows[3].sourceSha256s=f.receipt.rows[0].sourceSha256s;
  if(change==='missing source binding')delete f.receipt.rows[2].sourceSha256s;
  const ext={'compile log':'compile',jar:'jar','execution log':'log'}[change];
  if(ext)fs.appendFileSync(path.join(f.root,'11.'+ext),'tampered');
  f.save();assert.throws(f.run,/PINNED_GAMEHUB_PAIR_GATE_BLOCKED/);
 });
}
test('CLI rejects both source substitutions and restores tested bytes before publishing',t=>{
 const f=bindingFixture(t),{spawnSync}=require('node:child_process');
 const r=spawnSync(process.execPath,[path.join(__dirname,'../../scripts/c2-four-real-jvm-local-git-judge.cjs'),'refresh-battery',f.root],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const out=JSON.parse(fs.readFileSync(path.join(f.root,'output/local-git-judge-rollback.json')));
 assert.equal(out.postJvmSourceSubstitutionsRejected,2);
 assert.equal(f.run().allFunctionalControlsPassed,true);
});
test('empty successful compilation log is bound and accepted',t=>{
 const f=bindingFixture(t);
 fs.writeFileSync(path.join(f.root,'00.compile'),'');
 f.receipt.rows[0].compilationLogSha256=digest('');f.save();
 assert.equal(f.run().allFunctionalControlsPassed,true);
});

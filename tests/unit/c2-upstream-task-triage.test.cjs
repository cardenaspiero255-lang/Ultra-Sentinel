'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {auditTask,summarizeTasks}=require('../../packages/quality-gates/c2-upstream-task-triage.cjs');
const {PROJECTS}=require('../../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
function fixture(prefix='detekt_detekt',n='4205',f2p=['com.example.RuleTest.test()']){
 const [repository_owner,repository_name]=PROJECTS[prefix].repository.split('/');
 return {name:prefix+'-'+n,toml:`[metadata.source]\nrepository_owner = "${repository_owner}"\nrepository_name = "${repository_name}"\ncode_change_id = "${n}"\n[verifier]\nimplemented = false\n`,expected:{f2p_tests:f2p,p2p_tests:['com.example.SafeTest.test()'],s2p_tests:[],n2p_tests:[]},tomlGitSha:'a'.repeat(40),expectedGitSha:'b'.repeat(40)};
}
test('source expectations do not become manufactured labels',()=>{
 const r=auditTask(fixture());
 assert.equal(r.f2pTests,1);assert.equal(r.p2pTests,1);
 assert.equal(r.triage,'F2P_DECLARED_NOT_REPRODUCED');
 assert.equal(r.beforeFailedVerified,false);assert.equal(r.afterPassedVerified,false);
 assert.equal(r.positiveLabels,0);assert.equal(r.negativeLabels,0);
});
test('no fail-to-pass tests cannot produce a positive',()=>{
 assert.equal(auditTask(fixture('detekt_detekt','4205',[])).triage,'NO_F2P_NOT_POSITIVE');
});
test('spoofed owner, bad SHA and overlapping tests rejected',()=>{
 for(const mutate of [
  x=>x.toml=x.toml.replace('repository_name = "detekt"','repository_name = "other"'),
  x=>x.tomlGitSha='x'.repeat(40),
  x=>x.expected.p2p_tests=x.expected.f2p_tests,
  x=>x.expected.f2p_tests=[123],
  x=>x.expected.s2p_tests=undefined,
  x=>x.name='other-4205'
 ]){const obj=fixture();mutate(obj);assert.throws(()=>auditTask(obj),/C2_UPSTREAM_TASK_TRIAGE_BLOCKED/)}
});
test('106 tasks preserve nine-repo quotas without granting certification',()=>{
 let i=100;
 const entries=Object.entries(PROJECTS).flatMap(([prefix,{tasks}])=>Array.from({length:tasks},()=>fixture(prefix,String(i++),['T'+i])));
 const s=summarizeTasks(entries);
 assert.equal(s.candidateCount,106);assert.equal(s.f2pDeclaredTasks,106);
 assert.equal(s.verifiedOriginalRegressions,0);assert.equal(s.tripleSPlusCertified,false);
 assert.equal(s.precision,null);assert.equal(s.status,'UPSTREAM_EXPECTATIONS_TRIAGED_NOT_EXECUTED');
 assert.throws(()=>summarizeTasks(entries.slice(1)),/C2_UPSTREAM_TASK_TRIAGE_BLOCKED/);
});

test('source preflight rejects missing upstream with a safe stage code',()=>{
 const {spawnSync}=require('node:child_process');
 const {join}=require('node:path');
 const script=join(__dirname,'../../scripts/audit-c2-kotlin-upstream-task-evidence.cjs');
 const result=spawnSync(process.execPath,[script,'/definitely-not-real-c2-upstream','/tmp/not-a-real-c2-report.json'],{encoding:'utf8',timeout:20000});
 assert.equal(result.status,2);
 assert.match(result.stderr,/C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED:SOURCE_CHECK/);
 assert.doesNotMatch(result.stderr,/Error: ENOENT|stack trace/i);
});

test('pinned detekt 7212 expected manifest fits bounded size policy',()=>{
 const {MAX_EXPECTED_TEST_BYTES,MAX_TASK_TOML_BYTES}=require('../../scripts/audit-c2-kotlin-upstream-task-evidence.cjs');
 // Immutable source Git object c1a9e3504d7e94885cc176440a5420c5acbbcfe1:
 // original expected_tests.json is 2,143,404 bytes (larger than old 2 MiB).
 assert.ok(MAX_EXPECTED_TEST_BYTES>=2143404);
 assert.ok(MAX_EXPECTED_TEST_BYTES<=8388608);
 assert.equal(MAX_TASK_TOML_BYTES,65536);
});

test('source reader rejects a Git replacement that changes the committed blob',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {execFileSync}=require('node:child_process');
 const {read}=require('../../scripts/audit-c2-kotlin-upstream-task-evidence.cjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-replace-test-'));
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
 try{
  git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  const rel='task.toml',file=path.join(root,rel);
  fs.writeFileSync(file,'original source content\n');
  git('add',rel);git('commit','-qm','original');
  const original=git('rev-parse','HEAD');
  assert.equal(read(root,rel,65536).content,'original source content\n');
  fs.writeFileSync(file,'substituted source content\n');
  git('add',rel);git('commit','-qm','substituted');
  const replacement=git('rev-parse','HEAD');
  git('replace',original,replacement);git('update-ref','HEAD',original);
  assert.equal(git('rev-parse','HEAD'),original);
  assert.equal(git('status','--porcelain','--untracked-files=no'),'');
  assert.equal(git('rev-parse','HEAD:'+rel),git('hash-object','--',rel));
  assert.notEqual(git('--no-replace-objects','rev-parse','HEAD:'+rel),git('hash-object','--',rel));
  assert.throws(()=>read(root,rel,65536),/C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('source reader rejects bytes changed between identity check and read',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {execFileSync}=require('node:child_process');
 const {read}=require('../../scripts/audit-c2-kotlin-upstream-task-evidence.cjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-read-race-'));
 const originalRead=fs.readFileSync,originalReadSync=fs.readSync;
 try{
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
  git('init','-q');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  const rel='task.toml',file=path.join(root,rel);
  fs.writeFileSync(file,'original source content\n');git('add',rel);git('commit','-qm','original');
  let injected=false;
  fs.readFileSync=function(target,...args){
   if(!injected&&(target===file||typeof target==='number')){
    injected=true;fs.writeFileSync(file,'modified source content\n');
   }
   return originalRead.call(this,target,...args);
  };
  fs.readSync=function(...args){
   if(!injected){injected=true;fs.writeFileSync(file,'modified source content\n');}
   return originalReadSync.apply(this,args);
  };
  assert.throws(()=>read(root,rel,65536),/C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED/);
  assert.equal(injected,true);
 }finally{fs.readFileSync=originalRead;fs.readSync=originalReadSync;fs.rmSync(root,{recursive:true,force:true});}
});

test('source reader rejects FIFO substitution without blocking on open', {skip:process.platform!=='linux'},()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {execFileSync,spawnSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-fifo-'));
 try{
  execFileSync('mkfifo',[path.join(root,'task.toml')],{timeout:5000});
  const scriptPath=require.resolve('../../scripts/audit-c2-kotlin-upstream-task-evidence.cjs');
  const source='const {read}=require('+JSON.stringify(scriptPath)+');'+
   'try { read('+JSON.stringify(root)+',"task.toml",65536); process.exit(2); }'+
   'catch(e) { process.exit(/C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED/.test(String(e.message))?0:3); }';
  const child=spawnSync(process.execPath,['-e',source],
   {encoding:'utf8',timeout:2500,killSignal:'SIGKILL'});
  assert.equal(child.error,undefined,'the FIFO reader must fail closed, not hang');
  assert.equal(child.status,0,'the reader must safely reject a non-regular file');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

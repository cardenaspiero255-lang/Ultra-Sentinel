'use strict';
// These tests guard the experiment's sequencing and launch configuration.
// They do not establish that the host kernel enforced Bubblewrap namespaces;
// that requires an actual adversarial isolation probe in CI.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const workflow='.github/workflows/phase2-blind-elapsed-original-oracle.yml';
const replay='tests/fixtures/jarvis-elapsed-window/reproduce.sh';
const hunter='tests/fixtures/jarvis-elapsed-window/run-blind-hunter.sh';

test('the Hunter completes in its own phase before the oracle environment is launched',()=>{
 const yaml=read(workflow);
 const discovery=yaml.indexOf('run-blind-hunter.sh');
 const evaluation=yaml.indexOf('reproduce.sh');
 assert.ok(discovery>=0,'workflow must invoke the isolated Hunter stage');
 assert.ok(evaluation>discovery,'the oracle phase must follow the Hunter phase');
});

test('the oracle replay consumes an existing discovery report rather than rerunning Hunter with the oracle visible',()=>{
 const script=read(replay);
 assert.ok(/\$#"?\s+-eq\s+4\b/.test(script),'the sealed discovery report is a fourth argument');
 assert.ok(!/scanBlindElapsedWindows\s*\(/.test(script),
  'Hunter must not run inside the later environment containing Sentinel and the oracle');
});

test('the Hunter launcher requires an isolated namespace and does not mount the full answer-bearing workspace',()=>{
 const script=read(hunter);
 const check=spawnSync('bash',['-n',path.join(root,hunter)],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 assert.match(script,/\bbwrap\b/);
 assert.match(script,/--unshare-all\b/);
 assert.match(script,/--clearenv\b/);
 assert.doesNotMatch(script,/--ro-bind\s+["']?\$\{?GITHUB_WORKSPACE\}?["']?\s+\/sentinel\b/);
 assert.doesNotMatch(script,/--(?:ro-)?bind\s+\/\s+\/\s/);
});

test('a hostile worker cannot read an external answer or host environment inside real Bubblewrap',t=>{
 const available=spawnSync('/usr/bin/bwrap',[
  '--die-with-parent','--unshare-all','--new-session','--clearenv',
  '--ro-bind','/','/','--','/bin/true'
 ],{encoding:'utf8',timeout:10000});
 if(available.error||available.status!==0){
  if(process.env.SENTINEL_REQUIRE_BLIND_BWRAP==='1')
   assert.fail('Real Bubblewrap isolation is required but unavailable: '+
    String(available.stderr||available.error||'unknown failure').slice(0,500));
  t.skip('Bubblewrap namespaces unavailable; mandatory CI probe must run with SENTINEL_REQUIRE_BLIND_BWRAP=1');
  return;
 }
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-blind-test-'));
 try{
  const answer=path.join(dir,'oracle-answer.txt');
  const inventory=path.join(dir,'inventory.json'),modulePath=path.join(dir,'hunter.cjs');
  const worker=path.join(dir,'worker.cjs'),out=path.join(dir,'out');
  fs.mkdirSync(out);
  fs.writeFileSync(answer,'this answer must be inaccessible\n');
  const source='package example\nclass Sample\n';
  const sourceBytes=Buffer.from(source);
  const blob=crypto.createHash('sha1').update(`blob ${sourceBytes.length}\0`).update(sourceBytes).digest('hex');
  fs.writeFileSync(inventory,JSON.stringify({expectedCommitSha:'a'.repeat(40),files:[{
   path:'app/src/main/java/example/Sample.kt',source,expectedBlobSha:blob
  }]}));
  fs.writeFileSync(modulePath,"'use strict'; module.exports={};\n");
  fs.writeFileSync(worker,`'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const [inventory,output]=process.argv.slice(2);
assert.equal(inventory,'/input/inventory.json');
assert.equal(output,'/out/discovery.json');
JSON.parse(fs.readFileSync(inventory,'utf8'));
require('/hunter/blind-elapsed-window.cjs');
for(const p of ${JSON.stringify([answer,'/sentinel','/original-jarvis','/proc/1/root'+answer])}){
  try { fs.accessSync(p); throw Error('FORBIDDEN_FILE_EXPOSED: '+p); }
  catch(e) { if(e.code!=='ENOENT'&&e.code!=='EACCES'&&e.code!=='EPERM') throw e; }
}
assert.equal(process.env.SENTINEL_TEST_HOST_SECRET,undefined);
fs.writeFileSync(output,JSON.stringify({probe:'isolated'}),{flag:'wx'});
`);
  const result=spawnSync('bash',[path.join(root,hunter),inventory,modulePath,worker,out],{
   encoding:'utf8',timeout:20000,env:{...process.env,SENTINEL_TEST_HOST_SECRET:'must-not-leak'}
  });
  assert.equal(result.status,0,(result.stderr||result.stdout||'').slice(0,2000));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'discovery.json'),'utf8')),{probe:'isolated'});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

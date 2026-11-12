'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const launcher=path.join(root,'tests/fixtures/gamehub-blind-numeric/run-hunter.sh');
test('blind numeric launcher uses isolated namespace and never mounts original repo or oracle',()=>{
 const s=fs.readFileSync(launcher,'utf8');
 assert.equal(spawnSync('bash',['-n',launcher],{encoding:'utf8'}).status,0);
 for(const required of ['--unshare-all','--clearenv','--ro-bind "$inventory"','--ro-bind "$hunter"','--ro-bind "$worker"','--bind "$output"'])assert.ok(s.includes(required),required);
 assert.match(s,/--ro-bind "\$range_module" \/modules\/family-hunter\/bounded-kotlin-range-flow\.cjs/);
 assert.doesNotMatch(s,/--ro-bind\s+["']?\$\{?GITHUB_WORKSPACE\}?["']?\s+\/sentinel/);
 assert.doesNotMatch(s,/--(?:ro-)?bind\s+\/\s+\/\s/);
});
test('malicious worker cannot read host answer or leaked environment inside real Bubblewrap',t=>{
 const available=spawnSync('/usr/bin/bwrap',['--die-with-parent','--unshare-all','--new-session','--clearenv','--ro-bind','/','/','--','/bin/true'],{encoding:'utf8',timeout:10000});
 if(available.error||available.status!==0){
  if(process.env.SENTINEL_REQUIRE_BLIND_BWRAP==='1')assert.fail('Real Bubblewrap isolation unavailable: '+String(available.stderr||available.error));
  t.skip('Bubblewrap namespace unavailable; pinned CI must run with SENTINEL_REQUIRE_BLIND_BWRAP=1');return;
 }
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-numeric-bwrap-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 const answer=path.join(d,'held-out-oracle-answer'),inventory=path.join(d,'inventory.json'),hunter=path.join(d,'hunter.cjs');
 const worker=path.join(d,'worker.cjs'),payload=path.join(d,'payload.cjs'),policy=path.join(d,'policy.cjs'),out=path.join(d,'out');
 fs.mkdirSync(out);fs.writeFileSync(answer,'private held-out oracle\n');
 const source='package sample\nfun clean() = 123\n';const bytes=Buffer.from(source);
 const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 fs.writeFileSync(inventory,JSON.stringify({expectedCommitSha:'a'.repeat(40),files:[{path:'app/src/main/java/example/Clean.kt',source,expectedBlobSha:sha}],skippedOversized:0}));
 fs.writeFileSync(hunter,"'use strict';module.exports={};\n");fs.writeFileSync(payload,"'use strict';module.exports={};\n");fs.writeFileSync(policy,"'use strict';module.exports={};\n");
 fs.writeFileSync(path.join(d,'bounded-kotlin-range-flow.cjs'),"'use strict';module.exports={};\n");
 fs.writeFileSync(worker,`'use strict';
 const fs=require('node:fs'),assert=require('node:assert/strict');
 assert.equal(process.env.SENTINEL_NUMERIC_HOST_SECRET,undefined);
 JSON.parse(fs.readFileSync('/input/inventory.json','utf8'));
 for(const f of ${JSON.stringify([answer,'/sentinel','/original-gamehub','/proc/1/root'+answer])}){
  try{fs.accessSync(f);throw Error('ORACLE_EXPOSED:'+f);}
  catch(e){if(!['ENOENT','EACCES','EPERM'].includes(e.code))throw e;}
 }
 fs.writeFileSync('/out/discovery.json',JSON.stringify({probe:'isolated'}),{flag:'wx'});
 `);
 const result=spawnSync('bash',[launcher,inventory,hunter,worker,payload,policy,out],
 {encoding:'utf8',timeout:20000,env:{...process.env,SENTINEL_NUMERIC_HOST_SECRET:'do-not-expose'}});
 assert.equal(result.status,0,(result.stderr||result.stdout||'').slice(0,1500));
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'discovery.json'),'utf8')),{probe:'isolated'});
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const prefix='tests/fixtures/gamehub-codec/';
const workflow='.github/workflows/phase2-three-source-gamehub.yml';
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
test('blind worker seals only source hypotheses with no original oracle authority',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'codec-blind-worker-'));
 try{
  const source='package sample\nval value = String(Base64.getDecoder().decode(fields[i]), StandardCharsets.UTF_8)\n';
  const inventory=path.join(dir,'inventory.json'),output=path.join(dir,'report.json');
  fs.writeFileSync(inventory,JSON.stringify({expectedCommitSha:'a'.repeat(40),files:[{
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/data/Codec.kt',source,expectedBlobSha:sha(source)}]}));
  const r=spawnSync(process.execPath,[path.join(root,'packages/family-hunter/phase2-blind-codec-worker.cjs'),inventory,output],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  const verdict=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(verdict.filesScanned,1);
  assert.equal(verdict.findings.length,1);
  assert.equal(verdict.sourceRepositoryAuthenticated,false);
  assert.equal(verdict.originalFunctionalOracleVerified,false);
  assert.equal(verdict.remoteWrites,false);
  assert.equal(verdict.mergeAllowed,false);
  // Altered source bytes may never yield a sealed report.
  fs.unlinkSync(output);
  const obj=JSON.parse(fs.readFileSync(inventory,'utf8'));obj.files[0].source+='//tamper\n';
  fs.writeFileSync(inventory,JSON.stringify(obj));
  const bad=spawnSync(process.execPath,[path.join(root,'packages/family-hunter/phase2-blind-codec-worker.cjs'),inventory,output],{encoding:'utf8'});
  assert.notEqual(bad.status,0);
  assert.equal(fs.existsSync(output),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('source-only scanner runs before a separately mounted original JVM oracle',()=>{
 const yaml=read(workflow);
 const scan=yaml.indexOf('Run blind codec Hunter in a separate no-network namespace');
 const oracle=yaml.indexOf('Execute original codec JVM after sealed blind source discovery');
 assert.ok(scan>=0&&oracle>scan);
 const launch=read(prefix+'run-blind-codec-hunter.sh');
 assert.equal(spawnSync('bash',['-n',path.join(root,prefix+'run-blind-codec-hunter.sh')]).status,0);
 assert.match(launch,/--unshare-all/);assert.match(launch,/--clearenv/);
 assert.match(launch,/--ro-bind "\$inventory" \/input\/inventory.json/);
 assert.doesNotMatch(launch,/--ro-bind "\$GITHUB_WORKSPACE"/);
 const replay=read(prefix+'reproduce.sh');
 assert.equal(spawnSync('bash',['-n',path.join(root,prefix+'reproduce.sh')]).status,0);
 assert.match(replay,/BLIND_CODEC_ORIGINAL_RED_GREEN_VETO_ROLLBACK_PASS/);
 assert.match(yaml,/BLIND_CODEC_ORIGINAL_RED_GREEN_VETO_ROLLBACK_PASS/);
 assert.match(yaml,/sha256sum "\$RUNNER_TEMP\/codec-blind-output\/discovery.json"/);
 assert.match(yaml,/original-gamehub/);
 assert.doesNotMatch(yaml,/pull_request_target/);
});
test('independent held-out Kotlin oracle preserves benign records and rejects malformed identity bytes',()=>{
 const src=read(prefix+'OriginalCodecOracle.kt');
 assert.match(src,/BENIGN_CODEC_PASS/);
 assert.match(src,/LOSSY_UTF8_RECORD_ACCEPTED/);
 assert.match(src,/CODEC_INTEGRITY_ORACLE_PASS/);
 assert.match(read(prefix+'reproduce.sh'),/phase2-executed-jvm-triplet.cjs/);
 assert.match(read(prefix+'reproduce.sh'),/rollbackSandbox/);
});

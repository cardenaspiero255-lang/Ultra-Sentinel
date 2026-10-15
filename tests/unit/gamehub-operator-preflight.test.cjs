'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {operatorFile}=require('../../scripts/check-live-gamehub-preflight.cjs');
test('operator config trust anchor refuses unsafe paths and links',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-operator-file-'));
 try{
  const file=path.join(d,'receipt.json');
  fs.writeFileSync(file,'{"ok":false}',{mode:0o600});
  assert.equal(operatorFile(file),'{"ok":false}');
  assert.throws(()=>operatorFile('relative.json'),/OPERATOR_CONFIG_REQUIRED/);
  fs.chmodSync(file,0o666);
  assert.throws(()=>operatorFile(file),/UNSAFE_OPERATOR_CONFIG_FILE/);
  fs.chmodSync(file,0o600);
  const link=path.join(d,'link');
  fs.symlinkSync(file,link);
  assert.throws(()=>operatorFile(link),/UNSAFE_OPERATOR_CONFIG_FILE/);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('live signed preflight cannot start without operator keys, token and GitHub evidence',()=>{
 const script=path.resolve(__dirname,'../../scripts/check-live-gamehub-preflight.cjs');
 const run=spawnSync(process.execPath,[script],{encoding:'utf8',
  env:{PATH:process.env.PATH,ULTRA_SENTINEL_OWNER_GITHUB_TOKEN:'',
   ULTRA_SENTINEL_GAMEHUB_SIGNED_REQUEST_FILE:'',ULTRA_SENTINEL_REQUIRED_CHECKS_JSON:'[]',
   ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE:'',ULTRA_SENTINEL_AUDIT_PUBLIC_KEY_FILE:''}});
 assert.equal(run.status,1);
 assert.equal(run.stdout,'');
 assert.equal(run.stderr,'GAMEHUB_SIGNED_PREFLIGHT_BLOCKED\n');
});

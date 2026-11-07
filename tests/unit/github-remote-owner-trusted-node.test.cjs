'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {trustedNodePath}=require('../../scripts/run-github-owner-jarvis-remote.cjs');
function temp(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'us-node-bindir-'));
 fs.chmodSync(root,0o700);
 return root;
}
test('original Kotlin/JVM subprocess locates precisely the current trusted Node executable under a private PATH',()=>{
 const root=temp();
 try{
  const value=trustedNodePath(root);
  const entry=path.join(root,'trusted-tools','node');
  assert.equal(fs.lstatSync(entry).isSymbolicLink(),true);
  assert.equal(fs.realpathSync(entry),fs.realpathSync(process.execPath));
  assert.equal(value,root+'/trusted-tools:/usr/local/bin:/usr/bin:/bin');
  const checked=spawnSync('/bin/bash',['-c','command -v node; node -p "process.execPath"'],{
   encoding:'utf8',env:{PATH:value}});
  assert.equal(checked.status,0,checked.stderr);
  assert.equal(checked.stdout.split('\n')[0],entry);
  assert.equal(fs.realpathSync(checked.stdout.split('\n')[1]),fs.realpathSync(process.execPath));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('trusted Node executable is not injected through parent runner PATH',()=>{
 const root=temp(),rogue=path.join(root,'rogue');
 try{
  fs.mkdirSync(rogue);
  fs.writeFileSync(path.join(rogue,'node'),'#!/bin/sh\necho ATTACKER\n',{mode:0o755});
  const old=process.env.PATH;
  process.env.PATH=rogue+':'+old;
  let value;
  try{value=trustedNodePath(root);}finally{process.env.PATH=old;}
  assert.ok(!value.includes(rogue));
  const checked=spawnSync('/bin/bash',['-c','node --version'],{
   encoding:'utf8',env:{PATH:value}});
  assert.equal(checked.status,0);
  assert.match(checked.stdout,/^v\d+/);
  assert.ok(!checked.stdout.includes('ATTACKER'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('trustedNodePath rejects untrusted executable and unsafe work directory',()=>{
 const root=temp(),bad=path.join(root,'bad-node');
 try{
  fs.writeFileSync(bad,'#!/bin/sh\necho untrusted\n',{mode:0o777});
  fs.chmodSync(bad,0o777); // umask could otherwise turn 0777 into 0755.
  assert.throws(()=>trustedNodePath(root,bad),/OWNER_TRUSTED_NODE_/);
  fs.chmodSync(root,0o777);
  assert.throws(()=>trustedNodePath(root),/OWNER_TRUSTED_NODE_/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

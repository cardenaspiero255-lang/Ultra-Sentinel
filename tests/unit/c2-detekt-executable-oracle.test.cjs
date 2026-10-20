'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 actual Detekt Kotlin executable-oracle JUnit receipts fail closed and preserve no GOLD',()=>{
 const r=spawnSync('python3',['-m','unittest','discover','-s','tests/unit',
  '-p','test_c2_detekt_executable_oracle.py','-v'],
  {encoding:'utf8',timeout:60_000,maxBuffer:1024*1024});
 assert.equal(r.status,0,String(r.error||'')+'\n'+r.stdout+'\n'+r.stderr);
 assert.match(r.stderr,/Ran 8 tests/);
 assert.match(r.stderr,/OK/);
});
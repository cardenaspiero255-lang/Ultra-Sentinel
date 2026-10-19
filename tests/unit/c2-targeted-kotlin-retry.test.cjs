'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 targeted 62 retries are exactly bounded and never become benchmark labels',()=>{
 const r=spawnSync('python3',['-m','unittest','discover','-s','tests/unit','-p','test_c2_targeted_kotlin_retry.py','-v'],
 {encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
 assert.equal(r.status,0,String(r.error||'')+'\n'+r.stdout+'\n'+r.stderr);
 assert.match(r.stderr,/Ran 5 tests/);
 assert.match(r.stderr,/OK/);
});

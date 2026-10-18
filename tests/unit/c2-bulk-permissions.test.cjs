'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 Docker original-suite evidence permissions regression',()=>{
 const r=spawnSync('python3',['-m','unittest','discover','-s','tests/unit','-p','test_c2_bulk_permissions.py'],{
  encoding:'utf8',timeout:45_000,maxBuffer:1_048_576
 });
 assert.equal(r.status,0,String(r.error||'')+'\n'+r.stdout+'\n'+r.stderr);
 assert.match(r.stderr,/Ran 2 tests/);
 assert.match(r.stderr,/OK/);
});

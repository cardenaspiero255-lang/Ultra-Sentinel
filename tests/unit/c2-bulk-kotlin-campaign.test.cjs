'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 106-task replay campaign fail-closed roster and receipts',()=>{
  const result=spawnSync('python3',['-m','unittest','discover','-s','tests/unit','-p','test_c2_bulk_kotlin_campaign.py'],{
    encoding:'utf8',timeout:90_000,maxBuffer:1048576
  });
  assert.equal(result.status,0,String(result.error||'')+'\n'+result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 11 tests/);
  assert.match(result.stderr,/OK/);
});

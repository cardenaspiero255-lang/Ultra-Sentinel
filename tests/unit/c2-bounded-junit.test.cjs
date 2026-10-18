'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 original JUnit volume limits remain bounded across capture and verification',()=>{
 const x=spawnSync('python3',['-m','unittest','discover','-s','tests/unit','-p','test_c2_bounded_junit_capture.py','-v'],
  {encoding:'utf8',timeout:90_000,maxBuffer:1024*1024});
 assert.equal(x.status,0,String(x.error||'')+'\n'+x.stdout+'\n'+x.stderr);
 assert.match(x.stderr,/Ran 6 tests/);
 assert.match(x.stderr,/OK/);
});

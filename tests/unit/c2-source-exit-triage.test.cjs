'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 phase 40/41 original failed after test is mismatched, never infrastructure or a gold label',()=>{
 const x=spawnSync('python3',['-m','unittest','discover','-s','tests/unit','-p','test_c2_source_exit_triage.py','-v'],
 {encoding:'utf8',timeout:45000,maxBuffer:1048576});
 assert.equal(x.status,0,String(x.error||'')+'\n'+x.stdout+'\n'+x.stderr);
 assert.match(x.stderr,/Ran 4 tests/);assert.match(x.stderr,/OK/);
});

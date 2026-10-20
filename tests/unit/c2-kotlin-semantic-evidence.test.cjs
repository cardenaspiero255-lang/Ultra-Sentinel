'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');

test('Optional JVM Kotlin/Gradle semantic evidence fails closed on forged XML, SHA, marker, or skipped tests',()=>{
 const r=spawnSync('python3',['-m','unittest','discover','-s','tests/unit',
  '-p','test_c2_kotlin_semantic_evidence.py','-v'],
  {encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
 assert.equal(r.status,0,String(r.error||'')+'\n'+r.stdout+'\n'+r.stderr);
 assert.match(r.stderr,/Ran 7 tests/);
 assert.match(r.stderr,/OK/);
});

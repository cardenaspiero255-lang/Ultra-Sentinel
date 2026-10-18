'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 upstream JUnit transition gate rejects counterfeit and broken evidence',()=>{
  const result=spawnSync('python3',['-m','unittest','discover','-s','tests/unit','-p','test_c2_upstream_junit_evidence.py'],{
    encoding:'utf8',timeout:90_000,maxBuffer:1024*1024
  });
  assert.equal(result.status,0,`Python execution unsuccessful: ${result.error||''}\n${result.stdout}\n${result.stderr}`);
  const match=result.stderr.match(/Ran (\d+) tests/);
  assert.ok(match,`Missing Python unittest completion summary: ${result.stderr}`);
  assert.ok(Number(match[1])>=19,`Expected all 19 JUnit evidence regressions, got ${match[1]}`);
  assert.match(result.stderr,/OK/);
});

'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');

test('C2 declared-only Detekt wrapper aliases preserve raw evidence and reject collisions', () => {
  const p = spawnSync('python3',['-m','unittest','discover','-s','tests/unit',
    '-p','test_c2_wrapper_declared_aliases.py','-v'],
    {encoding:'utf8',timeout:90_000,maxBuffer:1048576});
  assert.equal(p.status,0,String(p.error||'')+'\n'+p.stdout+'\n'+p.stderr);
  assert.match(p.stderr,/Ran 9 tests/);
  assert.match(p.stderr,/OK/);
});

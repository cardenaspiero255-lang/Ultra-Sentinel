'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');

test('C2 Detekt six-case replay is bounded, compared with original, and cannot mint labels', () => {
  const r = spawnSync('python3', [
    '-m','unittest','discover','-s','tests/unit',
    '-p','test_c2_detekt_six_replay.py','-v'
  ], {encoding:'utf8', timeout:60_000, maxBuffer:1_048_576});
  assert.equal(r.status, 0, String(r.error||'')+'\n'+r.stdout+'\n'+r.stderr);
  assert.match(r.stderr,/Ran 6 tests/);
  assert.match(r.stderr,/OK/);
});

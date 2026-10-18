'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
test('C2 Detekt JUnit legitimate names and conservative duplicate handling', () => {
  const r = spawnSync('python3', ['-m','unittest','discover','-s','tests/unit',
     '-p','test_c2_upstream_detekt_names.py'], {
    encoding:'utf8',timeout:60_000,maxBuffer:1_048_576,
  });
  assert.equal(r.status, 0, (r.error || '') + '\n' + r.stdout + '\n' + r.stderr);
  assert.match(r.stderr, /Ran 6 tests/);
  assert.match(r.stderr, /OK/);
});

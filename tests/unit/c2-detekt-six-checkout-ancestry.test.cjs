'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

test('Detekt six-case source workflow fetches enough history for the fixed-validator ancestry check', () => {
  const yaml = readFileSync(join(__dirname, '../../.github/workflows/c2-detekt-six-corrected-main-replay.yml'), 'utf8');
  const steps = yaml.split(/\n      - /);
  const sentinel = steps.filter(x => x.startsWith('uses: actions/checkout@') && /\n\s+path: sentinel\n/.test(x));
  assert.equal(sentinel.length, 3, 'each phase must checkout corrected Sentinel main');
  for (const step of sentinel) {
    assert.match(step, /\n\s+fetch-depth: 0\n/, 'shallow checkout cannot prove a parent SHA');
    assert.match(step, /\n\s+persist-credentials: false(?:\n|$)/);
  }
  assert.match(yaml, /merge-base --is-ancestor aea223a4dd6c9c6a7f6c7d65fddcca094b0eea7c HEAD/g);
  assert.match(yaml, /run-id: 39214460564/);
});

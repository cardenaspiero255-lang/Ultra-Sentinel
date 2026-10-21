'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('scripts/c2-pr181-replay-original-three.sh','utf8');
test('RED: compile all Kotlin ABI files explicitly and bind Bubblewrap arguments',()=>{
 assert.doesNotMatch(source, /@@(?:ABI|MOUNTS)@@/);
 assert.match(source, /\$\{abi\[@\]\}/);
 assert.match(source, /\$\{mounts\[@\]\}/);
 assert.match(source, /kotlinc "\$first"/);
 assert.match(source, /--unshare-all --new-session/);
});

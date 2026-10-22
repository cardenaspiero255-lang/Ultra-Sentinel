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

test('expected vulnerable Kotlin failure is handled as an if condition, not swallowed or aborted by ERR trap',()=>{
 assert.match(source, /if run_jar "\$label-extra-original"/);
 assert.match(source, /if run_jar 158-blanket/);
 assert.doesNotMatch(source, /set \+e\s*\n\s*run_jar/);
 assert.match(source, /test "\$original_exit" -ne 0/);
 assert.match(source, /test "\$blanket_exit" -ne 0/);
});

test('CLI must accept four distinct evidence and output paths before attempting input IO',()=>{
 const {main}=require('../../scripts/c2-pr181-adjudicate.cjs');
 const root='/tmp/c2-pr182-unique-input-nonexistent-';
 assert.throws(
  ()=>main([root+'owner.json',root+'positive.json',root+'negative.json',root+'output.json']),
  error=>error.code==='ENOENT'
 );
 assert.throws(
  ()=>main([root+'owner.json',root+'positive.json',root+'negative.json',root+'owner.json']),
  /C2_PR181_OVERWRITE_BLOCKED/
 );
});

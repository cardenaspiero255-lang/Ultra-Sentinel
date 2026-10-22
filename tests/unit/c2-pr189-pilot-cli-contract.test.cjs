'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('PR189 positional file arguments must resolve individually, never pass Array.map extra params to path.resolve',()=>{
 const script=fs.readFileSync('scripts/c2-pr189-review-pilot-16.cjs','utf8');
 assert.doesNotMatch(script,/\.map\(path\.resolve\)/);
 assert.match(script,/\.map\(x=>path\.resolve\(x\)\)/);
});

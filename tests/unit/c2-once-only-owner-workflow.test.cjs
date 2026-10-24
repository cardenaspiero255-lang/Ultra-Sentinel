'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const wf=n=>fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/'+n),'utf8');
test('one-time owner source authorizations are gated by introducing merge, not retriggered on every main push',()=>{
 for(const filename of ['c2-owner-source-release-7428.yml','c2-frozen-path-bitwarden7499.yml']){
  const y=wf(filename);
  assert.match(y,/owner-introduction-check:/,'missing introducing SHA filter in '+filename);
  assert.match(y,/outputs:\s*\n\s*introduced:/,'missing conditional receipt in '+filename);
  assert.match(y,/owner-only-source-release:|owner-authorized-one-source-read:/);
  assert.match(y,/needs\.owner-introduction-check\.outputs\.introduced\s*==\s*'true'/,
   'owner source read must skip after request has been consumed in '+filename);
  assert.match(y,/git diff --name-only/);
 }
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('source bundle uses exact Git content, safe paths, Git object validation and no detector execution',()=>{
 const s=read('scripts/materialize-c2-source-universe.cjs');
 for(const k of ['verifyEightSourceCompares','gitBlob','cat-file','sha1',
  "['merge-base',lock.baseSha,lock.headSha]",
  "'--name-only','-z','--no-renames'",
  "'--binary','--full-index','--no-textconv','--no-ext-diff'",
  'sourceUniverseSha256','materializedChangedEntries',
  'completeForBothInputs:true','detectorsExecuted:false','truthRead:false',
  'precision:null','tripleSPlusCertified:false'])assert.ok(s.includes(k),k);
 assert.doesNotMatch(s,/eval\s*\(|child_process.*execSync|auto.?merge|GITHUB_TOKEN/);
});
test('owner workflow pins baseline to immediate predecessor and fetches all source once',()=>{
 const w=read('.github/workflows/c2-frozen-source-universe.yml');
 for(const token of [
 'github.event.repository.id == 1418338512',
 "github.event.comment.user.id == 322222186",
 'ULTRA_SENTINEL_C2_FROZEN_SOURCE_UNIVERSE_V1',
 '3c97b60717f6a08ddc7d618587202537d62bc951',
 '547938ed88804e25bbabecf74a3c3d91b74cf1a4',
 'b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9',
 '7df2a994f566ad56bdacab999fa6ba83b69e3b4d',
 'git rev-list --parents -n 1',
 '"${entries[@]}"','github.token','env -u GH_TOKEN -u GITHUB_TOKEN',
 'verify-c2-source-inventory.cjs','materialize-c2-source-universe.cjs',
 '241','source-universe.tar','SHA256SUMS','retention-days: 30',
 'detectorsExecuted == false','tripleSPlusCertified == false'
 ])assert.ok(w.includes(token),token);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge|docker run|candidate-predictions/);
});
test('offline compare verification never certifies or fabricates missing original labels',()=>{
 const s=read('scripts/verify-c2-source-inventory.cjs');
 assert.match(s,/verifyEightSourceCompares/);
 assert.match(s,/isSymbolicLink/);
 assert.match(s,/nlink!==1/);
 assert.match(s,/process.exitCode=2/);
 assert.doesNotMatch(s,/https?:\/\/|GITHUB_TOKEN|child_process/);
});

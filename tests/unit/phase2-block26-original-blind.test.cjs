'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {readManifest,buildSeal,verifySeal,adjudicate,MARKERS}=require('../../scripts/phase2-block26-original-blind.cjs');
const attempts=()=>Object.fromEntries(Object.entries(MARKERS).map(([kind,marker])=>[kind,{exitCode:1,stdout:'',stderr:marker+'\n',outputPresent:false}]));
test('all 27 original algorithm files retain authentic root paths and the precommitted frozen v4 identity',()=>{
 const m=readManifest();
 assert.equal(m.source.files.length,27);
 assert.equal(m.source.repository,'TheAlgorithms/Kotlin');
 assert.equal(m.engine.commitSha,'84c824ce6bfe3d260296108e955bbbc4624e6b7e');
 assert(m.source.files.every(f=>f.path.startsWith('src/main/kotlin/')));
});
test('four frozen worker rejections are sealed as abstentions, never as analyzed negatives',()=>{
 const a=attempts(),s=buildSeal(a);
 assert.equal(s.sourceFiles,27);assert.equal(s.filesAnalyzed,0);
 assert.equal(s.abstentions,27);assert.equal(s.unverifiedFindings,0);
 assert.equal(s.block26Closed,false);assert.equal(s.block27Allowed,false);
 assert.equal(s.precision,null);assert.deepEqual(verifySeal(s,a),s);
 for(const mutate of [x=>x.numeric.exitCode=0,x=>x.codec.stderr='bwrap: Operation not permitted',x=>x.identity.outputPresent=true,x=>delete x.cancellation,x=>x.numeric.stdout='fabricated']){
  const b=attempts();mutate(b);assert.throws(()=>buildSeal(b));
 }
});
test('mutation of raw errors, digest, coverage, and invented discovery is rejected before oracle interpretation',()=>{
 const a=attempts(),s=buildSeal(a);
 for(const mutate of [x=>x.predictionDigest='0'.repeat(64),x=>x.filesAnalyzed=27,x=>x.block26Closed=true,x=>x.extra=true]){
  const b=structuredClone(s);mutate(b);assert.throws(()=>verifySeal(b,a));
 }
 const b=attempts();b.numeric.stderr+='tampered';assert.throws(()=>verifySeal(s,b));
});
test('independent original numeric counterexamples cannot close discovery without a frozen Hunter finding',()=>{
 const a=attempts(),s=buildSeal(a);
 const oracle={schema:'ultra-sentinel-block26-original-jvm-observations/v1',
  controls:{sort:8,search:8,factorial:21},
  numeric:[{id:'median',cases:780,mismatches:1,examples:[{input:[2147483647,2147483647],expected:'2147483647.0',actual:'-1.0'}]},
           {id:'average',cases:780,mismatches:1,examples:[{input:[2147483647,2147483647],expected:'2147483647',actual:'-1'}]}]};
 const r=adjudicate(s,a,oracle);
 assert.equal(r.independentCounterexampleFunctions,2);
 assert.equal(r.hunterConfirmedDefects,0);assert.equal(r.functionalFamiliesDiscoveredByHunter,0);
 assert.equal(r.block26Closed,false);assert.equal(r.block27Allowed,false);
 for(const mutate of [x=>x.numeric[0].mismatches=781,x=>x.numeric[0].examples[0].actual=x.numeric[0].examples[0].expected,x=>x.controls.sort=0,x=>x.numeric[1].id='median']){
  const o=structuredClone(oracle);mutate(o);assert.throws(()=>adjudicate(s,a,o));
 }
});
test('CI authenticates prospective commits, invokes original source-only launchers, then runs original JVM contracts in a dependent job',()=>{
 const y=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block26-original-blind.yml'),'utf8');
 assert.match(y,/needs: frozen-source-only/);
 assert.match(y,/6195048a1d762e4d7d406db459e55df38a68c2ad 01288f49892c8e9242c0a4df8550a2317c2d6faa/);
 assert.match(y,/for kind in numeric codec identity cancellation/);
 assert.match(y,/phase2-block25d\/run-blind-cancellation-v4.sh/);
 assert.match(y,/--unshare-all --new-session --clearenv/);
 assert(y.indexOf('before-oracle')<y.indexOf('/jdk/bin/java -jar'));
 assert.doesNotMatch(y,/continue-on-error|if: always/);
});

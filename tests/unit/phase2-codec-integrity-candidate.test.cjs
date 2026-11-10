'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {draftCodecIntegrityCandidate}=require('../../packages/recovery/phase2-codec-integrity-candidate.cjs');
const path='app/src/main/java/com/cardenaspiero255/gamehubultra/data/GameSessionStore.kt';
const source='package sample\nfun field(index: Int): String =\n    String(Base64.getDecoder().decode(fields[index]), StandardCharsets.UTF_8)\n';
const blob=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const data=()=>({expectedCommitSha:'a'.repeat(40),
 file:{path,source,expectedBlobSha:blob(source)},
 finding:{rule:'LOSSY_BASE64_UTF8_DECODE',path,line:3,expectedBlobSha:blob(source),status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}});
test('drafts a constrained candidate without promoting original oracle authority',()=>{
 const r=draftCodecIntegrityCandidate(data());
 assert.equal(r.status,'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE');
 assert.match(r.candidateSource,/onMalformedInput/);
 assert.match(r.candidateSource,/REPORT/);
 assert.equal(blob(r.candidateSource),r.candidateBlobSha);
 assert.equal(r.originalFunctionalOracleVerified,false);
 assert.equal(r.remoteWrites,false);
 assert.equal(r.mergeAllowed,false);
});
test('rejects stale or altered findings and nonunique transformations',()=>{
 for(const mutate of [
  x=>{x.file.source+='// mutation\n'},
  x=>{x.finding.line=2},
  x=>{x.finding.rule='OTHER'},
  x=>{x.file.source+=source.slice(source.indexOf('    String('));x.file.expectedBlobSha=blob(x.file.source)},
  x=>{x.finding.expectedBlobSha='f'.repeat(40)},
  x=>{x.file.path='../path.kt'},
  x=>{x.expectedCommitSha='invalid'}
 ]){
  const x=data();mutate(x);
  assert.match(draftCodecIntegrityCandidate(x).status,/^BLOCKED_/);
 }
});
test('rejects input getters and proxies without execution',()=>{
 let sideEffects=0;
 const a=data();
 Object.defineProperty(a.file,'source',{get(){sideEffects++;throw Error('bad')},enumerable:true});
 assert.match(draftCodecIntegrityCandidate(a).status,/^BLOCKED_/);
 const b=new Proxy(data(),{ownKeys(){sideEffects++;throw Error('bad')}});
 assert.match(draftCodecIntegrityCandidate(b).status,/^BLOCKED_/);
 assert.equal(sideEffects,0);
});

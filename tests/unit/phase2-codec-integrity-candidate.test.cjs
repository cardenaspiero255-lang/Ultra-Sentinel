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

const {scanCodecIntegrityHypotheses}=
 require('../../packages/family-hunter/phase2-codec-integrity-hunter.cjs');
function multilineInput(){
 const src=[
  'package sample',
  'fun unpack(payload: String): String =',
  ' String(',
  '  Base64.getUrlDecoder()',
  '   .decode(payload),',
  '  StandardCharsets.UTF_8',
  ' )',
  ''
 ].join('\n');
 const file={path,source:src,expectedBlobSha:blob(src)};
 const scan=scanCodecIntegrityHypotheses({expectedCommitSha:'a'.repeat(40),files:[file]});
 assert.equal(scan.findings.length,1);
 return {expectedCommitSha:'a'.repeat(40),file,finding:scan.findings[0]};
}
test('Fixer transforms an actual multiline Hunter finding into a strictly scoped candidate',()=>{
 const request=multilineInput();
 const out=draftCodecIntegrityCandidate(request);
 assert.equal(out.status,'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE');
 assert.match(out.candidateSource,/Base64\.getUrlDecoder\(\)\s*\.decode\(payload\)/);
 assert.match(out.candidateSource,/onMalformedInput\(java\.nio\.charset\.CodingErrorAction\.REPORT\)/);
 assert.doesNotMatch(out.candidateSource,/\bString\s*\(\s*Base64/);
 assert.equal(out.candidateBlobSha,blob(out.candidateSource));
 assert.equal(out.originalFunctionalOracleVerified,false);
 assert.equal(out.mergeAllowed,false);
});
test('Fixer refuses a multiline finding altered after the sealed Hunter scan',()=>{
 const input=multilineInput();
 input.finding={...input.finding,line:input.finding.line+1};
 assert.equal(draftCodecIntegrityCandidate(input).status,'BLOCKED_CODEC_CANDIDATE');
});
test('Fixer does not trust a source-only finding generated from malformed Unicode bytes',()=>{
 const input=data();
 input.file.source=input.file.source.replace('package sample','package sample // \\uD800');
 input.file.expectedBlobSha=blob(input.file.source);
 input.finding.expectedBlobSha=input.file.expectedBlobSha;
 assert.equal(draftCodecIntegrityCandidate(input).status,'BLOCKED_CODEC_CANDIDATE');
});

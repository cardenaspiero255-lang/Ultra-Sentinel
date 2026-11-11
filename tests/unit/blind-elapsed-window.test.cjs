'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {scanBlindElapsedWindows}=require('../../packages/family-hunter/blind-elapsed-window.cjs');
const {draftElapsedWindowCandidate}=require('../../packages/recovery/elapsed-window-candidate.cjs');
const HASH=s=>{const b=Buffer.from(s);return crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');};
const head='a'.repeat(40);
const path='apps/android/app/src/main/java/example/core/Consent.kt';
const source=`package example\nclass Consent {\n val started: Long? = null\n fun fresh(now: Long): Boolean {\n  val issued = started\n  val fresh = issued != null && now >= issued &&\n      now - issued < EXPIRY_MS\n  return fresh\n }\n companion object { const val EXPIRY_MS = 30000L }\n}\n`;
const benign=`package example\nclass Valid {\n fun okay(now: Long, issued: Long): Boolean {\n  val elapsed = now - issued\n  return elapsed >= 0L && elapsed < 30000L\n }\n}\n`;
const pack=(p,s)=>({path:p,source:s,expectedBlobSha:HASH(s)});
const files=[pack('apps/android/app/src/main/java/example/core/Harmless.kt',benign),pack(path,source)];
test('source-only blind intake finds risky window without a provided path or patch',()=>{
 const result=scanBlindElapsedWindows({expectedCommitSha:head,files});
 assert.equal(result.status,'UNVERIFIED_ELAPSED_WINDOW_HYPOTHESES');
 assert.equal(result.findings.length,1);
 assert.equal(result.findings[0].path,path);
 assert.equal(result.findings[0].sourceBlobSha,HASH(source));
 assert.equal(result.findings[0].rule,'SIGNED_ELAPSED_WINDOW_UNDERFLOW');
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.mergeAllowed,false);
 assert.ok(!JSON.stringify(result).includes('candidateSource'));
});
test('benign signed elapsed guard is not flagged',()=>{
 const r=scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,benign)]});
 assert.equal(r.findings.length,0);
});
test('commented, forged blob and duplicated paths fail safely',()=>{
 const comment=`package example\n/* val fresh = issued != null && now >= issued && now - issued < EXPIRY_MS */\n`;
 assert.equal(scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,comment)]}).findings.length,0);
 assert.match(scanBlindElapsedWindows({expectedCommitSha:head,files:[{...files[1],expectedBlobSha:'f'.repeat(40)}]}).status,/^BLOCKED_/);
 assert.match(scanBlindElapsedWindows({expectedCommitSha:head,files:[files[1],files[1]]}).status,/^BLOCKED_/);
});
test('candidate is generated after blind finding, pins original bytes, keeps safe windows',()=>{
 const r=scanBlindElapsedWindows({expectedCommitSha:head,files});
 const proposal=draftElapsedWindowCandidate({expectedCommitSha:head,file:files[1],finding:r.findings[0]});
 assert.equal(proposal.status,'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE');
 assert.match(proposal.candidateSource,/now - issued >= 0L && now - issued < EXPIRY_MS/);
 assert.equal(proposal.candidateBlobSha,HASH(proposal.candidateSource));
 assert.equal(proposal.generatedByScopedFixer,true);
 assert.equal(proposal.originalFunctionalOracleVerified,false);
 assert.equal(proposal.remoteWrites,false);
 assert.equal(proposal.mergeAllowed,false);
 assert.equal(scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,proposal.candidateSource)]}).findings.length,0);
 const changed={...files[1],source:source+'\n'};
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:changed,finding:r.findings[0]}).status,/^BLOCKED_/);
});
test('ambiguous occurrences and hostile accessor input are not trusted',()=>{
 const two=source+source.replace('package example','// second code section');
 const r=scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,two)]});
 assert.equal(r.findings.length,2);
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:pack(path,two),finding:r.findings[0]}).status,/^BLOCKED_/);
 let touched=false;
 const hostile={expectedCommitSha:head,files};
 Object.defineProperty(hostile,'files',{get(){touched=true;throw Error('GETTER_CALLED')},enumerable:true});
 assert.match(scanBlindElapsedWindows(hostile).status,/^BLOCKED_/);
 assert.equal(touched,false);
});
test('defensive scan rejects malformed repository records without trusting caller booleans',()=>{
 const probes=[
  {expectedCommitSha:'a'.repeat(39),files},
  {expectedCommitSha:head,files:[]},
  {expectedCommitSha:head,files:[{...files[1],path:'/tmp/x.kt'}]},
  {expectedCommitSha:head,files:[{...files[1],path:'apps/android/../src/main/a.kt'}]},
  {expectedCommitSha:head,files:[{...files[1],path:'apps/android/not-kotlin.java'}]},
  {expectedCommitSha:head,files:[{...files[1],path:'x.kt'}]},
  {expectedCommitSha:head,files:[{...files[1],path:'a'.repeat(360)+'.kt'}]},
  {expectedCommitSha:head,files:[{...files[1],source:undefined}]},
  {expectedCommitSha:head,files:[{...files[1],source:'few\n'}]},
  {expectedCommitSha:head,files:[{...files[1],source:source+'\u0000'}]},
  {expectedCommitSha:head,files:[{...files[1],source:source+'\r\n'}]},
  {expectedCommitSha:head,files:[{...files[1],source:source.trimEnd()}]},
  {expectedCommitSha:head,files:[{...files[1],source:'x'.repeat(160010)+'\n'}]},
  {expectedCommitSha:head,files:[{...files[1],source:'x\n'.repeat(4100)}]},
  {expectedCommitSha:head,files:[{...files[1],expectedBlobSha:123}]},
  {expectedCommitSha:head,files:[{...files[1],expectedBlobSha:'Z'.repeat(40)}]},
  {expectedCommitSha:head,files:[{...files[1],source:source,extra:'not accepted'}]},
  {expectedCommitSha:head,files:{0:files[1],length:1}}
 ];
 for(const candidate of probes){
  const r=scanBlindElapsedWindows(candidate);
  assert.match(r.status,/^BLOCKED_/,JSON.stringify(candidate).slice(0,100));
  assert.equal(r.mergeAllowed,false);
 }
});
test('Kotlin comments, strings, chars and unterminated literals never become executable findings',()=>{
 const suspicious='val fresh = issued != null && now >= issued && now - issued < TIMEOUT';
 const comments=`package example\n/* outer /* nested */ ${suspicious} */\n// ${suspicious}\n`;
 const strings=`package example\nval example = "${suspicious}"\nval x = 'a'\nval escaped = "\\\" ${suspicious}"\nval raw = """ ${suspicious} """\n`;
 const multiline=`package example\n/* unterminated \n ${suspicious}\n`;
 const raw=`package example\nval x = """unterminated \n ${suspicious}\n`;
 const quoted=`package example\nval x = "unterminated \n ${suspicious}\n`;
 assert.equal(scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,comments)]}).findings.length,0);
 assert.equal(scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,strings)]}).findings.length,0);
 for(const value of [multiline,raw,quoted])
  assert.equal(scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,value)]}).status,'BLOCKED_UNTERMINATED_KOTLIN');
});
test('Fixer refuses different discovery receipts and malformed input without accessing getters',()=>{
 const finding=scanBlindElapsedWindows({expectedCommitSha:head,files}).findings[0];
 const changes=[
  {...finding,rule:'RULE_UNKNOWN'},
  {...finding,path:'apps/android/app/src/main/Other.kt'},
  {...finding,line:finding.line+1},
  {...finding,offset:finding.offset+1},
  {...finding,sourceBlobSha:'f'.repeat(40)}
 ];
 for(const f of changes){
  assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:files[1],finding:f}).status,/^BLOCKED_/);
 }
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:'f'.repeat(40),file:files[1],finding}).status,/^BLOCKED_/);
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:{...files[1],path:'a.kt'},finding}).status,/^BLOCKED_/);
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:{...files[1],unexpected:1},finding}).status,/^BLOCKED_/);
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:files[1],finding:{...finding,extra:1}}).status,/^BLOCKED_/);
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:files[1],finding:null}).status,/^BLOCKED_/);
 assert.match(draftElapsedWindowCandidate({expectedCommitSha:head,file:files[1],finding:Object.create(null)}).status,/^BLOCKED_/);
 let invoked=false;
 const input={expectedCommitSha:head,file:files[1],finding};
 Object.defineProperty(input,'finding',{get(){invoked=true;throw Error('NEVER')},enumerable:true});
 assert.match(draftElapsedWindowCandidate(input).status,/^BLOCKED_/);
 assert.equal(invoked,false);
});

test('blind source inventory refuses lossy UTF-16 before reporting an authenticated blob',()=>{
 // Node replaces an isolated surrogate with U+FFFD when encoding UTF-8.
 // A SHA-1 computed over those replacement bytes cannot attest the original
 // JavaScript string used by a source-only detector.
 const malformed=source.replace('class Consent', 'class \uD800Consent');
 const r=scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,malformed)]});
 assert.equal(r.status,'BLOCKED_INVENTORY');
 assert.deepEqual(r.findings,[]);
 assert.equal(r.remoteWrites,false);
});
test('well-formed supplementary Unicode remains a valid source inventory',()=>{
 const wellFormed=source.replace('class Consent','// 😀 supplementary character\nclass Consent');
 const r=scanBlindElapsedWindows({expectedCommitSha:head,files:[pack(path,wellFormed)]});
 assert.equal(r.status,'UNVERIFIED_ELAPSED_WINDOW_HYPOTHESES');
 assert.equal(r.findings.length,1);
 assert.equal(r.findings[0].sourceBlobSha,HASH(wellFormed));
});

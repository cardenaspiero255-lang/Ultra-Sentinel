'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanIdentityDelimiterHypotheses}=require('../../packages/family-hunter/phase2-identity-delimiter-hunter.cjs');
const {draftIdentityDelimiterCandidate}=require('../../packages/recovery/phase2-identity-delimiter-candidate.cjs');
const head='a'.repeat(40),path='app/src/main/java/com/example/AnyIdentity.kt';
const source='package demo\nobject CompositeIdentity {\n fun fingerprint(a: String,b: String): String = listOf(\n a,\n b.orEmpty(),\n "literal"\n ).joinToString("¦")\n}\n';
function blob(source){const b=Buffer.from(source,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
function file(source,pathOverride=path){return {path:pathOverride,source,expectedBlobSha:blob(source)};}
function scan(source,where=path){return scanIdentityDelimiterHypotheses({expectedCommitSha:head,files:[file(source,where)]});}
function draft(source){const f=file(source),finding=scan(source).findings[0];return draftIdentityDelimiterCandidate({expectedCommitSha:head,file:f,finding});}
test('finds an unregistered ambiguous identity serializer in Kotlin with source-only evidence',()=>{
 const out=scan(source);
 assert.equal(out.status,'IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 assert.deepEqual(out.findings.map(({rule,path,line,expectedBlobSha})=>[rule,path,line,expectedBlobSha]),
 [['AMBIGUOUS_DELIMITED_IDENTITY',path,3,blob(source)]]);
 for(const k of ['sourceRepositoryAuthenticated','originalFunctionalOracleVerified','causalityVerified','generalizationVerified','remoteWrites','mergeAllowed'])assert.equal(out[k],false);
 assert.equal(out.sourceByteIntegrityVerified,true);
});
test('recognizes distinct paths and source layouts without target file or field names',()=>{
 const other='package demo\nval serialized = listOf(first, second).joinToString("|")\n';
 const out=scanIdentityDelimiterHypotheses({expectedCommitSha:head,files:[file(other,'module/src/main/kotlin/Z.kt'),file(source,'module/src/main/kotlin/A.kt')]});
 assert.deepEqual(out.findings.map(x=>x.path),['module/src/main/kotlin/A.kt','module/src/main/kotlin/Z.kt']);
});
test('a byte-pinned unique observation produces only a provisional length-prefixed candidate',()=>{
 const out=draft(source);
 assert.equal(out.status,'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_AND_MIGRATION_ORACLE');
 assert.match(out.candidateSource,/\.map \{ "\$\{it\.length\}:\$it" \}\.joinToString\("¦"\)/);
 assert.equal(out.candidateBlobSha,blob(out.candidateSource));
 for(const k of ['originalFunctionalOracleVerified','legacyKeyMigrationVerified','remoteWrites','mergeAllowed'])assert.equal(out[k],false);
 assert.equal(scan(out.candidateSource).findings.length,0);
});
test('comments, quoted/raw literals and nested parentheses do not fabricate findings',()=>{
 const safe='package demo\nobject Fingerprint {\n // val f=listOf(a,b).joinToString("¦")\n /* outer /* nested */ val f=listOf(a,b).joinToString("¦") */\n val s="""listOf(a,b).joinToString("¦")"""\n val v="listOf(a,b).joinToString(\\\"¦\\\")"\n val f=listOf(encode(a,b),"literal").joinToString("¦")\n}\n';
 assert.equal(scan(safe).findings.length,0);
});
test('already encoded or unrelated output is not rewritten',()=>{
 for(const s of [
  'package demo\nval output=listOf(a,b).joinToString("¦")\n',
  'package demo\nval identity=listOf("a","b").joinToString("¦")\n',
  'package demo\nval identity=listOf(a,b).map { escape(it) }.joinToString("¦")\n',
  'package demo\nval identity=listOf(a,b).joinToString(separator = "¦")\n'
 ])assert.equal(scan(s).findings.length,0);
});
test('tampered source, invalid path, malformed unicode, wrong SHA and repeated paths are rejected',()=>{
 for(const mutate of [
  a=>a.files[0].source+='// tamper\n',
  a=>a.files[0].expectedBlobSha='f'.repeat(40),
  a=>a.files[0].path='../escape.kt',
  a=>a.expectedCommitSha='x',
  a=>a.files.push(file(source)),
  a=>{a.files[0].source=source+'\uD800';a.files[0].expectedBlobSha=blob(a.files[0].source);},
  a=>{a.files[0].source='x'.repeat(160010);a.files[0].expectedBlobSha=blob(a.files[0].source);},
  a=>{a.files[0].source=source.replace(/\n/g,'\r\n');a.files[0].expectedBlobSha=blob(a.files[0].source);},
  a=>a.files=[]
 ]){
  const a={expectedCommitSha:head,files:[file(source)]};mutate(a);
  assert.match(scanIdentityDelimiterHypotheses(a).status,/^BLOCKED_/);
 }
});
test('active getters and proxies are rejected without executing them',()=>{
 let reads=0;
 const a={expectedCommitSha:head,files:[file(source)]};
 Object.defineProperty(a.files[0],'source',{enumerable:true,get(){reads++;throw Error('getter');}});
 assert.match(scanIdentityDelimiterHypotheses(a).status,/^BLOCKED_/);
 const b=new Proxy({expectedCommitSha:head,files:[file(source)]},{ownKeys(){reads++;throw Error('proxy');}});
 assert.match(scanIdentityDelimiterHypotheses(b).status,/^BLOCKED_/);
 assert.equal(reads,0);
});
test('Fixer rejects mutated findings, unsupported delimiters and ambiguous multi-site edits',()=>{
 const f=file(source),finding=scan(source).findings[0];
 for(const altered of [{...finding,line:4},{...finding,path:'module/src/main/kotlin/Other.kt'},{...finding,rule:'OTHER'}]){
  assert.match(draftIdentityDelimiterCandidate({expectedCommitSha:head,file:f,finding:altered}).status,/^BLOCKED_/);
 }
 assert.match(draft('package demo\nval fingerprint=listOf(a,b).joinToString("|")\n').status,/^BLOCKED_/);
 const multi=source.replace('}\n',' val identity=listOf(c,d).joinToString("¦")\n}\n');
 assert.equal(scan(multi).findings.length,2);
 assert.equal(draftIdentityDelimiterCandidate({expectedCommitSha:head,file:file(multi),finding:scan(multi).findings[0]}).status,'BLOCKED_IDENTITY_DELIMITER_CANDIDATE');
});
test('candidate rejects altered bytes, active getters, and malformed incoming records',()=>{
 const f=file(source),finding=scan(source).findings[0];let side=0;
 f.source+='//tampered\n';
 assert.equal(draftIdentityDelimiterCandidate({expectedCommitSha:head,file:f,finding}).status,'BLOCKED_IDENTITY_DELIMITER_CANDIDATE');
 const g=file(source);
 Object.defineProperty(g,'source',{enumerable:true,get(){side++;throw Error('getter');}});
 assert.equal(draftIdentityDelimiterCandidate({expectedCommitSha:head,file:g,finding}).status,'BLOCKED_IDENTITY_DELIMITER_CANDIDATE');
 assert.equal(side,0);
});

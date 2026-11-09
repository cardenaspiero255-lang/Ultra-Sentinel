'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanKotlinFamilyAdvisories}=
 require('../../packages/family-hunter/combined-kotlin-family-advisories.cjs');
const SHA='a'.repeat(40),root='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const file=(path,source)=>{const b=Buffer.from(source,'utf8');
 return {path,source,expectedBlobSha:createHash('sha1')
  .update('blob '+b.length+'\0').update(b).digest('hex')};};
const note=[
 'class Dialogue {',' private val turns=mutableListOf<String>()',
 ' fun importLocalNote(text:String)=index.importText(text)',
 ' fun reply(query:String):String {',
 '  val localNote = if(query.isNotBlank()) {',
 '   index.search(query) ?: "No encontrado"',
 '  } else null',
 '  val answer = when {',
 '   localNote != null -> localNote','   else -> "OK"','  }',
 '  turns.add("JARVIS: $answer")','  return answer',' }',
 ' fun snapshotForStorage():String {',
 '  val lines=turns.takeLast(24).toMutableList()',
 '  return lines.joinToString("\\n")',' }','}',''].join('\n');
const bounded=[
 'import java.io.FilterInputStream','import java.io.IOException','import java.io.InputStream',
 'internal class BoundedImageInputStream(source: InputStream): FilterInputStream(source) {',
 ' override fun read(buffer: ByteArray, off: Int, len: Int): Int {',
 '  if (len == 0) return 0',
 '  ensureBudget()',
 '  val allowed = minOf(len.toLong(), maxBytes - consumed).toInt()',
 '  val actual = super.read(buffer, off, allowed)',
 '  if (actual > allowed || actual < -1) throw IOException("invalid image provider read")',
 '  return actual',' }','}',''].join('\n');
test('advisory portfolio identifies two independent static risk families, not verified generalization',()=>{
 const r=scanKotlinFamilyAdvisories({expectedCommitSha:SHA,files:[
  file(root+'Dialogue.kt',note),file(root+'BoundedImageInputStream.kt',bounded)]});
 assert.equal(r.status,'MULTIPLE_UNVERIFIED_FAMILIES_REQUIRING_ORACLES');
 assert.ok(r.rules.includes('EPHEMERAL_KNOWLEDGE_REACHES_HISTORY_SNAPSHOT'));
 assert.ok(r.rules.includes('BOUNDED_READ_ZERO_PROGRESS'));
 assert.equal(r.originalFunctionalOracleVerified,false);
 assert.equal(r.generalizationVerified,false);
 assert.equal(r.causalityVerified,false);
 assert.equal(r.remoteWrites,false);
});
test('benign positive-progress guard does not invent the bounded read family',()=>{
 const safe=bounded.replace('actual > allowed || actual < -1','actual == 0 || actual > allowed || actual < -1');
 const r=scanKotlinFamilyAdvisories({expectedCommitSha:SHA,files:[
  file(root+'Dialogue.kt',note),file(root+'Safe.kt',safe)]});
 assert.equal(r.rules.includes('BOUNDED_READ_ZERO_PROGRESS'),false);
});
test('rejects forged blobs, getters and proxies without evaluating effects',()=>{
 const src=file(root+'Dialogue.kt',note);
 assert.match(scanKotlinFamilyAdvisories({expectedCommitSha:SHA,
  files:[{...src,expectedBlobSha:'0'.repeat(40)}]}).status,/^BLOCKED_/);
 let effects=0;const evil=()=>{effects++;throw Error('trapped');};
 const opts={expectedCommitSha:SHA,files:[src]};
 Object.defineProperty(opts.files[0],'source',{get:evil});
 assert.match(scanKotlinFamilyAdvisories(opts).status,/^BLOCKED_/);
 assert.match(scanKotlinFamilyAdvisories(new Proxy({},{get:evil,getPrototypeOf:evil})).status,/^BLOCKED_/);
 assert.equal(effects,0);
});

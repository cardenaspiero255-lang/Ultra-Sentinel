'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanEphemeralKotlinHistory}=require('../../packages/family-hunter/ephemeral-kotlin-history-hunter.cjs');
const digest=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const root='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
function demo(note='localNote',history='turns',response='answer'){
 return [
  'class Example {',
  '    private val '+history+'=mutableListOf<String>()',
  '    fun importLocalNote(text:String)=localIndex.importText(text)',
  '    fun reply(query:String):String {',
  '        val '+note+' = if (query.isNotEmpty()) {',
  '            localIndex.search(query) ?: "No encontré"',
  '        } else null',
  '        val '+response+' = when {',
  '            '+note+' != null -> '+note,
  '            else -> "saludo"',
  '        }',
  '        '+history+'.add("JARVIS: $'+response+'")',
  '        return '+response,
  '    }',
  '    fun snapshotForStorage(): String {',
  '        val lines = '+history+'.takeLast(24).toMutableList()',
  '        return lines.joinToString("\\n")',
  '    }',
  '}',''
 ].join('\n');
}
const file=(path,source)=>({path,source,expectedBlobSha:digest(source)});
const input=files=>({expectedCommitSha:'a'.repeat(40),files});
test('discovers a candidate source-to-sink path without being given the affected filename',()=>{
 const r=scanEphemeralKotlinHistory(input([file(root+'Unrelated.kt','class Unrelated {}\n'),
  file(root+'Dialogue.kt',demo())]));
 assert.equal(r.status,'UNVERIFIED_EPHEMERAL_PERSISTENCE_HYPOTHESES');
 assert.equal(r.filesScanned,2);
 assert.deepEqual(r.findings.map(x=>x.path),[root+'Dialogue.kt']);
 assert.equal(r.findings[0].rule,'EPHEMERAL_KNOWLEDGE_REACHES_HISTORY_SNAPSHOT');
 assert.equal(r.sourceRepositoryAuthenticated,false);
 assert.equal(r.productContractConfirmed,false);
 assert.equal(r.causalityVerified,false);
 assert.equal(r.remoteWrites,false);
});
test('recognizes variable-renamed variants, not a fixed target name',()=>{
 for(const [n,h,a] of [['noteResult','chatLog','response'],['searchValue','rows','replyText']]){
  const r=scanEphemeralKotlinHistory(input([file(root+'Variant.kt',demo(n,h,a))]));
  assert.equal(r.findings.length,1);
 }
});
test('benign non-persisting or non-note cases do not trigger this heuristic',()=>{
 const s=demo();
 const cases=[
  s.replace('localIndex.search(query)','localIndex.getLabel(query)'),
  s.replace('localNote != null -> localNote','localNote != null -> "safe"'),
  s.replace('turns.takeLast(24)','turns.filter { it.persistent }.takeLast(24)'),
  s.replace('turns.add("JARVIS: $answer")','ephemeral.add("JARVIS: $answer")')
 ];
 for(const source of cases)
  assert.equal(scanEphemeralKotlinHistory(input([file(root+'Benign.kt',source)])).findings.length,0);
});
test('rejects forged source bytes, duplicate paths and traversal',()=>{
 const valid=file(root+'Dialogue.kt',demo());
 for(const files of [[{...valid,expectedBlobSha:'f'.repeat(40)}],[valid,valid],
   [file('../escape.kt',demo())]]){
  const r=scanEphemeralKotlinHistory(input(files));
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.findings.length,0);
 }
});
test('rejects proxy and getter inputs without triggering effects',()=>{
 let effects=0;const evil=()=>{effects++;throw Error('effect');};
 const a=input([file(root+'Dialogue.kt',demo())]);
 Object.defineProperty(a.files[0],'source',{get:evil});
 assert.match(scanEphemeralKotlinHistory(a).status,/^BLOCKED_/);
 const proxy=new Proxy(input([file(root+'Dialogue.kt',demo())]),{get:evil,getPrototypeOf:evil});
 assert.match(scanEphemeralKotlinHistory(proxy).status,/^BLOCKED_/);
 assert.equal(effects,0);
});

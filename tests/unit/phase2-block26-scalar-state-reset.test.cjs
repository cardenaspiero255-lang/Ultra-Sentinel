'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scanStateResetHypotheses}=require('../../packages/family-hunter/scalar-state-reset-hunter.cjs');
const path='src/main/kotlin/org/example/Queue.kt',sha='a'.repeat(40);
const wrap=source=>({path,source,expectedBlobSha:sha});
const body=(reset='head = 0\n tail = 0', head='head = (head + 1) % maxSize', tail='tail = (tail + 1) % maxSize')=>
 ['','package example','class RingBuffer<T>(val maxSize: Int = 10) {',
 ' var head = 0',' var tail = 0',' var capacity = 0',' fun clear() {',
 '  '+reset,' }',' fun enqueue(item: T) {',
 '  if (capacity == maxSize) throw IllegalStateException()',
 '  '+tail,'  capacity++',' }',' fun dequeue(): T? {',
 '  if (capacity == 0) throw IllegalStateException()',
 '  '+head,'  capacity--','  return null',' }','}',''].join('\n');
const rules=s=>scanStateResetHypotheses(wrap(s)).map(x=>x.rule);
test('existing RingBuffer counterexample produces a source-only hypothesis, not a defect verdict',()=>{
 const r=scanStateResetHypotheses(wrap(body()));
 assert.deepEqual(r.map(x=>x.rule),['INCOMPLETE_SCALAR_STATE_RESET']);
 assert.equal(r[0].path,path);
 assert.equal(r[0].expectedBlobSha,sha);
 assert.equal(r[0].status,'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE');
 assert.equal(r[0].line,7);
});
test('generalizes to unrelated state names, class names and operation names',()=>{
 const s=body().replaceAll('RingBuffer','Ledger').replaceAll('head','readCursor').replaceAll('tail','writeCursor').replaceAll('capacity','pending').replaceAll('clear','restart').replaceAll('enqueue','push').replaceAll('dequeue','pop');
 assert.deepEqual(rules(s),['INCOMPLETE_SCALAR_STATE_RESET']);
});
test('counter restored with the other fields is safe',()=>{
 assert.deepEqual(rules(body('head = 0\n tail = 0\n capacity = 0')),[]);
});
test('a cursor-only reset without a guarded increment/decrement counter abstains',()=>{
 assert.deepEqual(rules(body().replace('if (capacity == maxSize)', 'if (item == null)')),[]);
 assert.deepEqual(rules(body().replace('capacity--','capacity = 0')),[]);
 assert.deepEqual(rules(body().replace('capacity++','capacity = 0')),[]);
});
test('resetting a cursor not updated elsewhere is insufficient evidence',()=>{
 assert.deepEqual(rules(body(undefined,'val temp = 1')),[]);
});
test('a reset with additional unknown effects is not presumed incomplete',()=>{
 assert.deepEqual(rules(body('head = 0\n tail = 0\n syncState()')),[]);
 assert.deepEqual(rules(body('head = 0\n tail = 0\n if (capacity > 0) capacity = 0')),[]);
});
test('comments, strings, and unrelated classes cannot manufacture the reset evidence',()=>{
 const s=body().replace('head = 0\n tail = 0','// head = 0\n val text = "tail = 0"');
 assert.deepEqual(rules(s),[]);
 const other='class First { var head=0; var tail=0; fun clear(){head=0;tail=0} }\n'+
  'class Second {var capacity=0; fun add(){if(capacity==10) return; capacity++}; fun remove(){if(capacity==0)return; capacity--}}';
 assert.deepEqual(rules(other),[]);
});
test('an unbalanced Kotlin block refuses inferences',()=>{
 assert.deepEqual(rules(body().slice(0,-2)),[]);
});

test('source-only numeric worker consumes the new rule with exact Git byte identity',()=>{
 const {createHash}=require('node:crypto');
 const {runBlindNumericInventory}=require('../../packages/family-hunter/blind-numeric-worker.cjs');
 const source=body(),bytes=Buffer.from(source,'utf8');
 const expectedBlobSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const inventory={expectedCommitSha:'b'.repeat(40),files:[{path,source,expectedBlobSha}],
  skippedOversized:0,skippedNoncanonical:0};
 const output=runBlindNumericInventory(inventory);
 assert.equal(output.sourceByteIntegrityVerified,true);
 assert.equal(output.filesScanned,1);
 assert.equal(output.status,'NUMERIC_BLIND_HYPOTHESES_UNVERIFIED');
 assert.deepEqual(output.findings.map(f=>f.rule),['INCOMPLETE_SCALAR_STATE_RESET']);
 assert.equal(output.findings[0].expectedBlobSha,expectedBlobSha);
 assert.equal(output.originalOracleVerified,false);
 const altered=structuredClone(inventory);
 altered.files[0].source+='// edited after seal\n';
 assert.match(runBlindNumericInventory(altered).status,/^BLOCKED_/);
});

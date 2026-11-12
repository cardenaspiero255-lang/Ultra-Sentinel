'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanKotlinNumericRisks}=require('../../packages/family-hunter/phase2-numeric-risk-hunter.cjs');
const commit='a'.repeat(40),path='feature/src/main/kotlin/demo/MathModel.kt';
function scan(source){
 const bytes=Buffer.from(source,'utf8');
 const expectedBlobSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 return scanKotlinNumericRisks({expectedCommitSha:commit,files:[{path,source,expectedBlobSha}]});
}
function absFindings(source){
 const r=scan(source);
 assert.equal(r.sourceByteIntegrityVerified,true,JSON.stringify(r));
 for(const key of ['sourceRepositoryAuthenticated','originalFunctionalOracleVerified','causalityVerified',
  'generalizationVerified','remoteWrites','mergeAllowed'])assert.equal(r[key],false,key);
 return r.findings.filter(x=>x.rule==='SIGNED_MIN_ABSOLUTE_RANGE_RISK');
}
test('bounded numeric interval propagation finds signed-min overflow across unrelated Int and Long functions',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'fun hashBucket(n: Int): Int {',
  '  val derived: Int = n',
  '  return derived.absoluteValue % 7',
  '}',
  'fun normalizeMetric(value: Long): Long {',
  '  return value.absoluteValue',
  '}',''
 ].join('\n');
 const findings=absFindings(s);
 assert.deepEqual(findings.map(x=>x.line),[5,8]);
 assert.ok(findings.every(f=>f.path===path&&f.status==='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'));
});
test('Kotlin math abs aliases are tracked by numeric type rather than function name alone',()=>{
 const s=[
  'package demo',
  'import kotlin.math.abs as magnitude',
  'fun scale(distance: Int): Int {',
  '  val value = distance',
  '  return magnitude(value)',
  '}',
  'fun safeConst(): Int = magnitude(-11)',
  '',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[5]);
});
test('widening an Int to Long, clamping to a safe interval and bounded values are benign controls',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'import kotlin.math.abs',
  'fun widen(n: Int): Long = n.toLong().absoluteValue',
  'fun clamp(n: Int): Int = n.coerceIn(0,100).absoluteValue',
  'fun minSafe(n: Int): Int = n.coerceAtLeast(Int.MIN_VALUE + 1).absoluteValue',
  'fun minLongSafe(n: Long): Long = n.coerceAtLeast(Long.MIN_VALUE + 1).absoluteValue',
  'fun copied(n: Int): Int {',
  ' val safe = n.coerceAtLeast(-100)',
  ' return abs(safe)',
  '}',
  'fun const(): Int = abs(-12)',
  '',''].join('\n');
 assert.deepEqual(absFindings(s),[]);
});
test('same-line early return, recomputed mutable aliases, and independent method scopes do not leak incorrect bounds',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'fun guarded(n: Int): Int {',
  ' if (n == Int.MIN_VALUE) return 0',
  ' return n.absoluteValue',
  '}',
  'fun repro(n: Int): Int {',
  ' var x = n.coerceAtLeast(0)',
  ' x = n',
  ' return x.absoluteValue',
  '}',
  'fun fresh(n: Int): Int = n.absoluteValue',
  '',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[10,12]);
});
test('guarded branches on the same line do not establish unconditional facts',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'fun risky(n: Int): Int {',
  ' if (n == Int.MIN_VALUE) log("edge")',
  ' return n.absoluteValue',
  '}',
  'fun guarded(n: Int): Int {',
  ' if (n == Int.MIN_VALUE) throw IllegalArgumentException()',
  ' return n.absoluteValue',
  '}',
  '',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[5]);
});
test('rejected false positives: comments, raw strings, unrelated absoluteValue and unknown Number types',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'import other.abs as opaqueMagnitude',
  '// fun hidden(n: Int) = n.absoluteValue',
  'val quote = """fun hidden(n: Int) = n.absoluteValue"""',
  'fun x(n: Number): Number = n',
  'fun property(n: Number) = n.absoluteValue',
  'fun some(n: Int) = opaqueMagnitude(n)',
  'fun literal() = 5.absoluteValue',
  '',''].join('\n');
 assert.deepEqual(absFindings(s),[]);
});
test('existing numeric source hypotheses continue working alongside interval analysis',()=>{
 const s='package demo\nval a = (count * 500).toLong()\n';
 const r=scan(s);
 assert.ok(r.findings.some(f=>f.rule==='INT_MULTIPLICATION_BEFORE_WIDENING'));
 assert.equal(r.findings.some(f=>f.rule==='SIGNED_MIN_ABSOLUTE_RANGE_RISK'),false);
});

test('mixed typed and unknown Kotlin parameters retain provable numeric scalar intervals',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'fun aggregate(label: String, signal: Int, enabled: Boolean): Int {',
  ' return signal.absoluteValue',
  '}',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[4]);
});
test('a guard proven on a numeric source refines immutable aliases, but not unrelated variables',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'fun aliasGuard(n: Int): Int {',
  ' val same = n',
  ' if (n == Int.MIN_VALUE) return 0',
  ' return same.absoluteValue',
  '}',
  'fun distinct(a: Int, b: Int): Int {',
  ' if (a == Int.MIN_VALUE) return 0',
  ' return b.absoluteValue',
  '}',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[10]);
});
test('conditional exits and writes do not incorrectly narrow subsequent guaranteed execution',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'fun nestedGuard(n: Int): Int {',
  ' if (n > 0) {',
  '  if (n == Int.MIN_VALUE) return 0',
  ' }',
  ' return n.absoluteValue',
  '}',
  'fun nestedWrite(n: Int): Int {',
  ' var x = n',
  ' if (n > 0) {',
  '   x = 7',
  ' }',
  ' return x.absoluteValue',
  '}',
  'fun nestedInvalidateSafe(n: Int): Int {',
  ' var x = n.coerceAtLeast(0)',
  ' if (n > 0) {',
  '   x = n',
  ' }',
  ' return x.absoluteValue',
  '}',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[7,14,21]);
});
test('a continuation-line absoluteValue remains attached to its typed numeric receiver',()=>{
 const s=[
  'package demo',
  'import kotlin.math.absoluteValue',
  'fun continued(n: Int): Int {',
  ' return n',
  '    .absoluteValue',
  '}',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[5]);
});

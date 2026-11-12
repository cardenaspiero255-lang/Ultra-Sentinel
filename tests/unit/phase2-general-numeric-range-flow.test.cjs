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

test('abstract bounds are exact for signed 32/64-bit limits, constant offsets and safe clamps',()=>{
 const {range,interval,top,literal}=
  require('../../packages/family-hunter/bounded-kotlin-range-flow.cjs');
 const intMin=-(1n<<31n),intMax=(1n<<31n)-1n,longMin=-(1n<<63n);
 const env=new Map([['n',top('Int')],['big',top('Long')],['k',interval('Int',-7n,11n)]]);
 assert.deepEqual(interval('Int',-7n,11n),{type:'Int',lo:-7n,hi:11n});
 for(const [type,lo,hi] of [['Int',1n,0n],['Int',intMin-1n,0n],
  ['Long',0n,(1n<<63n)],['missing',0n,0n],['Int','x',0n]])
  assert.equal(interval(type,lo,hi),null);
 assert.equal(top('Unknown'),null);
 assert.deepEqual(literal('Int.MIN_VALUE'),{type:'Int',lo:intMin,hi:intMin});
 assert.deepEqual(literal('Int.MAX_VALUE'),{type:'Int',lo:intMax,hi:intMax});
 assert.deepEqual(literal('Long.MIN_VALUE + 1'),{type:'Long',lo:longMin+1n,hi:longMin+1n});
 assert.deepEqual(literal('Long.MAX_VALUE - 1')?.hi,(1n<<63n)-2n);
 assert.equal(literal('2147483648'),null);
 assert.equal(literal('9223372036854775808L'),null);
 assert.equal(literal('not-an-int'),null);
 assert.equal(literal('-11')?.lo,-11n);
 assert.equal(literal('11L')?.type,'Long');
 assert.equal(range('n',env)?.lo,intMin);
 assert.equal(range('((k))',env)?.hi,11n);
 assert.equal(range('(-(-11))',env)?.lo,11n);
 assert.equal(range('-(k)',env)?.lo,-11n);
 assert.equal(range('-n',env)?.lo,intMin);
 assert.equal(range('-unavailable',env),null);
 assert.equal(range('big.toInt()',env)?.lo,intMin);
 assert.equal(range('k.toInt()',env)?.hi,11n);
 assert.equal(range('n.toLong()',env)?.lo,intMin);
 assert.equal(range('notThere.toLong()',env),null);
 assert.equal(range('n.coerceAtLeast(0)',env)?.lo,0n);
 assert.equal(range('n.coerceAtMost(11)',env)?.hi,11n);
 assert.deepEqual(range('n.coerceIn(-7,11)',env),{type:'Int',lo:-7n,hi:11n});
 assert.equal(range('n.coerceIn(11,-7)',env),null);
 assert.equal(range('n.coerceIn(0)',env),null);
 assert.equal(range('n.coerceAtMost(0,1)',env),null);
 assert.equal(range('n.coerceAtLeast(0L)',env),null);
 assert.equal(range('missing.coerceAtLeast(0)',env),null);
 assert.equal(range('k.coerceIn(-100,100)',env)?.lo,-7n);
 assert.equal(range('k.coerceIn(50,60)',env)?.lo,50n);
 assert.equal(range('n.coerceAtLeast(Int.MIN_VALUE + 1)',env)?.lo,intMin+1n);
 assert.equal(range('n.coerceAtLeast(Int.MAX_VALUE)',env)?.lo,intMax);
 assert.equal(range('2.toLong().coerceAtLeast(0L)',env)?.lo,2n);
 assert.equal(range(null,env),null);
 assert.equal(range('a'.repeat(241),env),null);
 assert.equal(range('n',env,13),null);
 assert.equal(range('notThere',env),null);
 assert.equal(range('(n) + 1',env),null);
});
test('early exits infer reachable lower and upper interval edges, not blanket safety',()=>{
 const cases=[
  ['if (n == Int.MIN_VALUE) return 0',false],
  ['if (n <= Int.MIN_VALUE) return 0',false],
  ['if (n < Int.MIN_VALUE + 1) return 0',false],
  ['if (n >= Int.MIN_VALUE + 1) return 0',true],
  ['if (n > Int.MIN_VALUE) return 0',true],
  ['if (n != Int.MIN_VALUE) return 0',true],
  ['if (n == Int.MIN_VALUE + 1) return 0',true],
  ['if (n == Int.MIN_VALUE) println("not exiting")',true]
 ];
 for(const [guard,risky] of cases){
  const text=['package demo','import kotlin.math.absoluteValue',
   'fun f(n: Int): Int {','  '+guard,'  return n.absoluteValue','}',''].join('\n');
  assert.equal(absFindings(text).length,risky?1:0,guard);
 }
 const short=['package demo','import kotlin.math.absoluteValue',
  'fun hi(n: Int): Int {',
  ' val x = n.coerceIn(Int.MIN_VALUE, Int.MIN_VALUE + 1)',
  ' if (x == Int.MIN_VALUE + 1) return 0',
  ' return x.absoluteValue','}',''].join('\n');
 assert.deepEqual(absFindings(short).map(x=>x.line),[6]);
});
test('unknown expressions widen safely and unsupported call syntax abstains rather than supplying false proof',()=>{
 const cases=[
  ['fun f(n: Int): Int {',' var x: Int = unknown()',' return x.absoluteValue','}'],
  ['fun f(n: Int): Int {',' var x = n',' x = unknown()',' return x.absoluteValue','}'],
  ['fun f(n: Int): Int {',' var x = n',' x = n.toLong()',' return x.absoluteValue','}'],
  ['fun f(n: Int): Int {',' val x: Int = unknown()',' return x.absoluteValue','}'],
  ['fun f(n: Int): Int {',' return kotlin.math.abs((n))','}']
 ];
 for(const body of cases){
  const text=['package demo','import kotlin.math.absoluteValue',...body,''].join('\n');
  assert.equal(absFindings(text).length,1,body.join(' / '));
 }
 const safe=['package demo','import kotlin.math.abs',
  'fun f(n: Int): Long = abs(n.toLong())',
  'fun g(n: Int): Int = abs(n.coerceAtLeast(0))',
  'fun h(n: Int): Int = abs(-11)',
  'fun u(n: Int): Int = unknown(n)',
  '',''].join('\n');
 assert.deepEqual(absFindings(safe),[]);
});
test('scalar absolute import aliases and expression-bodied functions remain independent',()=>{
 const s=[
 'package demo',
 'import kotlin.math.absoluteValue as magnitude',
 'fun f(n: Int): Int = n.magnitude',
 'fun ordinary(n: Int): Long = n.toLong().magnitude',
 'fun other(n: Int): Int = kotlin.math.abs(n)',
 'fun nested(n: Int): Int = kotlin.math.abs((n))',
 'fun zero(): Int = kotlin.math.abs(-100)',
 '',''].join('\n');
 assert.deepEqual(absFindings(s).map(x=>x.line),[3,5,6]);
});

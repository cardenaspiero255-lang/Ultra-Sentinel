'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-jvm-domains-'));
const bin = path.join(temp, 'bin'), classes = path.join(temp, 'classes');
const jar = path.join(temp, 'fixtures.jar');
fs.mkdirSync(bin); fs.mkdirSync(classes);

function run(command, args) {
 const result = spawnSync(command, args, {encoding:'utf8', timeout:30000, maxBuffer:1024*1024});
 assert.ifError(result.error);
 assert.equal(result.status, 0, `${command} failed: ${result.stderr}`);
 return result.stdout;
}
const sources = [];
function source(name, body) {
 const file = path.join(temp, 'src', name);
 fs.mkdirSync(path.dirname(file), {recursive:true});
 fs.writeFileSync(file, body);
 sources.push(file);
}

const integral = [
 ['Byte', 'byte'], ['BoxedByte', 'Byte'], ['Short', 'short'], ['BoxedShort', 'Short'],
 ['Int', 'int'], ['BoxedInt', 'Integer'], ['Long', 'long'], ['BoxedLong', 'Long']
];
const floating = [['Float', 'float'], ['BoxedFloat', 'Float'], ['Double', 'double'], ['BoxedDouble', 'Double']];
const positiveMethods = [...integral, ...floating].map(([name, type]) => `
 public static double stable${name}(${type} n) {
  if (n <= 0) throw new IllegalArgumentException("positive inputs only");
  return n;
 }
 public static double peak${name}(${type} n) {
  if (n <= 0) throw new IllegalArgumentException("positive inputs only");
  return n == 2 ? 7 : 0;
 }`).join('\n');
source('sample/domain/positive/Cases.java', `package sample.domain.positive;
 public class Cases {
  ${positiveMethods}
  public static float logFloat(float n) { return (float)Math.log(n); }
  public static Float logBoxedFloat(Float n) { return (float)Math.log(n); }
  public static double logDouble(double n) { return Math.log(n); }
  public static Double logBoxedDouble(Double n) { return Math.log(n); }
 }`);

const signedMethods = integral.map(([name, type]) => `
 public static int peak${name}(${type} n) { return n == 0 ? 7 : 0; }`).join('\n');
source('sample/domain/signed/Cases.java', `package sample.domain.signed;
 public class Cases { ${signedMethods} }`);

source('sample/domain/controls/Cases.java', `package sample.domain.controls;
 public class Cases {
  public static int linear(int n) { return n; }
  public static int magnitude(int n) { return Math.abs(n); }
 }`);
source('sample/domain/invalid/Cases.java', `package sample.domain.invalid;
 public class Cases {
  private static int calls;
  public static int changing(int n) { return ++calls; }
  public static int failing(int n) { throw new IllegalArgumentException("unavailable"); }
 }`);

run('javac', ['-d', bin, path.join(root, 'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
run('javac', ['-d', classes, ...sources]);
run('jar', ['cf', jar, '-C', classes, '.']);
test.after(() => fs.rmSync(temp, {recursive:true, force:true}));

function probe(prefix) {
 return JSON.parse(run('java', ['-Xmx128m', '-cp', bin, 'GenericJvmMetamorphicProbe', jar, prefix]));
}
function byMethod(report, name) {
 return report.findings.filter(f => f.method?.startsWith(`${name}(`));
}
function unverified(report) {
 assert.equal(report.oracleVerified, false);
 assert.equal(report.novelFamilyVerified, false);
 assert.equal(report.mergeAllowed, false);
}

test('strictly positive numeric APIs complete a finite triple for primitive and boxed inputs', () => {
 const report = probe('sample.domain.positive');
 assert.equal(report.methodsProbed, 2 * (integral.length + floating.length) + 4,
  'both monotonic and peaked positive-domain APIs must be exercised');
 for (const [name] of [...integral, ...floating]) {
  const inputs = floating.some(([n]) => n === name) ? ['1.0', '2.0', '3.0'] : ['1', '2', '3'];
  const findings = byMethod(report, `peak${name}`);
  assert.ok(findings.some(f => JSON.stringify(f.inputs) === JSON.stringify(inputs) &&
   f.status === 'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'), `${name} positive turning point`);
  assert.equal(byMethod(report, `stable${name}`).length, 0, `${name} monotonic control`);
 }
 for (const [name] of floating)
  assert.equal(byMethod(report, `log${name}`).length, 0, `${name} logarithm remains monotonic`);
 assert.ok(report.abstainedProbes > 0, 'rejected nonpositive samples must remain explicit');
 assert.equal(report.status, 'PARTIAL_HYPOTHESES_REQUIRE_ORACLE');
 unverified(report);
});

test('signed finite integers expose a generic turning point for every supported scalar type', () => {
 const report = probe('sample.domain.signed');
 for (const [name] of integral) {
  const findings = byMethod(report, `peak${name}`);
  assert.ok(findings.some(f => JSON.stringify(f.inputs) === JSON.stringify(['-1', '0', '1']) &&
   f.status === 'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'), `${name} signed turning point`);
 }
 unverified(report);
});

test('monotonic and intentionally nonmonotonic functions remain unverified hypotheses', () => {
 const report = probe('sample.domain.controls');
 assert.equal(byMethod(report, 'linear').length, 0);
 const magnitude = byMethod(report, 'magnitude');
 assert.ok(magnitude.some(f => JSON.stringify(f.inputs) === JSON.stringify(['-1', '0', '1']) &&
  f.status === 'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'));
 assert.equal(report.status, 'HYPOTHESES_REQUIRE_ORACLE');
 unverified(report);
});

test('throwing and stateful numeric methods abstain instead of certifying coverage', () => {
 const report = probe('sample.domain.invalid');
 assert.equal(report.status, 'INCOMPLETE_NO_SUPPORTED_METHODS');
 assert.equal(report.methodsProbed, 0);
 assert.ok(report.abstainedProbes > 0);
 assert.deepEqual(report.findings, []);
 unverified(report);
});

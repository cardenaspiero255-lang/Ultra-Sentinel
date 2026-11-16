'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-jvm-admission-'));
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

source('sample/dependency/MissingParameter.java', `package sample.dependency;
 public class MissingParameter {}`);
for (const [kind, extra] of [
 ['comparable', `implements Comparable<Case>`],
 ['equality', ''],
 ['instance', '']
]) {
 const law = kind === 'comparable' ? 'public int compareTo(Case other) { return 0; }' :
  kind === 'equality' ? `@Override public boolean equals(Object other) { return this == other; }
   @Override public int hashCode() { return 0; }` : '';
 source(`sample/linkage/${kind}/Case.java`, `package sample.linkage.${kind};
  public class Case ${extra} {
   public Case() {}
   public Case(sample.dependency.MissingParameter ignored) {}
   public int aInstance(int n) { return n; }
   public static int zPeak(int n) { return n == 1 ? 7 : 0; }
   ${law}
  }`);
}

for (const [kind, shouldThrow] of [
 ['first', '++attempts == 1'],
 ['second', '++attempts == 2'],
 ['alternating', '++attempts % 2 == 0']
]) {
 source(`sample/twin/${kind}/Case.java`, `package sample.twin.${kind};
  public class Case {
   private static int attempts;
   private final int key;
   public Case(int key) {
    if (${shouldThrow}) throw new IllegalArgumentException("unavailable");
    this.key = key;
   }
   @Override public boolean equals(Object other) {
    return other instanceof Case value && key == value.key;
   }
   @Override public int hashCode() { return Integer.hashCode(key); }
   public static int zPeak(int n) { return n == 1 ? 7 : 0; }
  }`);
}

source('sample/members/Outer.java', `package sample.members;
 public class Outer {
  public static class Stable {
   public static int stable(int n) { return n; }
  }
  public static class Broken {
   public static int peak(int n) { return n == 1 ? 7 : 0; }
  }
  private static class Private {
   public static int peak(int n) { return n == 1 ? 8 : 0; }
  }
  public class Inner implements Comparable<Inner> {
   public int compareTo(Inner other) { return 0; }
   public static int peak(int n) { return n == 1 ? 9 : 0; }
  }
  public abstract static class Abstract {
   public static int peak(int n) { return n == 1 ? 10 : 0; }
  }
  public interface Interface {
   static int peak(int n) { return n == 1 ? 11 : 0; }
  }
  public static final Runnable ANONYMOUS = new Runnable() {
   public void run() {}
   public static int peak(int n) { return n == 1 ? 12 : 0; }
  };
  public static final java.util.function.IntUnaryOperator LAMBDA = n -> n == 1 ? 13 : 0;
 }`);

for (const [kind, member, field] of [
 ['defaultcomp', 'Companion', 'public static final Companion Companion = new Companion();'],
 ['named', 'Ops', 'public static final Ops Ops = new Ops();'],
 ['wrongtype', 'Ops', 'public static final Object Ops = new Ops();'],
 ['nonstatic', 'Ops', 'public final Ops Ops = new Ops();'],
 ['nonfinal', 'Ops', 'public static Ops Ops = new Ops();']
]) {
 source(`sample/companion/${kind}/Outer.java`, `package sample.companion.${kind};
  public class Outer {
   ${field}
   public static int zOuterPeak(int n) { return n == 1 ? 11 : 0; }
   public static final class ${member} {
    private ${member}() {}
    public int aPeak(int n) {
     ${kind === 'defaultcomp' || kind === 'named' ? `if (this != Outer.${member}) throw new IllegalStateException("not the published receiver");` : ''}
     return n == 1 ? 7 : 0;
    }
    public static int zNestedPeak(int n) { return n == 1 ? 9 : 0; }
   }
  }`);
}
source('sample/dollars/Top$Level.java', `package sample.dollars;
 public class Top$Level {
  public static int peak(int n) { return n == 1 ? 7 : 0; }
 }`);

run('javac', ['-d', bin, path.join(root, 'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
run('javac', ['-d', classes, ...sources]);
// The jar is valid, but one public constructor references a dependency that is absent at runtime.
fs.rmSync(path.join(classes, 'sample/dependency/MissingParameter.class'));
run('jar', ['cf', jar, '-C', classes, '.']);
test.after(() => fs.rmSync(temp, {recursive:true, force:true}));

function probe(prefix) {
 return JSON.parse(run('java', ['-Xmx128m', '-cp', bin, 'GenericJvmMetamorphicProbe', jar, prefix]));
}
function numericPeak(report, className) {
 return report.findings.filter(f => f.class === className && f.method?.startsWith('zPeak('));
}

for (const kind of ['comparable', 'equality', 'instance']) {
 test(`unresolvable constructor metadata preserves static numeric coverage (${kind})`, () => {
  const className = `sample.linkage.${kind}.Case`, report = probe(`sample.linkage.${kind}`);
  assert.ok(numericPeak(report, className).length > 0, 'the independent static turning point must be observed');
  assert.ok(report.constructorAbstentions > 0, 'unavailable constructor metadata must be explicit');
  assert.equal(report.status, 'PARTIAL_HYPOTHESES_REQUIRE_ORACLE');
  assert.equal(report.oracleVerified, false);
 });
}

test('a failed second construction cannot discard or mispair later valid equality samples', () => {
 const first = probe('sample.twin.first'), second = probe('sample.twin.second');
 for (const [kind, report] of [['first', first], ['second', second]]) {
  assert.ok(numericPeak(report, `sample.twin.${kind}.Case`).length > 0);
  assert.ok(report.objectContractAbstentions > 0);
  assert.ok(!report.findings.some(f => f.rule?.startsWith('OBJECT_')),
   'valid value equality and hash codes must not create law findings');
  assert.equal(report.oracleVerified, false);
 }
 assert.ok(first.objectContractPairs > 0, 'later successful construction pairs must be tested');
 assert.equal(second.objectContractPairs, first.objectContractPairs,
  'failing either construction of the first pair leaves the same later valid pairs');
});

test('alternating constructor failures abstain without suppressing static coverage', () => {
 const report = probe('sample.twin.alternating');
 assert.ok(numericPeak(report, 'sample.twin.alternating.Case').length > 0);
 assert.ok(report.objectContractAbstentions > 0);
 assert.equal(report.objectContractPairs, 0, 'no complete receiver/twin pair exists');
 assert.ok(!report.findings.some(f => f.rule?.startsWith('OBJECT_')));
 assert.equal(report.oracleVerified, false);
});

test('public static named members expose numeric methods; inaccessible and generated members do not', () => {
 const report = probe('sample.members');
 const memberFindings = report.findings.filter(f => f.method);
 assert.ok(memberFindings.some(f => f.class === 'sample.members.Outer$Broken' && f.method.startsWith('peak(')),
  'the public static nested turning point must be observed');
 assert.ok(memberFindings.every(f => f.class === 'sample.members.Outer$Broken'),
  'private, non-static, abstract, interface, anonymous and synthetic members must not be probed');
 assert.equal(report.methodsProbed, 2, 'both the stable and turning-point member APIs are exercised');
 assert.equal(report.oracleVerified, false);
});

for (const [kind, member] of [['defaultcomp', 'Companion'], ['named', 'Ops']]) {
 test(`a public final enclosing field supplies the ${kind} companion receiver`, () => {
  const prefix = `sample.companion.${kind}`, report = probe(prefix);
  const nested = `${prefix}.Outer$${member}`;
  assert.ok(report.findings.some(f => f.class === nested && f.method?.startsWith('aPeak(')),
   'the public companion instance API must be exercised through its enclosing field');
  assert.ok(report.findings.some(f => f.class === nested && f.method?.startsWith('zNestedPeak(')));
  assert.ok(report.findings.some(f => f.class === `${prefix}.Outer` && f.method?.startsWith('zOuterPeak(')));
  assert.equal(report.instanceMethodsExercised, 1);
  assert.equal(report.oracleVerified, false);
 });
}

for (const kind of ['wrongtype', 'nonstatic', 'nonfinal']) {
 test(`a ${kind} enclosing field cannot supply a companion receiver`, () => {
  const prefix = `sample.companion.${kind}`, report = probe(prefix);
  const nested = `${prefix}.Outer$Ops`;
  assert.ok(!report.findings.some(f => f.class === nested && f.method?.startsWith('aPeak(')),
   'the unusable field and private constructor must not provide a receiver');
  assert.ok(report.constructorAbstentions > 0 || report.abstainedProbes > 0);
  assert.ok(report.findings.some(f => f.class === nested && f.method?.startsWith('zNestedPeak(')),
   'an unsupported receiver must not hide a static method of the same member');
  assert.ok(report.findings.some(f => f.class === `${prefix}.Outer` && f.method?.startsWith('zOuterPeak(')));
  assert.equal(report.instanceMethodsExercised, 0);
  assert.equal(report.oracleVerified, false);
 });
}

test('a top-level Java class with a dollar sign remains eligible', () => {
 const report = probe('sample.dollars');
 assert.ok(report.findings.some(f => f.class === 'sample.dollars.Top$Level' && f.method?.startsWith('peak(')));
 assert.equal(report.oracleVerified, false);
});

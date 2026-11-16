'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');

test('numeric-returning JVM APIs with String parameters are probed with exact bounded text witnesses', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-string-jvm-'));
  try {
    const probeClasses = path.join(tmp, 'probe');
    const originalClasses = path.join(tmp, 'original');
    const originalJar = path.join(tmp, 'original.jar');
    fs.mkdirSync(probeClasses);
    fs.mkdirSync(originalClasses);
    const source = path.join(tmp, 'StringNumbers.java');
    fs.writeFileSync(source, `package sample.strings;
public final class StringNumbers {
  private static int calls;
  public static int peak(String input) { return input.length() == 1 ? 7 : 0; }
  public static int monotonic(String input) { return input.length(); }
  public static int mixed(String input, int offset) { return input.length() == 1 ? offset + 3 : 0; }
  public static int parseOnly(String input) { return Integer.parseInt(input); }
  public static int unstable(String input) { return ++calls; }
  public static String excluded(String input) { return input; }
}
`);
    const run = (cmd, args) => {
      const r = spawnSync(cmd, args, {encoding:'utf8', timeout:30000, maxBuffer:1024*1024});
      assert.ifError(r.error);
      assert.equal(r.status, 0, r.stderr);
      return r.stdout;
    };
    run('javac', ['-d', probeClasses, path.join(root, 'packages/family-hunter/GenericJvmMetamorphicProbe.java')]);
    run('javac', ['-d', originalClasses, source]);
    run('jar', ['cf', originalJar, '-C', originalClasses, '.']);
    const command = ['-Xmx128m', '-cp', probeClasses, 'GenericJvmMetamorphicProbe', originalJar, 'sample.strings'];
    const original = run('java', command);
    const report = JSON.parse(original);
    const finds = name => report.findings.filter(f=>f.method?.startsWith(name+'('));

    assert.equal(report.methodsProbed, 3, 'peak, monotonic and mixed must execute complete stable triples');
    assert.ok(finds('peak').length > 0);
    assert.ok(finds('mixed').length > 0);
    assert.deepEqual(finds('peak')[0].inputs, ['', 'a', 'aaa'],
      'report the actual bounded string arguments, never numeric collection sizes');
    for (const name of ['monotonic', 'parseOnly', 'unstable', 'excluded'])
      assert.equal(finds(name).length, 0, name);
    assert.ok(report.abstainedProbes >= 2, 'parsing failures and mutable state must abstain');
    assert.ok(report.unsupportedMethods >= 1, 'nonnumeric return types remain unsupported');
    assert.ok(report.findings.every(f=>f.status==='HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'));
    assert.equal(report.oracleVerified, false);
    assert.equal(report.novelFamilyVerified, false);
    assert.equal(report.remoteWrites, false);
    assert.equal(report.mergeAllowed, false);
    assert.equal(run('java', command), original, 'identical artifact and scope must replay deterministically');
  } finally {
    fs.rmSync(tmp, {recursive:true, force:true});
  }
});

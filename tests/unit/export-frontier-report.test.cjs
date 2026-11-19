'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { analyze } = require('../../packages/core/ultra_sentinel_core.cjs');

const sha = 'a'.repeat(40);
const command = path.resolve(__dirname, '../../scripts/export-frontier-report.cjs');

function input(t, value) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-report-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'core.json');
  fs.writeFileSync(filename, JSON.stringify(value));
  return filename;
}

function analysis(filename = 'app/src/main/java/Fixture.kt') {
  return analyze([{
    filename, status: 'added', changes: 1,
    patch: '@@ -0,0 +1 @@\n+GlobalScope.launch { fixtureSourceMarker() }\n',
  }], { sha });
}

const run = (...args) => spawnSync(process.execPath, [command, ...args], { encoding: 'utf8' });

test('exports bounded report metadata from the real Core analyzer', t => {
  const source = analysis();
  const result = run('json', input(t, source));
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schema, 'ultra-sentinel-frontier-report/v1');
  assert.equal(report.sha, sha);
  assert.equal(report.engineVersion, source.version);
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(report.evidenceAuthenticated, false);
  assert.deepEqual(report.coverage, source.coverage);
  assert.ok(report.findings.some(row => row.rule === 'UNSCOPED_COROUTINE'));
  assert.doesNotMatch(result.stdout, /fixtureSourceMarker|remediations|warnings/);
});

test('HTML safely represents punctuation in filenames and preserves partial coverage', t => {
  const source = analysis('app/src/main/java/A & B.kt');
  source.coverage.partial = true;
  source.verdict = 'INCOMPLETE';
  const result = run('html', input(t, source));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /A &amp; B\.kt/);
  assert.match(result.stdout, /INCOMPLETE/);
  assert.match(result.stdout, /Content-Security-Policy/);
  assert.doesNotMatch(result.stdout, /fixtureSourceMarker/);
});

test('preserves the incomplete state when Core received no diff', t => {
  const result = run('json', input(t, analyze([], { sha })));
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'INCOMPLETE');
  assert.deepEqual(report.findings, []);
});

test('rejects bad reports and invalid input paths without emitting a report', t => {
  const noVersion = input(t, { ...analysis(), version: 'unexpected' });
  const noSha = input(t, { ...analysis(), sha: 'unknown' });
  const source = analysis();
  source.findings[0].path = 'C:/private/Fixture.kt';
  const badPath = input(t, source);
  const badJson = input(t, {});
  fs.writeFileSync(badJson, '{ "fixture-private-value": malformed }');
  for (const [file, error] of [
    [noVersion, /Invalid Core version/],
    [noSha, /INVALID_CORE_ANALYSIS/],
    [badPath, /Invalid report path/],
    [path.dirname(badPath), /Invalid input file/],
    [badJson, /Invalid Core JSON input/],
  ]) {
    const result = run('json', file);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, error);
    assert.doesNotMatch(result.stderr, /fixture-private-value/);
  }
  const unknown = run('csv', badPath);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Usage/);
});

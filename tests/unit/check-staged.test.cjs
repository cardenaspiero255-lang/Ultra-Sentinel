'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const command = path.join(root, 'scripts/check-staged.cjs');

function git(cwd, ...args) {
  return spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgSign=false', ...args], { cwd, encoding: 'utf8' });
}

function checkout(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-staged-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = git(directory, 'init', '-q');
  assert.equal(result.status, 0, result.stderr);
  return directory;
}

function stage(directory, file, source) {
  fs.writeFileSync(path.join(directory, file), source);
  const result = git(directory, 'add', '--', file);
  assert.equal(result.status, 0, result.stderr);
}

const run = cwd => spawnSync(process.execPath, [command], { cwd, encoding: 'utf8' });

test('checks the staged snapshot and never runs source code', t => {
  const directory = checkout(t);
  stage(directory, 'control.cjs', 'throw new Error("this source must stay inert");\n');
  stage(directory, 'module with spaces.mjs', 'export const count = 3;\n');
  stage(directory, 'configuration.json', '{"enabled":true}\n');
  stage(directory, 'notes.md', 'Fixture notes\n');
  fs.writeFileSync(path.join(directory, 'control.cjs'), 'module.exports = (\n');
  const result = run(directory);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /3 staged files/);
});

test('refuses invalid staged syntax even when the working copy has been fixed', t => {
  const directory = checkout(t);
  stage(directory, 'settings.cjs', 'module.exports = (\n');
  fs.writeFileSync(path.join(directory, 'settings.cjs'), 'module.exports = 2;\n');
  const result = run(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid staged CJS.*settings\.cjs/);
});

test('refuses malformed JSON and staged whitespace errors', t => {
  const directory = checkout(t);
  stage(directory, 'settings.json', '{"active":\n');
  const malformed = run(directory);
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /Invalid staged JSON.*settings\.json/);
  stage(directory, 'settings.json', '{} \n');
  const whitespace = run(directory);
  assert.equal(whitespace.status, 1);
  assert.match(whitespace.stderr, /Staged whitespace check failed/);
});

test('refuses a staged source symlink and handles an empty Git index', t => {
  const directory = checkout(t);
  const empty = run(directory);
  assert.equal(empty.status, 0, empty.stderr);
  assert.match(empty.stdout, /0 staged files/);
  fs.symlinkSync('missing.cjs', path.join(directory, 'linked.cjs'));
  assert.equal(git(directory, 'add', '--', 'linked.cjs').status, 0);
  const symlink = run(directory);
  assert.equal(symlink.status, 1);
  assert.match(symlink.stderr, /Staged source is not a regular file.*linked\.cjs/);
});

test('the opt-in hook allows a valid commit and stops an invalid one', t => {
  const directory = checkout(t);
  fs.mkdirSync(path.join(directory, '.githooks'));
  fs.mkdirSync(path.join(directory, 'scripts'));
  fs.copyFileSync(command, path.join(directory, 'scripts/check-staged.cjs'));
  fs.copyFileSync(path.join(root, '.githooks/pre-commit'), path.join(directory, '.githooks/pre-commit'));
  const commit = () => git(directory, '-c', 'core.hooksPath=.githooks', 'commit', '-qm', 'fixture');

  stage(directory, 'code.cjs', 'module.exports = 1;\n');
  const initial = commit();
  assert.equal(initial.status, 0, initial.stderr);
  const base = git(directory, 'rev-parse', 'HEAD').stdout;
  stage(directory, 'code.cjs', 'module.exports = (\n');
  const invalid = commit();
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /Invalid staged CJS/);
  assert.equal(git(directory, 'rev-parse', 'HEAD').stdout, base);
});

test('fails clearly outside a Git repository', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-no-index-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = run(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Could not read staged Git files/);
});

test('refuses to approve a different index snapshot', t => {
  const directory = checkout(t);
  stage(directory, 'update.cjs', 'module.exports = 1;\n');
  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  const bin = path.join(directory, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'git'), `#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
const git = ${JSON.stringify(realGit)};
execFileSync(git, args, { stdio: 'inherit' });
if (args.includes('--check')) {
  writeFileSync('update.cjs', 'module.exports = 2;\\n');
  execFileSync(git, ['add', '--', 'update.cjs']);
}
`, { mode: 0o755 });
  const result = spawnSync(process.execPath, [command], {
    cwd: directory, encoding: 'utf8', env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Git index changed during staged validation/);
});

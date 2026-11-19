'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { planMetadataCandidates } = require('../../scripts/phase2-block26-git-admission.cjs');
const pool = require('../../docs/quality/PHASE2-BLOCK26-V9-POOL.json');
const command = path.resolve(__dirname, '../../scripts/phase2-block26-git-admission.cjs');

const rank127 = pool.candidates.find(candidate => candidate.rank === 127).source;
const limits = { maxEligibleSourceCandidates: 2, maxExaminedMetadataRepositories: 4, maxRepoSizeKb: 8192 };

function repository(full_name, stargazers_count) {
  return { full_name, stargazers_count, default_branch: 'main', size: 1 };
}

function kotlinBlob(path, sha, size, mode = '100644') {
  return { path, sha, size, mode, type: 'blob' };
}

function pinnedTree(commitSha, treeSha, tree) {
  return { commitSha, treeSha, tree: { sha: treeSha, truncated: false, tree } };
}

const canonical = pinnedTree('1'.repeat(40), '2'.repeat(40), [
  kotlinBlob('src/main/kotlin/Example.kt', '3'.repeat(40), 23),
]);

// Kotlin entries from git ls-tree at V9's exact rank 127 commit.
const refusedOriginal = pinnedTree(rank127.commitSha, rank127.treeSha, [
  ...rank127.files.map(file => kotlinBlob(file.path, file.blobSha, file.sizeBytes)),
  kotlinBlob('src/main/kotlin/wolfbeacon/hackalist/HackalistHackathon.kt', '4227dc9d779f9e9899bd5dbc455a0be34ba3ffb7', 1858, '100755'),
  kotlinBlob('src/main/kotlin/wolfbeacon/hackalist/HackalistHackathonRepository.kt', '8510cde9fdc35d03db85f4b2ae8c5c5405ecf74e', 172, '100755'),
]);

test('admission refuses the whole V9 rank 127 tree and continues ranking canonical Kotlin trees', async () => {
  const original = repository(rank127.repository, 2);
  const control = repository('fixture/canonical', 1);
  const identities = new Map([[original.full_name, refusedOriginal], [control.full_name, canonical]]);
  const plan = await planMetadataCandidates(
    [control, original], new Set(), new Set(), repo => identities.get(repo.full_name), limits,
  );

  assert.deepEqual(plan.audit, [
    { rank: 1, repository: original.full_name, reason: 'NONCANONICAL_ORIGINAL_KOTLIN_TREE' },
    { rank: 2, repository: control.full_name, reason: 'METADATA_CANDIDATE' },
  ]);
  assert.deepEqual(plan.candidates, [{
    rank: 2,
    source: {
      repository: control.full_name,
      commitSha: canonical.commitSha,
      treeSha: canonical.treeSha,
      files: [{ path: 'src/main/kotlin/Example.kt', blobSha: '3'.repeat(40), sizeBytes: 23 }],
      totalBytes: 23,
    },
  }]);
  assert.equal(plan.sourceBodiesRead, false);
});

test('admission refuses unbound, incomplete, or malformed tree metadata', async () => {
  for (const tree of [
    null,
    { ...canonical.tree, sha: '4'.repeat(40) },
    { ...canonical.tree, truncated: true },
    { ...canonical.tree, tree: [null] },
  ]) {
    const plan = await planMetadataCandidates(
      [repository('fixture/canonical', 1)], new Set(), new Set(), () => ({ ...canonical, tree }), limits,
    );
    assert.equal(plan.audit[0].reason, 'TREE_METADATA_UNAVAILABLE');
    assert.deepEqual(plan.candidates, []);
  }
  await assert.rejects(planMetadataCandidates(
    [repository('fixture/missing', 1)], new Set(), new Set(), () => null, limits,
  ), /INVALID_PINNED_TREE/);
});

test('the offline command uses current exclusions and rejects invalid provenance', () => {
  const run = input => spawnSync(process.execPath, [command], { input, encoding: 'utf8', timeout: 10000 });
  const control = repository('fixture/canonical', 1);
  const refused = repository('fixture/executable', 2);
  const result = run(JSON.stringify({
    repositories: [repository('SebastianAigner/dhash-kotlin', 3), refused, control],
    pinnedTrees: { [control.full_name]: canonical, [refused.full_name]: refusedOriginal },
  }));
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.deepEqual(plan.audit.map(row => row.reason), [
    'EXPOSED_REPOSITORY', 'NONCANONICAL_ORIGINAL_KOTLIN_TREE', 'METADATA_CANDIDATE',
  ]);
  assert.equal(plan.candidates[0].source.repository, control.full_name);

  const invalid = run(JSON.stringify({ repositories: [control], pinnedTrees: {} }));
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert.match(invalid.stderr, /INVALID_PINNED_TREE/);
});

function git(directory, ...args) {
  return execFileSync('git', ['-C', directory, '-c', 'core.hooksPath=/dev/null', ...args], {
    encoding: 'utf8',
  }).trim();
}

function fixtureCheckout(directory, files) {
  fs.mkdirSync(directory);
  git(directory, 'init', '-q');
  for (const { name, text, mode } of files) {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text, { mode });
  }
  git(directory, 'add', '.');
  git(directory, '-c', 'user.name=Fixtures', '-c', 'user.email=fixtures@example.invalid',
    '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'Local fixture');
  return {
    commitSha: git(directory, 'rev-parse', 'HEAD'),
    treeSha: git(directory, 'rev-parse', 'HEAD^{tree}'),
  };
}

function stagingFixture(t, extraFiles = []) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'block26-git-admission-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const engineDir = path.join(directory, 'engine');
  const sourceDir = path.join(directory, 'source');
  const sourcePath = 'src/main/kotlin/Example.kt';
  const sourceText = 'package example\nfun sum(a: Int, b: Int) = a + b\n';
  const engine = fixtureCheckout(engineDir, []);
  const source = fixtureCheckout(sourceDir, [
    { name: sourcePath, text: sourceText, mode: 0o644 },
    ...extraFiles,
  ]);
  const manifest = {
    engine,
    source: {
      ...source,
      repository: 'fixture/controlled',
      files: [{
        path: sourcePath,
        blobSha: git(sourceDir, 'rev-parse', 'HEAD:' + sourcePath),
        sizeBytes: Buffer.byteLength(sourceText),
      }],
    },
  };
  const destination = path.join(directory, 'staged');
  const run = (request, args = ['stage', engineDir, sourceDir, destination]) =>
    spawnSync(process.execPath, [command, ...args], {
      input: JSON.stringify(request), encoding: 'utf8', timeout: 12000,
    });
  return { directory, sourceDir, sourceText, sourcePath, manifest, destination, run };
}

test('stage authenticates local Git metadata before copying the exact Kotlin blob', t => {
  const fixture = stagingFixture(t, [{ name: 'README.md', text: 'fixture\n', mode: 0o644 }]);
  const result = fixture.run(fixture.manifest);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(fixture.destination, fixture.sourcePath), 'utf8'), fixture.sourceText);
  assert.equal(fs.existsSync(path.join(fixture.destination, 'README.md')), false);
  const compiler = process.env.SENTINEL_BLOCK26_FIXTURE_COMPILER;
  if (compiler) {
    const artifacts = path.join(fixture.directory, 'compiled');
    fs.mkdirSync(artifacts);
    const launcher = path.resolve(__dirname, '../fixtures/phase2-block26-object-contracts/run-isolated.sh');
    const result = spawnSync('bash', [launcher, 'compile-v2', compiler, fixture.destination, artifacts], {
      encoding: 'utf8', timeout: 150000,
    });
    assert.equal(result.status, 0, result.stderr);
    const classes = execFileSync('jar', ['tf', path.join(artifacts, 'target.jar')], { encoding: 'utf8' });
    assert.match(classes, /^example\/ExampleKt\.class$/m);
    t.diagnostic('The existing isolated Kotlin compiler used the authenticated Git fixture.');
  }
});

test('stage rejects a Kotlin Git entry absent from the reservation before creating compiler input', t => {
  const fixture = stagingFixture(t, [
    { name: 'src/main/kotlin/Executable.kt', text: 'package example\n', mode: 0o755 },
  ]);
  const result = fixture.run(fixture.manifest);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NONCANONICAL_ORIGINAL_KOTLIN_TREE/);
  assert.equal(fs.existsSync(fixture.destination), false);
});

test('stage retains the existing commit, tree, blob and clean-checkout requirements', t => {
  const fixture = stagingFixture(t);
  for (const [change, expected] of [
    [{ treeSha: 'bad-tree' }, /TREE_METADATA_UNAVAILABLE/],
    [{ treeSha: 'f'.repeat(40) }, /TREE_METADATA_UNAVAILABLE/],
    [{ commitSha: 'f'.repeat(40) }, /BLOCK26_OBJECT_EVIDENCE_REFUSED/],
    [{ files: [{ ...fixture.manifest.source.files[0], blobSha: 'f'.repeat(40) }] },
      /BLOCK26_OBJECT_EVIDENCE_REFUSED/],
  ]) {
    const result = fixture.run({ ...fixture.manifest, source: { ...fixture.manifest.source, ...change } });
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
    assert.equal(fs.existsSync(fixture.destination), false);
  }
  fs.writeFileSync(path.join(fixture.sourceDir, fixture.sourcePath), 'changed');
  const dirty = fixture.run(fixture.manifest);
  assert.equal(dirty.status, 1);
  assert.match(dirty.stderr, /BLOCK26_OBJECT_EVIDENCE_REFUSED/);
  assert.equal(fs.existsSync(fixture.destination), false);
  assert.match(fixture.run({}, ['stage']).stderr, /GIT_ADMISSION_ARGUMENTS/);
});

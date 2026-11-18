'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { planMetadataCandidates } = require('../../scripts/phase2-block26-git-admission.cjs');
const pool = require('../../docs/quality/PHASE2-BLOCK26-V9-POOL.json');

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
  const command = path.resolve(__dirname, '../../scripts/phase2-block26-git-admission.cjs');
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

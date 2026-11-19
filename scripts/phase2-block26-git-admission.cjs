#!/usr/bin/env node
'use strict';

const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { assertSafeGitCheckout } = require('../packages/recovery/git-sandbox-policy.cjs');
const { prepareCohort } = require('./phase2-block26-object-eval.cjs');
const { planMetadataCandidates: rankCandidates } = require('./phase2-kotlin-api-v8-candidate-pool.cjs');
const { validateFreeze, verifyFullOriginalTree } = require('./phase2-kotlin-api-v11-metadata.cjs');
const exclusions = require('../docs/quality/PHASE2-BLOCK26-V11-POSTSCOUT-EXCLUSIONS.json');

async function planMetadataCandidates(repositories, excludedRepos, excludedBlobs, loadTree, limits) {
  const noncanonicalTrees = new Set();
  const result = await rankCandidates(repositories, excludedRepos, excludedBlobs, async repository => {
    const identity = await loadTree(repository);
    if (!identity) return identity;
    const { tree, treeSha } = identity;
    if (!tree || tree.sha !== treeSha) return { ...identity, tree: null };

    try {
      verifyFullOriginalTree(tree);
    } catch (error) {
      switch (error.message) {
        case 'V11_NONCANONICAL_ORIGINAL_KOTLIN_TREE':
          noncanonicalTrees.add(repository.full_name);
          break;
        case 'V11_TRUNCATED_ORIGINAL_GIT_TREE':
        case 'V11_INVALID_TREE_ENTRY':
          break;
        default:
          throw error;
      }
      // Keep the pinned identity for the audit and withhold the unusable tree.
      return { ...identity, tree: null };
    }
    return identity;
  }, limits);

  for (const row of result.audit) {
    if (noncanonicalTrees.has(row.repository)) row.reason = 'NONCANONICAL_ORIGINAL_KOTLIN_TREE';
  }
  return result;
}

function readKotlinTree(checkout, treeSha) {
  if (typeof treeSha !== 'string' || !/^[a-f0-9]{40}$/.test(treeSha)) {
    throw Error('TREE_METADATA_UNAVAILABLE');
  }
  let raw;
  try {
    raw = execFileSync('git', [
      '-c', 'protocol.allow=never', 'ls-tree', '-r', '-t', '-l', '-z', treeSha, '--', 'src/main/',
    ], {
      cwd: checkout,
      timeout: 20000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: {
        PATH: process.env.PATH,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_NO_LAZY_FETCH: '1',
        GIT_NO_REPLACE_OBJECTS: '1',
      },
    });
  } catch {
    throw Error('TREE_METADATA_UNAVAILABLE');
  }
  const tree = new TextDecoder('utf-8', { fatal: true }).decode(raw).split('\0').slice(0, -1).map(entry => {
    const tab = entry.indexOf('\t');
    const [mode, type, sha, size] = entry.slice(0, tab).split(/\s+/);
    return { mode, type, sha, size: Number(size), path: entry.slice(tab + 1) };
  });
  return { sha: treeSha, truncated: false, tree };
}

async function stageCohort(engine, checkout, destination, manifest) {
  const { repository, commitSha, treeSha } = manifest.source;
  const source = assertSafeGitCheckout(checkout);
  const tree = readKotlinTree(source, treeSha);
  const plan = await planMetadataCandidates(
    [{ full_name: repository, default_branch: 'pinned', stargazers_count: 0, size: 0 }],
    new Set(), new Set(), () => ({ commitSha, treeSha, tree }), validateFreeze().selector,
  );
  if (plan.candidates.length === 0) throw Error(plan.audit[0].reason);

  // The staging adapter independently checks both checkouts and every reserved blob.
  prepareCohort(assertSafeGitCheckout(engine), source, destination, manifest, { extendedKotlinPaths: true });
}

async function main(args) {
  if (args.length && (args[0] !== 'stage' || args.length !== 4)) throw Error('GIT_ADMISSION_ARGUMENTS');
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (args.length) {
    await stageCohort(...args.slice(1), input);
    return;
  }
  const { repositories, pinnedTrees } = input;
  const result = await planMetadataCandidates(
    repositories,
    new Set(exclusions.repositories.map(repository => repository.toLowerCase())),
    new Set(exclusions.blobShas),
    repository => Object.hasOwn(pinnedTrees, repository.full_name) ? pinnedTrees[repository.full_name] : null,
    validateFreeze().selector,
  );
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ planMetadataCandidates });

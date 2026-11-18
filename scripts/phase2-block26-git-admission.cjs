#!/usr/bin/env node
'use strict';

const { readFileSync } = require('node:fs');
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

async function main() {
  // Standard input contains repositories and pinnedTrees keyed by full_name.
  const { repositories, pinnedTrees } = JSON.parse(readFileSync(0, 'utf8'));
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
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ planMetadataCandidates });

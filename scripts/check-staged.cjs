'use strict';

const { spawnSync } = require('node:child_process');
const { extname } = require('node:path');

const MAX_BYTES = 2 * 1024 * 1024;
const diffOptions = ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--no-relative'];
const decoder = new TextDecoder('utf-8', { fatal: true });
const modes = { '.cjs': 'commonjs', '.mjs': 'module' };
const rawEntry = /^:[0-7]{6} ([0-7]{6}) [0-9a-f]{40,64} ([0-9a-f]{40,64}) [AMT]$/;

function git(cwd, args, error = 'Could not read staged Git files') {
  const result = spawnSync('git', [
    '--no-replace-objects', '-c', 'core.fsmonitor=false', '-c', 'protocol.allow=never', ...args,
  ], {
    cwd, timeout: 10000, maxBuffer: MAX_BYTES,
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1' },
  });
  if (result.error || result.status !== 0) throw Error(error);
  return result.stdout;
}

function checkStaged(cwd) {
  const indexArgs = [...diffOptions, '--raw', '-z', '--no-abbrev', '--no-renames', '--diff-filter=AMT'];
  const snapshot = git(cwd, indexArgs);
  git(cwd, [...diffOptions, '--check'], 'Staged whitespace check failed');

  const entries = decoder.decode(snapshot).split('\0');
  entries.pop();
  let count = 0;
  for (let i = 0; i < entries.length; i += 2) {
    const details = rawEntry.exec(entries[i]);
    if (!details || !entries[i + 1]) throw Error('Invalid staged Git entry');
    const file = entries[i + 1], extension = extname(file);
    if (!Object.hasOwn(modes, extension) && extension !== '.json') continue;
    const filename = JSON.stringify(file);
    if (details[1] !== '100644' && details[1] !== '100755') {
      throw Error('Staged source is not a regular file ' + filename);
    }
    const bytes = git(cwd, ['cat-file', 'blob', details[2]], 'Could not read staged source ' + filename);
    const source = decoder.decode(bytes);
    if (extension === '.json') {
      try { JSON.parse(source); } catch { throw Error('Invalid staged JSON ' + filename); }
    } else {
      const check = spawnSync(process.execPath, ['--check', '--input-type=' + modes[extension]], {
        cwd, input: source, timeout: 10000, maxBuffer: MAX_BYTES,
        env: { ...process.env, NODE_OPTIONS: '' },
      });
      if (check.error || check.status !== 0) {
        throw Error('Invalid staged ' + extension.slice(1).toUpperCase() + ' ' + filename);
      }
    }
    count++;
  }
  if (!snapshot.equals(git(cwd, indexArgs))) throw Error('Git index changed during staged validation');
  return count;
}

if (require.main === module) {
  try {
    console.log('Verified ' + checkStaged(process.cwd()) + ' staged files.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

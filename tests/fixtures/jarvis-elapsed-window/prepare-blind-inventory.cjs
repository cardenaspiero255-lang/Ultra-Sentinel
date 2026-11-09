'use strict';
// Make a source-only input from one locally pinned clean Git commit. Remote
// identity must be established by the caller before invoking this program.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {TextDecoder} = require('node:util');

function run() {
  const [rootArg, head, scope, output] = process.argv.slice(2);
  if (process.argv.length !== 6 || !path.isAbsolute(rootArg) || !path.isAbsolute(output) ||
      !/^[a-f0-9]{40}$/.test(head) || typeof scope !== 'string' ||
      !/^[A-Za-z0-9_.\/-]+$/.test(scope) || !scope.includes('/src/main/') ||
      scope.startsWith('/') || scope.split('/').some(s => !s || s === '.' || s === '..'))
    throw Error('INVALID_INVENTORY_INPUT');
  const root = fs.realpathSync(rootArg);
  const env = {PATH:process.env.PATH || '/usr/bin:/bin', HOME:'/tmp',
    GIT_NO_REPLACE_OBJECTS:'1', GIT_CONFIG_NOSYSTEM:'1', GIT_CONFIG_GLOBAL:'/dev/null',
    GIT_CONFIG_COUNT:'0', GIT_TERMINAL_PROMPT:'0', GIT_OPTIONAL_LOCKS:'0'};
  function git(...args) {
    const p = spawnSync('git', ['-C', root, '-c', 'core.hooksPath=/dev/null',
      '-c', 'core.fsmonitor=false', '--literal-pathspecs', ...args],
      {encoding:null, env, timeout:15000, maxBuffer:4 * 1024 * 1024});
    if (p.error || p.status !== 0 || !Buffer.isBuffer(p.stdout)) throw Error('GIT_FAILED');
    return p.stdout;
  }
  const text = (...args) => git(...args).toString('utf8').trim();
  function requireCleanHead() {
    if (fs.realpathSync(text('rev-parse', '--show-toplevel')) !== root ||
        text('rev-parse', 'HEAD') !== head || text('status', '--porcelain', '--untracked-files=all') !== '')
      throw Error('UNTRUSTED_GIT_CHECKOUT');
  }
  requireCleanHead();
  const listing = git('ls-tree', '-r', '-z', '--full-tree', head, '--', scope).toString('utf8');
  const rows = listing.split('\0');
  if (rows.pop() !== '') throw Error('INCOMPLETE_GIT_TREE');
  const files = [];
  for (const row of rows) {
    const m = /^(\d{6}) (\w+) ([a-f0-9]{40})\t(.+)$/.exec(row);
    if (!m) throw Error('INVALID_GIT_TREE');
    const [, mode, type, blob, name] = m;
    if (!name.endsWith('.kt')) continue;
    if (mode !== '100644' || type !== 'blob' || !name.startsWith(scope + '/') ||
        !/^[A-Za-z0-9_.\/-]+\.kt$/.test(name) || name.length > 350 ||
        name.split('/').some(s => !s || s === '.' || s === '..'))
      throw Error('INVALID_SOURCE_PATH');
    const bytes = git('cat-file', 'blob', blob);
    if (bytes.length < 10 || bytes.length > 160000) throw Error('SOURCE_SIZE');
    const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (actual !== blob) throw Error('SOURCE_BLOB_MISMATCH');
    const source = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
    if (source.includes('\0') || source.includes('\r') || !source.endsWith('\n') ||
        source.split('\n').length > 4000) throw Error('INVALID_SOURCE_TEXT');
    files.push({path:name, source, expectedBlobSha:blob});
  }
  if (!files.length || files.length > 160) throw Error('INVENTORY_SIZE');
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (new Set(files.map(f => f.path)).size !== files.length) throw Error('DUPLICATE_SOURCE_PATH');
  requireCleanHead();
  fs.writeFileSync(output, JSON.stringify({expectedCommitSha:head, files}), {flag:'wx', mode:0o600});
  process.stdout.write(`blind_inventory_count=${files.length}\n`);
}
try { run(); } catch (e) { process.stderr.write(`BLIND_INVENTORY_BLOCKED: ${e.message}\n`); process.exitCode = 1; }

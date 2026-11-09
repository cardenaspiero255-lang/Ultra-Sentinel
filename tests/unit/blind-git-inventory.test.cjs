'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync, spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const fixture = path.join(root, 'tests/fixtures/jarvis-elapsed-window');
const collector = path.join(fixture, 'prepare-blind-inventory.cjs');
const worker = path.join(root, 'packages/family-hunter/blind-hunter-worker.cjs');
const scope = 'app/src/main/kotlin';
const ordinary = 'package example\nclass Ordinary { val x = 1 }\n';
const risk = 'package example\nclass Risk { fun f(issued: Long?, now: Long): Boolean {\n'+
  'val fresh = issued != null && now >= issued && now - issued < 100L\nreturn fresh\n} }\n';

function repository() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blind-inventory-test-'));
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(path.join(repo, scope), {recursive:true});
  fs.mkdirSync(path.join(repo, 'private-oracle'), {recursive:true});
  fs.writeFileSync(path.join(repo, scope, 'Ordinary.kt'), ordinary);
  fs.writeFileSync(path.join(repo, scope, 'Risk.kt'), risk);
  fs.writeFileSync(path.join(repo, scope, 'README.md'), 'NOT_KOTLIN_SOURCE\n');
  fs.writeFileSync(path.join(repo, 'private-oracle', 'answer.txt'), 'HELD_OUT_SECRET_123\n');
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], {encoding:'utf8'}).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  return {dir, repo, git, head:git('rev-parse', 'HEAD')};
}

function collect(r, head = r.head) {
  const output = path.join(r.dir, 'inventory.json');
  const proc = spawnSync(process.execPath, [collector, r.repo, head, scope, output], {encoding:'utf8'});
  return {proc, output};
}

test('inventory exposes only committed Kotlin source and matching Git blobs, not the held-out oracle', () => {
  const r = repository();
  try {
    const {proc, output} = collect(r);
    assert.equal(proc.status, 0, proc.stderr);
    const text = fs.readFileSync(output, 'utf8');
    const result = JSON.parse(text);
    assert.deepEqual(Object.keys(result).sort(), ['expectedCommitSha', 'files']);
    assert.equal(result.expectedCommitSha, r.head);
    assert.deepEqual(result.files.map(f => f.path), [`${scope}/Ordinary.kt`, `${scope}/Risk.kt`]);
    for (const file of result.files) {
      assert.equal(file.expectedBlobSha, r.git('rev-parse', `HEAD:${file.path}`));
      assert.equal(file.source, r.git('show', `HEAD:${file.path}`) + '\n');
    }
    assert.ok(!text.includes('HELD_OUT_SECRET_123'));
    assert.ok(!text.includes('private-oracle'));
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('inventory rejects dirty trees and wrong commits without emitting input', () => {
  const r = repository();
  try {
    let result = collect(r, 'f'.repeat(40));
    assert.notEqual(result.proc.status, 0);
    assert.equal(fs.existsSync(result.output), false);
    fs.appendFileSync(path.join(r.repo, scope, 'Risk.kt'), '// modified\n');
    result = collect(r);
    assert.notEqual(result.proc.status, 0);
    assert.equal(fs.existsSync(result.output), false);
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('inventory can use the system Git path when PATH is empty', () => {
  const r = repository();
  try {
    const output = path.join(r.dir, 'inventory.json');
    const proc = spawnSync(process.execPath, [collector,r.repo,r.head,scope,output],
      {encoding:'utf8',env:{...process.env,PATH:''}});
    assert.equal(proc.status, 0, proc.stderr);
    assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).files.length, 2);
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('worker consumes the inventory and emits only unverified hypotheses', () => {
  const r = repository();
  try {
    const {proc, output} = collect(r);
    assert.equal(proc.status, 0, proc.stderr);
    const report = path.join(r.dir, 'report.json');
    const run = spawnSync(process.execPath, [worker, output, report], {encoding:'utf8'});
    assert.equal(run.status, 0, run.stderr);
    const result = JSON.parse(fs.readFileSync(report, 'utf8'));
    assert.equal(result.status, 'UNVERIFIED_ELAPSED_WINDOW_HYPOTHESES');
    assert.equal(result.findings.length, 1);
    assert.equal(result.originalFunctionalOracleVerified, false);
    assert.equal(result.mergeAllowed, false);
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('malformed inventory invocations and nonexistent scopes fail closed', () => {
  const r = repository();
  try {
    const output = path.join(r.dir, 'inventory.json');
    const invalid = [
      [], ['relative', r.head, scope, output], [r.repo, 'Z'.repeat(40), scope, output],
      [r.repo, r.head, '/app/src/main/kotlin', output],
      [r.repo, r.head, 'app/src/main/../kotlin', output],
      [r.repo, r.head, 'app/src/main//kotlin', output],
      [r.repo, r.head, 'app/src/other/kotlin', output],
      [r.repo, r.head, 'app/src/main/bad space', output],
      [r.repo, r.head, scope, 'relative.json'],
      [r.repo, r.head, 'app/src/main/missing', output],
      [path.join(r.dir, 'missing'), r.head, scope, output]
    ];
    for (const args of invalid) {
      const p = spawnSync(process.execPath, [collector, ...args], {encoding:'utf8'});
      assert.notEqual(p.status, 0, JSON.stringify(args));
      assert.equal(fs.existsSync(output), false);
    }
    fs.writeFileSync(output, 'previous');
    const p = spawnSync(process.execPath, [collector, r.repo, r.head, scope, output], {encoding:'utf8'});
    assert.notEqual(p.status, 0);
    assert.equal(fs.readFileSync(output, 'utf8'), 'previous');
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('source inventory rejects committed unsafe file modes, paths and contents', () => {
  const variants = [
    {name:'Link.kt', symlink:true},
    {name:'Executable.kt', data:ordinary, executable:true},
    {name:'Bad+name.kt', data:ordinary},
    {name:'Tiny.kt', data:'x\n'},
    {name:'Large.kt', data:'x'.repeat(160001)+'\n'},
    {name:'NoNewline.kt', data:'package example'},
    {name:'Carriage.kt', data:'package example\r\n'},
    {name:'Nul.kt', data:'package example\0\n'},
    {name:'LongLines.kt', data:'x\n'.repeat(4001)},
    {name:'InvalidUtf8.kt', data:Buffer.from([0x70,0x61,0x63,0x6b,0x61,0x67,0x65,0x20,0xff,0x0a])}
  ];
  for (const variant of variants) {
    const r = repository();
    try {
      const target = path.join(r.repo, scope, variant.name);
      if (variant.symlink) fs.symlinkSync('Ordinary.kt', target);
      else fs.writeFileSync(target, variant.data);
      if (variant.executable) fs.chmodSync(target, 0o755);
      r.git('add', '.');
      r.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'variant');
      const result = collect(r, r.git('rev-parse', 'HEAD'));
      assert.notEqual(result.proc.status, 0, variant.name);
      assert.equal(fs.existsSync(result.output), false, variant.name);
    } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
  }
});

test('source inventory refuses untracked changes and excessive file counts', () => {
  const r = repository();
  try {
    fs.writeFileSync(path.join(r.repo, 'untracked'), 'changed');
    assert.notEqual(collect(r).proc.status, 0);
    fs.unlinkSync(path.join(r.repo, 'untracked'));
    for (let i=0; i<160; i++) fs.writeFileSync(path.join(r.repo, scope, `Extra${i}.kt`), ordinary);
    r.git('add', '.');
    r.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'many files');
    const result = collect(r, r.git('rev-parse', 'HEAD'));
    assert.notEqual(result.proc.status, 0);
    assert.equal(fs.existsSync(result.output), false);
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('inventory rejects malformed or inconsistent Git responses before exposing source', () => {
  const r = repository();
  try {
    const bin = path.join(r.dir, 'fake-bin'); fs.mkdirSync(bin);
    const fake = path.join(bin, 'git'), output = path.join(r.dir, 'inventory.json');
    const blob = r.git('rev-parse', `HEAD:${scope}/Ordinary.kt`);
    const entry = (hash, name) => `100644 blob ${hash}\t${name}\0`;
    const variants = [
      {tree:''},
      {tree:'truncated'},
      {tree:'invalid entry\0'},
      {tree:`100644 tree ${blob}\t${scope}/Pretend.kt\0`},
      {tree:entry(blob, `other/src/main/kotlin/Ordinary.kt`)},
      {tree:entry(blob, `${scope}/../Outside.kt`)},
      {tree:entry(blob, `${scope}/${'x'.repeat(351)}.kt`)},
      {tree:entry('a'.repeat(40), `${scope}/Ordinary.kt`), bytes:ordinary},
      {tree:entry(blob, `${scope}/Duplicate.kt`)+entry(blob, `${scope}/Duplicate.kt`), bytes:ordinary},
      {tree:entry(blob, `${scope}/Z.kt`)+entry(blob, `${scope}/A.kt`), bytes:ordinary, valid:true},
      {error:true}
    ];
    for (const variant of variants) {
      const script = `#!${process.execPath}\n`+
        `const a=process.argv.slice(2); const v=${JSON.stringify(variant)};\n`+
        `if(v.error)process.exit(1);\n`+
        `if(a.includes('--show-toplevel'))process.stdout.write(${JSON.stringify(r.repo)});\n`+
        `else if(a.includes('rev-parse'))process.stdout.write(${JSON.stringify(r.head)});\n`+
        `else if(a.includes('status'))process.stdout.write('');\n`+
        `else if(a.includes('ls-tree'))process.stdout.write(v.tree);\n`+
        `else if(a.includes('cat-file'))process.stdout.write(v.bytes||'');\n`;
      fs.writeFileSync(fake, script, {mode:0o755});
      const p = spawnSync(process.execPath, [collector,r.repo,r.head,scope,output],
        {encoding:'utf8',env:{...process.env,PATH:bin+':/usr/bin:/bin'}});
      if (variant.valid) {
        assert.equal(p.status, 0, p.stderr);
        assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')).files.map(f=>f.path),
          [`${scope}/A.kt`, `${scope}/Z.kt`]);
        fs.unlinkSync(output);
      } else {
        assert.notEqual(p.status, 0, JSON.stringify(variant).slice(0,100));
        assert.equal(fs.existsSync(output), false);
      }
    }
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('worker rejects malformed, oversized or inconsistent input without creating a report', () => {
  const r = repository();
  try {
    const {proc, output} = collect(r);
    assert.equal(proc.status, 0, proc.stderr);
    const dest = path.join(r.dir, 'report.json');
    const bad = path.join(r.dir, 'bad.json');
    const huge = path.join(r.dir, 'huge.json');
    fs.writeFileSync(bad, '{bad json');
    fs.writeFileSync(huge, Buffer.alloc(32*1024*1024+1, 32));
    for (const args of [[], [bad,dest], [huge,dest], [path.join(r.dir,'missing'),dest]]) {
      assert.notEqual(spawnSync(process.execPath, [worker,...args]).status, 0);
      assert.equal(fs.existsSync(dest), false);
    }
    const forged = JSON.parse(fs.readFileSync(output, 'utf8'));
    forged.files[0].expectedBlobSha = 'f'.repeat(40);
    fs.writeFileSync(bad, JSON.stringify(forged));
    assert.notEqual(spawnSync(process.execPath, [worker,bad,dest]).status, 0);
    assert.equal(fs.existsSync(dest), false);
    fs.writeFileSync(dest, 'previous');
    assert.notEqual(spawnSync(process.execPath, [worker,output,dest]).status, 0);
    assert.equal(fs.readFileSync(dest, 'utf8'), 'previous');
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

test('worker refuses contradictory or privileged Hunter output', () => {
  const r = repository();
  try {
    const {proc, output} = collect(r);
    assert.equal(proc.status, 0, proc.stderr);
    const dest = path.join(r.dir, 'report.json'), preload = path.join(r.dir, 'preload.cjs');
    const base = {status:'NO_HYPOTHESES', sourceRepositoryAuthenticated:false,
      originalFunctionalOracleVerified:false, remoteWrites:false, mergeAllowed:false};
    for (const result of [{...base,status:'BLOCKED_MALFORMED'},
      {...base,sourceRepositoryAuthenticated:true}, {...base,originalFunctionalOracleVerified:true},
      {...base,remoteWrites:true}, {...base,mergeAllowed:true}]) {
      const script = "const M=require('node:module');const old=M._load;M._load=function(id,...args){"+
        "if(id==='./blind-elapsed-window.cjs')return {scanBlindElapsedWindows:()=>"+JSON.stringify(result)+"};"+
        "return old.call(this,id,...args)};";
      fs.writeFileSync(preload, script);
      const p = spawnSync(process.execPath, ['--require',preload,worker,output,dest]);
      assert.notEqual(p.status, 0);
      assert.equal(fs.existsSync(dest), false);
    }
  } finally { fs.rmSync(r.dir, {recursive:true, force:true}); }
});

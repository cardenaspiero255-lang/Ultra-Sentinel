'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-owner-original-kotlin-oracles.yml'),'utf8');
test('C2 Kotlin Bubblewrap preserves merged-/usr ELF loader and library symlinks',()=>{
 assert.match(workflow,/for mount in \/bin \/lib \/lib64; do/);
 assert.match(workflow,/mounts\+=\(--symlink "\$target" "\$mount"\)/);
 assert.match(workflow,/mounts\+=\(--ro-bind "\$mount" "\$mount"\)/);
 assert.match(workflow,/bwrap --die-with-parent --unshare-all --new-session --clearenv/);
 assert.match(workflow,/\$\{mounts\[@\]\}/);
});
test('C2 Kotlin runner never falls back to unisolated JVM or leaks tokens',()=>{
 assert.match(workflow,/--clearenv/);
 assert.match(workflow,/--ro-bind "\$jdk" \/jdk/);
 assert.match(workflow,/--ro-bind "\$build" \/workspace/);
 assert.match(workflow,/-- \/jdk\/bin\/java -jar/);
 assert.match(workflow,/--proc \/proc --dev \/dev --tmpfs \/tmp/);
 assert.doesNotMatch(workflow,/--share-net|sudo sysctl -w|\|\| java -jar/);
});

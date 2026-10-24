'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sourceSlices}=require('../../scripts/c2-aw315-source-extract.cjs');

const original=`package net.activitywatch.android
class RustInterface(context: Context? = null) {
    fun startServerTask() {
        if (!serverStarted) {
            try {
                val socket = java.net.ServerSocket(BuildConfig.SERVER_PORT)
                socket.close()
            } catch (e: java.net.BindException) {
                return
            }
            serverStarted = true
        }
    }

    fun createBucketHelper(bucket_id: String, type: String) {}
}`;
const repaired=`package net.activitywatch.android
internal enum class PortProbe { FREE, IN_USE, SOCKET_DENIED }
internal fun probeServerPort(port: Int): PortProbe =
    try { java.net.ServerSocket(port).close(); PortProbe.FREE }
    catch (e: java.net.BindException) { PortProbe.IN_USE }
    catch (e: java.io.IOException) { onDenied(e); PortProbe.SOCKET_DENIED }
    catch (e: SecurityException) { onDenied(e); PortProbe.SOCKET_DENIED }

class RustInterface(context: Context? = null) {
    fun startServerTask() {
        if (!serverStarted) {
            when (probeServerPort(BuildConfig.SERVER_PORT)) {
                PortProbe.FREE -> {}
                PortProbe.IN_USE -> { return }
                PortProbe.SOCKET_DENIED -> { return }
            }
            serverStarted = true
        }
    }

    fun createBucketHelper(bucket_id: String, type: String) {}
}`;

test('source scoped extraction keeps the exact upstream method without rewriting its body',()=>{
 const out=sourceSlices(original,repaired);
 assert.match(out.originalSource,/catch \(e: java\.net\.BindException\)/);
 assert.match(out.fixedSource,/catch \(e: java\.io\.IOException\)/);
 assert.match(out.fixedSource,/PortProbe\.SOCKET_DENIED/);
 assert.ok(out.originalMethod.includes('val socket = java.net.ServerSocket(BuildConfig.SERVER_PORT)'));
 assert.ok(!out.originalMethod.includes('probeServerPort'));
 assert.equal(out.newGoldLabels,0);
 assert.equal(out.trainingExcludedAsKnownDevelopment,true);
});
test('fails closed on missing upstream production function and missing denial handling',()=>{
 assert.throws(()=>sourceSlices(original.replace('fun startServerTask','fun renamedTask'),repaired),/C2_AW315_BLOCKED/);
 assert.throws(()=>sourceSlices(original,repaired.replace('java.io.IOException','java.io.FileNotFoundException')),/C2_AW315_BLOCKED/);
});
test('fails closed on duplicated source anchors that permit ambiguous extraction',()=>{
 assert.throws(()=>sourceSlices(original+'\n'+original,repaired),/C2_AW315_BLOCKED/);
});

test('independent job re-fetches both exact original and fixed Git blobs before claiming source provenance',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const wf=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-aw315-original-fix-development.yml'),'utf8');
 const verifier=wf.split('  independent-receipt-authentication:')[1];
 assert.ok(verifier, 'independent verifier job is required');
 assert.match(verifier,/ref: 3cd8a388d21dcdd7bc7e686a75a7b3046d876f11/);
 assert.match(verifier,/ref: 5a44cecef81c62d1527c49fecd00f90bd18db9df/);
 assert.match(verifier,/410c7a2d9c6d5698c3ed623b3c0d46ee01620081/);
 assert.match(verifier,/9474712a3953c78118f0d33633afb247bae31770/);
 assert.match(verifier,/842324ca38c8a1f3253c464eca41dcfdd05d382e/);
 assert.match(verifier,/originalMethodSha256/);
 assert.match(verifier,/fixedMethodSha256/);
});

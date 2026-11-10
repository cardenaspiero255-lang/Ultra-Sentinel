#!/usr/bin/env bash
# Synthetic semantic regression only; this is not an independent product oracle.
set -euo pipefail
[ "$#" -eq 4 ] || exit 2
kotlin=$(realpath "$1")
repo=$(realpath "$2")
agent=$(realpath "$3")
jacoco=$(realpath "$4")
fixture="$repo/tests/fixtures/kotlin-numeric-identity"
[[ "$("$kotlin/bin/kotlinc" -version 2>&1)" == *'kotlinc-jvm 2.0.21 '* ]]
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
alias_relative=module/src/main/kotlin/numeric/alias/Alias.kt
mkdir -p "$(dirname "$work/$alias_relative")"
cp "$fixture/Alias.kt" "$work/$alias_relative"
"$kotlin/bin/kotlinc" -nowarn -language-version 1.9 -cp "$kotlin/lib/kotlin-compiler.jar" \
 "$repo/packages/kotlin-semantic/C2NumericSemanticClaims.kt" -d "$work/emitter.jar"
java -javaagent:"$agent"="destfile=$work/coverage.exec,includes=C2NumericSemanticClaimsKt*" \
 -cp "$work/emitter.jar:$kotlin/lib/*" C2NumericSemanticClaimsKt \
 "$kotlin/lib/kotlin-stdlib.jar" "$fixture/Standard.kt" "$work/$alias_relative" "$fixture/Shadow.kt" "$fixture/Unresolved.kt" \
 > "$work/report.json"
java -javaagent:"$agent"="destfile=$work/coverage.exec,includes=C2NumericSemanticClaimsKt*,append=true" \
 -cp "$work/emitter.jar:$kotlin/lib/*" C2NumericSemanticClaimsKt \
 "$kotlin/lib/kotlin-stdlib.jar" "$fixture/Spoof.kt" > "$work/spoof.json"
java -cp "$work/emitter.jar:$kotlin/lib/*" C2NumericSemanticClaimsKt \
 "$kotlin/lib/kotlin-stdlib.jar" "--target=$work/$alias_relative" "$work/$alias_relative" > "$work/alias-report.json"
node - "$work/report.json" "$work/spoof.json" <<'JS'
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(report.schema,'ultra-sentinel-numeric-semantic-claims/v1');
assert.equal(report.compilerAuthenticated,false);
assert.equal(report.originalOracleVerified,false);
const spoof=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
assert.deepEqual(spoof.claims,[],'a source declaration cannot impersonate the Kotlin library');
assert.equal(spoof.compilerAuthenticated,false);
const actual=report.claims.map(c=>{
 const bytes=fs.readFileSync(c.path);
 const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(c.blobSha,sha);
 return [path.basename(c.path),c.line,c.rule].join(':');
}).sort();
assert.deepEqual(actual,[
 'Alias.kt:3:WIDE_NUMERIC_NARROWED_BEFORE_CLAMP',
 'Standard.kt:2:WIDE_NUMERIC_NARROWED_BEFORE_CLAMP',
 'Standard.kt:3:INT_MULTIPLICATION_BEFORE_WIDENING'
].sort());
console.log('KOTLIN_NUMERIC_SYMBOL_IDENTITY_FIXTURE_PASS');
JS
node - "$work" "$repo" "$alias_relative" <<'JS'
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [work,repo,relativePath]=process.argv.slice(2),absolutePath=path.join(work,relativePath);
const source=fs.readFileSync(absolutePath,'utf8'),bytes=Buffer.from(source);
const sourceBlobSha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const {runBlindNumericInventory}=require(path.join(repo,'packages/family-hunter/blind-numeric-worker.cjs'));
const blindReport=runBlindNumericInventory({expectedCommitSha:'a'.repeat(40),
 files:[{path:relativePath,source,expectedBlobSha:sourceBlobSha}],skippedOversized:0,skippedNoncanonical:0});
const semanticReport=JSON.parse(fs.readFileSync(path.join(work,'alias-report.json'),'utf8'));
const {linkSealedNumericAndCompilerClaims}=require(path.join(repo,'packages/family-hunter/phase2-numeric-sealed-semantic-link.cjs'));
const link=linkSealedNumericAndCompilerClaims({relativePath,absolutePath,sourceBlobSha,blindReport,semanticReport});
assert.equal(link.status,'BLIND_NUMERIC_TYPED_LINK_ADVISORY');
assert.equal(link.matchedClaims,1);
assert.equal(link.compilerEvidenceAuthenticated,false);
assert.equal(link.originalOracleVerified,false);
assert.equal(link.remoteWrites,false);
console.log('BLIND_NUMERIC_ALIAS_LINKED_ADVISORY_NOT_ORACLE');
JS
java -jar "$jacoco" report "$work/coverage.exec" --classfiles "$work/emitter.jar" \
 --sourcefiles "$repo/packages/kotlin-semantic" --xml "$work/coverage.xml" >/dev/null
node - "$work/coverage.xml" "$repo/packages/kotlin-semantic/C2NumericSemanticClaims.kt" <<'JS'
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const xml=fs.readFileSync(process.argv[2],'utf8'),source=fs.readFileSync(process.argv[3],'utf8').split('\n');
const section=xml.match(/<sourcefile name="C2NumericSemanticClaims\.kt">([\s\S]*?)<\/sourcefile>/);
assert.ok(section,'missing JaCoCo source coverage');
const first=source.findIndex(s=>s.startsWith('private fun resolved('))+1;
const last=source.findIndex(s=>s.startsWith('private fun expressionType('))+1;
assert.ok(first>0&&last>first,'missing semantic call identity method');
const coveredLines=[];
for(const m of section[1].matchAll(/<line nr="(\d+)" mi="(\d+)" ci="(\d+)"/g)){
 const line=Number(m[1]);
 if((line>=first&&line<last)||source[line-1].includes('resolved('))
  coveredLines.push({line,covered:Number(m[3])>0});
}
assert.ok(coveredLines.length>=5,'missing executable semantic identity lines');
const covered=coveredLines.filter(x=>x.covered).length;
assert.ok(covered/coveredLines.length>=0.9,JSON.stringify(coveredLines));
console.log(`KOTLIN_NUMERIC_IDENTITY_LINE_COVERAGE=${covered}/${coveredLines.length}`);
JS

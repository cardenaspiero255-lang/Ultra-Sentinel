'use strict';
// Development case only: the source was examined before this experiment.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const [root,sentinel,work]=process.argv.slice(2);
const target='app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt';
const head='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const originalBlob='61ab93d2f4e6deb7aaf321b7b18583de2acc5699';
const source=fs.readFileSync(path.join(root,target),'utf8');
const blob=s=>{const b=Buffer.from(s);return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');};
if(blob(source)!==originalBlob)throw Error('ORIGINAL_BLOB_MISMATCH');
const report=require(path.join(sentinel,'packages/family-hunter/phase2-numeric-risk-hunter.cjs'))
 .scanKotlinNumericRisks({expectedCommitSha:head,files:[{path:target,source,expectedBlobSha:originalBlob}]});
if(report.status!=='NUMERIC_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE'||
 !report.findings.some(x=>x.line===71&&x.rule==='WIDE_NUMERIC_NARROWED_BEFORE_CLAMP'))
 throw Error('MULTILINE_FINDING_MISSING');
fs.writeFileSync(path.join(work,'discovery.json'),JSON.stringify(report),{flag:'wx',mode:0o600});
const old='((freeBytes * 100L) / totalBytes)\n            .toInt()\n            .coerceIn(0, 100)';
if(source.split(old).length!==2)throw Error('EXPECTED_EXPRESSION_NOT_UNIQUE');
// This is a manually written development intervention, not a generic Fixer.
const fix='((freeBytes.toBigInteger() * 100.toBigInteger()) / totalBytes.toBigInteger())\n'+
 '            .coerceIn(java.math.BigInteger.ZERO, java.math.BigInteger.valueOf(100L))\n'+
 '            .toInt()';
const candidate=source.replace(old,fix),wrong=source.replace(old,'100');
for(const [name,text] of [['original',source],['candidate',candidate],['wrong',wrong]])
 fs.writeFileSync(path.join(work,`${name}.kt`),text,{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(work,'intervention.json'),JSON.stringify({head,target,originalBlob,
 candidateBlob:blob(candidate)}),{flag:'wx',mode:0o600});
console.log('MULTILINE_ORIGINAL_SOURCE_HYPOTHESIS_NOT_BLIND');

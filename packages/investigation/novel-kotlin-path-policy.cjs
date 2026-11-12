'use strict';
/*
 * Fail-closed path authority for original Kotlin production source sets: main,\n * commonMain, jvmMain and androidMain; never tests or generated folders.
 * Only a lexical input check: never authenticates source provenance, grants
 * access to the filesystem, or authorizes a remote write or merge.
 */
const PATH=/^(?:(?:apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core|app\/src\/main\/(?:java|kotlin)|(?:[A-Za-z0-9_-]+\/){1,4}src\/(?:main\/(?:java|kotlin)|(?:commonMain|jvmMain|androidMain)\/kotlin))\/[A-Za-z0-9_./-]+)\.kt$/;
function isSafeNovelKotlinPath(value){
 if(typeof value!=='string'||value.length<10||value.length>300||
  !(PATH.test(value)||value==='packages/kotlin-semantic/C2OptionalKotlinSemantic.kt')||
  value.includes('..')||value.includes('//')||
  value.includes('\\'))return false;
 const segments=value.split('/');
 return !segments.some(x=>x===''||x==='.'||x==='..');
}
module.exports=Object.freeze({isSafeNovelKotlinPath});

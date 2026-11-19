'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rankRepositoryMetadata,admitMetadataTree}=require('../../scripts/phase2-kotlin-api-v7-select.cjs');
const sha=x=>x.repeat(40);
const a=(path,hash,size=100)=>({path,sha:sha(hash),size,mode:'100644',type:'blob'});
const origin=(full_name,stars=3)=>({full_name,stargazers_count:stars,default_branch:'main',private:false,archived:false,fork:false});

test('prospective metadata ranking is deterministic and rejects duplicate public identities',()=>{
 const sorted=rankRepositoryMetadata([origin('z/b',4),origin('A/b',6),origin('a/C',6)]);
 assert.deepEqual(sorted.map(x=>x.full_name),['A/b','a/C','z/b']);
 assert.throws(()=>rankRepositoryMetadata([origin('a/B'),origin('A/b')]),/DUPLICATE_REPOSITORY/);
});
test('eligible metadata has only original Kotlin paths and no code bodies',()=>{
 const repo=origin('fresh/prospective');
 const tree={truncated:false,tree:[
  a('src/main/kotlin/main.kt','a'),
  a('src/main/kotlin/util/Sub.kt','b',80),
  a('src/test/kotlin/fixture.kt','c'),
  {path:'src/main/kotlin/link.kt',sha:sha('d'),mode:'120000',type:'blob',size:8}
 ]};
 const result=admitMetadataTree(repo,'ab'.repeat(20),'cd'.repeat(20),tree,new Set(),new Set());
 assert.equal(result.eligible,true);
 assert.deepEqual(result.files.map(x=>x.path),['src/main/kotlin/main.kt','src/main/kotlin/util/Sub.kt']);
 assert.equal(result.totalBytes,180);
 assert.ok(!JSON.stringify(result).includes('fixture.kt'));
});
test('previously exposed Kotlin blobs or repository identities cannot be reserved again',()=>{
 const repo=origin('already/known'),tree={truncated:false,tree:[a('src/main/kotlin/Main.kt','e')]};
 assert.equal(admitMetadataTree(repo,sha('a'),sha('b'),tree,new Set(['already/known']),new Set()).eligible,false);
 assert.equal(admitMetadataTree(repo,sha('a'),sha('b'),tree,new Set(),new Set([sha('e')])).eligible,false);
});
test('fail closed on partial API metadata, invalid hashes, source contents and oversize cohorts',()=>{
 const repo=origin('fresh/kotlin');
 assert.throws(()=>admitMetadataTree(repo,sha('a'),sha('b'),{truncated:true,tree:[]},new Set(),new Set()),/TRUNCATED_TREE/);
 assert.throws(()=>admitMetadataTree(repo,'bad',sha('b'),{truncated:false,tree:[]},new Set(),new Set()),/INVALID_SHA/);
 assert.throws(()=>admitMetadataTree(repo,sha('a'),sha('b'),{truncated:false,tree:[{...a('src/main/kotlin/Main.kt','f'),content:'secret'}]},new Set(),new Set()),/SOURCE_BODY_FORBIDDEN/);
 const tooLarge=admitMetadataTree(repo,sha('a'),sha('b'),{truncated:false,tree:[a('src/main/kotlin/Main.kt','f',196609)]},new Set(),new Set());
 assert.equal(tooLarge.eligible,false);
 assert.equal(tooLarge.reason,'SOURCE_SIZE_OUTSIDE_BOUNDS');
});

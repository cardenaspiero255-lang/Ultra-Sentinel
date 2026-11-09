'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {planDependencyExpansion}=require('../../packages/family-hunter/cross-file-interventions.cjs');
const sha='a'.repeat(40), digest='b'.repeat(64);
const edge=(from,to)=>({from,to,evidenceSha256:digest});
const input=()=>({headSha:sha,seeds:['src/A.kt'],edges:[edge('src/A.kt','src/B.kt'),edge('src/B.kt','src/C.kt')],maxFiles:3,maxDepth:2});
test('expands explicit evidence in deterministic breadth-first order without claiming proof',()=>{
 const r=planDependencyExpansion(input());
 assert.equal(r.status,'COMPLETE_WITHIN_SUPPLIED_GRAPH');
 assert.deepEqual(r.files.map(x=>[x.path,x.depth]),[['src/A.kt',0],['src/B.kt',1],['src/C.kt',2]]);
 assert.equal(r.edgesConsidered,2); assert.equal(r.causalityVerified,false);
 assert.equal(r.sourceAuthenticated,false); assert.equal(r.semanticAnalysisPerformed,false);
});
test('budget and depth boundaries disclose unvisited dependencies',()=>{
 const a=planDependencyExpansion({...input(),maxFiles:2});
 assert.equal(a.status,'INCOMPLETE_BUDGET'); assert.equal(a.files.length,2);
 const b=planDependencyExpansion({...input(),maxDepth:1});
 assert.equal(b.status,'INCOMPLETE_DEPTH'); assert.equal(b.files.length,2);
});
test('cycles and input ordering are deterministic',()=>{
 const a=input(); a.edges.push(edge('src/C.kt','src/A.kt'));
 const b={...a,edges:[...a.edges].reverse()};
 assert.deepEqual(planDependencyExpansion(a),planDependencyExpansion(b));
 assert.equal(planDependencyExpansion(a).files.length,3);
});
test('rejects unsafe, ambiguous or unbounded input',()=>{
 for(const patch of [{headSha:'main'},{seeds:['../x']},{maxFiles:0},{maxDepth:-1},
  {edges:[edge('src/A.kt','/absolute')]},{edges:[{...edge('src/A.kt','src/B.kt'),evidenceSha256:'x'}]},
  {edges:[edge('src/A.kt','src/B.kt'),edge('src/A.kt','src/B.kt')]},
  {seeds:['src/A.kt','src/A.kt']}, {maxFiles:1,seeds:['a','b']}])
  assert.throws(()=>planDependencyExpansion({...input(),...patch}),/INVALID_DEPENDENCY_EXPANSION/);
});
test('traverses a 12-file chain without treating structural relations as causal proof',()=>{
 const paths=Array.from({length:12},(_,i)=>`src/Chain${i}.kt`);
 const edges=paths.slice(1).map((p,i)=>edge(paths[i],p));
 const args={headSha:sha,seeds:[paths[0]],edges,maxFiles:12,maxDepth:11};
 const complete=planDependencyExpansion(args);
 assert.equal(complete.status,'COMPLETE_WITHIN_SUPPLIED_GRAPH');
 assert.deepEqual(complete.files.map(f=>f.path),paths);
 assert.equal(complete.files[11].depth,11);
 assert.equal(complete.sourceAuthenticated,false);
 assert.equal(complete.semanticAnalysisPerformed,false);
 assert.equal(complete.causalityVerified,false);
 const depthLimited=planDependencyExpansion({...args,maxDepth:7});
 assert.equal(depthLimited.status,'INCOMPLETE_DEPTH');
 assert.equal(depthLimited.files.length,8);
 const nodeLimited=planDependencyExpansion({...args,maxFiles:8});
 assert.equal(nodeLimited.status,'INCOMPLETE_BUDGET');
 assert.equal(nodeLimited.files.length,8);
});
test('rejects JavaScript accessors and proxies without invoking their effects',()=>{
 let effects=0;
 const options=input();
 Object.defineProperty(options,'headSha',{get(){effects++;return sha;}});
 assert.throws(()=>planDependencyExpansion(options),/INVALID_DEPENDENCY_EXPANSION/);
 const hostileEdge=edge('src/A.kt','src/B.kt');
 Object.defineProperty(hostileEdge,'to',{get(){effects++;return 'src/B.kt';}});
 assert.throws(()=>planDependencyExpansion({...input(),edges:[hostileEdge]}),/INVALID_DEPENDENCY_EXPANSION/);
 const hostileSeeds=['src/A.kt'];
 Object.defineProperty(hostileSeeds,'0',{get(){effects++;return 'src/A.kt';}});
 assert.throws(()=>planDependencyExpansion({...input(),seeds:hostileSeeds}),/INVALID_DEPENDENCY_EXPANSION/);
 const proxy=new Proxy(input(),{get(){effects++;throw Error('proxy trap invoked');}});
 assert.throws(()=>planDependencyExpansion(proxy),/INVALID_DEPENDENCY_EXPANSION/);
 assert.equal(effects,0);
});
test('bounded structural planning handles 4 through 256 related files without claiming execution',()=>{
 for(const size of [4,8,16,32,64,128,256]){
  const seeds=['src/root.kt'];
  const edges=Array.from({length:size-1},(_,i)=>edge(seeds[0],`src/file${String(i).padStart(3,'0')}.kt`));
  const result=planDependencyExpansion({headSha:sha,seeds,edges,maxFiles:size,maxDepth:1});
  assert.equal(result.status,'COMPLETE_WITHIN_SUPPLIED_GRAPH');
  assert.equal(result.files.length,size);
  assert.equal(result.edgesConsidered,size-1);
  assert.equal(result.causalityVerified,false);
  assert.equal(result.sourceAuthenticated,false);
 }
});

'use strict';
/* Bounded source-only scalar interval flow. Not compiler proof or trusted semantics.
 * Unknown expressions/guards abstain; never produce verified defect labels. */
const BOUNDS=Object.freeze({
 Int:Object.freeze({lo:-(1n<<31n),hi:(1n<<31n)-1n}),
 Long:Object.freeze({lo:-(1n<<63n),hi:(1n<<63n)-1n})
});
const ID=/^[A-Za-z_][A-Za-z_0-9]*$/;
function interval(type,lo,hi){
 const limit=BOUNDS[type];
 return limit&&typeof lo==='bigint'&&typeof hi==='bigint'&&
  lo<=hi&&lo>=limit.lo&&hi<=limit.hi?Object.freeze({type,lo,hi}):null;
}
function top(type){const b=BOUNDS[type];return b?interval(type,b.lo,b.hi):null;}
function literal(text){
 const s=text.trim(),constant=/^(Int|Long)\.(MIN_VALUE|MAX_VALUE)(?:\s*([+-])\s*(\d+))?$/.exec(s);
 if(constant){
  let n=BOUNDS[constant[1]][constant[2]==='MIN_VALUE'?'lo':'hi'];
  if(constant[3])n+=BigInt(constant[3]==='-'?'-'+constant[4]:constant[4]);
  return interval(constant[1],n,n);
 }
 const m=/^(-?\d+)([Ll])?$/.exec(s);
 if(!m)return null;
 const v=BigInt(m[1]),type=m[2]?'Long':'Int';
 return interval(type,v,v);
}
function unwrap(s){
 s=s.trim();
 for(let guard=0;guard<12;guard++){
  if(s[0]!=='('||s.at(-1)!==')')break;
  let depth=0,whole=true;
  for(let i=0;i<s.length;i++){
   if(s[i]==='(')depth++;
   else if(s[i]===')'){
    depth--;
    if(depth===0&&i<s.length-1){whole=false;break;}
   }
   if(depth<0){whole=false;break;}
  }
  if(!whole||depth!==0)break;
  s=s.slice(1,-1).trim();
 }
 return s;
}
function range(raw,env,depth=0){
 if(typeof raw!=='string'||raw.length>240||depth>12)return null;
 const s=unwrap(raw),direct=literal(s);
 if(direct)return direct;
 if(ID.test(s))return env.get(s)||null;
 let m=/^([\s\S]+)\s*\.\s*(toLong|toInt)\s*\(\s*\)$/.exec(s);
 if(m){
  const prior=range(m[1],env,depth+1),type=m[2]==='toLong'?'Long':'Int';
  if(!prior)return null;
  const limit=BOUNDS[type];
  if(prior.lo<limit.lo||prior.hi>limit.hi)return top(type);
  return interval(type,prior.lo,prior.hi);
 }
 m=/^([\s\S]+)\s*\.\s*(coerceAtLeast|coerceAtMost|coerceIn)\s*\(([^()]*)\)$/.exec(s);
 if(m){
  const prior=range(m[1],env,depth+1);
  if(!prior)return null;
  const args=m[3].split(',').map(literal);
  if(args.some(x=>!x||x.type!==prior.type)||
   (m[2]==='coerceIn'&&args.length!==2)||
   (m[2]!=='coerceIn'&&args.length!==1))return null;
  const a=args[0].lo,b=args[1]?.lo;
  if(m[2]==='coerceAtLeast')return interval(prior.type,prior.lo>a?prior.lo:a,prior.hi>a?prior.hi:a);
  if(m[2]==='coerceAtMost')return interval(prior.type,prior.lo<a?prior.lo:a,prior.hi<a?prior.hi:a);
  if(a>b)return null;
  const lo=prior.lo<a?a:prior.lo>b?b:prior.lo;
  const hi=prior.hi>b?b:prior.hi<a?a:prior.hi;
  return interval(prior.type,lo,hi);
 }
 m=/^-([\s\S]+)$/.exec(s);
 if(m){
  const before=range(m[1],env,depth+1);
  if(!before)return null;
  if(before.lo===BOUNDS[before.type].lo)return top(before.type);
  return interval(before.type,-before.hi,-before.lo);
 }
 return null;
}
function parameters(line){
 const m=/\bfun\s+(?:[A-Za-z_]\w*\s*\.\s*)?[A-Za-z_]\w*\s*\(([^()]{0,450})\)/.exec(line);
 if(!m)return null;
 const env=new Map();
 if(!m[1].trim())return env;
 for(const p of m[1].split(',')){
  const d=/^\s*(?:vararg\s+)?([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*\??)\s*(?:=\s*[^,]+)?\s*$/.exec(p);
  if(!d)return null;
  if(BOUNDS[d[2]])env.set(d[1],top(d[2]));
 }
 return env;
}
function aliases(lines){
 const abs=new Set(),props=new Set();
 for(const line of lines){
  const m=/^\s*import\s+kotlin\.math\.(abs|absoluteValue)(?:\s+as\s+([A-Za-z_]\w*))?\s*$/.exec(line);
  if(m)(m[1]==='abs'?abs:props).add(m[2]||m[1]);
 }
 return {abs,props};
}
function operations(line,names,env){
 const observed=[];
 if(names.props.size){
  const p=[...names.props].join('|');
  const atom='[A-Za-z_]\\w*';
  const tail='(?:\\s*\\.\\s*(?:toLong|toInt)\\s*\\(\\s*\\)|\\s*\\.\\s*coerce(?:AtLeast|AtMost|In)\\s*\\([^()]*\\))*';
  const re=new RegExp('('+atom+tail+')\\s*\\.\\s*(?:'+p+')\\b','g');
  for(const match of line.matchAll(re))observed.push(range(match[1],env));
 }
 const calls=[...names.abs,'kotlin\\s*\\.\\s*math\\s*\\.\\s*abs'];
 const re=new RegExp('(?:^|[^\\w.])(?:'+calls.join('|')+')\\s*\\(','g');
 for(const match of line.matchAll(re)){
  const begin=match.index+match[0].length;
  let nested=0,end=-1;
  for(let i=begin;i<line.length&&i<begin+240;i++){
   if(line[i]==='(')nested++;
   if(line[i]===')'){if(nested===0){end=i;break;}nested--;}
  }
  if(end!==-1)observed.push(range(line.slice(begin,end),env));
 }
 return observed.filter(x=>x&&x.lo<=BOUNDS[x.type].lo);
}
function guard(line,env){
 const m=/^\s*if\s*\(\s*([A-Za-z_]\w*)\s*(==|!=|<=|>=|<|>)\s*((?:Int|Long)\.MIN_VALUE(?:\s*\+\s*\d+)?)\s*\)\s*(?:return(?:\s|$)|throw(?:\s|$))/.exec(line);
 if(!m||!env.has(m[1]))return;
 const v=env.get(m[1]),bound=literal(m[3])?.lo;
 if(bound===undefined)return;
 const op=m[2];
 let lo=v.lo,hi=v.hi;
 if(op==='=='&&bound===lo)lo=bound+1n;
 else if(op==='=='&&bound===hi)hi=bound-1n;
 else if(op==='<')lo=lo>bound?lo:bound;
 else if(op==='<=')lo=lo>bound?lo:bound+1n;
 else if(op==='>')hi=hi<bound?hi:bound;
 else if(op==='>=')hi=hi<bound?hi:bound-1n;
 else if(op==='!='&&bound>=lo&&bound<=hi){lo=bound;hi=bound;}
 const next=interval(v.type,lo,hi);
 if(next){
  // An immutable source alias has the same abstract identity. Refining only
  // the original name would create spurious warnings in reaching aliases.
  for(const [key,prior] of env)if(prior===v)env.set(key,next);
 }
}
function assignment(line,env){
 const d=/^\s*(?:val|var)\s+([A-Za-z_]\w*)(?:\s*:\s*(Int|Long))?\s*=\s*(.+?)\s*;?\s*$/.exec(line);
 if(d){
  let v=range(d[3],env);
  if(d[2])v=v?.type===d[2]?v:top(d[2]);
  if(v)env.set(d[1],v);else env.delete(d[1]);
  return;
 }
 const m=/^\s*([A-Za-z_]\w*)\s*=\s*([^=].*?)\s*;?\s*$/.exec(line);
 if(m&&env.has(m[1])){
  const v=range(m[2],env),previous=env.get(m[1]);
  env.set(m[1],v?.type===previous.type?v:top(previous.type));
 }
}
function scanSignedNumericFlow(file,lines){
 const imported=aliases(lines),found=[];
 if(!imported.props.size&&!imported.abs.size&&!lines.some(x=>/\bkotlin\.math\.abs\s*\(/.test(x)))return found;
 let env=new Map(),functionDepth=null,depth=0,active=false;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],fun=parameters(line);
  if(fun){env=fun;active=true;functionDepth=null;}
  if(active){
   const continued=line.trimStart().startsWith('.')&&i>0;
   const candidate=continued?lines[i-1]+' '+line:line;
   for(const _observation of operations(candidate,imported,env))
    found.push(Object.freeze({rule:'SIGNED_MIN_ABSOLUTE_RANGE_RISK',
     path:file.path,line:i+1,expectedBlobSha:file.expectedBlobSha,
     status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}));
   // Only a top-level early exit dominates the rest of the function.
   // A nested conditional or assignment cannot narrow later execution;
   // conservatively invalidate mutable reaching definitions instead.
   if(functionDepth!==null&&depth>functionDepth){
    const mutation=/^\s*([A-Za-z_]\w*)\s*=\s*[^=]/.exec(line);
    if(mutation&&env.has(mutation[1]))env.set(mutation[1],top(env.get(mutation[1]).type));
   }else{
    guard(line,env);
    assignment(line,env);
   }
  }
  depth+=(line.match(/\{/g)||[]).length-(line.match(/\}/g)||[]).length;
  if(fun){
   if(line.includes('{'))functionDepth=depth;
   else if(line.includes('=')){active=false;env=new Map();}
  }else if(active&&functionDepth!==null&&depth<functionDepth){
   active=false;env=new Map();functionDepth=null;
  }
 }
 return found;
}
module.exports=Object.freeze({scanSignedNumericFlow,range,interval,top,literal});

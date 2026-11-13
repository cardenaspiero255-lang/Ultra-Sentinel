'use strict';
// Conservative, source-only summary of scalar class state transitions.
// This is a hypothesis generator, never a Kotlin compiler or defect oracle.
function mask(source){
 const out=Array.from({length:source.length},(_,i)=>source[i]==='\n'?'\n':' ');
 let i=0,block=0,quote=null;
 while(i<source.length){
  const two=source.slice(i,i+2),three=source.slice(i,i+3);
  if(block){
   if(two==='/*'){block++;i+=2;continue;}
   if(two==='*/'){block--;i+=2;continue;}
   i++;continue;
  }
  if(quote){
   if(quote==='raw'){
    if(three==='"""'){quote=null;i+=3;continue;}
    i++;continue;
   }
   if(source[i]==='\\'){i+=Math.min(2,source.length-i);continue;}
   if(source[i]===quote)quote=null;
   i++;continue;
  }
  if(two==='//'){
   while(i<source.length&&source[i]!=='\n')i++;
   continue;
  }
  if(two==='/*'){block=1;i+=2;continue;}
  if(three==='"""'){quote='raw';i+=3;continue;}
  if(source[i]==='"'||source[i]==="'"){quote=source[i++];continue;}
  out[i]=source[i++];
 }
 if(block||quote)return null;
 return out.join('');
}
function braces(code){
 const depth=new Uint16Array(code.length),ends=new Map(),stack=[];
 for(let i=0;i<code.length;i++){
  depth[i]=stack.length;
  if(code[i]==='{'){if(stack.length>=128)throw Error('STATE_BRACE_BUDGET');stack.push(i);}
  if(code[i]==='}'){
   if(!stack.length)return null;
   ends.set(stack.pop(),i);
  }
 }
 return stack.length?null:{depth,ends};
}
function directMatch(method,pattern,code,depth){
 const body=code.slice(method.open+1,method.close);
 for(const match of body.matchAll(pattern)){
  if(depth[method.open+1+match.index]===depth[method.open]+1)return true;
 }
 return false;
}
function hasWrite(method,name,code,depth){
 return directMatch(method,new RegExp('\\b(?:this\\s*\\.\\s*)?'+name+'\\s*(?:=(?!=)|\\+\\+|--|\\+=|-=)','g'),code,depth);
}
function hasChange(method,name,direction,code,depth){
 const change=direction==='up'?'(?:\\+\\+|\\+=\\s*1L?\\b)':'(?:--|-=\\s*1L?\\b)';
 return directMatch(method,new RegExp('\\b(?:this\\s*\\.\\s*)?'+name+'\\s*'+change,'g'),code,depth);
}
function hasGuard(method,name,code,depth){
 return directMatch(method,new RegExp('\\bif\\s*\\(\\s*(?:this\\s*\\.\\s*)?'+name+'\\s*(?:==|!=|<=|>=|<|>)\\s*[^)]{1,120}\\)','g'),code,depth);
}
function resetWrites(method,code,depth,fields){
 const body=code.slice(method.open+1,method.close),writes=new Set();
 const rest=body.replace(/\b(?:this\s*\.\s*)?([A-Za-z_]\w*)\s*=\s*0L?\b\s*;?/g,(text,name,offset)=>{
  if(depth[method.open+1+offset]!==depth[method.open]+1||!fields.has(name))return text;
  writes.add(name);return '';
 });
 return rest.trim()===''&&writes.size>=2?writes:null;
}
function scanStateResetHypotheses(file){
 if(!file||typeof file.source!=='string'||file.source.length>65536)return [];
 const code=mask(file.source);
 if(code===null)return [];
 const structure=braces(code);
 if(!structure)return [];
 const {depth,ends}=structure,classes=[],findings=[];
 // Bounded class/object scopes: never combine unrelated or nested classes.
 for(const m of code.matchAll(/\b(?:class|object)\s+[A-Za-z_]\w*[^{};]{0,300}\{/g)){
  const open=m.index+m[0].lastIndexOf('{'),close=ends.get(open);
  if(close!==undefined)classes.push({open,close});
  if(classes.length>24)throw Error('STATE_CLASS_BUDGET');
 }
 for(const cls of classes){
  const level=depth[cls.open]+1,fields=new Set(),methods=[];
  const classBody=code.slice(cls.open+1,cls.close);
  for(const m of classBody.matchAll(/\bvar\s+([A-Za-z_]\w*)\s*(?::\s*(?:Int|Long))?\s*=\s*0L?\b/g)){
   const offset=cls.open+1+m.index;
   if(depth[offset]===level)fields.add(m[1]);
  }
  if(fields.size<3)continue;
  if(fields.size>32)throw Error('STATE_FIELD_BUDGET');
  for(const m of classBody.matchAll(/\bfun\s+([A-Za-z_]\w*)\s*\([^()]{0,300}\)\s*(?::\s*[^{}=]{1,160})?\s*\{/g)){
   const open=cls.open+1+m.index+m[0].lastIndexOf('{'),close=ends.get(open);
   if(depth[cls.open+1+m.index]===level&&close!==undefined&&close<=cls.close)
    methods.push({name:m[1],start:cls.open+1+m.index,open,close});
   if(methods.length>64)throw Error('STATE_METHOD_BUDGET');
  }
  for(const reset of methods){
   const resets=resetWrites(reset,code,depth,fields);
   if(!resets)continue;
   const others=methods.filter(m=>m!==reset);
   if(![...resets].every(field=>others.some(m=>hasWrite(m,field,code,depth))))continue;
   for(const state of fields){
    if(resets.has(state)||hasWrite(reset,state,code,depth))continue;
    const increasing=others.filter(m=>hasChange(m,state,'up',code,depth)&&hasGuard(m,state,code,depth));
    const decreasing=others.filter(m=>hasChange(m,state,'down',code,depth)&&hasGuard(m,state,code,depth));
    if(!increasing.some(a=>decreasing.some(b=>a!==b)))continue;
    findings.push(Object.freeze({rule:'INCOMPLETE_SCALAR_STATE_RESET',path:file.path,
     line:code.slice(0,reset.start).split('\n').length,expectedBlobSha:file.expectedBlobSha,
     status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}));
    break;
   }
  }
  if(findings.length>32)throw Error('STATE_FINDING_BUDGET');
 }
 return findings;
}
module.exports=Object.freeze({scanStateResetHypotheses});

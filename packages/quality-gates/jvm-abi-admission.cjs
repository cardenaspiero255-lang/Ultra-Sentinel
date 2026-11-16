'use strict';
// Build/ABI admission only. This module never loads classes or invokes target code.
const NUMERIC=new Set(['B','S','I','J','F','D',...['Byte','Short','Integer','Long','Float','Double'].map(n=>'Ljava/lang/'+n+';')]);
const SIMPLE=new Set([...NUMERIC,'Ljava/lang/String;']);
const COLLECTION=/^Ljava\/lang\/Iterable;$|^Ljava\/util\/(?:List|Collection);$/;
const EXACT_ELEMENT=/^java\.(?:util\.(?:List|Collection)|lang\.Iterable)<java\.lang\.(?:Byte|Short|Integer|Long|Float|Double)>$/;
const fail=()=>{throw Error('JVM_ABI_ADMISSION_REFUSED');};
function descriptor(value){
 if(typeof value!=='string'||value.length>4096||!value.startsWith('('))fail();
 const close=value.indexOf(')'),body=value.slice(1,close),params=[];
 const token=/\[*([BCDFIJSZ]|L[^;[\s()]+;)/y;let pos=0;
 while(pos<body.length){token.lastIndex=pos;const match=token.exec(body);if(!match)fail();params.push(match[0]);pos=token.lastIndex;}
 const result=value.slice(close+1);token.lastIndex=0;const match=token.exec(result);
 if(close<0||!(result==='V'||match&&token.lastIndex===result.length))fail();
 return {params,result};
}
function parameters(value){
 const result=[];let depth=0,start=0;
 if(!value.trim())return result;
 for(let i=0;i<value.length;i++){
  if(value[i]==='<')depth++;
  if(value[i]==='>')depth--;
  if(depth<0)fail();
  if(value[i]===','&&depth===0){result.push(value.slice(start,i).trim());start=i+1;}
 }
 if(depth!==0)fail();result.push(value.slice(start).trim());return result;
}
function parseJavap(text,className){
 if(typeof text!=='string'||text.length>1048576||typeof className!=='string'||className.length>500||
  !/^[\p{ID_Start}_$][\p{ID_Continue}$]*(?:\.[\p{ID_Start}_$][\p{ID_Continue}$]*)*$/u.test(className))fail();
 const lines=text.split(/\r?\n/),header=lines.find(x=>/\b(class|interface|enum)\b.*\{$/.test(x.trim()));
 if(!header||/\b(?:class|interface|enum)\s+([^\s<{]+)/.exec(header)?.[1]!==className)fail();
 const methods=[],fields=[];let declaration=null;
 for(const raw of lines){
  const line=raw.trim();
  if(line.startsWith('public ')&&line.endsWith(';')){declaration=line;continue;}
  if(!line.startsWith('descriptor:'))continue;
  if(!declaration)fail();
  const value=line.slice(11).trim();
  if(declaration.includes('(')){
   const begin=declaration.indexOf('('),end=declaration.lastIndexOf(')'),prefix=declaration.slice(0,begin);
   const name=prefix.split(/\s+/).at(-1),types=parameters(declaration.slice(begin+1,end));
   const d=descriptor(value);
   if(end<begin||types.length!==d.params.length)fail();
   methods.push({name:name===className?'<init>':name,descriptor:value,parameters:d.params,
    result:d.result,genericParameters:types,static:/\bstatic\b/.test(prefix),abstract:/\babstract\b/.test(prefix)});
  }else{
   const name=declaration.slice(0,-1).split(/\s+/).at(-1);
   // Reuse the method descriptor validator for a field type.
   const d=descriptor('()'+value);if(d.result==='V')fail();
   fields.push({name,descriptor:value,static:/\bstatic\b/.test(declaration),final:/\bfinal\b/.test(declaration)});
  }
  declaration=null;
 }
 return {className,public:/^public\b/.test(header.trim()),abstract:/\b(abstract|interface)\b/.test(header),methods,fields};
}
function classify(classes){
 if(!Array.isArray(classes)||classes.length>256)fail();
 const names=new Set(),rows=[];
 for(const c of classes){if(names.has(c.className))fail();names.add(c.className);}
 for(const c of classes){
  const target='L'+c.className.replaceAll('.','/')+';';
  const constructor=c.methods.some(m=>m.name==='<init>'&&m.parameters.length<=3&&m.parameters.every(t=>SIMPLE.has(t)));
  const object=c.fields.some(f=>f.name==='INSTANCE'&&f.static&&f.descriptor===target);
  const split=c.className.lastIndexOf('$'),outer=classes.find(x=>x.className===c.className.slice(0,split));
  const companion=split>0&&outer?.public&&outer.fields.some(f=>f.name===c.className.slice(split+1)&&f.static&&f.final&&f.descriptor===target);
  for(const m of c.methods){
   if(m.name==='<init>')continue;
   let reason='ADMISSIBLE_ABI_CANDIDATE';
   if(!c.public||m.abstract||m.name.includes('$default')||!NUMERIC.has(m.result)||m.parameters.length<1||m.parameters.length>3)
    reason='API_UNSUPPORTED';
   else if(!m.static&&(c.abstract||!constructor&&!object&&!companion))reason='ABI_UNSUPPORTED_RECEIVER';
   else for(let i=0;i<m.parameters.length;i++){
    const type=m.parameters[i];
    if(SIMPLE.has(type)||type.startsWith('[')&&NUMERIC.has(type.slice(1)))continue;
    reason=COLLECTION.test(type)?(EXACT_ELEMENT.test(m.genericParameters[i])?'ADMISSIBLE_ABI_CANDIDATE':'GENERIC_ERASURE_UNSAFE'):'API_UNSUPPORTED';
    if(reason!=='ADMISSIBLE_ABI_CANDIDATE')break;
   }
   rows.push({className:c.className,method:m.name,descriptor:m.descriptor,reason,
    receiver:m.static?'STATIC':object?'OBJECT':companion?'COMPANION':constructor?'CONSTRUCTOR':'UNSUPPORTED',
    finiteDomain:'NOT_EVALUATED_BY_ABI',targetInvoked:false});
  }
 }
 return rows;
}
module.exports=Object.freeze({descriptor,parameters,parseJavap,classify});

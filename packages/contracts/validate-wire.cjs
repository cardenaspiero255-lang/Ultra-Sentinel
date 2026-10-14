'use strict';
/**
 * Read-only validation of the repository's three *specific* v1 wire shapes.
 * This is a constrained validator for the schema vocabulary used here, NOT a
 * generic JSON Schema engine and NEVER an authorization/evidence attestation.
 * Unknown schema keywords throw at load; unknown untrusted data fails closed.
 */
const {isStrictRfc3339}=require('./strict-rfc3339.cjs');
const SCHEMAS=Object.freeze({
 incident:require('./schemas/incident.v1.schema.json'),
 'review-result':require('./schemas/review-result.v1.schema.json'),
 'repair-authorization':require('./schemas/repair-authorization.v1.schema.json')
});
const KEYWORDS=new Set([
 '$schema','$id','title','description','type','const','enum','required',
 'properties','additionalProperties','pattern','format','minLength','maxLength',
 'minimum','maximum','minItems','maxItems','uniqueItems','items','allOf',
 'if','then','else'
]);
function auditSchema(schema){
 for(const key of Object.keys(schema)){
  if(!KEYWORDS.has(key))throw Error('Unsupported schema keyword: '+key);
 }
 if(schema.format&&schema.format!=='date-time')throw Error('Unsupported format');
 if(schema.type&&!(typeof schema.type==='string'||Array.isArray(schema.type)))throw Error('Bad schema type');
 if(schema.properties)for(const child of Object.values(schema.properties))auditSchema(child);
 if(schema.items)auditSchema(schema.items);
 if(schema.allOf)for(const child of schema.allOf)auditSchema(child);
 if(schema.if)auditSchema(schema.if);
 if(schema.then)auditSchema(schema.then);
 if(schema.else)auditSchema(schema.else);
}
for(const schema of Object.values(SCHEMAS))auditSchema(schema);

function isPlainRecord(value){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
}
function safeInput(value,seen=new WeakSet(),depth=0,count={value:0}){
 if(depth>16||++count.value>1024)return false;
 if(value===null)return true;
 if(typeof value==='string')return value.length<=100_000;
 if(typeof value==='number')return Number.isFinite(value);
 if(typeof value==='boolean')return true;
 if(typeof value!=='object')return false;
 if(seen.has(value))return false;
 seen.add(value);
 if(!Array.isArray(value)&&!isPlainRecord(value))return false;
 if(Array.isArray(value)){
  if(value.length>1024)return false;
  for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))return false; // No holes.
 }
 for(const key of Reflect.ownKeys(value)){
  if(Array.isArray(value)&&key==='length')continue; // Native array length.
  if(Array.isArray(value)&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))return false;
  if(typeof key!=='string'||key==='__proto__'||key==='constructor'||key==='prototype')return false;
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(!d||!d.enumerable||!Object.hasOwn(d,'value'))return false;
  if(!safeInput(d.value,seen,depth+1,count))return false;
 }
 return true;
}
function validType(value,type){
 switch(type){
  case 'object':return isPlainRecord(value);
  case 'array':return Array.isArray(value);
  case 'integer':return Number.isSafeInteger(value);
  case 'number':return typeof value==='number'&&Number.isFinite(value);
  case 'string':return typeof value==='string';
  case 'boolean':return typeof value==='boolean';
  case 'null':return value===null;
  default:throw Error('Unsupported schema type: '+type);
 }
}
function check(schema,value,path,errors){
 const fail=reason=>errors.push(path+': '+reason);
 if(schema.type){
  const kinds=Array.isArray(schema.type)?schema.type:[schema.type];
  if(!kinds.some(kind=>validType(value,kind))){fail('invalid type');return;}
 }
 if(Object.hasOwn(schema,'const')&&value!==schema.const)fail('wrong constant');
 if(schema.enum&&!schema.enum.includes(value))fail('not in enum');
 if(typeof value==='string'){
  if(schema.minLength!==undefined&&value.length<schema.minLength)fail('too short');
  if(schema.maxLength!==undefined&&value.length>schema.maxLength)fail('too long');
  if(schema.pattern&&!new RegExp(schema.pattern).test(value))fail('pattern mismatch');
  if(schema.format==='date-time'&&!isStrictRfc3339(value))fail('invalid RFC3339 instant');
 }
 if(typeof value==='number'){
  if(schema.minimum!==undefined&&value<schema.minimum)fail('below minimum');
  if(schema.maximum!==undefined&&value>schema.maximum)fail('above maximum');
 }
 if(Array.isArray(value)){
  if(schema.minItems!==undefined&&value.length<schema.minItems)fail('too few items');
  if(schema.maxItems!==undefined&&value.length>schema.maxItems)fail('too many items');
  if(schema.uniqueItems&&new Set(value).size!==value.length)fail('duplicate items');
  if(schema.items)for(let i=0;i<value.length;i++)check(schema.items,value[i],path+'['+i+']',errors);
 }
 if(isPlainRecord(value)){
  if(schema.required)for(const key of schema.required){
   if(!Object.hasOwn(value,key))errors.push(path+'.'+key+': required');
  }
  if(schema.properties)for(const key of Object.keys(value)){
   if(!Object.hasOwn(schema.properties,key)){
    if(schema.additionalProperties===false)errors.push(path+'.'+key+': unknown field');
   }else check(schema.properties[key],value[key],path+'.'+key,errors);
  }
  if(schema.allOf)for(const rule of schema.allOf){
   if(rule.if){
    const matches=[];
    check(rule.if,value,path,matches);
    if(matches.length===0&&rule.then)check(rule.then,value,path,errors);
    if(matches.length!==0&&rule.else)check(rule.else,value,path,errors);
   }else check(rule,value,path,errors);
  }
 }
}
/**
 * A positive result means "wire SHAPE valid", nothing more. In particular,
 * never use it as an authorization, merge gate, or evidence verification.
 */
function validateWire(name,payload){
 if(!Object.hasOwn(SCHEMAS,name))return {ok:false,errors:['unsupported contract']};
 try{
  if(!safeInput(payload))return {ok:false,errors:['unsafe or cyclic input']};
  const errors=[];
  check(SCHEMAS[name],payload,'$',errors);
  if(name==='repair-authorization'&&Array.isArray(payload?.scope)){
   for(const scope of payload.scope){
    if(typeof scope!=='string')continue;
    const segments=scope.split('/');
    if(segments.some(s=>!s||s==='.'||s==='..')||scope.startsWith('/')||
       /^[A-Za-z]:/.test(scope)){
     errors.push('$.scope: invalid or traversing path');
    }
   }
  }
  return {ok:errors.length===0,errors};
 }catch{
  return {ok:false,errors:['contract validation error']};
 }
}
module.exports={validateWire};

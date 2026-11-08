'use strict';
/* Shared inert-data boundary for Hunter and Fixer. The only accepted
 * payloads are ordinary, own data properties in plain objects/arrays.
 * Never read a caller-controlled getter, iterator or Proxy trap. */
const {types}=require('node:util');
function snapshotRecord(value,fields,exact=true){
 if(!value||typeof value!=='object'||types.isProxy(value)||
  Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||
  (exact&&Reflect.ownKeys(value).length!==fields.length))
  throw Error('UNSAFE_CANDIDATE_INPUT');
 const copy={};
 for(const key of fields){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))
   throw Error('UNSAFE_CANDIDATE_INPUT');
  copy[key]=descriptor.value;
 }
 return copy;
}
function snapshotArray(value,fields,max=12){
 if(!Array.isArray(value)||types.isProxy(value)||
  Object.getPrototypeOf(value)!==Array.prototype||
  value.length<1||value.length>max||
  Reflect.ownKeys(value).length!==value.length+1)
  throw Error('UNSAFE_CANDIDATE_INPUT');
 const copy=[];
 for(let i=0;i<value.length;i++){
  const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
  if(!descriptor||!Object.hasOwn(descriptor,'value'))
   throw Error('UNSAFE_CANDIDATE_INPUT');
  copy.push(snapshotRecord(descriptor.value,fields));
 }
 return copy;
}
module.exports=Object.freeze({snapshotRecord,snapshotArray});

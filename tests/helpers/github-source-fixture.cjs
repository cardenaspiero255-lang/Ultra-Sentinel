'use strict';
const {createHash}=require('node:crypto');
function source(body,path){
 const bytes=Buffer.from(body);
 return {type:'file',encoding:'base64',path,size:bytes.length,
  sha:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),
  content:bytes.toString('base64')};
}
module.exports={source};

'use strict';
// Trusted owner's POSIX workstation only. This script signs; it does not
// connect to GitHub, run the candidate, execute a repair, or grant a rollback.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {digestBranchCandidate,stableOwnerBranchGrant}=
 require('../packages/recovery/supervised-github-branch-commit.cjs');
const DOMAIN='Ultra-Sentinel:github-pr-branch-commit:v1\n';
const REQ=['plan','files','ownerGrant'];
const PLAN=['repository','prNumber','branch','expectedHeadSha','expectedMainSha',
 'expectedTreeSha','operation'];
const GRANT=['ownerLogin','ownerId','repo','prNumber','branch','headSha','baseSha',
 'planDigest','nonce','expiresAt','operation'];
function fail(code){throw Error('OWNER_REPAIR_SIGN_'+code);}
function exact(value,keys){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).length===keys.length&&
  keys.every(k=>Object.hasOwn(value,k));
}
function signRepairIntent(request,key,pinnedPublicKeySha256){
 if(process.env.GITHUB_ACTIONS==='true')fail('FORBIDDEN_IN_CI');
 if(!exact(request,REQ)||!exact(request.plan,PLAN)||!exact(request.ownerGrant,GRANT))
  fail('INVALID_INTENT');
 const {plan,files,ownerGrant}=request;
 const digest=digestBranchCandidate(plan,files);
 const canonical=stableOwnerBranchGrant(ownerGrant);
 const now=Date.now();
 if(!Number.isSafeInteger(now)||ownerGrant.repo!==plan.repository||
  ownerGrant.prNumber!==plan.prNumber||ownerGrant.branch!==plan.branch||
  ownerGrant.headSha!==plan.expectedHeadSha||ownerGrant.baseSha!==plan.expectedMainSha||
  ownerGrant.operation!==plan.operation||ownerGrant.planDigest!==digest||
  ownerGrant.expiresAt<=now||ownerGrant.expiresAt-now>900000)
  fail('PLAN_NOT_SIGNABLE');
 if(!(key instanceof crypto.KeyObject)||key.type!=='private'||key.asymmetricKeyType!=='ed25519'||
  typeof pinnedPublicKeySha256!=='string'||!/^([a-f0-9]{64})$/.test(pinnedPublicKeySha256))
  fail('INVALID_KEY_OR_PIN');
 const pub=crypto.createPublicKey(key).export({type:'spki',format:'der'});
 const actual=crypto.createHash('sha256').update(pub).digest('hex');
 if(!crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(pinnedPublicKeySha256,'hex')))
  fail('KEY_PIN_MISMATCH');
 return crypto.sign(null,Buffer.from(DOMAIN+canonical,'utf8'),key).toString('base64');
}
function isSafeAncestor(stat,ownerUid){
 return !!stat&&stat.isDirectory()&&!stat.isSymbolicLink()&&
  (stat.uid===0||stat.uid===ownerUid)&&(stat.mode&0o022)===0;
}
function readOwnerFile(filename,{maxBytes,privateFile}){
 if(process.platform==='win32'||typeof process.geteuid!=='function'||
  typeof filename!=='string'||!path.isAbsolute(filename)||!fs.constants.O_NOFOLLOW)
  fail('TRUSTED_POSIX_ABSOLUTE_PATH_REQUIRED');
 // Every parent, including root, must be owned by root or the operator and
 // must not be writable by group/others. Root and this UID remain trusted.
 const absolute=path.resolve(filename),parent=path.dirname(absolute),root=path.parse(parent).root;
 let current=root;const uid=process.geteuid();
 if(!isSafeAncestor(fs.lstatSync(root),uid))fail('UNSAFE_PARENT');
 for(const piece of path.relative(root,parent).split(path.sep).filter(Boolean)){
  current=path.join(current,piece);
  const s=fs.lstatSync(current);
  if(!isSafeAncestor(s,uid))fail('UNSAFE_PARENT');
 }
 const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const s=fs.fstatSync(fd);
  if(!s.isFile()||s.nlink!==1||s.uid!==process.geteuid()||s.size<1||s.size>maxBytes||
   (s.mode&(privateFile?0o077:0o022))!==0)fail('UNSAFE_FILE');
  const bytes=fs.readFileSync(fd);
  if(bytes.length!==s.size)fail('FILE_CHANGED');
  return bytes;
 }finally{fs.closeSync(fd);}
}
function main(){
 if(process.env.GITHUB_ACTIONS==='true')fail('FORBIDDEN_IN_CI');
 if(process.argv.length!==3)fail('INTENT_PATH_REQUIRED');
 const input=readOwnerFile(process.argv[2],{maxBytes:2*1024*1024,privateFile:false});
 let request;
 try{
  const text=input.toString('utf8');
  request=JSON.parse(text);
  // One canonical serialization removes duplicate-key and ambiguous-review
  // interpretations. The owner should review exactly the normalized file.
  if(!Buffer.from(text,'utf8').equals(input)||text!==JSON.stringify(request))
   fail('NONCANONICAL_INTENT');
 }finally{input.fill(0);}
 const keyBytes=readOwnerFile(process.env.ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE,
  {maxBytes:8192,privateFile:true});
 try{
  const key=crypto.createPrivateKey(keyBytes);
  const signature=signRepairIntent(request,key,process.env.ULTRA_SENTINEL_OWNER_SIGNING_PUBKEY_SHA256);
  process.stdout.write(signature+'\n');
 }finally{keyBytes.fill(0);}
}
if(require.main===module)try{main();}catch{
 process.stderr.write('OWNER_REPAIR_SIGNING_BLOCKED\n');process.exitCode=1;
}
module.exports={signRepairIntent,isSafeAncestor};

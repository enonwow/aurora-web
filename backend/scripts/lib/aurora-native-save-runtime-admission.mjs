import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,statSync,realpathSync} from 'node:fs';
import {basename,dirname,join,resolve,isAbsolute} from 'node:path';
import {isDeepStrictEqual as equal} from 'node:util';
import {loadBinaryEntrySurfaceSource} from './aurora-binary-entry-surface-inspection.mjs';
import {validateEntrySurfaceCapture,ENTRY_READ_ONLY_SAFETY} from './aurora-binary-entry-surface-contract.mjs';
import {NATIVE_GIT_INVENTORY_VERSION} from './aurora-native-save-git-inventory.mjs';

export const NATIVE_SAVE_ADMISSION_VERSION='aurora-toolset-native-save-runtime-admission/v1';
export const NATIVE_SAVE_GATE_KIND='native-save-review-v1';
const REQUEST='aurora-native-save-runtime-request/v1',RECEIPT='aurora-native-save-runtime-receipt/v1';
const requestName='runtime-native-save-request.v1.json',artifactName='runtime-native-save-admission.v1.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const check=(condition,code)=>{if(!condition)throw Object.assign(new Error(code),{code});};
const time=value=>{check(typeof value==='string'&&Number.isFinite(Date.parse(value)),'NATIVE_SAVE_TIME_INVALID');return Date.parse(value);};
const fullTime=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/u.test(value)&&Number.isFinite(Date.parse(value));
const identity=(path,bytes)=>({path:resolve(path),bytes:bytes.length,sha256:sha(bytes)});
const safety={...ENTRY_READ_ONLY_SAFETY,writesNewEvidenceOnly:true};
function read(path,max=16*1024*1024){
  check(typeof path==='string'&&isAbsolute(path),'NATIVE_SAVE_PATH_INVALID');const absolute=resolve(path);
  check(realpathSync(absolute).toLowerCase()===absolute.toLowerCase(),'NATIVE_SAVE_REPARSE_PATH');
  const before=statSync(absolute);check(before.isFile()&&before.size>0&&before.size<=max,'NATIVE_SAVE_FILE_BUDGET');
  const bytes=readFileSync(absolute),after=statSync(absolute);
  check(bytes.length===before.size&&before.size===after.size&&before.mtimeMs===after.mtimeMs,'NATIVE_SAVE_FILE_DRIFT');return bytes;
}
function json(bytes){try{return JSON.parse(bytes.toString('utf8'));}catch{check(false,'NATIVE_SAVE_JSON_INVALID');}}
const readJson=path=>json(read(path));
function writeOnce(path,bytes){if(existsSync(path)){check(readFileSync(path).equals(bytes),'NATIVE_SAVE_IMMUTABLE_ARTIFACT_EXISTS');return;}writeFileSync(path,bytes,{flag:'wx'});}
const writeJson=(path,value)=>writeOnce(path,Buffer.from(JSON.stringify(value,null,2)+'\n'));
function keys(value,allowed,code){check(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key)),code);}
function producer(){return ['aurora-toolset-native-save-runtime-admission.mjs','aur-s07-runtime-execution.mjs','aurora-toolset-test-module-nonblocking.mjs',
  'lib/aurora-native-save-runtime-admission.mjs','lib/aurora-native-save-runtime-dispatch.mjs','lib/aur-s07-entry-geometry-binding.mjs',
  'lib/aur-s07-runtime-window-contract.mjs','lib/aurora-saved-file-identity.mjs','lib/aurora-binary-entry-surface-inspection.mjs',
  'lib/aurora-binary-entry-surface-contract.mjs','lib/aurora-native-save-git-inventory.mjs','lib/aurora-model-proof-120s-erf-gff-readback.mjs','lib/aurora-viewport-capture-provenance.mjs',
  'probe-aurora-toolset-window-tree-no-global-input.mjs'].map(name=>({name,sha256:sha(readFileSync(resolve(import.meta.dirname,'..',name)))}));}

function sourceState(profilePath,outDir){
  const source=loadBinaryEntrySurfaceSource({profilePath,outDir,sourcePolicy:NATIVE_GIT_INVENTORY_VERSION});
  const manifestBytes=read(source.source.manifest.path),profileBytes=read(source.source.profile.path),postBytes=read(source.source.postSaveProfile.path);
  for(const [bytes,item] of [[manifestBytes,source.source.manifest],[profileBytes,source.source.profile],[postBytes,source.source.postSaveProfile]])check(sha(bytes)===item.sha256,'NATIVE_SAVE_SOURCE_DRIFT');
  const manifest=json(manifestBytes),profile=json(profileBytes),process=manifest.open?.process,save=manifest.nativeSave?.save;
  check(fullTime(process?.StartTimeUtc)&&time(process.StartTimeUtc)===time(source.owner.startedAt),'NATIVE_SAVE_FULL_OWNER_TIME_REQUIRED');
  check(save.safety&&['usesGlobalCursor','usesGlobalKeyboard','usesGlobalMouse'].every(key=>save.safety[key]===false),'NATIVE_SAVE_SAFETY_INVALID');
  check(typeof save.titleAfter==='string'&&save.titleAfter.endsWith(` - ${basename(source.target.module.path)}`)&&!save.titleAfter.endsWith('*'),'NATIVE_SAVE_CLEAN_TITLE_REQUIRED');
  check(time(save.after.lastWriteTimeUtc)>=time(process.StartTimeUtc),'NATIVE_SAVE_CHRONOLOGY_INVALID');
  const owner={pid:source.owner.pid,startedAt:process.StartTimeUtc,frameHwnd:source.owner.frameHwnd};
  return {source,owner,savedAt:save.after.lastWriteTimeUtc,moduleTitle:save.titleAfter,profile,sourceBytes:{manifest:manifestBytes,profile:profileBytes,postSaveProfile:postBytes}};
}

export function prepareNativeSaveAdmission({profilePath,outDir,evidenceDir,now=new Date().toISOString()}){
  const current=sourceState(profilePath,outDir);check(time(now)>=time(current.savedAt),'NATIVE_SAVE_PREPARE_PREDATES_SAVE');
  check(typeof evidenceDir==='string'&&isAbsolute(evidenceDir)&&!existsSync(evidenceDir),'NATIVE_SAVE_NEW_DIRECTORY_REQUIRED');
  const directory=resolve(evidenceDir),createdAt=now,requestId=randomUUID();
  const request={version:REQUEST,requestId,createdAt,expiresAt:new Date(time(now)+30*60*1000).toISOString(),
    status:'awaiting_actual_capture_and_review',inputs:{profilePath:resolve(profilePath),outDir:resolve(outDir)},source:current.source,
    savedAt:current.savedAt,moduleTitle:current.moduleTitle,producer:producer(),
    captureBinding:{requestId,notBefore:now,owner:current.owner,target:current.source.target},
    proofScope:'nativeSaveReadbackAndToolsetReview',runtimeClaimed:false,fileValidatorAuthenticatesReviewer:false};
  mkdirSync(directory);
  for(const [name,bytes] of Object.entries(current.sourceBytes))writeOnce(join(directory,`source-${name}.json`),bytes);
  const requestPath=join(directory,requestName),bindingPath=join(directory,'capture-binding.v1.json');
  writeJson(bindingPath,request.captureBinding);writeJson(requestPath,request);
  return {ok:true,status:request.status,requestPath,bindingPath,expiresAt:request.expiresAt,owner:current.owner,
    nativeSaveReused:true,safety,runtimeClaimed:false};
}

function loadRequest(directory){
  const path=join(directory,requestName),bytes=read(path),request=json(bytes);
  check(request.version===REQUEST&&request.status==='awaiting_actual_capture_and_review'&&typeof request.requestId==='string'&&request.requestId.length>0
    &&time(request.expiresAt)-time(request.createdAt)===30*60*1000,'NATIVE_SAVE_REQUEST_INVALID');
  const current=sourceState(request.inputs?.profilePath,request.inputs?.outDir);
  check(equal(request.source,current.source)&&request.savedAt===current.savedAt&&request.moduleTitle===current.moduleTitle,'NATIVE_SAVE_SOURCE_DRIFT');
  check(equal(request.producer,producer()),'NATIVE_SAVE_PRODUCER_DRIFT');
  check(equal(request.captureBinding,{requestId:request.requestId,notBefore:request.createdAt,owner:current.owner,target:current.source.target}),'NATIVE_SAVE_CAPTURE_BINDING_DRIFT');
  check(equal(readJson(join(directory,'capture-binding.v1.json')),request.captureBinding),'NATIVE_SAVE_CAPTURE_BINDING_DRIFT');
  for(const [name,value] of Object.entries(current.sourceBytes))check(read(join(directory,`source-${name}.json`)).equals(value),'NATIVE_SAVE_SNAPSHOT_DRIFT');
  return {request,current,identity:identity(path,bytes)};
}

function reviewCapture({request,current},sidecar,png,pngPath,review,acceptedAt){
  const binding=validateEntrySurfaceCapture({sidecar,pngBytes:png,pngPath,target:request.source.target,owner:request.captureBinding.owner,
    requestId:request.requestId,notBefore:request.createdAt,expiresAt:request.expiresAt,now:acceptedAt});
  for(const owner of [sidecar.owner,sidecar.stability.before.owner,sidecar.stability.after.owner]){
    check(owner?.pid===current.owner.pid&&owner.frameHwnd===current.owner.frameHwnd&&owner.startedAt===current.owner.startedAt
      &&Number.isSafeInteger(owner.viewerHwnd)&&owner.viewerHwnd>0&&Number.isSafeInteger(owner.viewportHwnd)&&owner.viewportHwnd>0,'NATIVE_SAVE_CAPTURE_OWNER_MISMATCH');
  }
  check(sidecar.moduleTitle===current.moduleTitle&&sidecar.areaViewerTitle?.trim().replace(/^-\s*/u,'')===current.source.target.area,'NATIVE_SAVE_CAPTURE_WINDOW_MISMATCH');
  check(time(sidecar.captureStartedAt)>=time(current.savedAt),'NATIVE_SAVE_CAPTURE_PREDATES_SAVE');
  keys(review,['version','requestId','actor','source','captureSha256','verdict','observations','walkability','runtimeClaimed'],'NATIVE_SAVE_REVIEW_INVALID');
  keys(review.actor,['kind','id'],'NATIVE_SAVE_REVIEW_ACTOR_INVALID');keys(review.source,['kind','reference','recordedAt'],'NATIVE_SAVE_REVIEW_SOURCE_INVALID');
  const actor=review.actor;
  check(review.version==='aurora-native-save-toolset-review/v1'&&review.requestId===request.requestId&&['agent','human'].includes(actor.kind)
    &&typeof actor.id==='string'&&actor.id.trim().length>0&&actor.id.length<=200
    &&review.source.kind===(actor.kind==='agent'?'agent_observation':'user_message')
    &&typeof review.source.reference==='string'&&review.source.reference.trim().length>0&&review.source.reference.length<=1000,'NATIVE_SAVE_REVIEW_ACTOR_INVALID');
  const o=review.observations;keys(o,['areaSurface','blankOrPlaceholder','entryContext','fixtures','details'],'NATIVE_SAVE_REVIEW_OBSERVATIONS_INVALID');
  check(review.captureSha256===binding.png.sha256&&review.verdict==='ready_for_runtime_test'&&review.walkability==='not_evaluated'&&review.runtimeClaimed===false
    &&o.areaSurface==='visible'&&o.blankOrPlaceholder===false&&o.entryContext==='reviewed'&&o.fixtures==='reviewed'
    &&typeof o.details==='string'&&o.details.trim().length>=20&&o.details.length<=8000,'NATIVE_SAVE_REVIEW_INVALID');
  check(time(review.source.recordedAt)>=time(sidecar.capturedAt)&&time(review.source.recordedAt)<=time(acceptedAt),'NATIVE_SAVE_REVIEW_CHRONOLOGY_INVALID');
  return {owner:sidecar.owner,reviewer:actor,capture:binding.png};
}

function buildArtifact({request,current,identity:requestIdentity},receiptIdentity,receipt,reviewed){
  return {version:NATIVE_SAVE_ADMISSION_VERSION,id:`${current.profile.id}:native-save-runtime-v1`,
    module:current.source.target.module,area:current.profile.area,orderedHakList:current.source.target.orderedHakList,
    entryPoint:{area:current.source.target.area,...current.source.target.entry},fixtures:current.source.target.git.inventory,
    inventory:{version:NATIVE_GIT_INVENTORY_VERSION,gitSha256:current.source.target.git.sha256,
      objectCounts:current.source.target.git.objectCounts,objects:current.source.target.git.inventory},
    requiredFixtureBindings:current.source.requiredFixtureBindings,
    sourceNativeSave:json(current.sourceBytes.manifest).nativeSave,request:requestIdentity,receipt:receiptIdentity,
    owner:reviewed.owner,reviewer:reviewed.reviewer,reviewAuthority:'reported_visual_review',capture:reviewed.capture,
    basis:'native_save_readback_and_toolset_visual_review',proofScope:'nativeSaveReadbackAndToolsetReview',
    semanticVerdict:'runtime_and_walkability_not_evaluated',runtimeClaimed:false,fileValidatorAuthenticatesReviewer:false,
    acceptedAt:receipt.acceptedAt,sourceManifestSha256:request.source.source.manifest.sha256};
}

export function finalizeNativeSaveAdmission({evidenceDir,pngPath,sidecarPath,reviewPath,now=new Date().toISOString()}){
  check(typeof reviewPath==='string','NATIVE_SAVE_REVIEW_REQUIRED');check(typeof pngPath==='string'&&typeof sidecarPath==='string','NATIVE_SAVE_CAPTURE_REQUIRED');
  const directory=resolve(evidenceDir),loaded=loadRequest(directory),artifactPath=join(directory,artifactName),receiptPath=join(directory,'receipt.v1.json');
  const files={png:read(pngPath,32*1024*1024),sidecar:read(sidecarPath),review:read(reviewPath)};
  const handoff={png:identity(pngPath,files.png),sidecar:identity(sidecarPath,files.sidecar),review:identity(reviewPath,files.review)};
  if(existsSync(artifactPath)){
    const receipt=readJson(receiptPath);check(equal(receipt.handoff,handoff),'NATIVE_SAVE_REQUEST_ALREADY_CONSUMED');
    return {ok:true,...validateNativeSaveAdmission(artifactPath),admissionPath:artifactPath,idempotentReplay:true};
  }
  const sidecar=json(files.sidecar),review=json(files.review);
  const reviewed=reviewCapture(loaded,sidecar,files.png,pngPath,review,now);
  const copied={};for(const [name,bytes] of Object.entries(files)){
    const path=join(directory,name==='png'?'toolset-capture.png':`${name}.json`);writeOnce(path,bytes);copied[name]=identity(path,bytes);
  }
  // Rehash current MOD/ordered HAKs and source evidence before acceptance.
  const fresh=loadRequest(directory);check(equal(fresh.identity,loaded.identity),'NATIVE_SAVE_REQUEST_DRIFT');
  const receipt={version:RECEIPT,request:loaded.identity,acceptedAt:now,handoff,files:copied,runtimeClaimed:false};
  writeJson(receiptPath,receipt);const artifact=buildArtifact(loaded,identity(receiptPath,read(receiptPath)),receipt,reviewed);
  writeJson(artifactPath,artifact);
  return {ok:true,status:'verified',admissionPath:artifactPath,geometryProfile:artifact,basis:artifact.basis,
    proofScope:artifact.proofScope,runtimeClaimed:false,nativeSaveReused:true,safety};
}

export function validateNativeSaveAdmission(admissionPath){
  const path=resolve(admissionPath),directory=dirname(path),artifactBytes=read(path),artifact=json(artifactBytes),loaded=loadRequest(directory);
  check(basename(path)===artifactName&&artifact.version===NATIVE_SAVE_ADMISSION_VERSION,'NATIVE_SAVE_ADMISSION_VERSION_INVALID');
  const receiptPath=join(directory,'receipt.v1.json'),receiptBytes=read(receiptPath),receipt=json(receiptBytes);
  check(receipt.version===RECEIPT&&equal(receipt.request,loaded.identity)&&receipt.runtimeClaimed===false,'NATIVE_SAVE_RECEIPT_INVALID');
  const expectedNames={png:'toolset-capture.png',sidecar:'sidecar.json',review:'review.json'},bytes={};
  for(const [name,fileName] of Object.entries(expectedNames)){
    const item=receipt.files?.[name];check(item&&resolve(item.path)===join(directory,fileName),'NATIVE_SAVE_RECEIPT_PATH_INVALID');
    bytes[name]=read(item.path,name==='png'?32*1024*1024:16*1024*1024);
    check(equal(identity(item.path,bytes[name]),item)&&receipt.handoff?.[name]?.sha256===item.sha256&&receipt.handoff[name].bytes===item.bytes,'NATIVE_SAVE_RECEIPT_FILE_DRIFT');
  }
  const sidecar=json(bytes.sidecar),review=json(bytes.review);
  const reviewed=reviewCapture(loaded,sidecar,bytes.png,receipt.handoff.png.path,review,receipt.acceptedAt);
  const expected=buildArtifact(loaded,identity(receiptPath,receiptBytes),receipt,reviewed);
  check(equal(artifact,expected),'NATIVE_SAVE_ADMISSION_MISMATCH');
  const verdict={status:'verified',geometryProfile:artifact,admissionPath:path,admissionIdentity:identity(path,artifactBytes),owner:artifact.owner,
    basis:artifact.basis,proofScope:artifact.proofScope,reviewAuthority:artifact.reviewAuthority,
    fileValidatorAuthenticatesReviewer:false,runtimeClaimed:false,safety:{...ENTRY_READ_ONLY_SAFETY}};
  const source=loaded.request.source,files=[identity(path,artifactBytes),identity(receiptPath,receiptBytes),loaded.identity,
    ...Object.values(source.source).filter(value=>value?.path),...Object.values(receipt.files),
    ...Object.keys(loaded.current.sourceBytes).map(name=>identity(join(directory,`source-${name}.json`),loaded.current.sourceBytes[name])),
    identity(join(directory,'capture-binding.v1.json'),read(join(directory,'capture-binding.v1.json')))];
  const resources=[source.target.module,...source.target.orderedHakList].map(item=>({path:item.path,stat:fileStat(item.path)}));
  Object.defineProperty(verdict,'assertUnchanged',{value:()=>{
    for(const file of files)check(sha(read(file.path,32*1024*1024))===file.sha256,'NATIVE_SAVE_EVIDENCE_DRIFT');
    for(const item of resources)check(equal(fileStat(item.path),item.stat),'NATIVE_SAVE_RESOURCE_DRIFT');
    check(equal(producer(),loaded.request.producer),'NATIVE_SAVE_PRODUCER_DRIFT');
  }});
  return verdict;
}
function fileStat(path){const s=statSync(path,{bigint:true});return Object.fromEntries(['dev','ino','size','mtimeNs','ctimeNs'].map(key=>[key,String(s[key])]));}

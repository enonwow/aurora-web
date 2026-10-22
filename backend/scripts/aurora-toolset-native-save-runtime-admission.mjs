#!/usr/bin/env node
import {prepareNativeSaveAdmission,finalizeNativeSaveAdmission,validateNativeSaveAdmission} from './lib/aurora-native-save-runtime-admission.mjs';
const [command,...args]=process.argv.slice(2);
try{
  const allowed={prepare:['profile','outDir','evidenceDir'],finalize:['evidenceDir','png','capture','review'],validate:['admission']}[command];
  if(!allowed)throw new Error('NATIVE_SAVE_COMMAND_INVALID');const options={};
  for(let i=0;i<args.length;i+=2){const key=args[i]?.slice(2),value=args[i+1];
    if(!args[i]?.startsWith('--')||!allowed.includes(key)||!value||value.startsWith('--')||options[key]!==undefined)throw new Error('NATIVE_SAVE_ARGUMENT_INVALID');options[key]=value;}
  if(allowed.some(key=>options[key]===undefined))throw new Error('NATIVE_SAVE_ARGUMENT_MISSING');
  const result=command==='prepare'?prepareNativeSaveAdmission({profilePath:options.profile,outDir:options.outDir,evidenceDir:options.evidenceDir})
    :command==='finalize'?finalizeNativeSaveAdmission({evidenceDir:options.evidenceDir,pngPath:options.png,sidecarPath:options.capture,reviewPath:options.review})
    :validateNativeSaveAdmission(options.admission);
  process.stdout.write(JSON.stringify({ok:true,command,...result},null,2)+'\n');
}catch(error){process.stdout.write(JSON.stringify({ok:false,command,blockerCode:error.code??error.message,runtimeClaimed:false,startsNwn:false,startsToolset:false,sourceEvidencePreserved:true},null,2)+'\n');process.exitCode=2;}

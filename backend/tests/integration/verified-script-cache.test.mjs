import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectExactTemp0Cache} from '../../scripts/lib/aurora-toolset-verified-temp0-recovery.mjs';

function erf(entries){
 const count=entries.length,key=160,table=key+count*24,start=table+count*8;
 const out=Buffer.alloc(start+entries.reduce((n,e)=>n+e.bytes.length,0));
 out.write('MOD V1.0');out.writeUInt32LE(count,16);out.writeUInt32LE(key,24);out.writeUInt32LE(table,28);
 let offset=start;entries.forEach((e,i)=>{out.write(e.name,key+i*24,16,'ascii');out.writeUInt32LE(i,key+i*24+16);out.writeUInt16LE(e.type,key+i*24+20);out.writeUInt32LE(offset,table+i*8);out.writeUInt32LE(e.bytes.length,table+i*8+4);e.bytes.copy(out,offset);offset+=e.bytes.length;});return out;
}
test('script-bearing exact native cache preserves strict resource identity',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'aurora-script-cache-'));
 const modulePath=path.join(root,'arbitrary.mod'),temp0Path=path.join(root,'temp0');
 fs.mkdirSync(temp0Path);
 const entries=[['module',2014,'ifo'],['entry',2009,'nss'],['entry',2010,'ncs'],['palette',2030,'itp']].map(([name,type,ext])=>({name,type,ext,bytes:Buffer.from(name+':'+type)}));
 const restore=()=>{fs.writeFileSync(modulePath,erf(entries));for(const e of entries)fs.writeFileSync(path.join(temp0Path,e.name+'.'+e.ext),e.bytes);};
 try{
  restore();assert.equal(inspectExactTemp0Cache({modulePath,temp0Path}).resources.length,4);
  const inspect=()=>inspectExactTemp0Cache({modulePath,temp0Path});
  fs.writeFileSync(path.join(temp0Path,'entry.ncs'),'modified');assert.throws(inspect,{code:'VERIFIED_TEMP0_RESOURCE_MISMATCH'});restore();
  fs.writeFileSync(path.join(temp0Path,'extra.nss'),'extra');assert.throws(inspect,{code:'VERIFIED_TEMP0_FILE_SET_MISMATCH'});fs.unlinkSync(path.join(temp0Path,'extra.nss'));
  fs.unlinkSync(path.join(temp0Path,'entry.nss'));assert.throws(inspect,{code:'VERIFIED_TEMP0_FILE_SET_MISMATCH'});restore();
  fs.writeFileSync(modulePath,erf([...entries,entries[1]]));assert.throws(inspect,/erf_resource_duplicate/);restore();
  fs.writeFileSync(modulePath,erf([...entries,{name:'unknown',type:65530,bytes:Buffer.from('x')} ]));assert.throws(inspect,{code:'VERIFIED_TEMP0_RESOURCE_TYPE_UNSUPPORTED'});
 }finally{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));fs.rmSync(root,{recursive:true});}
});

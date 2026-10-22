import {createHash} from 'node:crypto';
import {openSync,closeSync,readSync,fstatSync,statSync,realpathSync} from 'node:fs';
import {resolve,isAbsolute} from 'node:path';

export function measureSavedFile(path,maxBytes,expected){
  if(typeof path!=='string'||!isAbsolute(path))throw new Error('ENTRY_FILE_PATH_INVALID');
  const absolute=resolve(path);
  if(realpathSync(absolute).toLowerCase()!==absolute.toLowerCase())throw new Error('ENTRY_FILE_REPARSE_PATH');
  const fd=openSync(absolute,'r');
  try{
    const before=fstatSync(fd,{bigint:true});
    if(!before.isFile()||before.size<=0n||before.size>BigInt(maxBytes))throw new Error('ENTRY_FILE_BUDGET_INVALID');
    const hash=createHash('sha256'),chunk=Buffer.alloc(4*1024*1024);let bytes=0;
    for(;;){const n=readSync(fd,chunk,0,chunk.length,null);if(!n)break;bytes+=n;
      if(bytes>maxBytes||BigInt(bytes)>before.size)throw new Error('ENTRY_FILE_CHANGED_DURING_READ');hash.update(chunk.subarray(0,n));}
    const after=fstatSync(fd,{bigint:true}),current=statSync(absolute,{bigint:true});
    for(const stat of [after,current])for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])
      if(stat[key]!==before[key])throw new Error('ENTRY_FILE_CHANGED_DURING_READ');
    if(BigInt(bytes)!==before.size)throw new Error('ENTRY_FILE_CHANGED_DURING_READ');
    const result={path:absolute,bytes,sha256:hash.digest('hex')};
    if(expected&&(result.sha256!==expected.sha256||result.bytes!==expected.bytes))throw new Error('ENTRY_FILE_HASH_MISMATCH');
    return result;
  }finally{closeSync(fd);}
}

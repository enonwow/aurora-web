import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {inspectNwmain} from './lib/nwmain-fatal-close.mjs';
import {admitForeground,runForeground,withTemporaryRaise} from './lib/nwmain-foreground.mjs';
const [command,...args]=process.argv.slice(2),o={};
assert.ok(['dry-run','foreground','capture-front'].includes(command));
assert.equal(args.length%2,0);
for(let i=0;i<args.length;i+=2){assert.ok(['--runtimeDir','--authorization','--out','--resultOut','--ffmpeg'].includes(args[i]));assert.equal(o[args[i]],undefined);o[args[i]]=args[i+1];}
assert.ok(o['--runtimeDir']);
const dir=path.resolve(o['--runtimeDir']),hash=b=>createHash('sha256').update(b).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8').replace(/^\uFEFF/,''));
const profileBytes=fs.readFileSync(path.join(dir,'profile.json')),profile=JSON.parse(profileBytes.toString('utf8').replace(/^\uFEFF/,''));
const observation=read('aur-s07-runtime-observation.json'),placement=read('aur-s07-runtime-window-result.json');
assert.equal(placement.status,'verified');assert.equal(placement.profileSha256,hash(profileBytes));
assert.equal(observation.profileSha256,hash(profileBytes));assert.equal(observation.moduleSha256,profile.module.sha256);
for(const file of [profile.module,...profile.orderedHakList])assert.equal(hash(fs.readFileSync(file.path)),file.sha256,'Installed resource changed');
const p=observation.process;
const plan=admitForeground({state:inspectNwmain(),expected:{pid:p.pid,startedAtUtc:p.startedAt,hwnd:p.mainWindowHandle,device:profile.runtimeWindow.expectedDevice},authorization:o['--authorization']});
if(command==='capture-front') {
  for(const key of ['--out','--resultOut','--ffmpeg'])assert.ok(o[key],key+' required');
  assert.ok(!fs.existsSync(o['--out'])&&!fs.existsSync(o['--resultOut'])&&!fs.existsSync(o['--resultOut']+'.window.json'),'Capture destinations must be new');
  const result=withTemporaryRaise({
    raise:()=>runForeground(plan,'raise'),restore:()=>runForeground(plan,'lower'),
    record:value=>fs.writeFileSync(o['--resultOut']+'.window.json',JSON.stringify({authorization:plan.authorization,...value},null,2)+'\n',{flag:'wx'}),
    capture:()=>JSON.parse(execFileSync(process.execPath,[path.join(import.meta.dirname,'capture-nwmain-proof-video-no-global-input.mjs'),'capture','--pid',String(plan.pid),'--startedAtUtc',plan.startedAtUtc,'--out',o['--out'],'--resultOut',o['--resultOut'],'--ffmpeg',o['--ffmpeg'],'--durationSeconds','25','--fps','30'],{windowsHide:true,encoding:'utf8',timeout:50000,maxBuffer:1024*1024}))
  });
  console.log(JSON.stringify({status:'captured-with-temporary-raise',...result},null,2));
} else {
  const result=runForeground(plan,command==='foreground');
  console.log(JSON.stringify({version:'aurora-owned-nwmain-foreground/v1',command,profileSha256:hash(profileBytes),moduleSha256:profile.module.sha256,authorization:plan.authorization,...result},null,2));
  if(command==='foreground'&&!result.foregroundVerified)process.exitCode=2;
}

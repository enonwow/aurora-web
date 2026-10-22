import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertEnvironmentProfile, assertEnvironmentResourcePins} from '../../scripts/lib/aurora-binary-environment-profile.mjs';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(name='sky_a',row=200){
 const bytes=Buffer.from('immutable-resource');
 const profile={version:'aurora-toolset-binary-environment-profile/v1',proofKind:'skybox-environment-trial',area:{resref:'gate'},entryPoint:{area:'gate',position:[1,2,3]},fixtures:[],orderedHakList:[{resref:name}],environment:{kind:'skybox',row,areaResources:[2012,2023,2046].map(type=>({resref:'gate',type,sha256:hash(bytes)})),hakResref:name,hakResources:[{resref:name,type:2002,sha256:hash(bytes)},{resref:'skyboxes',type:2017,sha256:hash(bytes)}]}};
 return {profile,bytes};
}
test('two distinct pinned skies use the same environment contract without fake creatures',()=>{
 for(const [name,row] of [['sky_a',200],['cloud_b',22]]){const {profile,bytes}=fixture(name,row);assert.doesNotThrow(()=>assertEnvironmentProfile(profile));assert.doesNotThrow(()=>assertEnvironmentResourcePins(profile,()=>bytes));}
});
test('wrong target, NPC fixtures, duplicate or incomplete pins and changed bytes fail closed',()=>{
 for(const mutate of [p=>p.entryPoint.area='elsewhere',p=>p.fixtures=[{id:'fake'}],p=>p.environment.row=256,p=>p.environment.areaResources.pop(),p=>p.environment.areaResources[1]=p.environment.areaResources[0],p=>p.environment.hakResref='other',p=>p.environment.hakResources.pop()]){const {profile}=fixture();mutate(profile);assert.throws(()=>assertEnvironmentProfile(profile),/environment_/);}
 const {profile}=fixture();assert.throws(()=>assertEnvironmentResourcePins(profile,()=>Buffer.from('changed')),/environment_resource_hash_mismatch/);
});

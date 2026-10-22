import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseErfArchive,requiredResource,parseGff,requiredField,readInteger} from './aurora-model-proof-120s-erf-gff-readback.mjs';
export const ENVIRONMENT_PROFILE_VERSION='aurora-toolset-binary-environment-profile/v1';
export const ENVIRONMENT_PROOF_KIND='skybox-environment-trial';
const check=(v,c)=>{if(!v)throw Error(c);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const pin=p=>/^[a-z0-9_]{1,32}$/i.test(p?.resref??'')&&Number.isInteger(p.type)&&/^[a-f0-9]{64}$/.test(p.sha256??'');
const unique=ps=>new Set(ps.map(p=>`${p.resref}:${p.type}`)).size===ps.length;
export function assertEnvironmentProfile(p){
 const e=p.environment;
 check(p.version===ENVIRONMENT_PROFILE_VERSION&&p.proofKind===ENVIRONMENT_PROOF_KIND,'environment_identity_invalid');
 check(p.entryPoint?.area===p.area?.resref&&Array.isArray(p.entryPoint.position)&&p.entryPoint.position.length===3&&p.entryPoint.position.every(Number.isFinite)&&Array.isArray(p.fixtures)&&p.fixtures.length===0,'environment_target_invalid');
 check(e?.kind==='skybox'&&Number.isInteger(e.row)&&e.row>=0&&e.row<=255&&e.hakResref===p.orderedHakList?.[0]?.resref,'environment_skybox_binding_invalid');
 check(Array.isArray(e.areaResources)&&e.areaResources.length===3&&e.areaResources.every(r=>pin(r)&&r.resref===p.area.resref)&&unique(e.areaResources)&&[2012,2023,2046].every(t=>e.areaResources.some(r=>r.type===t)),'environment_area_pins_invalid');
 check(Array.isArray(e.hakResources)&&e.hakResources.length>=2&&e.hakResources.every(pin)&&unique(e.hakResources)&&e.hakResources.some(r=>r.type===2002)&&e.hakResources.some(r=>r.type===2017&&r.resref==='skyboxes'),'environment_hak_pins_invalid');
}
export function assertEnvironmentResourcePins(p,readResource){
 for(const [kind,pins] of [['module',p.environment.areaResources],['hak',p.environment.hakResources]])for(const r of pins)check(sha(readResource(kind,r))===r.sha256,`environment_resource_hash_mismatch:${kind}:${r.resref}:${r.type}`);
}
export function inspectEnvironmentResources(p){
 assertEnvironmentProfile(p);
 const module=parseErfArchive(readFileSync(p.module.path));
 const hak=parseErfArchive(readFileSync(p.orderedHakList[0].path));
 assertEnvironmentResourcePins(p,(kind,r)=>requiredResource(kind==='module'?module:hak,r.resref,r.type));
 const sky=requiredField(parseGff(requiredResource(module,p.area.resref,2012)).root,'SkyBox');
 check(sky.typeId===0&&readInteger(sky)===p.environment.row,'environment_skybox_byte_mismatch');
}

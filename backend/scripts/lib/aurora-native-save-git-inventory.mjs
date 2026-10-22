import {isDeepStrictEqual as equal} from 'node:util';
import {requiredField,readString,readInteger,readFloat,readList} from './aurora-model-proof-120s-erf-gff-readback.mjs';

export const NATIVE_GIT_INVENTORY_VERSION='aurora-native-save-git-inventory/v1';
export const NATIVE_INVENTORY_SOURCE_VERSION='aurora-binary-native-save-inventory-source/v1';
const RECEIPT_VERSION='aurora-toolset-bootstrap-git-readback/v1';
const families=[['creatures','Creature List'],['placeables','Placeable List'],['doors','Door List'],
  ['encounters','Encounter List'],['items','List'],['sounds','SoundList'],['stores','StoreList'],
  ['triggers','TriggerList'],['waypoints','WaypointList']];
const types={creature:{struct:4,appearance:'Appearance_Type',appearanceTypes:[2],position:['XPosition','YPosition','ZPosition']},
  placeable:{struct:9,appearance:'Appearance',appearanceTypes:[0,4],position:['X','Y','Z']}};
const positionAliases=new Set(['x','y','z','xposition','yposition','zposition','xpos','ypos','zpos','position']);
function check(condition,code,context){if(!condition)throw Object.assign(new Error(context?`${code}: ${context}`:code),{code});}
function typedField(struct,label,allowed,context){
  const field=requiredField(struct,label);
  check(allowed.includes(field.typeId),'NATIVE_GIT_FIELD_TYPE_INVALID',`${context}.${label} type=${field.typeId}`);return field;
}
function readObject(struct,kind,sourceIndex){
  const spec=types[kind],context=`${kind}[${sourceIndex}]`;
  check(struct.typeId===spec.struct,'NATIVE_GIT_STRUCT_TYPE_INVALID',context);
  for(const field of struct.fields){
    const key=field.label.toLowerCase();
    if(['appearance','appearance_type'].includes(key))check(field.label===spec.appearance,'NATIVE_GIT_APPEARANCE_ALIAS_INVALID',context);
    if(positionAliases.has(key))check(spec.position.includes(field.label),'NATIVE_GIT_POSITION_ALIAS_INVALID',context);
  }
  const templateResRef=readString(typedField(struct,'TemplateResRef',[11],context));
  const tag=readString(typedField(struct,'Tag',[10],context));
  check(typeof templateResRef==='string'&&/^[a-z0-9_]{1,16}$/iu.test(templateResRef),'NATIVE_GIT_TEMPLATE_INVALID',context);
  const appearanceType=readInteger(typedField(struct,spec.appearance,spec.appearanceTypes,context));
  const position=spec.position.map(label=>readFloat(typedField(struct,label,[8],context)));
  check(position.every(Number.isFinite),'NATIVE_GIT_POSITION_INVALID',context);
  return {kind,sourceIndex,templateResRef,tag,appearanceType,position};
}

// Pure, typed saved-GIT reader. All known families are counted; unsupported
// nonempty families fail before any partial inventory can be admitted.
export function readNativeSaveGitInventory(parsed){
  const lists=new Map(),objectCounts={};
  for(const [kind,label] of families){
    const found=parsed.root.fields.filter(field=>field.label===label);
    check(found.length<=1,'NATIVE_GIT_LIST_AMBIGUOUS',label);
    const list=found.length?readList(requiredField(parsed.root,label),parsed):[];
    lists.set(kind,list);objectCounts[kind]=list.length;
    check(list.length<=10000,'NATIVE_GIT_OBJECT_BUDGET',kind);
    check(['creatures','placeables'].includes(kind)||list.length===0,'NATIVE_GIT_UNSUPPORTED_FAMILY',kind);
  }
  for(const field of parsed.root.fields){
    if(field.typeId===15&&!families.some(([,label])=>label===field.label))
      check(readList(field,parsed).length===0,'NATIVE_GIT_UNSUPPORTED_FAMILY',field.label);
  }
  objectCounts.total=Object.values(objectCounts).reduce((sum,count)=>sum+count,0);
  check(objectCounts.total<=10000,'NATIVE_GIT_OBJECT_BUDGET');
  const creatures=lists.get('creatures').map((struct,index)=>readObject(struct,'creature',index));
  const placeables=lists.get('placeables').map((struct,index)=>readObject(struct,'placeable',index));
  return {version:NATIVE_GIT_INVENTORY_VERSION,objectCounts,creatures,placeables,inventory:[...creatures,...placeables]};
}
const projectedPosition=position=>position.map(value=>Number(value.toFixed(4)));
const receiptObjects=(objects,project=false)=>objects.map(({templateResRef,tag,appearanceType,position})=>({
  templateResRef,tag,appearanceType,position:project?projectedPosition(position):position}));

export function validateNativeSaveGitInventory({git,receipt,fixtures}){
  check(git?.version===NATIVE_GIT_INVENTORY_VERSION&&receipt?.version===RECEIPT_VERSION,'NATIVE_GIT_VERSION_INVALID');
  check(equal(receipt.objectCounts,git.objectCounts),'NATIVE_GIT_RECEIPT_COUNTS_MISMATCH');
  for(const family of ['creatures','placeables']){
    check(Array.isArray(receipt[family])&&equal(receiptObjects(receipt[family]),receiptObjects(git[family],true)),
      'NATIVE_GIT_RECEIPT_OBJECT_MISMATCH',family);
  }
  check(Array.isArray(fixtures)&&fixtures.length>0&&fixtures.length<=git.inventory.length,'NATIVE_GIT_FIXTURE_REQUIREMENTS_INVALID');
  const used=new Set();
  return fixtures.map((fixture,fixtureIndex)=>{
    check(fixture&&Array.isArray(fixture.position)&&fixture.position.length===3&&fixture.position.every(Number.isFinite),
      'NATIVE_GIT_FIXTURE_INVALID',String(fixtureIndex));
    const matches=git.inventory.filter(object=>object.templateResRef===fixture.templateResRef&&object.appearanceType===fixture.appearanceType
      &&(fixture.tag==null||object.tag===fixture.tag)&&(fixture.kind===undefined||object.kind===fixture.kind)
      &&(fixture.sourceIndex===undefined||object.sourceIndex===fixture.sourceIndex)
      &&(equal(object.position,fixture.position)||equal(projectedPosition(object.position),fixture.position)));
    check(matches.length===1,'NATIVE_GIT_FIXTURE_MATCH_INVALID',`${fixtureIndex}: matches=${matches.length}`);
    const object=matches[0],key=`${object.kind}:${object.sourceIndex}`;
    check(!used.has(key),'NATIVE_GIT_FIXTURE_DUPLICATE',String(fixtureIndex));used.add(key);
    return {fixtureIndex,requirement:structuredClone(fixture),kind:object.kind,sourceIndex:object.sourceIndex,
      positionRepresentation:equal(object.position,fixture.position)?'packed_float':'bootstrap_git_readback_v1_four_decimals'};
  });
}

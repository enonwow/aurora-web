// Independent test grammar: native field spelling and types, no production reader.
export const field = (label, type, value) => ({label, type, value});
const object = (kind, template, tag, appearance, position) => {
  const creature = kind === 'creature';
  const fields = [field('TemplateResRef',11,template),field('Tag',10,tag),
    field(creature?'Appearance_Type':'Appearance',creature?2:4,appearance),
    ...(creature?['XPosition','YPosition','ZPosition']:['X','Y','Z']).map((label,i)=>field(label,8,position[i]))];
  fields.typeId = creature?4:9; return fields;
};
export function nativeGitFields() {
  return [field('Creature List',15,[object('creature','guard','GUARD',219,[20,23,0])]),
    field('Placeable List',15,[object('placeable','lever','LEVER',22,[9.9693,12.5908,0.01]),object('placeable','dummy','DUMMY',39,[7.5724,12.3825,0.01])]),
    ...['Door List','Encounter List','List','SoundList','StoreList','TriggerList','WaypointList'].map(label=>field(label,15,[]))];
}
export const nativeGitReceipt = () => ({version:'aurora-toolset-bootstrap-git-readback/v1',
  objectCounts:{placeables:2,doors:0,creatures:1,encounters:0,items:0,sounds:0,stores:0,triggers:0,waypoints:0,total:3},
  creatures:[{templateResRef:'guard',tag:'GUARD',appearanceType:219,position:[20,23,0]}],
  placeables:[{templateResRef:'lever',tag:'LEVER',appearanceType:22,position:[9.9693,12.5908,0.01]},
    {templateResRef:'dummy',tag:'DUMMY',appearanceType:39,position:[7.5724,12.3825,0.01]}]});

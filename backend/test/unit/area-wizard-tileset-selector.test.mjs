import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,list} from '../helpers/area-wizard-tileset-selector.mjs';
const stock=Array.from({length:33},(_,i)=>'Terrain '+i);stock[21]='MicroSet';const custom=[...stock,'Arbitrary Sea'];
const cases=[
 {name:'stock33',tileset:'MicroSet',controls:[list(stock)],index:21},
 {name:'custom34',tileset:'Arbitrary Sea',controls:[list(custom)],index:33},
 {name:'arbitrary count and literal special name',tileset:"Ocean [A]* 'Z'",controls:[list(["Ocean [A]* 'Z'",'Other'])],index:0},
 {name:'irrelevant visible list ignored',tileset:'Wanted',controls:[list(['Tiny','Small']),list(['Wanted'],{hwnd:102})],index:0,hwnd:102},
 {name:'missing',tileset:'Absent',controls:[list(stock)]},
 {name:'duplicate candidate list',tileset:'MicroSet',controls:[list(stock),list(stock,{hwnd:102})]},
 {name:'duplicate label',tileset:'Dup',controls:[list(['Dup','Dup'])],error:'exact_tileset_missing:Dup'},
 {name:'hidden',tileset:'Wanted',controls:[list(['Wanted'],{visible:false})]},
 {name:'disabled',tileset:'Wanted',controls:[list(['Wanted'],{enabled:false})]},
 {name:'wrong class',tileset:'Wanted',controls:[list(['Wanted'],{className:'TComboBox'})]},
 {name:'empty',tileset:'Wanted',controls:[list([])]},
 {name:'case variant not exact',tileset:'Wanted',controls:[list(['wanted'])]},
 {name:'whitespace alias not exact',tileset:'Wanted',controls:[list(['Wanted '])]},
 {name:'existing case-insensitive duplicate guard retained',tileset:'Dup',controls:[list(['Dup','dup'])],error:'exact_tileset_missing:Dup'}
];const result=evaluate(cases);
for(let i=0;i<cases.length;i++)test(cases[i].name,()=>{const c=cases[i],r=result[i];if(c.index!==undefined){assert.equal(r.status,'verified');assert.equal(r.index,c.index);assert.equal(r.hwnd,c.hwnd||101);}else{assert.equal(r.status,'failed');assert.ok(r.code.startsWith(c.error||'exact_tileset_list_missing:'));}});

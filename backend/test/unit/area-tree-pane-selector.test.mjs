import test from 'node:test';
import assert from 'node:assert/strict';
import {scriptPaths,evaluate,frame,tree,alter} from '../helpers/area-tree-pane-selector.mjs';
const cases=[
 {name:'actual compact frame',controls:[tree],ok:true},
 {name:'translated display coordinates',frame:{...frame,left:100,top:50},controls:[alter({bounds:{left:109,top:132}})],ok:true},
 {name:'right palette',controls:[alter({bounds:{left:-567,top:372,width:308,height:456}})],ok:false},
 {name:'bottom 58px tree',controls:[alter({bounds:{top:865,height:58}})],ok:false},
 {name:'oversized width',controls:[alter({bounds:{width:800}})],ok:false},
 {name:'outside left',controls:[alter({bounds:{left:-1683}})],ok:false},
 {name:'outside bottom',controls:[alter({bounds:{height:700}})],ok:false},
 {name:'outside top',controls:[alter({bounds:{top:199}})],ok:false},
 {name:'hidden',controls:[alter({visible:false})],ok:false},
 {name:'disabled',controls:[alter({enabled:false})],ok:false},
 {name:'wrong class',controls:[alter({className:'TListBox'})],ok:false},
 {name:'duplicate left tree',controls:[tree,alter({hwnd:99})],ok:false},
 {name:'missing',controls:[],ok:false},
 {name:'narrow tree',controls:[alter({bounds:{width:249}})],ok:false},
];
for(const p of scriptPaths){const results=evaluate(p,cases.map(c=>({frame,...c})));cases.forEach((c,i)=>test(p.split('/').at(-1)+' '+c.name,()=>assert.equal(results[i].ok,c.ok)));}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scriptPaths,evaluate,frame,tree} from '../helpers/area-tree-pane-selector.mjs';
const recorded=JSON.parse(fs.readFileSync(new URL('../fixtures/area-tree-compact-frame-20261002.json',import.meta.url),'utf8'));
const stock={frame:{left:-1920,top:0,width:1920,height:1040},controls:[{...tree,bounds:{left:-1910,top:90,width:287,height:930}}]};
for(const p of scriptPaths){const results=evaluate(p,[{frame:recorded.bounds,controls:recorded.controls},stock]);test(p.split('/').at(-1)+' recorded compact exact HWND',()=>{assert.equal(results[0].ok,true);assert.equal(results[0].hwnd,30935606);});test(p.split('/').at(-1)+' old stock tall frame',()=>assert.equal(results[1].ok,true));test(p.split('/').at(-1)+' target identity and modal guards retained',()=>{const s=fs.readFileSync(p,'utf8');assert.match(s,/frames.Count-ne1/);assert.match(s,/frame_on_primary|frame_not_on_display1/);assert.match(s,/GetWindowThreadProcessId/);if(p.includes('delete-')){assert.match(s,/unexpected_top_before/);assert.match(s,/selected_tree_handle_changed/);assert.match(s,/modal_left_after_delete/);}else{assert.match(s,/tree_object_occurrence_out_of_range/);assert.match(s,/tree_remote_read_failed/);}});}

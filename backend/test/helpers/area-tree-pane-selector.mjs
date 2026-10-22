import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const scriptPaths=['inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs','delete-aurora-toolset-area-tree-item-atomic-no-global-input.mjs'].map(n=>fileURLToPath(new URL('../../scripts/'+n,import.meta.url)));
export function evaluate(sourcePath,cases){
 const source=fs.readFileSync(sourcePath,'utf8');
 const chunk=source.match(/\$script:trees=@\(\);[\s\S]*?;if\(\$script:trees.Count-ne1\)[\s\S]*?;\$tree=\$script:trees\[0\]/)?.[0];
 assert.ok(chunk,'actual unique tree selector');
 const expr=chunk.match(/if\((\(\$(?:r|rect)\.Right-[\s\S]*?)\)\{\$script:trees/)?.[1].replace(/\$rect/g,'$r');
 assert.ok(expr,'actual bounds predicate');
 assert.doesNotMatch(expr,/ATOC|AAD|Add-Type|Get-Process|SendMessage|PostMessage/);
 const enabled=/::IsWindowEnabled\(\$h\)/.test(chunk);
 const code=["$ErrorActionPreference='Stop'",'function SelectAreaTree($case){$b=$case.frame;$fr=[pscustomobject]@{Left=$b.left;Top=$b.top;Right=($b.left+$b.width);Bottom=($b.top+$b.height)};$trees=@();foreach($c in $case.controls){if($c.visible-and'+(enabled?'$c.enabled-and':'')+"$c.className-eq'TTreeView'){$b=$c.bounds;$r=[pscustomobject]@{Left=$b.left;Top=$b.top;Right=($b.left+$b.width);Bottom=($b.top+$b.height)};if("+expr+"){$trees+=$c}}};if($trees.Count-ne1){throw 'exact_area_tree_missing'};$trees[0].hwnd}",'$cases=ConvertFrom-Json $env:AURORA_TREE_CASES;$out=@();foreach($case in $cases){try{$out+=[pscustomobject]@{ok=$true;hwnd=(SelectAreaTree $case)}}catch{$out+=[pscustomobject]@{ok=$false;error=$_.Exception.Message}}};ConvertTo-Json -InputObject @($out) -Compress'].join('\n');
 return JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',code],{encoding:'utf8',windowsHide:true,timeout:15000,env:{...process.env,AURORA_TREE_CASES:JSON.stringify(cases)}}).trim());
}
export const frame={left:-1682,top:200,width:1440,height:753};
export const tree={hwnd:30935606,className:'TTreeView',visible:true,enabled:true,bounds:{left:-1673,top:282,width:287,height:582}};
export const alter=(change)=>({...tree,...change,bounds:{...tree.bounds,...change.bounds}});

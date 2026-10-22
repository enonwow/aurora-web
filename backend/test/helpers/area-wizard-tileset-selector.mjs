import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const sourcePath=process.env.AURORA_WIZARD_SELECTOR_SOURCE||fileURLToPath(new URL('../../scripts/probe-aurora-toolset-area-wizard-atomic-no-global-input.mjs',import.meta.url));
export const source=readFileSync(sourcePath,'utf8');
export function evaluate(cases,candidateSource=source){
 const match=candidateSource.match(/if\(\$env:ADVANCE-eq'true'\)\{(\$lists=@\([\s\S]*?;\$target=\[int\]\$matches\[0\]);\$lh=/);
 assert.ok(match,'actual selector prefix must be found');
 const selector=match[1];assert.doesNotMatch(selector,/AWA|User32|Add-Type|Get-Process|SendMessage|PostMessage/);
 const program=["$ErrorActionPreference='Stop'",'function SelectWizardTileset([object[]]$controls){'+selector+';[pscustomobject]@{hwnd=$lists[0].hwnd;index=$target}}',
 '$cases=ConvertFrom-Json $env:AURORA_WIZARD_SELECTOR_CASES;$result=@()',
 'foreach($case in $cases){$env:TILESET=$case.tileset;try{$selected=SelectWizardTileset -controls @($case.controls);$result+=[pscustomobject]@{status="verified";hwnd=$selected.hwnd;index=$selected.index}}catch{$result+=[pscustomobject]@{status="failed";code=$_.Exception.Message}}}',
 'ConvertTo-Json -InputObject @($result) -Depth 8 -Compress'].join('\n');
 return JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',program],{encoding:'utf8',windowsHide:true,timeout:15000,env:{...process.env,AURORA_WIZARD_SELECTOR_CASES:JSON.stringify(cases)}}).trim());
}
export function list(items,extra={}){return {hwnd:101,className:'TListBox',visible:true,enabled:true,list:{count:items.length,items},...extra};}

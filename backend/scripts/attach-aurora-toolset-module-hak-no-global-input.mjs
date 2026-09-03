#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const moduleName = resref(options.module, "--module");
const hak = resref(options.hak, "--hak");
const hakPath = resolve(
  options.hakPath ??
    `C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\${hak}.hak`,
);
const timeoutMs = positiveInteger(options.timeoutMs ?? "45000", "--timeoutMs");
const reuseOpenModuleProperties = options.reuseOpenModuleProperties === "true";
const reuseSelectedHak = options.reuseSelectedHak === "true";
const inspectOnly = options.inspectOnly === "true";
const expectedDirty = options.expectedDirty ?? "true";
if (!["true", "false"].includes(expectedDirty)) throw new Error("--expectedDirty must be true or false.");
if (!existsSync(hakPath)) throw new Error(`hak_file_missing:${hakPath}`);
if (timeoutMs > 60_000) throw new Error("--timeoutMs must not exceed 60000.");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AHK{
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public struct MII{public uint cbSize,fMask,fType,fState,wID;public IntPtr hSubMenu,hbmpChecked,hbmpUnchecked;public UIntPtr dwItemData;public IntPtr dwTypeData;public uint cch;public IntPtr hbmpItem;}
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll")]public static extern IntPtr GetMenu(IntPtr h);
  [DllImport("user32.dll")]public static extern IntPtr GetSubMenu(IntPtr m,int p);
  [DllImport("user32.dll")]public static extern int GetMenuItemCount(IntPtr m);
  [DllImport("user32.dll")]public static extern uint GetMenuItemID(IntPtr m,int p);
  [DllImport("user32.dll")]public static extern uint GetMenuState(IntPtr m,uint i,uint f);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool GetMenuItemInfo(IntPtr m,uint i,bool p,ref MII info);
  [DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
  [DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr SendMessageTimeoutText(IntPtr h,uint m,IntPtr w,StringBuilder l,uint flags,uint timeout,out IntPtr result);
  [DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr OpenProcess(uint a,bool i,uint p);
  [DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr s,uint t,uint pr);
  [DllImport("kernel32.dll",SetLastError=true)]public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr s,uint t);
  [DllImport("kernel32.dll",SetLastError=true)]public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr r);
  [DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr h);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][AHK]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AHK]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Get-WindowBounds([IntPtr]$h){$bounds=New-Object 'AHK+R';if(-not[AHK]::GetWindowRect($h,[ref]$bounds)){throw 'window_rect_failed'};$bounds}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w,[IntPtr]$l){$r=[IntPtr]::Zero;$sent=[AHK]::SendMessageTimeout($h,$m,$w,$l,2,2000,[ref]$r);if($sent-eq[IntPtr]::Zero){throw "send_timeout:$m"};$r}
function SMT([IntPtr]$h,[uint32]$m,[IntPtr]$w,[Text.StringBuilder]$l){$r=[IntPtr]::Zero;$sent=[AHK]::SendMessageTimeoutText($h,$m,$w,$l,2,2000,[ref]$r);if($sent-eq[IntPtr]::Zero){throw "send_text_timeout:$m"};$r}
function Tops([uint32]$toolsetPid){$script:tops=@();[void][AHK]::EnumWindows([AHK+E]{param($h,$l);[uint32]$p=0;[void][AHK]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[AHK]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=C $h;text=T $h;enabled=[AHK]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$parent){$script:kids=@();[void][AHK]::EnumChildWindows($parent,[AHK+E]{param($h,$l);$bounds=Get-WindowBounds $h;$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=C $h;text=T $h;visible=[AHK]::IsWindowVisible($h);enabled=[AHK]::IsWindowEnabled($h);left=$bounds.Left;top=$bounds.Top;width=$bounds.Right-$bounds.Left;height=$bounds.Bottom-$bounds.Top};$true},[IntPtr]::Zero);@($script:kids)}
# The former Alt+E / popup mnemonic route is forbidden: it opened an unrelated
# Resize Area dialog in the current Toolset session.  Aurora RCDATA binds
# TFRMFRAME.miViewProperties (caption Module &Properties, handler
# miViewPropertiesClick) as direct Edit child 12.  Live owner-drawn menu
# enumeration on this exact build reports that child as command ID 68.
$MODULE_PROPERTIES_MENU_CONTRACT=[pscustomobject]@{version='aurora-module-properties-menu-contract/v3';toolsetVersion='89.8193.37-17';topMenuPosition=1;topMenuCount=8;editMenuItemCount=14;modulePropertiesPosition=12;modulePropertiesCommandId=68;expectedDialogTitle='Module Properties';evidence='TFRMFRAME parsed binary DFM tree: Edit child miViewProperties / Module &Properties / miViewPropertiesClick plus current native menu ID'}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"}
[uint32]$toolsetPid=$ps[0].Id
$before=@(Tops $toolsetPid)
$frames=@($before|Where-Object{$_.className-eq'TfrmFrame'-and$_.text.TrimEnd('*').EndsWith(" - $env:M.mod",[StringComparison]::OrdinalIgnoreCase)})
if($frames.Count-ne1){throw "exact_module_frame_missing:$($frames.Count)"}
$frame=$frames[0]
$screen=[Windows.Forms.Screen]::FromHandle($frame.h)
if($screen.Primary){throw "module_frame_on_primary:$($screen.DeviceName)"}
$openedAlready=$env:REUSE_OPEN_MODULE_PROPERTIES-eq'true'
$dialog=$null
$menuItem=$null;$modulePropertiesId=$null;$modulePropertiesState=$null
if($openedAlready){
  $openDialogs=@($before|Where-Object{$_.className-eq'TfrmIFOProp'-and$_.text-eq$MODULE_PROPERTIES_MENU_CONTRACT.expectedDialogTitle})
  $unexpected=@($before|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TfrmIFOProp')})
  if($openDialogs.Count-ne1-or$unexpected.Count-ne0){throw ('expected_one_open_module_properties_dialog:'+($before|ConvertTo-Json -Compress))}
  $dialog=$openDialogs[0]
}else{
  if(-not$frame.enabled){throw 'exact_enabled_module_frame_missing'}
  $unexpected=@($before|Where-Object{$_.className-notin@('TfrmFrame','TApplication')})
  if($unexpected.Count-ne0){throw ('unexpected_modal_before_hak:'+($unexpected|ConvertTo-Json -Compress))}
  $menu=[AHK]::GetMenu($frame.h)
  if($menu-eq[IntPtr]::Zero){throw 'module_properties_main_menu_missing'}
  $topCount=[AHK]::GetMenuItemCount($menu);$editMenu=[AHK]::GetSubMenu($menu,[int]$MODULE_PROPERTIES_MENU_CONTRACT.topMenuPosition)
  if($topCount-ne[int]$MODULE_PROPERTIES_MENU_CONTRACT.topMenuCount-or$editMenu-eq[IntPtr]::Zero){throw "module_properties_menu_topology_mismatch:topCount=$topCount"}
  $menuItem=New-Object 'AHK+MII';$menuItem.cbSize=[Runtime.InteropServices.Marshal]::SizeOf([type]'AHK+MII');$menuItem.fMask=0x105
  if(-not[AHK]::GetMenuItemInfo($menu,[uint32][int]$MODULE_PROPERTIES_MENU_CONTRACT.topMenuPosition,$true,[ref]$menuItem)){throw 'module_properties_edit_menu_info_read_failed'}
  $editCount=[AHK]::GetMenuItemCount($editMenu)
  if($editCount-ne[int]$MODULE_PROPERTIES_MENU_CONTRACT.editMenuItemCount-or$menuItem.hSubMenu-eq[IntPtr]::Zero-or$menuItem.hSubMenu-ne$editMenu-or($menuItem.fState-band3)-ne0-or($menuItem.fType-band0x800)-ne0){throw "module_properties_edit_menu_invalid:count=$editCount fState=$($menuItem.fState) fType=$($menuItem.fType) hasSubMenu=$($menuItem.hSubMenu-ne[IntPtr]::Zero)"}
  [void](SM $frame.h 0x0117 $editMenu ([IntPtr][int]$MODULE_PROPERTIES_MENU_CONTRACT.topMenuPosition))
  $modulePropertiesId=[uint32][AHK]::GetMenuItemID($editMenu,[int]$MODULE_PROPERTIES_MENU_CONTRACT.modulePropertiesPosition)
  $modulePropertiesState=[uint32][AHK]::GetMenuState($editMenu,[uint32][int]$MODULE_PROPERTIES_MENU_CONTRACT.modulePropertiesPosition,0x400)
  if($modulePropertiesId-ne[uint32][int]$MODULE_PROPERTIES_MENU_CONTRACT.modulePropertiesCommandId-or($modulePropertiesState-band3)-ne0-or($modulePropertiesState-band0x800)-ne0){throw "module_properties_command_binding_invalid:id=$modulePropertiesId state=$modulePropertiesState"}
  if(-not[AHK]::PostMessage($frame.h,0x0111,[IntPtr][int]$modulePropertiesId,[IntPtr]::Zero)){throw 'module_properties_command_post_failed'}
  $deadline=[DateTime]::UtcNow.AddSeconds(8)
  do{
    Start-Sleep -Milliseconds 80
    $candidates=@(Tops $toolsetPid|Where-Object{$_.text-eq$MODULE_PROPERTIES_MENU_CONTRACT.expectedDialogTitle})
    if($candidates.Count-eq1){$dialog=$candidates[0]}
  }while($null-eq$dialog-and[DateTime]::UtcNow-lt$deadline)
  if($null-eq$dialog){throw 'module_properties_dialog_missing'}
}
if([Windows.Forms.Screen]::FromHandle($dialog.h).Primary){throw 'module_properties_on_primary'}

$pages=@(Kids $dialog.h|Where-Object{$_.className-eq'TPageControl'-and$_.visible})
if($pages.Count-ne1){throw "expected_one_visible_page_control:$($pages.Count)"}
$page=$pages[0]
$tabCount=[int](SM $page.h 0x1304 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
if($tabCount-lt2-or$tabCount-gt20){throw "invalid_tab_count:$tabCount"}
$proc=[AHK]::OpenProcess(0x38,$false,$toolsetPid)
if($proc-eq[IntPtr]::Zero){throw 'tab_process_open_failed'}
$remote=[AHK]::VirtualAllocEx($proc,[IntPtr]::Zero,[UIntPtr]::new(64),0x3000,4)
if($remote-eq[IntPtr]::Zero){[void][AHK]::CloseHandle($proc);throw 'tab_remote_alloc_failed'}
$tabProof=@()
try{
  for($i=0;$i-lt$tabCount;$i++){
    [void](SM $page.h 0x130A ([IntPtr]$i) $remote)
    $bytes=New-Object byte[] 16;[UIntPtr]$read=[UIntPtr]::Zero
    if(-not[AHK]::ReadProcessMemory($proc,$remote,$bytes,[UIntPtr]::new(16),[ref]$read)){throw 'tab_rect_read_failed'}
    $left=[BitConverter]::ToInt32($bytes,0);$top=[BitConverter]::ToInt32($bytes,4);$right=[BitConverter]::ToInt32($bytes,8);$bottom=[BitConverter]::ToInt32($bytes,12)
    if($right-le$left-or$bottom-le$top){throw "tab_rect_invalid:$i"}
    $x=[int](($left+$right)/2);$y=[int](($top+$bottom)/2);$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff))
    if(-not[AHK]::PostMessage($page.h,0x0201,[IntPtr]1,$lp)-or-not[AHK]::PostMessage($page.h,0x0202,[IntPtr]::Zero,$lp)){throw "tab_click_post_failed:$i"}
    Start-Sleep -Milliseconds 180
    $active=@(Kids $page.h|Where-Object{$_.className-eq'TTabSheet'-and$_.visible})
    $tabProof+=[pscustomobject]@{index=$i;active=@($active.text)}
    if($active.Count-eq1-and$active[0].text-eq'Custom Content'){$targetTabIndex=$i;break}
  }
}finally{
  [void][AHK]::VirtualFreeEx($proc,$remote,[UIntPtr]::Zero,0x8000)
  [void][AHK]::CloseHandle($proc)
}
if($null-eq$targetTabIndex){throw ('custom_content_tab_not_found:'+($tabProof|ConvertTo-Json -Compress))}

$content=@(Kids $dialog.h|Where-Object{$_.visible})
$combos=@($content|Where-Object{$_.className-eq'TComboBox'-and$_.enabled})
$listsBefore=@($content|Where-Object{$_.className-eq'TListBox'-and$_.enabled})
$addsBefore=@($content|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Add'})
$hakComboCandidates=@()
foreach($candidateCombo in $combos){
  $candidateLists=@($listsBefore|Where-Object{($_.top+$_.height)-le$candidateCombo.top-and$candidateCombo.top-($_.top+$_.height)-le10-and[math]::Abs($_.left-$candidateCombo.left)-le5-and[math]::Abs($_.width-$candidateCombo.width)-le5})
  $candidateAdds=@($addsBefore|Where-Object{[math]::Abs($_.top-$candidateCombo.top)-le5-and$_.left-gt($candidateCombo.left+$candidateCombo.width)-and$_.left-($candidateCombo.left+$candidateCombo.width)-le30})
  if($candidateLists.Count-eq1-and$candidateAdds.Count-eq1){$hakComboCandidates+=[pscustomobject]@{combo=$candidateCombo;list=$candidateLists[0];add=$candidateAdds[0]}}
}
if($hakComboCandidates.Count-ne1){throw ('expected_one_hak_combo_by_list_add_geometry:'+($hakComboCandidates|ConvertTo-Json -Compress))}
$combo=$hakComboCandidates[0].combo
$preAddList=$hakComboCandidates[0].list
$add=$hakComboCandidates[0].add
$count=[int](SM $combo.h 0x0146 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
$beforeIndexRaw=[uint32](SM $combo.h 0x0147 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
$beforeIndex=[BitConverter]::ToInt32([BitConverter]::GetBytes($beforeIndexRaw),0)
if($beforeIndex-lt-1){throw "invalid_combo_selected_index:$beforeIndex"}
$names=@()
for($i=0;$i-lt$count;$i++){$length=[int](SM $combo.h 0x0149 ([IntPtr]$i) ([IntPtr]::Zero)).ToInt64();if($length-lt0-or$length-gt32767){throw "hak_combo_item_length_invalid:\${i}:\${length}"};$b=[Text.StringBuilder]::new([Math]::Max(2,$length+1));[void](SMT $combo.h 0x0148 ([IntPtr]$i) $b);$names+=$b.ToString()}
$hakMatches=@(0..($names.Count-1)|Where-Object{$names[$_]-ceq$env:HAK})
if($hakMatches.Count-ne1){throw "expected_one_exact_hak:$($hakMatches.Count)"}
$targetIndex=[int]$hakMatches[0]
$inspectOnly=$env:INSPECT_ONLY-eq'true'
if($inspectOnly){
  $list=$preAddList
  $listCount=[int](SM $list.h 0x018B ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
  $listItems=@()
  for($i=0;$i-lt$listCount;$i++){$len=[int](SM $list.h 0x018A ([IntPtr]$i) ([IntPtr]::Zero)).ToInt64();if($len-lt0-or$len-gt32767){throw "hak_inspection_list_item_length_invalid:\${i}:\${len}"};$b=[Text.StringBuilder]::new([Math]::Max(2,$len+1));[void](SMT $list.h 0x0189 ([IntPtr]$i) $b);$listItems+=$b.ToString()}
  if(@($listItems|Where-Object{$_-ceq$env:HAK}).Count-ne1){throw ('hak_inspection_expected_exact_hak_missing:'+($listItems|ConvertTo-Json -Compress))}
  $cancel=@($content|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Cancel'-and$_.enabled})
  if($cancel.Count-ne1){throw "hak_inspection_expected_one_cancel:$($cancel.Count)"}
  if(-not[AHK]::PostMessage($cancel[0].h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'hak_inspection_cancel_post_failed'}
  $deadline=[DateTime]::UtcNow.AddSeconds(5);$after=@()
  do{Start-Sleep -Milliseconds 80;$after=@(Tops $toolsetPid)}while(@($after|Where-Object{$_.className-eq'TfrmIFOProp'-and$_.text-eq$MODULE_PROPERTIES_MENU_CONTRACT.expectedDialogTitle}).Count-ne0-and[DateTime]::UtcNow-lt$deadline)
  if(@($after|Where-Object{$_.className-eq'TfrmIFOProp'-and$_.text-eq$MODULE_PROPERTIES_MENU_CONTRACT.expectedDialogTitle}).Count-ne0){throw ('hak_inspection_module_properties_did_not_close:'+($after|ConvertTo-Json -Compress))}
  $finalFrame=@($after|Where-Object{$_.className-eq'TfrmFrame'-and$_.text.TrimEnd('*').EndsWith(" - $env:M.mod",[StringComparison]::OrdinalIgnoreCase)})
  $remaining=@($after|Where-Object{$_.className-notin@('TfrmFrame','TApplication')})
  $expectedDirty=$env:EXPECTED_DIRTY-eq'true'
  if($finalFrame.Count-ne1-or$remaining.Count-ne0-or($finalFrame[0].text.EndsWith('*')-ne$expectedDirty)){throw ('hak_inspection_final_state_unverified:'+($after|ConvertTo-Json -Compress))}
  [pscustomobject]@{ok=$true;processId=$toolsetPid;module=$env:M;hak=$env:HAK;inspectionOnly=$true;hakListReadback=$listItems;finalFrame=$finalFrame[0];safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated Module Properties custom-content readback followed by targeted Cancel only; no HAK Add/OK/save'}}|ConvertTo-Json -Depth 7 -Compress
  exit 0
}
if($env:REUSE_SELECTED_HAK-eq'true' -and $beforeIndex-ne$targetIndex){throw "hak_combo_selected_index_not_target:\${beforeIndex}:\${targetIndex}"}
if($env:REUSE_SELECTED_HAK-ne'true'){[void](SM $combo.h 0x014E ([IntPtr]$targetIndex) ([IntPtr]::Zero));Start-Sleep -Milliseconds 100}
$selectedIndexRaw=[uint32](SM $combo.h 0x0147 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
$selectedIndex=[BitConverter]::ToInt32([BitConverter]::GetBytes($selectedIndexRaw),0)
if($selectedIndex-ne$targetIndex){throw "hak_combo_selected_index_readback_mismatch:\${selectedIndex}:\${targetIndex}"}
$selectedLength=[int](SM $combo.h 0x0149 ([IntPtr]$selectedIndex) ([IntPtr]::Zero)).ToInt64()
if($selectedLength-lt0-or$selectedLength-gt32767){throw "hak_combo_selected_item_length_invalid:$selectedLength"}
$selectedBuffer=[Text.StringBuilder]::new([Math]::Max(2,$selectedLength+1));[void](SMT $combo.h 0x0148 ([IntPtr]$selectedIndex) $selectedBuffer)
$comboReadback=$selectedBuffer.ToString()
if($comboReadback-cne$env:HAK){throw "hak_combo_selected_item_readback_mismatch:$comboReadback"}

if($env:REUSE_SELECTED_HAK-ne'true'){
  # CB_SETCURSEL updates the owner-drawn text/index but does not invoke Aurora's
  # VCL selection handler. Notify the verified actual parent before inspecting
  # Add; never use a global keyboard or a menu mnemonic for this transition.
  $selectionChangeParent=[AHK]::GetParent($combo.h)
  if($selectionChangeParent-eq[IntPtr]::Zero){throw 'selection_change_parent_missing'}
  [uint32]$selectionChangeParentPid=0;[void][AHK]::GetWindowThreadProcessId($selectionChangeParent,[ref]$selectionChangeParentPid)
  if($selectionChangeParentPid-ne$toolsetPid){throw "selection_change_parent_pid_mismatch:$selectionChangeParentPid"}
  $selectionChangeControlId=[AHK]::GetDlgCtrlID($combo.h)
  if($selectionChangeControlId-le0){throw "selection_change_control_id_invalid:$selectionChangeControlId"}
  # WM_COMMAND: LOWORD control id, HIWORD CBN_SELCHANGE (1), LPARAM combo HWND.
  $selectionChangeWParam=[IntPtr][int64](($selectionChangeControlId-band0xffff)-bor(1-shl16))
  [void](SM $selectionChangeParent 0x0111 $selectionChangeWParam $combo.h) # CBN_SELCHANGE
  $selectionChangeDeadline=[DateTime]::UtcNow.AddSeconds(2)
  do{Start-Sleep -Milliseconds 80;$addEnabled=[AHK]::IsWindowEnabled($add.h)}while(-not$addEnabled-and[DateTime]::UtcNow-lt$selectionChangeDeadline)
  if(-not$addEnabled){throw 'selection_change_add_not_enabled'}
}
if(-not[AHK]::IsWindowEnabled($add.h)){throw 'hak_add_button_not_enabled_after_exact_combo_selection'}
if(-not[AHK]::PostMessage($add.h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'add_hak_post_failed'}
Start-Sleep -Milliseconds 300
$afterAdd=@(Kids $dialog.h|Where-Object{$_.visible})
$lists=@($afterAdd|Where-Object{$_.className-eq'TListBox'})
if($lists.Count-ne1){throw "expected_one_hak_list:$($lists.Count)"}
$list=$lists[0]
$listCount=[int](SM $list.h 0x018B ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
$listItems=@()
for($i=0;$i-lt$listCount;$i++){$len=[int](SM $list.h 0x018A ([IntPtr]$i) ([IntPtr]::Zero)).ToInt64();$b=[Text.StringBuilder]::new([Math]::Max(2,$len+1));[void](SMT $list.h 0x0189 ([IntPtr]$i) $b);$listItems+=$b.ToString()}
if(@($listItems|Where-Object{$_-ceq$env:HAK}).Count-ne1){throw ('hak_list_readback_failed:'+($listItems|ConvertTo-Json -Compress))}

$ok=@($afterAdd|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'OK'-and$_.enabled})
if($ok.Count-ne1){throw "expected_one_module_properties_ok:$($ok.Count)"}
if(-not[AHK]::PostMessage($ok[0].h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'module_properties_ok_post_failed'}

$deadline=[DateTime]::UtcNow.AddSeconds(5)
$warning=$null
do{
  Start-Sleep -Milliseconds 80
  $warnings=@(Tops $toolsetPid|Where-Object{$_.className-eq'#32770'-and$_.text-eq'Warning'})
  if($warnings.Count-eq1){$warning=$warnings[0]}
}while($null-eq$warning-and[DateTime]::UtcNow-lt$deadline)
if($null-eq$warning){throw 'hak_rebuild_warning_missing'}
$warningKids=@(Kids $warning.h|Where-Object{$_.visible})
$warningText=($warningKids.text -join [Environment]::NewLine)
if($warningText-notmatch'change the list of Hak (Paks|Files) used by this module'-or$warningText-notmatch'Are you sure you wish to continue'){throw "unexpected_hak_warning:$warningText"}
$yes=@($warningKids|Where-Object{$_.className-in@('TButton','Button')-and$_.text-in@('Yes','&Yes','Tak','&Tak')-and$_.enabled})
if($yes.Count-ne1){throw "expected_one_warning_yes:$($yes.Count)"}
$no=@($warningKids|Where-Object{$_.className-in@('TButton','Button')-and$_.text-in@('No','&No','Nie','&Nie')-and$_.enabled})
if($no.Count-ne1){throw "expected_one_warning_no:$($no.Count)"}
if(-not[AHK]::PostMessage($yes[0].h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'warning_yes_post_failed'}

$deadline=[DateTime]::UtcNow.AddMilliseconds([int]$env:TIMEOUT)
$sawBuild=$false;$last=@()
do{
  Start-Sleep -Milliseconds 100
  $last=@(Tops $toolsetPid)
  if(@($last|Where-Object{$_.className-eq'TdlgProgress'-or$_.text-match'Build Module|Loading Inventory List'}).Count-gt0){$sawBuild=$true}
  $remaining=@($last|Where-Object{$_.className-notin@('TfrmFrame','TApplication')})
}while($remaining.Count-ne0-and[DateTime]::UtcNow-lt$deadline)
if($remaining.Count-ne0){throw ('hak_rebuild_did_not_settle:'+($remaining|ConvertTo-Json -Compress))}
$finalFrame=@($last|Where-Object{$_.className-eq'TfrmFrame'-and$_.text.TrimEnd('*').EndsWith(" - $env:M.mod",[StringComparison]::OrdinalIgnoreCase)})
if($finalFrame.Count-ne1-or-not$finalFrame[0].enabled){throw 'module_frame_not_restored_after_hak'}
if(-not(Get-Process -Id $toolsetPid).Responding){throw 'toolset_not_responding_after_hak'}

[pscustomobject]@{
  ok=$true
  processId=$toolsetPid
  module=$env:M
  hak=$env:HAK
  hakPath=$env:HAK_PATH
  menu=[pscustomobject]@{contract=$MODULE_PROPERTIES_MENU_CONTRACT;reusedOpenDialog=$openedAlready;readback=[pscustomobject]@{fState=$menuItem.fState;fType=$menuItem.fType;hasSubMenu=($menuItem.hSubMenu-ne[IntPtr]::Zero);modulePropertiesId=$modulePropertiesId;modulePropertiesState=$modulePropertiesState}}
  dialogClass=$dialog.className
  customContentTabIndex=$targetTabIndex
  tabProof=$tabProof
  combo=[pscustomobject]@{itemCount=$count;previousIndex=$beforeIndex;previousIndexRaw=$beforeIndexRaw;targetIndex=$targetIndex;selectedIndex=$selectedIndex;selectedIndexRaw=$selectedIndexRaw;readback=$comboReadback;reusedSelectedHak=($env:REUSE_SELECTED_HAK-eq'true');identity=[pscustomobject]@{listHwnd=$preAddList.hwnd;comboHwnd=$combo.hwnd;addHwnd=$add.hwnd;predicate='one visible enabled combo directly below a same-width ListBox and horizontally adjacent to Add'}}
  hakListReadback=$listItems
  sawBuildProgress=$sawBuild
  finalFrame=$finalFrame[0]
  monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary}
  safety=[pscustomobject]@{
    usesGlobalCursor=$false
    usesGlobalKeyboard=$false
    usesGlobalMouse=$false
    guessedMenuCommandId=$false
    staleHwndReuse=$false
    method='RCDATA-bound owner-drawn Edit child plus current command-ID readback; targeted frame WM_COMMAND; bounded tab discovery with active TTabSheet readback; exact HAK text and list readback; targeted PostMessage; SendMessageTimeout only'
  }
}|ConvertTo-Json -Depth 8 -Compress
`;

const output = execFileSync(
  "powershell.exe",
  ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source],
  {
    encoding: "utf8",
    windowsHide: true,
    timeout: timeoutMs + 15_000,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      M: moduleName,
      HAK: hak,
      HAK_PATH: hakPath,
      REUSE_OPEN_MODULE_PROPERTIES: String(reuseOpenModuleProperties),
      REUSE_SELECTED_HAK: String(reuseSelectedHak),
      INSPECT_ONLY: String(inspectOnly),
      EXPECTED_DIRTY: expectedDirty,
      TIMEOUT: String(timeoutMs),
    },
  },
);
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function required(value, name) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function resref(value, name) {
  const result = required(value, name);
  if (!/^[a-z0-9_]{1,32}$/iu.test(result)) {
    throw new Error(`${name} must be a 1-32 character Aurora resref.`);
  }
  return result;
}

function positiveInteger(value, name) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new Error(`${name} must be a positive integer.`);
  return result;
}

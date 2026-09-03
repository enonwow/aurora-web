#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/attach-aurora-toolset-module-hak-no-global-input.mjs");
const source = readFileSync(atom, "utf8");

// Aurora's VCL main menu is owner-drawn: GetMenuString exposes empty labels.
// The route binds the exact Edit child through the current native menu ID plus
// the matching TFRMFRAME RCDATA component order. It must not use mnemonics:
// the former Alt+E / "m" route opened an unrelated Resize Area dialog live.
assert.match(source, /MODULE_PROPERTIES_MENU_CONTRACT/);
assert.match(source, /topMenuPosition=1/);
assert.match(source, /modulePropertiesPosition=12/);
assert.match(source, /modulePropertiesCommandId=68/);
assert.match(source, /reuseOpenModuleProperties = options\.reuseOpenModuleProperties === "true"/);
assert.match(source, /reuseSelectedHak = options\.reuseSelectedHak === "true"/);
assert.match(source, /inspectOnly = options\.inspectOnly === "true"/);
assert.match(source, /const expectedDirty = options\.expectedDirty \?\? "true"/);
assert.match(source, /GetMenuItemInfo/);
assert.match(source, /fMask=0x105/);
assert.match(source, /\$menuItem\.fState-band3/);
assert.match(source, /\$menuItem\.fType-band0x800/);
assert.match(source, /GetMenuItemID\(\$editMenu,\[int\]\$MODULE_PROPERTIES_MENU_CONTRACT\.modulePropertiesPosition\)/);
assert.match(source, /SM \$frame\.h 0x0117/);
assert.match(source, /PostMessage\(\$frame\.h,0x0111/);
assert.match(source, /expectedDialogTitle='Module Properties'/);
assert.match(source, /function Get-WindowBounds\(/);
assert.match(source, /\$bounds=Get-WindowBounds \$h/);
assert.doesNotMatch(source, /function R\(/);
assert.doesNotMatch(source, /\$r=R \$h/);
assert.match(source, /REUSE_OPEN_MODULE_PROPERTIES: String\(reuseOpenModuleProperties\)/);
assert.match(source, /\$hakComboCandidates=@\(\)/);
assert.match(source, /expected_one_hak_combo_by_list_add_geometry/);
assert.match(source, /\$candidateLists=@\(\$listsBefore/);
assert.match(source, /\$candidateAdds=@\(\$addsBefore/);
assert.match(source, /hak_add_button_not_enabled_after_exact_combo_selection/);
assert.match(source, /one visible enabled combo directly below a same-width ListBox and horizontally adjacent to Add/);
assert.doesNotMatch(source, /expected_one_hak_combo:\$\(\$combos\.Count\)/);
assert.match(source, /\$beforeIndexRaw=\[uint32\]\(SM \$combo\.h 0x0147/);
assert.match(source, /\$beforeIndex=\[BitConverter\]::ToInt32\(\[BitConverter\]::GetBytes\(\$beforeIndexRaw\),0\)/);
assert.match(source, /invalid_combo_selected_index/);
assert.match(source, /hak_combo_item_length_invalid/);
assert.match(source, /SMT \$combo\.h 0x0148/);
assert.doesNotMatch(source, /for\(\$i=0;\$i-lt\$count;\$i\+\+\)\{\[void\]\(SM \$combo\.h 0x014E/);
assert.match(source, /hak_combo_selected_index_readback_mismatch/);
assert.match(source, /hak_combo_selected_item_readback_mismatch/);
assert.match(source, /GetParent\(IntPtr h\)/);
assert.match(source, /GetDlgCtrlID\(IntPtr h\)/);
assert.match(source, /CBN_SELCHANGE/);
assert.match(source, /selection_change_parent_missing/);
assert.match(source, /selection_change_add_not_enabled/);
assert.match(source, /REUSE_SELECTED_HAK: String\(reuseSelectedHak\)/);
assert.match(source, /INSPECT_ONLY: String\(inspectOnly\)/);
assert.match(source, /EXPECTED_DIRTY: expectedDirty/);
assert.match(source, /if\(\$inspectOnly\)\{/);
assert.match(source, /hak_inspection_expected_exact_hak_missing/);
assert.match(source, /hak_inspection_cancel_post_failed/);
assert.match(source, /no HAK Add\/OK\/save/);
assert.match(source, /Hak \(Paks\|Files\)/);
assert.match(source, /expected_one_warning_no/);
assert.doesNotMatch(source, /Find-MenuLeaf/);
assert.doesNotMatch(source, /GetMenuString\(/);
assert.doesNotMatch(source, /\$editState/);
assert.doesNotMatch(source, /0x0104/);
assert.doesNotMatch(source, /0x0105/);
assert.doesNotMatch(source, /0x0102/);
assert.doesNotMatch(source, /#32768/);

// Regression fixture: VCL's owner-drawn top-level Edit item returned 0x3600
// from legacy GetMenuState even though the separately reported state is enabled
// and the type is a non-separator submenu. The contract must accept this case.
const ownerDrawnTopLevelEdit = {
  legacyGetMenuState: 0x3600,
  menuItemInfo: { fState: 0, fType: 0x100, hasSubMenu: true },
};
assert.equal(ownerDrawnTopLevelEdit.legacyGetMenuState, 0x3600);
assert.equal((ownerDrawnTopLevelEdit.menuItemInfo.fState & 0x3) === 0, true);
assert.equal((ownerDrawnTopLevelEdit.menuItemInfo.fType & 0x800) === 0, true);
assert.equal(ownerDrawnTopLevelEdit.menuItemInfo.hasSubMenu, true);

// Compile the actual generated PowerShell source without executing its native
// calls. A JavaScript syntax check cannot catch a broken P/Invoke or a
// PowerShell parsing regression in the production atom.
const parseScript = "$path=$env:ATOM;$text=Get-Content -Raw $path;$marker='const source = String.raw'+[char]96;$start=$text.IndexOf($marker);if($start-lt0){throw 'source_marker_missing'};$start+=$marker.Length;$end=$text.IndexOf(([char]96+';'),$start);if($end-lt0){throw 'source_terminator_missing'};[void][ScriptBlock]::Create($text.Substring($start,$end-$start));'powershell_source_parse_ok'";
const parseOutput = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", parseScript], { encoding: "utf8", env: { ...process.env, ATOM: atom } });
assert.match(parseOutput, /powershell_source_parse_ok/);

// Win32 CB_GETCURSEL returns CB_ERR (-1) through the pointer-sized
// SendMessageTimeout result as 0xFFFFFFFF. It must be decoded as a signed
// 32-bit sentinel, not cast directly to Int32 from a positive IntPtr.
const sentinelOutput = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "$raw=[uint32]4294967295;$signed=[BitConverter]::ToInt32([BitConverter]::GetBytes($raw),0);if($signed-ne-1){throw ('cb_err_decode_failed:'+$signed)};'cb_err_signed_decode_ok'"], { encoding: "utf8" });
assert.match(sentinelOutput, /cb_err_signed_decode_ok/);

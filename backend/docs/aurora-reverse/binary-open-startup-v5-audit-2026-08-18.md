# Binary explicit-open v5 module-selector audit

Date: 2026-08-18

Status: `SEMANTIC GAP CLOSED FOR THE EXACT BINARY; LIVE ROUTE VALIDATION PENDING`.

This audit extends the v4 Welcome audit only for `nwtoolset.exe` SHA-256
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
The executable, Toolset state, modules, HAKs, INI/MRU, and NWN process were not
mutated during this static investigation.

## Root cause

The first v4 live route found and selected the exact `codex_vfx_row28` list
item, and `LB_GETCURSEL` returned its exact index. It nevertheless opened the
old `m2aweapdemo9` module. The list-index readback was real but incomplete:
`LB_SETCURSEL` does not itself invoke the VCL `lbModulesClick` handler, so the
separate module-name edit retained its old value.

## Exact class and handler binding

The exact PE contains the published `TdlgModuleSelect` class block at
`0x00BF2040..0x00BF2167`. It binds `lbModules` to object offset `0x3D8`,
`eModuleName` to `0x3DC`, `bOKClick` to `0x00500CBC`, and `lbModulesClick` to
`0x005016D8`.

At `0x005016ED`, `lbModulesClick` loads `this+0x3D8` and queries the current
list index. At `0x00501707` it loads that list again, obtains the selected item
text, then at `0x00501733` loads `this+0x3DC` and copies the text into the
module-name edit through the call at `0x0050173B`.

`bOKClick` independently loads `this+0x3DC` at `0x00500CF7` and reads the edit
text through the call at `0x00500CFD`. Therefore the edit text, not the visual
list selection alone, is the native input to the Open action.

The machine-readable byte-slice inventory and hashes are in
`evidence/binary-open-startup-v5/toolset-module-selector-static-audit.json`.
The old May Ghidra export was used only as a human-readable cross-check and
remains non-authoritative lineage-v1 material.

## Narrow route authorization

For this exact executable hash, after one exact module item is selected with
`LB_SETCURSEL` and verified with `LB_GETCURSEL`, the route must resolve the
actual list parent and control ID, synchronously send `WM_COMMAND` with
`LBN_SELCHANGE`, and require the one visible enabled `TEdit` text to equal the
exact selected list text. Only then may it asynchronously post the exact Open
button. A parent mismatch, invalid control ID, notification timeout, edit-text
mismatch, different binary, ambiguous controls, or unexpected loaded frame
fails closed.

## Implementation and validation state

`open-last-city-module-and-area-toolset-no-global-input.mjs` implements the
bounded native notification and exact edit-text readback. The startup
integration test was observed failing before the implementation and passing
after it; the binary-native-geometry contract and Node syntax check also pass.
A new clean-session live rerun is still required before the route can be
called operationally validated or used as downstream VFX proof.


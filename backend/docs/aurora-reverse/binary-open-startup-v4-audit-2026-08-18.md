# Binary explicit-open v4 exact-semantic audit

Date: 2026-08-18

Status: `SEMANTIC GAP CLOSED FOR THE EXACT BINARY; LIVE ROUTE VALIDATION PENDING`.

This audit supersedes the missing-semantic conclusion in
`binary-open-startup-v3-audit-2026-07-21.md` only for `nwtoolset.exe` SHA-256
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
The executable, Toolset state, modules, HAKs, INI/MRU, and NWN process were not
mutated during this static investigation.

## Root cause

The Welcome route selected `Open an existing Module` and posted `OK`, but it
left the Welcome recent-module list selected. Aurora therefore behaved as its
native code requires: it copied the selected recent-module string and called
the loader directly. It did not create `TdlgModuleSelect`. The previously
observed old-MRU load was not proof that the radio choice failed.

## Exact class and handler binding

The exact PE contains one published `TdlgWelcome` class block at
`0x00CACB50..0x00CACBBB`. The block binds:

- `rbCreateNew` to object offset `0x3E4`;
- `rbOpenExisting` to `0x3E8`;
- `lbModuleFiles` to `0x3EC`;
- `rbDoNothing` to `0x3F4`; and
- `bOKClick` to code pointer `0x007471F0`.

The handler at `0x007471F0` reads the `rbOpenExisting` checked state through
the object at `this+0x3E8`, stores it at `this+0x3FE`, queries the list
selection through `this+0x3EC`, captures the selected module string when an
index exists, then sets the dialog result to `1` at `0x00747390`.

The caller at `0x0057F398` shows the Welcome dialog, reads the open-existing
flag through `0x00747144`, then retrieves the captured module string through
`0x0074714C`. At `0x0057F774` it chooses between two native paths:

- non-empty string: direct module load through `0x0057BCD8`;
- empty string: module-selector transition through `0x005752C0`.

The latter constructs `TdlgModuleSelect` through `0x004FEB14` at
`0x00575332` and invokes its modal path at `0x00575342`.

The machine-readable byte-slice inventory and hashes are in
`evidence/binary-open-startup-v4/toolset-welcome-open-existing-static-audit.json`.
The old May Ghidra export was used only as a human-readable cross-check and
remains non-authoritative lineage-v1 material.

## Narrow route authorization

For this exact executable hash, a startup route may clear the Welcome
`lbModuleFiles` selection with `LB_SETCURSEL(-1)`, require
`LB_GETCURSEL == -1`, verify `rbOpenExisting=checked` and
`Start normally=unchecked`, then asynchronously post the exact Welcome `OK`.

It must then require exactly one `TdlgModuleSelect` titled `Open`, select only
the exact requested module text, read back the exact list index, asynchronously
post the exact `Open` button, and accept success only from the exact loaded
frame title. Any different executable hash, ambiguous dialog/control set,
selection readback mismatch, unexpected module frame, or critical modal fails
closed before another load action.

## Implementation and validation state

`open-last-city-module-and-area-toolset-no-global-input.mjs` now implements the
narrow route and rejects a Toolset executable whose SHA-256 differs from the
audited value. The integration contract proves the required readbacks and
asynchronous posts. A live clean-session rerun is still required before this
route can be called operationally validated or used as downstream VFX proof.


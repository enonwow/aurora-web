# Aurora Toolset entry-surface research

Date: 2026-07-19

Scope: the central vertical-slice bootstrap entry-location and
surface-accessibility gate. This is an Aurora-first research record; it does
not authorize a project-local Toolset adapter.

## Primary evidence

1. Local Aurora decompilation at
   `C:\Projects\New Folder\export\decompiled_all.c:262383-262397` reads
   `Mod_Entry_Area`, `Mod_Entry_X`, `Mod_Entry_Y`, `Mod_Entry_Z`,
   `Mod_Entry_Dir_X`, and `Mod_Entry_Dir_Y` into the module state.
2. The corresponding write path at
   `C:\Projects\New Folder\export\decompiled_all.c:264310-264315` writes
   the same fields. This independently establishes the serialized IFO entry
   tuple as the native module start-location source, rather than a project
   convention.
3. Toolset resource evidence in
   `C:\Projects\nwn-last-city\Aurora\reverse\reverse\nwtoolset_rcdata_report.json`
   records the `sbStartLocation` control with the hint `Paint Start Location`,
   plus `Show Start Location` and `Goto Start Location` actions. It establishes
   that the Toolset owns a start-location editing surface.
4. The existing local reverse note
   `docs/analysis/2026-05-21_reverse-walkmesh-placement-and-visual-transform.md`
   establishes that physical creature positions are GIT `XPosition/YPosition/ZPosition`
   and that walkability requires a valid WOK triangle. It does not establish
   that a Toolset save validates an IFO entry coordinate against the same
   predicate.

No xoreos source was used to establish any runtime behavior in this change.

## Resulting central contract

`read-aurora-toolset-bootstrap-entry-readback.mjs` reads the saved native IFO
tuple. The bootstrap manifest binds that tuple to the MOD hash, while the GIT
reader binds each placed fixture's actual post-placement coordinates to the
same MOD hash. A bootstrap declaration supplies only `entryArea` and fixture
identities; it cannot predeclare world coordinates.

The fallback `bootstrap-entry-surface-arm` / `bootstrap-entry-surface-ingest`
contract is user-owned and nonce-bound. It requires a hash-bound fresh Toolset
capture and rechecks the serialized IFO tuple. It has no project-supplied
`accessible=true` field.

## Open semantic question

The suggested entry-proxy creature approach is a valid research hypothesis,
not an accepted predicate. It may be promoted only after a controlled Aurora
fixture proves both of the following:

1. Toolset save rejection/acceptance for the proxy uses the same accessible
   surface predicate relevant to the IFO entry; and
2. a native start-location edit followed by save/readback preserves equality
   between the IFO tuple and the proxy's saved GIT world position.

Until that experiment exists, the central geometry observer remains fail-closed
for a missing entry-surface observation. It must not infer entry accessibility
from a successful creature save.

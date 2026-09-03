# Copy/Paste placeable — Aurora live proof (2026-07-14)

Verdict: **VERIFIED for the generic Area Copy/Paste route on one uniquely
identified placeable**. This packet does not claim an NPC- or item-specific
workflow.

One Toolset session (PID `24892`) remained open for the whole sequence on
`DISPLAY1`: select `Water Trough` from the Area tree, native Edit/Copy (`59`),
read back that native Paste (`61`) was enabled, enter Paste, commit its active
viewport preview at `(1100,700)`, save and parse, Undo (`56`), save and parse,
then cleanly close. Every live action used targeted window messages only; no
global cursor, keyboard, or mouse input was used.

The saved GIT delta is exactly one `plc_watertrough` record at
`(63.5478, 24.6024, 0)`: `placeables 3 -> 4` and `total 18 -> 19`.
After native Undo and a second save, `objects.csv` is byte-identical to the
baseline (`BD25047F...7C491`) and counts return to `3` / `18`.

The container `.mod` SHA-256 changed despite that exact parser-level rollback
(`D4ABD... -> 660C...`). This is recorded as Toolset container repacking, not
hidden as a byte-identical module rollback. The source `DEMO-NPC_Routines.mod`
was not modified.

Run the independent check with:

```powershell
node backend/scripts/validate-aurora-toolset-copy-paste-placeable-proof.mjs
```

Key artifacts: [actions](actions.json), [committed Aurora frame](05-paste-committed.png),
[after-save parser manifest](after-paste-save/manifest.json),
[rollback parser manifest](after-undo-save/manifest.json), and
[session clean close](session-state.json).

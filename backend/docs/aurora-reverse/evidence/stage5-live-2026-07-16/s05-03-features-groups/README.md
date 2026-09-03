# AUR-S05-03 Features and Groups proof

Result: accepted by `validate-aurora-toolset-stage5-features-groups.mjs`.

The Feature half reuses the already accepted S05-01 transaction instead of
repeating it: exact palette leaf `Ground with grass patch`, one changed tile,
saved source readback, reopen persistence, and complete rollback.

The Group half uses the exact leaf `Small square (2x2)` on `area001`. Its saved
ARE footprint is a contiguous `4x4` source rectangle at rows `2..5`, columns
`3..6`, indices:

- `19, 20, 21, 22`
- `27, 28, 29, 30`
- `35, 36, 37, 38`
- `43, 44, 45, 46`

The `2x2` name describes the prefab core; the Toolset also rebuilt the
surrounding transition/autotile border. Acceptance therefore depends on the
enumerated 16-tile ARE delta, not on assuming that the palette label equals the
complete source footprint. Height, light, and animation-loop fields stayed
unchanged, object counts stayed at one placeable, and native Undo + Save
restored all `64/64` baseline tiles.

Evidence:

- `group-palette-readback.json` — exact, unique leaf identity
- `group-diff.json` — complete before/after source delta
- `group-after-save/` — saved positive source pack
- `group-rollback.json` and `group-rollback/` — zero-delta rollback proof
- `validation.json` — executable acceptance verdict

The palette action made the VCL UI busy longer than the observer timeout, so
the observer did not emit a post-action JSON record. This is not treated as an
input proof. Acceptance uses the independently captured exact palette identity,
dirty/save transition, packed ARE before/after sources, and exact rollback.
No global cursor, keyboard, or mouse input was used, and the Toolset remained
open.

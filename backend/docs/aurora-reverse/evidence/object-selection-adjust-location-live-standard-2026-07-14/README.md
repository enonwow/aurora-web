# Aurora Toolset live proof — object selection and Adjust Location

Verdict: `verified` for `AUR-S02-01` and `AUR-S02-03` on 2026-07-14.
`AUR-S02-09` is only `partial`, because Undo is proven but Redo is not.

The run used one live Aurora Toolset process (`PID 43748`) on physical
`DISPLAY1`, with no global cursor, keyboard, or mouse input.

## Selection proof

The native `Selection Mode` toolbar exposed two buttons. Index `0`, command
`0`, was checked for terrain selection. A targeted click switched to index `1`,
command `1`, and native toolbar readback proved that only the object button was
checked. This corrects the older unproven assumption that viewer
`WM_COMMAND 74` alone established `Select Objects`.

The selected object was identified three ways:

- green outline in `04-object-selection-npc.png`;
- selected `Dwarf Mercenary` row in the Area tree;
- `Creature Properties` in `05-selected-npc-properties.png`, showing
  `Tag=NW_DWARFMERC001`, race Dwarf and appearance Dwarf, Male.

## Adjust Location proof

The active object context menu was read through `MN_GETHMENU`. Exact item
`A&djust Location`, position `1`, command `192`, opened a real
`TdlgLocation` dialog.

Aurora changed the selected instance from:

| Phase | X | Y | Z | `demo.git` SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Baseline | 60.9686 | 27.1816 | 0 | `5bd618c1...a40d` |
| Mutated | 61.47 | 27.18 | 0.25 | `375be6db...db2a` |
| Native Undo | 60.9686 | 27.1816 | 0 | `5bd618c1...a40d` |

The baseline and post-Undo `objects.csv` files are byte-identical, and the
extracted `demo.git` payload hash also returned exactly to baseline.

## Precision problem captured by the standard

Typing `60,9686` and `27,1816` into the visible TUpDown-backed edits displayed
the values but did not change the persisted GIT from the mutated state. The
standard therefore forbids claiming an exact rollback from text readback alone.
When the baseline contains more precision than the UI display, native Undo or a
verified pristine working copy is mandatory.

The packed `.mod` container hash changed because the container was saved, while
the exact Area GIT payload and object rows returned to baseline.

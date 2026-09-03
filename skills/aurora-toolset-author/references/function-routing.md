# Aurora authoring function routing

Skill suite contract: `1.0.15`. Runner versions are independent; validate their
declared contracts rather than comparing them to this skill-suite version.

Resolve `AURORA_STANDARD_ROOT`, falling back to `C:\Projects\aurora-web`.
Documents live under `backend/docs/aurora-reverse`; atoms and validators live
under `backend/scripts`.

Read the roadmap first, then select the narrowest standards below.

## Placement

- Common palette: `aurora-toolset-palette-placement-standard.md`
- Creature/NPC: `aurora-toolset-creature-npc-placement-standard.md`
- Placeable: `aurora-toolset-placeable-placement-standard.md`
- Ground item: `aurora-toolset-item-ground-placement-standard.md`
- Door: `aurora-toolset-door-placement-standard.md`
- Encounter: `aurora-toolset-encounter-placement-standard.md`
- Merchant: `aurora-toolset-merchant-placement-standard.md`
- Sound: `aurora-toolset-sound-placement-standard.md`
- Trigger: `aurora-toolset-trigger-placement-standard.md`
- Waypoint: `aurora-toolset-waypoint-placement-standard.md`

## Selection and mutation

- Selection: `aurora-toolset-object-selection-standard.md`
- Exact location: `aurora-toolset-adjust-location-standard.md`
- Bearing: `aurora-toolset-bearing-rotation-standard.md`
- Delete: `aurora-toolset-object-delete-standard.md`
- Duplicate: `aurora-toolset-duplicate-standard.md`
- Copy/paste: `aurora-toolset-copy-paste-standard.md`
- Overlap: `aurora-toolset-overlap-topmost-selection-standard.md`
- Undo/redo: `aurora-toolset-undo-redo-standard.md`

## Creatures, items, and placeables

- NPC properties: `aurora-toolset-npc-stage3-standard.md`
- Stage 4 core: `aurora-toolset-stage4-standard.md`
- Inventory/equipment D&D:
  `aurora-toolset-inventory-equipment-dnd-standard.md`

For D&D, prefer the verified native atom
`invoke-aurora-toolset-native-inventory-drop-no-global-input.mjs` and its
specific validators. Reject the historical process-local pointer/IAT path.

## Area

- Area standards: `aurora-toolset-stage5-area-standards-2026-07-16.md`
- Camera: `aurora-toolset-camera-standard-2026-07-11.md`
- Viewport target: `aurora-toolset-viewport-target-standard.md`

## Function manifests and closure

- Manifest index: `function-manifests/index.json`
- Validate manifests:
  `validate-aurora-toolset-function-manifests.mjs`
- Validate stage:
  `validate-aurora-toolset-stage-completion.mjs --stage N`

Search by the mapped `AUR-SNN-NN` ID and read the most recent accepted evidence
before live work. Execute the central verified atom from this map. A consuming
project's product `reference-only` boundary does not require or permit a
project-local Toolset runner or UI adapter as a replacement.

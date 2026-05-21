# Aurora Scope Inventory (Verified)

## Purpose
This document verifies the initial Aurora element list and records missing formats/types that should be tracked by `aurora-web`.

## Verification Date
- 2026-05-20

## Input Coverage Status
- The provided list is strong and mostly complete for area generation, placement, and rendering pipelines.

## Corrections
1. `Tile` should be treated as area tile layout in `ARE` (`Tile_List`), not as a `GIT` instance list object.
2. `Ground Item` as top-level `GIT.List` is correct.
3. `Area of Effect` exists as an object/runtime type, but usually should be tracked as optional/runtime scope (not a core blueprint workflow item).

## Missing Types To Track
1. `FAC` (factions and reputation data)
2. `ITP` (toolset palette resources)
3. `UTG` (item generator template)
4. `DFT` (legacy/toolset area defaults)
5. `PTM` and `PTT` (plot manager and plot templates)
6. `SSF` (soundset resources)
7. `GUI` and generic `GFF` resources (profile-dependent but real)
8. `CAF` (EE combined area format, profile-dependent)
9. `SQ3` (module SQLite DB, profile-dependent)

## Scope Labels
- `Must Support`: ARE, GIT, GIC, SET, IFO, UTC, UTP, UTD, UTI, UTT, UTW, UTE, UTS, UTM, DLG, 2DA, TLK, JRL, MDL, WOK, PWK, DWK, TGA, DDS, PLT, TXI, MTR, SHD, HAK, MOD, ERF, KEY, BIF.
- `Should Track`: FAC, ITP, NSS, NCS, GUI, GFF, SSF.
- `Profile/Optional`: RIM, NWM, CAF, SQ3, Area-of-Effect runtime details.

## Source Notes
- Primary references were cross-checked from existing reverse-engineering and POC documentation and local implementation references.

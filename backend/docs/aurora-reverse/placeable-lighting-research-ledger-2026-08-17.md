# Placeable lighting research ledger — 2026-08-17

Status: `PL-R01`, `PL-R02`, and `PL-R03` are `blocked` with
`proofCompleteness=missing`. This is an implementation gate, not a failed
runtime observation. No Toolset or NWN process was started for this ledger and
xoreos was not used.

## PL-R01 — placed GIT `LightState`

### Confirmed

- Blueprint UTP `LightState` is parsed. A missing UTP field defaults to `1`.
- `backend/scripts/audit-lightstate-default-retail-binary.mjs` anchors the
  retail `LightState` string, the owning function, and the
  `mov dword ptr [rbx+0x368],1` default-before-read instruction.
- The binary fact is classified as retail-binary evidence, not as a recovered
  raw decompilation field contract.

### Missing

- No real GIT sample with a serialized illumination OFF state exists in the
  admitted corpus.
- GIT field presence, type ID, absence rule, legal value domain, and save/load
  behavior have not been recovered.
- Synthetic parser fixtures do not prove Aurora storage semantics.

### Resume condition

Capture one exact-object Toolset save/readback sequence for missing, OFF, and
ON states. The evidence must include the raw GFF list/structure, label, type ID,
and value, plus a retail load/save call path covering the legal domain and an
out-of-domain value. Until then, no existing-instance `LightState` write is
admitted.

## PL-R02 — illumination API and recomputation

### Confirmed

- Retail `nwscript.nss` exposes `SetPlaceableIllumination`,
  `GetPlaceableIllumination`, and `RecomputeStaticLighting`.
- Its comments require recomputation after tile-light changes, placeable
  illumination changes, and adding or deleting lit placeables.

### Missing

- The engine handler/call path has not been recovered.
- State ownership, persistence across save/reload or Area transitions, timing
  before and after recomputation, and the affected object/geometry set are
  unknown.
- Existing Aurora Web route overrides are local preview controls, not native
  NWScript execution proof.

### Resume condition

Run an isolated accepted AUR-S07/NWN fixture with
`Get-before -> Set -> Get-before-recompute -> Recompute -> Get-after`, bound
captures at each stage, adjacent static/dynamic controls, save/reload and Area
re-entry. Pair it with engine handler xrefs. Until then, no runtime toggle or
recompute workflow is implemented.

## PL-R03 — Toolset `Use Area Lighting`

### Confirmed

- Toolset menu command `107` can be observed as
  `unchecked -> checked -> unchecked` and visibly changes the viewport.
- The setting is a Toolset preview state; the current evidence does not show an
  Area property write.

### Missing

- Existing images do not isolate whether the toggle affects placeables.2da
  lights, source-MDL lights, Toolset markers, or multiple classes.
- The historical captures are outside a current admitted proof profile.
- No decompiled command-handler path for menu command `107` was found.

### Resume condition

Capture an exact OFF/ON/OFF Toolset oracle containing separate 2DA-only,
MDL-light-only, hybrid, and no-light control fixtures with menu-state readback,
bound per-object captures, and deltas. Add a `WM_COMMAND 107` handler xref when
available. Until then, the toggle scope stays explicitly blocked.

## Implementation consequence

This iteration may harden source-MDL feature preservation and renderer
eligibility because those operations describe already-present source data. It
must not add GIT illumination writes, runtime illumination/recompute behavior,
or broaden `Use Area Lighting` semantics.


# VFX Lightning / P2P / Beam — Evidence & Gap Analysis

**Date:** 2026-06-17
**Author:** parity investigation pass (evidence-first, pre-code)
**Scope:** `aurora-web` VFX module — first focus effect: **P2P / Lightning / Beam**
**Mode:** Evidence → plan → acceptance → code (no code changes made yet)

---

## 0. Why this document exists

User report: "VFX in `aurora-web` look wrong vs real Aurora — a mass of errors."
This pass establishes *what is actually wrong*, backed by the Aurora Toolset
decompilation, before any code is touched.

**Source of truth (confirmed):** the Ghidra export in `C:\Projects\New Folder\export`
is the **Bioware Aurora Toolset** binary (`BiowareToolsetMutex`, `TOOLSETRED`
strings present). Since `aurora-web` is a web re-implementation of the toolset,
this is the correct authority for visual parity.

Supplementary: nwn.wiki emitter docs (field semantics only).

---

## 1. Reframing — this is not "buggy code", it is *guarded* code

The `aurora-web` VFX backend is already advanced, not broken-by-accident:

- `backend/src/modules/vfx/domain/aurora-mdl-vfx-source.parser.ts` parses the full
  emitter field set (velocity, particleRot, sizeStart/End, lightningScale, P2P
  bezier/gravity flags, controllers).
- `aurora-vfx-runtime-state.ts` already has runtime families
  `Continuous / Fountain / P2P / Lightning / Chunk` with `tickP2PRuntime` and
  `tickLightningRuntime`.

The catch: P2P, Lightning and Chunk are **deliberately frozen in "local
diagnostic" mode**, pending hard evidence. The code says so literally:

- `VFX_P2P_RETAIL_RUNTIME_DUMP_REQUIRED` — "Retail P2P target mapping and runtime
  tick dumps are still required before canonical parity can be promoted."
- `VFX_LIGHTNING...` — "Lightning active-point runtime is local diagnostic
  evidence only until retail target mapping and runtime tick dumps are supplied."

This matches the project's **Track B (retail-hard-confirm)** policy: shells exist,
canonical semantics are not locked until evidence closes.

**Conclusion:** the task is not "fix sloppy bugs". It is **promote the guarded
Lightning/P2P paths from diagnostic mode to canonical parity, using the toolset
decompilation as the evidence that was missing.** This is exactly why the user set
"Aurora decompilation" as the priority.

> Note: the older `nwn-last-city/Areas Generator 3d/Documentation/VFX_Diagnosis.md`
> (10-point list: 0.18 scale, missing particleRot, etc.) describes the **old Python
> pipeline**, not `aurora-web`. Most of those points are already handled in the
> `aurora-web` parser. It is useful as a field map, not as an `aurora-web` bug list.

---

## 2. Evidence collected from the decompilation

### 2.1 Lightning is a first-class emitter
- RTTI class string `LightningEmitter` @ `0x00a334d0` (and `LightningEmitter *` @ `0x00a26144`).
- Render-type token `LIGHTNING` @ `0x00c1085f` / `0x00c29daa`, emitted by the
  emitter property writer (decompiled ~line 211343 / 257692).

### 2.2 Lightning MDL fields (tokens present)
- `lightningDelay` (+`key`/`bezierkey`) @ ~`0x00cc7a10`
- `lightningRadius` (+`key`/`bezierkey`) @ ~`0x00cc7a82`
- `lightningScale` (+`key`/`bezierkey`) @ `0x00cc78a2`
- No `lightningSubDiv` token found → subdivision count is **not** an MDL field
  (likely fixed/derived in the render method — to confirm, see §4).

### 2.3 P2P / gravity / bezier fields (tokens present)
- `p2p_sel`, `combinetime`, `threshold`, `grav` (+`key`/`bezierkey`).
- Confirms P2P uses a gravity/bezier path model gated by `combinetime`/`threshold`.

### 2.4 Canonical animation-controller IDs (high-value)
From the ASCII property parser (decompiled ~line 884600+), the `uVar10` controller
ids per token:

| Token          | Controller id (dec / hex) |
|----------------|---------------------------|
| `fps`          | 128 / 0x80                |
| `particleRot`  | 160 / 0xA0                |
| `lightningScale` | **216 / 0xD8**          |
| `xsize`        | 196 / 0xC4                |
| `ysize`        | 200 / 0xC8                |

---

## 3. Cross-check against current `aurora-web` (concrete gaps)

### 3.1 Controller IDs — mostly VALIDATED ✅
`backend/.../aurora-mdl-vfx-source.parser.ts` defines:
`FPS=128`, `PARTICLE_ROT=160`, `SIZE_X=196`, `SIZE_Y=200` — **all match** the
decompilation. The parser's binary controller table is trustworthy.

### 3.2 GAP-1 — `lightningScale` binary controller (216 / 0xD8) is MISSING ⚠️
- The parser has **no** `AURORA_BINARY_CONTROLLER_EMITTER_LIGHTNING_SCALE = 216`
  constant and the controller `switch` (lines ~1705+) has no `case` returning
  `"lightningScale"`.
- `lightningScale` is handled only on the **ASCII** path (token map / `setNumber`).
- **Effect:** binary-compiled MDL lightning emitters lose their animated/keyed
  `lightningScale` → lightning bolt width is wrong/static for binary models.

### 3.3 GAP-2 — Lightning runtime is diagnostic-only ⚠️
`tickLightningRuntime` clears active particles unless a resolved target position is
injected, and emits `..._RETAIL_RUNTIME_DUMP_REQUIRED`. There is **no canonical
bolt geometry** (origin→target subdivision + perpendicular jitter scaled by
`lightningRadius`, width by `lightningScale`, regeneration by `lightningDelay`).
**Effect:** lightning renders as placeholder points, not a bolt.

### 3.4 GAP-3 — P2P runtime is diagnostic-only ⚠️
`tickP2PRuntime` requires an injected target pointer and emits local-diagnostic +
`..._RETAIL_RUNTIME_DUMP_REQUIRED`. The gravity/bezier path integration
(`grav`/`combinetime`/`threshold`/`p2pBezier2/3`) is not promoted to canonical.
**Effect:** P2P/beam effects render like a normal emitter instead of a point-to-point pull/beam.

---

## 4. Remaining evidence still required (one mining pass)

To lock **canonical** lightning render semantics I still need the
`LightningEmitter` render/update method body (vtable method, currently unnamed
`FUN_...`). It will give: subdivision count, jitter distribution vs
`lightningRadius`, segment width vs `lightningScale`, regeneration cadence vs
`lightningDelay`, and how the target/`LinkedTo` node is resolved.

Plan to locate it: find the `LightningEmitter` RTTI/type_info reference → vtable →
methods; corroborate with nwn.wiki lightning field semantics. (Same approach for
the P2P gravity-path integrator.)

---

## 5. Proposed implementation plan (TDD, incremental, Track-A safe)

Each slice = failing test first → implement → green → no regressions.

1. **Slice A — GAP-1 (parser, deterministic, Track A now):**
   add controller `216 → "lightningScale"` to the binary controller map + switch;
   unit test that a binary emitter with controller 216 yields a `lightningScale`
   timeline key. *Low risk, pure parser, evidence-closed.*

2. **Slice B — finish §4 evidence**, then promote `tickLightningRuntime` to a
   canonical bolt: deterministic subdivision + jitter(`lightningRadius`),
   width(`lightningScale`), regen(`lightningDelay`); feed `drawRecords`
   (`drawLane`) into `auroraVfxCanonicalRenderer`. Parity test against
   decompiled-derived fixture.

3. **Slice C — P2P gravity/bezier path** integrator promotion, same method.

4. **Slice D — verify:** backend unit/e2e + frontend vfx tests +
   relevant stryker/parity-gate; list what to re-check visually in the running app.

---

## 6. Open questions for acceptance

1. OK to ship **Slice A now** (parser controller 216 — fully evidence-closed, low risk)
   while I do the §4 mining pass for B/C?
2. For Lightning, do you have a **specific model/resref** that currently looks wrong
   in the app, to use as the parity fixture? (e.g. a beam/lightning placeable)
3. Confirm the visual target is the **toolset preview** look (not the in-game
   `nwmain` runtime), since the decompilation is the toolset.

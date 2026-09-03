# Aurora Web general current-state audit - 2026-07-14

## Verdict

Aurora Web has a substantial implementation and reverse-engineering foundation.
It is not yet a completed Aurora-parity editor or a completed VFX renderer.
The strongest current work is source-preserving infrastructure, targeted native
Toolset proof procedures, and a growing browser/runtime implementation. The
largest risk is not lack of code: it is a fragmented definition of what has
actually been proven in Aurora, in Aurora Web, or only by unit tests.

This report separates those states deliberately:

* **Implemented**: code and focused tests exist.
* **Native proved**: the real Aurora Toolset has a saved, validated artifact.
* **Web parity proved**: an Aurora/NWN oracle and an equivalent Aurora Web
  capture agree for the stated behavior.

Only the third state permits an Aurora Web parity claim. Most active features
are in the first or second state, not the third.

## Audit boundary

* Read-only Aurora reference: `C:\Projects\New Folder`.
* Editable implementation: `C:\Projects\aurora-web` on branch `dev`.
* This is a read-only audit of the current worktree. It does not rerun Aurora,
  NWN, browser fixtures, or automated tests.
* The worktree is deliberately not cleaned or reverted by this audit.

At audit time, the tracked worktree contains **79 changed files**, with
**17,740 additions** and **1,698 deletions**, plus a large set of untracked
scripts, documentation, fixtures, and evidence artifacts. The evidence root
alone contains **1,188 files** and approximately **252.7 MiB**. This is useful
work, but it must be packaged into bounded changes and indexed before it can
serve as a reliable project-state record.

## What exists today

| Capability family | Current assets | Honest status | Important boundary |
| --- | --- | --- | --- |
| Source/resource foundation | Backend modules for catalog, areas, tiles, VFX, sounds, processing, runtime settings, and authenticated source delivery; reverse documentation for GFF, 2DA, MDL, HAK, and precedence. | Implemented in meaningful slices. | The older executive reverse summary is from 2026-05 and cannot be used as a current completion board. |
| Native Toolset operating knowledge | Live-proof standards, action scripts, validators, function manifests, and saved native evidence for palette placement and selected transforms. | Native proved for the scoped scenarios. | This proves the Aurora oracle workflow, not automatically Aurora Web UI parity. |
| Areas and terrain | Area parser/writer, viewport, tile/area documents, camera work, light/shadow runner, and focused proofs. | Partial. | Tile mutation, group/features, properties, resize, environment, and universal save/reopen remain open by the own roadmap. |
| Objects, placement, and transforms | Placeable, creature, item, door, trigger, encounter, sound, merchant, and waypoint placement standards; some GFF readback/rollback work. | Native proof is strong for selected placement scenarios. | Properties, runtime behavior, cross-kind workflows, and Aurora Web parity remain mostly unproved. |
| Creatures, items, and placeable properties | Frontend feature surfaces and catalog/GFF work exist. | Partial implementation. | The roadmap still marks nearly all NPC property, inventory, equipment, item property, placeable script, appearance, and animation workflows open. |
| Rendering, models, lights, and placeables | Three runtime, model presentation, asset transport, source-MDL support, light/shadow work, and visual diagnostics. | Partial implementation. | A loaded asset or a generated GLB is not an Aurora visual-parity proof. |
| Sounds | Dedicated backend/frontend modules and preview work exist. | Partial implementation. | A common end-to-end source -> Toolset/NWN -> Web audible proof matrix is not established. |
| VFX | Source parser, runtime, render contract, Three adapter, fixture runners, saved NWN/Web artifacts, and dedicated diagnostics. | Implemented architecture with open parity defects. | See `vfx-full-decomp-gap-audit-2026-07-14.md`; no VFX family is canonical parity-complete. |

## Confirmed strengths

1. **Aurora-first evidence is present.** The repository explicitly separates
   `C:\Projects\New Folder` as the decompiled reference from Aurora Web as the
   implementation target. VFX, area, source-MDL, and Toolset documents preserve
   this boundary.
2. **The proof discipline has become much stronger.** Recent native Toolset
   artifacts use before/after state, readback, validators, clean closure, and
   targeted input rather than screen-only claims.
3. **The code has real contracts, not only mock screens.** Backend VFX runtime
   state, render contracts, source provenance, area GFF parsing/writing, and
   frontend payload routing are testable surfaces.
4. **Preview/canonical separation is explicitly discussed.** VFX guardrails
   correctly state that GLB, sprite, material, and preview output are not
   retail-parity evidence.
5. **Known failures have started to become artifacts.** The row-22 VFX report
   records the multi-wave, Chunk, coordinate, and proof-harness defects instead
   of calling the visibly divergent result complete.

## General gaps and technical debt

### G-01: No single machine-checked truth for feature status

The current documents cannot all be true at the same time.

* `aurora-toolset-usage-standards-roadmap-2026-07-14.md` reports 75 functions
  as `18 TAK`, `14 CZESCIOWO`, `42 NIE`, and `1 DO AUDYTU` in its summary.
* In the same roadmap, `AUR-S02-07` is later declared `TAK` by defining
  Copy/Paste as the semantic duplicate workflow.
* `stage2-completion-audit-2026-07-14.md` declares the same `AUR-S02-07`
  blocked and unaccepted because no native Duplicate action was found.
* `vfx-implementation-checklist.md` marks `VFX-P0` as `Done` in its summary
  but `InProgress` in its detailed section; it also omits `VFX-P7` from the
  summary despite a detailed `InProgress` section.

This is a P0 governance defect. A reader cannot determine whether a feature is
blocked, implemented, native-proved, or parity-proved without manually
reconciling multiple files.

### G-02: Native Toolset proof and Aurora Web proof are mixed too easily

The Toolset standards are valuable oracle evidence. They do not demonstrate
that the browser editor performs the same operation, persists the same state,
or renders the same result. Every tracker row needs separate fields for
`nativeOracle`, `webImplementation`, `webRuntimeProof`, and `visualParity`.

### G-03: The worktree is one large uncommitted integration batch

The current diff crosses area parsing/writing, catalog, VFX, Toolset automation,
frontend rendering, fixtures, tests, and evidence. That makes regressions,
review, rollback, and proof lineage difficult. The audit does not judge the
changes invalid, but their current packaging makes completion status harder to
trust.

### G-04: Evidence provenance is not fully indexed

There are real NWN MP4s, Web MP4s, screenshots, JSON summaries, manifests, and
validators. The global VFX retail manifest still lists all 10 cases as
`missing` or `unknown` with diagnostic claims even though row-22 and row-68
proof directories now exist. This may be correct for the strict canonical gate,
but the manifest does not expose the newer non-canonical comparison evidence.
The same lineage problem appears across Toolset standards and stage audits.

### G-05: Documentation hygiene is degrading operational truth

Several recent Polish documents render with mojibake, including the stage-2
audit and Toolset roadmap. The root `ARCHITECTURE_PHASE_READY.md` is dated
2026-05-21, names branch `architecture`, and points to an external
documentation root. It is historical context, not a current project charter.

### G-06: The broad product matrix remains incomplete

The current roadmap itself leaves major user-facing work open: creature
properties and behavior, item and placeable properties, Area construction and
persistence, logical-object runtime behavior, build/test-module flows, and
cross-feature regression/reproduction. These are capability gaps, not merely
documentation gaps.

## Recommended project order

1. **P0: establish one generated status registry.** Each feature must have a
   stable ID, owner surface, native evidence ref, Web evidence ref, validator
   result, implementation revision, and current classification. Existing
   prose roadmaps can remain explanatory, but the registry becomes the source
   of truth.
2. **P0: correct proof terminology everywhere.** Replace generic `done` with
   `implemented`, `native-proved`, `web-runtime-proved`, or `visual-parity-
   proved`. Migrate contradictory `AUR-S02-07`, VFX P0/P7/P12, and stale
   summaries first.
3. **P0: finish the VFX parity foundations.** Event ownership, coordinate
   transforms, native render-mode bases, full Chunk asset/collision semantics,
   proof camera, and fixture lineage are blocking visual VFX work.
4. **P1: close Area save/reopen and source-to-Web visual matrices.** Do not
   broaden Area editing from a single successful Toolset scenario into an
   Aurora Web parity claim before controlled browser proof exists.
5. **P1: take one object family end-to-end.** For example, placeable inventory
   or creature appearance should go source -> Web edit -> GFF write -> reopen
   -> native/readback -> browser screenshot before starting another property
   cluster.
6. **P2: split and commit the current work by capability.** Keep proofs next to
   their source change, retain one canonical latest comparison pointer, and
   archive superseded diagnostics without treating them as current proof.
7. **P2: repair document encoding and stale entry points.** Preserve historical
   notes but mark them as such; create a current in-repo project index.

## Completion rule

No feature should be called complete merely because code, a fixture, a preview,
or a native Toolset action exists. The required proof level must be chosen
before implementation:

* parser/contract feature: targeted source and contract test;
* persistence feature: source readback after reopen;
* runtime behavior: deterministic runtime artifact;
* visual parity: matched Aurora/NWN and Aurora Web capture plus an explicit
  list of remaining deltas.


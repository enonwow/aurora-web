# Placeable lighting implementation-plan scope

Date: 2026-08-17

## Decision

Create one ordered implementation plan for placeable lighting based on the
2026-08-17 agent audit. The plan defines separate gates for source/data
correctness, shared renderer architecture, existing-instance authoring,
runtime illumination behavior, shadows and LightManager semantics, automated
quality, and accepted Toolset/NWN proof.

## Aurora-first boundary

Confirmed source transport may be hardened without new retail research.
Unknown Aurora behavior must not be implemented from Three.js conventions or
existing preview heuristics. In particular, runtime illumination/recompute,
the exact `Use Area Lighting` scope, source-MDL shadow/flare behavior, fast
shadow pixels, and cross-lane active-slot precedence require targeted
Aurora/retail evidence before their implementation phase can start.

## Product boundary

Placeable lighting is a shared lighting concern, not a VFX-emitter feature.
Source-MDL lights may arrive in the canonical VFX package, but they must be
materialized by the same lighting core used by ordinary placeables.

`placeables.2da` light color/offset/shadow selection and MDL light-node fields
are appearance/model data. They remain read-only in the ordinary placeable
property editor unless a separate table/model-authoring feature is admitted.
Only a proven existing-instance illumination field may become writable.

## Proof boundary

Planning performs no Toolset or NWN action. Live completion requires a
versioned profile, exact immutable module/HAK/resource lineage, fixture
identities and positions, fresh accepted Toolset/AUR-S07 observations, and the
canonical validator. Old retired lighting capture helpers are not admissible.

## Deliverable

`backend/docs/aurora-reverse/placeable-lighting-implementation-plan-v1-2026-08-17.md`

## Scope verification update (2026-08-18)

The visual-parity correction remains inside the approved lighting/proof scope.
The implemented slice adds only an honest proof profile, receiver-material
classification, lane ablations, fail-closed capture metadata, and a debug-only
reactive receiver. It deliberately does not replace the production Area
receiver material or tune light/VFX/postprocess constants.

Runtime diagnosis confirms why that boundary matters: the exact Area route
contained one placeable point light and four visible receiver meshes, but all
four receivers used `MeshBasicMaterial`; zero receiver materials reacted to
the light. The debug receiver demonstrated that the Three.js point light can
produce an OFF/ON delta, but it is labelled and rejected as Area or retail
proof.

Production implementation remains blocked by `PL-R07` (exact admitted Area
receiver material/profile), followed by `PL-R08` for source-light energy and
falloff. Retail completion additionally requires the matched NWN oracle and
the remaining `PL-R09`/shadow gates. No FE-BE payload expansion was needed for
this proof slice.

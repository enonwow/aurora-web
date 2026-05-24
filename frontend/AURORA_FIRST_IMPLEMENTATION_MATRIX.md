# Aurora First Implementation Matrix

Status legend:
- `CONFIRMED`: behavior has hard evidence in decompiled/runtime notes.
- `PARTIAL`: behavior is mostly known but has unresolved edges.
- `UNKNOWN`: currently missing hard confirmation.

## Scope lanes

1. Placeables + Adjust Location + Visual Transform
2. Scripts + Properties tabs
3. VFX + Sound
4. Tiles + Tilesets + Groups
5. Doors + Transitions + Links
6. Area pipeline + Coordinates + Walkmesh

---

## 1) Placeables + Adjust Location + Visual Transform

Status: `PARTIAL`

Hard-confirmed:
- `Adjust Location` is explicit (`TDLGLOCATION`, caption `Adjust Position/Orientation`) with dedicated `Position` (`X/Y/Z`) and `Orientation` (`Bearing`) controls and handlers.
- `Visual Transforms` are in the same dialog surface (`Scale`, `Rotation XYZ`, `Translation XYZ`) with dedicated handlers.
- `Apply/OK/Cancel` are separate handlers (`bApplyClick`, `bOKClick`, `bCancelClick`).
- Situated instances read `X/Y/Z` from instance data and `Bearing` from stored value with degree conversion in UI path.
- Placeable precedence is `UTP -> GIT override`.
- `Static` is explicit (`xbStatic -> Static`).
- Supporting evidence appears in:
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\placeables\AURORA_RE_ADJUST_LOCATION_2026-05-18.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\placeables\AURORA_RE_PLACEABLE_OBJECT_PROPERTIES_2026-05-18.md`
  - `C:\Projects\New Folder\export\strings.tsv`
  - `C:\Projects\New Folder\export\functions.tsv`

Implementation rules:
- Keep `Adjust Location` as dedicated flow, not merged into generic inspector fields.
- Keep dual bearing input path: numeric + orientation panel drag.
- Preserve `Apply` (commit/no close), `OK` (commit/close), `Cancel` (revert dialog session).
- Keep `Static` as explicit render-time gate for visual transforms (preserve stored values, conditionally apply in rendering policy).

Open gaps:
- Exact serialization keys/shape for `Visual Transforms` in canonical GFF/GIT write path.
- Exact clamp/units for `Scale` and `Rotation XYZ`.
- Final undo granularity semantics for repeated `Apply`.
- Exact math/snapping behavior of orientation panel drag.

Regression tests:
- `Bearing` roundtrip: storage radians <-> UI degrees.
- `Cancel` restores pre-open snapshot for single and multi-selection edits.
- `Apply`/`OK` history semantics.
- `Static=true` ignores visual transform in renderer while preserving stored values.

---

## 2) Scripts + Properties tabs

Status: `PARTIAL`

Hard-confirmed:
- Placeable properties surface is the situated editor specialization with tabs: Basic/Lock/Trap/Scripts/Advanced/Description/Comments.
- High-confidence field mapping exists for core fields: `LocName`, `Tag`, `Appearance`, `Plot`, `Useable`, `HasInventory`, `Static`, `TemplateResRef`, `Faction`, `Conversation`, `AnimationState`, `Description`, `Comment`.
- Script slots are strongly mapped, including:
  - `OnClick`, `OnClosed`, `OnDamaged`, `OnDeath`, `OnHeartbeat`, `OnInvDisturbed`, `OnLock`, `OnMeleeAttacked`, `OnOpen`, `OnSpellCastAt`, `OnUnlock`, `OnUsed`, `OnUserDefined`.
- Main evidence:
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\placeables\AURORA_RE_PLACEABLE_OBJECT_PROPERTIES_2026-05-18.md`
  - `C:\Projects\New Folder\export\strings.tsv`
  - `C:\Projects\New Folder\export\functions.tsv`

Implementation rules:
- Use canonical storage script keys, not UI aliases.
- Keep precedence `Template/blueprint defaults -> instance overrides`.
- Preserve full tab contract even if some controls start as read-only/disabled in early implementation.

Open gaps:
- `Reflex Save` canonical key (`Ref` vs alternative spelling) still unresolved.
- `Treasure Model` exact storage mapping unresolved.
- `No Interrupt` polarity needs final roundtrip confirmation.
- `OnFailToOpen` visibility rules vary by surface and need runtime validation.

Regression tests:
- Script slots roundtrip snapshot for all scripted controls.
- Alias safety tests (UI label differences do not change stored key names).
- Lock/trap enable/disable control-state transitions.
- `TemplateResRef` retention across appearance changes.

---

## 3) VFX + Sound

Status: `PARTIAL`

Hard-confirmed:
- Sound positioning has three modes: everywhere, random-each-play, specific-position.
- Sound authoring surface includes distance min/max, random ranges, height/elevation, interval and interval variation, volume and pitch variation, play style/order, specific-hours scheduling.
- Editor viewport representation is consistent: glyph/anchor/attenuation guides and editor-only box overlays.
- VFX parser contracts are explicit for frame ranges and numeric profile policy (classic vs EE), including random-domain checks.
- Main evidence:
  - `C:\Projects\aurora-web\frontend\AURORA_SOUND_POSITIONING_PARITY.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\vfx\VFX_STATUS_AND_GAPS_2026-05-20.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\vfx\AURORA_VFX_RE_OBJECTIVE_REPORT_2026-05-18.md`
  - `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0745_encounter_sound_authoring_runtime_matrix.json`
  - `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-19_2317_vfx_frame_range_contract_matrix.json`

Implementation rules:
- Keep strict mode-gating for VFX numeric parsing (classic/EE policy split).
- Keep sound mode gating deterministic (`specific` must not degrade to random-box).
- Keep sound visualization editor-only where appropriate (do not serialize helper wireframes as runtime objects).

Open gaps:
- Retail runtime truth for several VFX behaviors remains open (exact blend math, sorting granularity, overflow/caps, detailed collision semantics).
- Sound/encounter runtime bindings remain partially uncovered in current reverse corpus.
- NWScript sound/encounter runtime mapping has stub-heavy zones.

Regression tests:
- Sound mode gating and random-box bounds tests.
- Sound attenuation and schedule behavior tests.
- VFX frame range and atlas bound tests under both profile policies.
- VFX parser whitespace/edge token test matrix.

---

## 4) Tiles + Tilesets + Groups

Status: `PARTIAL`

Hard-confirmed:
- Tile model resolution should be deterministic from chosen tileset (`Tile_ID -> Model`), not global first-match mixing.
- Orientation should be handled as rotation (`*90`) rather than side-label remapping.
- Height contributes to vertical placement through transition scaling path.
- Parser-level alias/canonicalization and duplicate protections are strongly covered.
- Main evidence:
  - `C:\Projects\ai-documentations\aurora-reverse\formats\tilesets\TILESET_STATUS_AND_GAPS_2026-05-20.md`
  - `C:\Projects\ai-documentations\aurora-reverse\formats\tilesets\AURORA_RE_TILESET_TNO01_V51_05_DECOMP_2026-05-18.md`
  - `C:\Projects\ai-documentations\aurora-reverse\reports\areas3d-audits\AREAS3D_RE_TILE_TILESET_AUDYT_2026-05-18.md`
  - `C:\Projects\ai-documentations\aurora-reverse\reports\areas3d-audits\AREAS3D_RE_AREA_TILESET_PIPELINE_AUDYT_2026-05-18.md`

Implementation rules:
- For each area, pin one authoritative tileset resolution source.
- Enforce structural validation (`width * height == tile_count`) and deterministic group parsing.
- Keep orientation logic strictly on transform rotation axis, not semantic renaming.
- Keep deterministic cache keys using tileset id, tile id, orientation, and height.

Open gaps:
- No hard, explicit retail rule set yet for `2x2 master cell` semantics.
- Full runtime proof for problematic neighborhood render/material precedence remains open.
- Some reported source-rule notes require sanitization before treating as normative.

Regression tests:
- Group count and geometry consistency tests.
- Corner/adjacency sentinel matrix tests (edge vs interior).
- Height transition tests across mixed neighboring tiles.
- Render parity capture tests for known problematic tile neighborhoods.

---

## 5) Doors + Transitions + Links

Status: `PARTIAL`

Hard-confirmed:
- Door transition field surface is known and should preserve:
  - `LinkedTo`, `LinkedToFlags`, `LoadScreenID`, `TransitionDestination`/`TransitionDestin`, `LinkedToModule`.
- Toolset UI control surface for link targets is confirmed (radio/button families and handlers).
- Alias divergence for destination keys exists in corpus and must be handled compatibly.
- Evidence:
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\doors\AURORA_RE_DOOR_KNOWLEDGE_BASE.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\are-git\DOOR_TRANSITION_FIELD_STATUS_MATRIX_2026-05-19.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\are-git\DOOR_TRANSITION_DEST_KEY_ALIAS_COMPAT_2026-05-20.md`

Implementation rules:
- Use preserve-only behavior for door transition payload semantics until retail confirmation closes.
- Do not hard-map `LinkedToFlags` enum semantics from UI labels.
- Accept known destination key aliases without destructive normalization.

Open gaps:
- Retail write path for `TransitionDestination`/`LinkedToModule` remains open.
- Retail runtime effect of `LoadScreenID` remains open.
- Significant ARE/GIT hard-confirm backlog remains unresolved.

Regression tests:
- Alias compatibility tests for transition destination fields.
- Parse boundary tests for transition numeric fields.
- Preserve-only roundtrip tests for door transition payloads.

---

## 6) Area pipeline + Coordinates + Walkmesh

Status: `PARTIAL`

Hard-confirmed:
- Retail ARE/GIT hard-confirm scoreboard remains mostly open (`HARD_CONFIRMED_RETAIL` is effectively not closed in current 20-question set).
- Walkmesh/pathing analysis coverage is broad in reverse package with explicit callflow decomposition and parser/scaffold contracts.
- Local walkmesh query contracts and tests exist in `cpp_impl` (mesh validation, height query, walkability line sampling, intra-tile/area path scaffolding).
- Evidence:
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\are-git\AURORA_RE_RETAIL_20_ANSWERS_SNAPSHOT_2026-05-18.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\are-git\RETAIL_ARE_GIT_STATUS_AND_GAPS_2026-05-20.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\walking\AURORA_BINARY_DECOMP_IMPLEMENTATION_GUIDE_WALKING_2026-05-20.md`
  - `C:\Projects\ai-documentations\aurora-reverse\runtime-behavior\walking\AURORA_BINARY_DECOMP_CALLFLOW_WALKMESH_MOVEMENT_MODELS_2026-05-20.md`
  - `C:\Projects\nwn-last-city\Aurora\reverse\cpp_impl\src\aurora\walking\*`

Implementation rules:
- Treat coordinate/orientation mappings as object-type-dependent (`Bearing` vs orientation vector forms), not globally uniform.
- Keep walkmesh queries deterministic and test-backed (strict invalid mesh guards, predictable sampling).
- Keep ARE/GIT integration conservative where retail proof is missing.

Open gaps:
- Global world-origin (`0,0`) parity against retail/toolset is not fully hard-confirmed from current evidence package.
- Exact retail sign conventions and axis interpretation need dedicated parity scenarios.
- IFO integration proofs in this narrowed lane remain incomplete.

Regression tests:
- Coordinate parity suite: known area fixtures with expected positions and bearings.
- Walkmesh height and line-walkability tests with invalid/degenerate mesh cases.
- Inter-area pathing scenario tests with deterministic tie-break behavior.

---

## Cross-lane decisions for aurora-web

Status: `ACTIVE`

- Use evidence-first policy: `CONFIRMED` behaviors can be implemented as canonical.
- Use preserve-only policy for unresolved semantics (especially ARE/GIT and door transitions).
- Keep compatibility aliases where corpus proves spelling divergence.
- Keep unknowns isolated behind explicit TODO/feature flags and regression tests.

## Final readiness

- Ready to implement now:
  - Placeable `Adjust Location` shell and core field mapping.
  - Placeable properties/scripts core roundtrip.
  - Sound positioning UI behavior and VFX parser policy contracts.
  - Deterministic tile/tileset parsing rules with strict validation.
  - Door transition preserve-only data layer.
- Must validate on retail first:
  - ARE/GIT hard-confirm backlog.
  - Door transition semantics (`LinkedToFlags`, `LoadScreenID`, destination/module write path).
  - Global coordinate-origin parity and full axis-sign conventions.
  - VFX full runtime rendering semantics (blend/sorting/overflow/collision details).

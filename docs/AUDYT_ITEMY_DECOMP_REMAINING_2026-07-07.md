# Aurora Web Items - decompilation remaining audit 2026-07-07

## Paths

- Decompilation/reference: `C:\Projects\New Folder`
- Editable web repo: `C:\Projects\aurora-web`

## Evidence checked

- `C:\Projects\New Folder\AUDYT_ITEMY.md`
  - item classes and UI anchors: `TNWItemTemplate`, `TNWItem`, `TNWItemInstance`, `TdlgItemEdit`, `TdlgItemWizard`, `TdlgItemGeneratorEdit`
  - data anchors: `BaseItem`, `TemplateResRef`, `PropertiesList`, `ModelPart1..3`, `ArmorPart_*`, material colors
  - inventory/equipment anchors: `ItemList`, `Equip_ItemList`, `InventoryRes`, `EquippedRes`, `RandomList`, `RandomResRef`
  - store anchors: `StoreList`, `WillNotBuy`, `WillOnlyBuy`
  - visual anchors: `baseitems.2da`, `CAPART`, `CloakModel`, `parts_*.2da`
  - property anchors: `itempropdef.2da`, `IPRP_*`
  - generator anchors: `TNWItemGeneratorTemplate`, `TNWItemGenerator`, `*.UTG`
- `C:\Projects\New Folder\item-retail-extract`
  - `extract-summary.json`: `2763` UTI, `75` ITP, `42` UTM, `597` 2DA, `22` type-2036 generator-ish sources
  - `utg\*.utg`: current extracted examples start with `LTR V1.0`, not `UTG V3.2`
  - `utm-summary.json`: `42` stores, `210` `StoreList` buckets, `4597` store item entries
  - `2da-summary.json`: `baseitems.2da`, `itempropdef.2da`, `IPRP_*`, `CAPART`, `CloakModel`, `parts_*.2da`
- Current repo audit/proof docs:
  - `docs/AUDYT_ITEMY_WEB_GAPS_2026-06-30.md`
  - `docs/AUDYT_ITEMY_WEB_REMAINING_2026-07-03.md`
  - `docs/AUDYT_ITEM_PROPERTIES_UTI_FIELD_MATRIX_2026-07-05.md`
- Current retained proof:
  - `frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/visual-source-coverage/26-item-visual-source-coverage-summary.json`
  - `frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/runtime-proof-v69-full-default/24-item-visual-matrix-summary.json`
  - `frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/runtime-proof-v70-source-blocked/24-item-visual-matrix-summary.json`
  - `frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/runtime-contact-sheet-v71/item-runtime-contact-sheet-v71.png`

## Current status by decompilation contract

| Contract area | Current status | Notes |
| --- | --- | --- |
| UTI / `TNWItemTemplate` core fields | Closed for current Web item flow | Native writer/parser covers identity, names/descriptions, flags, base/pricing/charges, model parts, armor parts, material colors, `PropertiesList`, scripts, comments, and LocString StrRefs. |
| `PropertiesList` / `itempropdef.2da` / `IPRP_*` | Closed for current Web item flow | Item property editor, dropdown chain, cost tables, cost/ILR proof, and serialized `PropertiesList` are implemented. |
| `baseitems.2da` metadata | Closed | Web uses base item metadata for item class, model type, icon/model source, slots, sizes, cost, stack/ILR, and store panel. |
| Visual assembly: `ModelPart*`, `ArmorPart_*`, `CAPART`, `CloakModel` | Closed for representative runtime matrix; stronger retail overlay remains optional scope | Current proof covers single item, three-part weapon, shield, armor, robe/cloak, potion/misc, and custom wizard armor across front/side/back/top-oblique. It is not a pixel-perfect retail Toolset overlay for every armor permutation. |
| Source-blocked/no-renderable items | Correctly gated | Full source sweep: `3160` items, `1183` unique visual signatures, `653` source-blocked, `0` Web bug candidates. These rows must stay explicit unsupported/unavailable, not placeholders. |
| `ItemList` / `Equip_ItemList` embedded item data | Closed for item subset in current creature/inventory contract | The UTC writer is intentionally narrow, but the supported item subset now has full round-trip proof for both inventory and equipment embedded items: LocString StrRefs, descriptions, comments, palette/tag/flags, base item, model parts, all armor parts, material colors, cost/charges/stack, `PropertiesList`, scripts, repo coordinates, equipment slot mask, and drop/pickpocket/infinite flags. It is not a full creature blueprint writer. |
| Placeable/container `UTP ItemList` embedded item data | Closed for current supported item subset | Placeable/container inventory now has full round-trip proof for embedded item structs with the same supported item field subset as UTC/UTM: LocString StrRefs, descriptions, comments, palette/tag/flags, base item, model parts, all armor parts, material colors, cost/charges/stack, `PropertiesList`, scripts, repo coordinates, and drop/pickpocket/infinite flags. |
| Area placed item `GIT ItemList` | Closed for current supported area item fields | Item placement writer/parser now has full round-trip proof for the supported item subset: LocString StrRefs, descriptions, comments, palette/tag/flags, base item, model parts, all armor parts, material colors, cost/charges/stack, `PropertiesList`, scripts, position, and bearing. Full untouched `.git/.are` parity for unsupported per-object fields is outside this item slice. |
| Stores / `UTM` / `StoreList` / `WillNotBuy` / `WillOnlyBuy` | Closed for current Web store flow | Module-backed store lifecycle and five-bucket store item flow are implemented. Embedded item data inside `StoreList.ItemList.Item` now round-trips through the same supported item field subset as standalone UTI/UTC inventory. Current retail extract has no non-module UTM source row to prove shadow-copy overwrite live. |
| ITP item palettes | Closed | `itempal`, `itempalstd`, custom palette writer, and Add-to-Area palette flow are implemented/proofed. |
| Item generator / `TNWItemGenerator*` / `*.UTG` | Open, source-gated | Decompilation proves the feature exists, but current extracted retail `*.utg` examples are `LTR V1.0`, not parseable `UTG V3.2`. Web correctly reports unsupported instead of faking a generator. |
| Native Toolset UI parity (`TdlgItemEdit`, `TdlgItemWizard`) | Web flow implemented; exact native clone is not fully claimed | Current Web has wizard/editor flows for item creation, model/parts, colors, properties, store/area placement, and source-backed overwrite. A pixel/behavior exact clone of every native dialog affordance would be a separate UX parity task. |

## Completion audit 2026-07-07

This objective is closed for the current available Aurora source set and current Web item subsystem scope:

| Objective requirement | Completion evidence |
| --- | --- |
| `UTG` item generator by real format/sample or explicit unsupported gate | Current `C:\Projects\New Folder\item-retail-extract\utg\*.utg` sources are `4/4` `LTR V1.0` lexicons and `0` GFF-style `UTG V3.2` candidates. Backend and frontend both expose explicit unsupported states, and the contract gate fails if a GFF-style `UTG` source appears before parser/serializer support lands. |
| Source-blocked visual rows without placeholders | Source coverage is `3160` items, `653` source-blocked, `0` Web bug candidates. UI suppresses fake cached/data-url/metadata-only thumbnails for warning-state rows. Runtime proof v70 confirms `x3_it_camp` is explicit unavailable with `hasImage=false` and `hasInventoryGrid=false`. |
| Fuller item parity in UTC/area/store where it belongs to the item subsystem | UTC `ItemList`/`Equip_ItemList`, UTP container `ItemList`, UTM `StoreList`, and area GIT `ItemList` all have full supported-item-subset round-trip tests. The contract gate now requires these proof tests/sources to remain present. |
| Runtime/contact-sheet proof after changes | v69 full item matrix, v70 source-blocked proof, and v71 contact sheet were generated after the no-placeholder thumbnail guard and harness reset fixes. The contract gate points at those durable `frontend/public` artifacts. |
| Documentation without fake success | This document keeps real external/source boundaries explicit instead of claiming pixel-perfect native Toolset parity, a real `UTG V3.2` parser, or renderable assets for source-blocked rows. |

## Future boundaries, not ordinary open Web-code gaps

## Progress 2026-07-07

- Added a durable remaining-contract gate:
  - `backend/scripts/check-item-decomp-remaining-contract.mjs`
  - `backend/test/unit/check-item-decomp-remaining-contract.spec.ts`
- The gate verifies the current decompilation-backed item closure state:
  - `C:\Projects\New Folder\item-retail-extract\utg\*.utg` is still LTR-only (`4` sources, `0` GFF-style `UTG V3.2` candidates), so the item-generator path must remain explicit unsupported.
  - Backend generator unsupported gate messages are present.
  - Visual source coverage remains `3160` items, `653` source-blocked, `0` Web bug candidates.
  - Fresh four-angle runtime visual matrix is `7/7` captured with `0` issue cases.
  - Fresh thumbnail readiness is `7/7` ready in the same runtime matrix.
  - Fresh source-blocked runtime proof covers `x3_it_camp` as an expected source issue with explicit `metadata-without-supported-asset` / `missing-source` / `Preview unavailable` evidence.
  - Fresh v71 contact sheet exists and includes the 7 default runtime cases across 4 angles (`28` real UI screenshots).
  - Frontend generator unsupported status is required by the gate: `Item Generator Unsupported` for the current LTR-only `*.utg` source set.
  - Frontend source-blocked visual status is required by the gate for both the item list and inspector: `Preview unsupported` / `Preview unavailable`, with explicit `data-visual-support-*` evidence.
  - Embedded item parity proof presence is required by the gate for UTC `ItemList`/`Equip_ItemList`, UTP `ItemList`, UTM `StoreList`, and area GIT `ItemList`.
- Frontend unsupported/source-blocked UI proof:
  - `frontend/src/modules/items/application/itemVisualSupport.ts` resolves explicit states for invalid-icon/no-model, empty delivered GLB, metadata without supported asset, and no visual source.
  - `frontend/src/modules/layout/components/ItemsModePanel.tsx` does not render a fake thumbnail when no real icon/model/captured preview exists; it also suppresses cached preview images and metadata-only GLB thumbnails for warning-state visual rows. It renders `Preview unsupported` or `Preview unavailable` status text with `data-visual-support-*` evidence instead.
  - `frontend/src/modules/layout/components/ItemsModeRightPanel.tsx` shows the same warning as an alert in the inspector.
  - Verification: `npm.cmd run test -- tests/unit/modules/items/itemVisualSupport.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/layout/ItemsModeRightPanel.test.tsx` in `frontend` -> `3` files, `26` tests passed. The run still emits existing React `act(...)` warnings in `ItemsModePanel.test.tsx`, but no assertion failed.
- Current proof report:
  - `.codex-tmp/item-proof-all/item-decomp-remaining-contract/item-decomp-remaining-contract-summary.json`
- Verification:
  - `npm.cmd run test:unit -- check-item-decomp-remaining-contract.spec.ts --runInBand` -> `1` suite, `2` tests passed.
  - `node backend/scripts/check-item-decomp-remaining-contract.mjs` -> `status=pass`, `failureCount=0`.
  - `npm.cmd run items:decomp-remaining-gate` in `backend` -> `status=pass`, `failureCount=0`.
- Fresh runtime/contact-sheet proof refresh:
  - Fixed the CDP capture harness filter reset in `backend/scripts/capture-item-visual-matrix-cdp.mjs`; custom wizard capture previously saw `New Item` disabled after an earlier filtered case.
  - Tightened the same harness again after v65 exposed a stale disabled `New Item` state; `waitForNewItemReady` performs a fresh `items_mode` navigation fallback before failing.
  - Tightened `clickButtonByText` so `New Item` can wait through delayed base-item readiness instead of failing on a transient disabled state.
  - Re-ran the full default runtime matrix into a durable public proof path:
    - `frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/runtime-proof-v69-full-default/24-item-visual-matrix-summary.json`
    - `7/7` cases captured, `0` failures, `0` issue cases.
    - Angles: `front=7`, `side=7`, `back=7`, `top-oblique=7`.
    - Thumbnail readiness: `7/7`, missing `0`.
  - Re-ran source-blocked runtime proof into a durable public proof path:
    - `frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/runtime-proof-v70-source-blocked/24-item-visual-matrix-summary.json`
    - `x3_it_camp` captured as expected source issue, `0` failures.
    - Explicit row support evidence: `metadata-without-supported-asset`, `missing-source`, `Preview unavailable`.
    - No placeholder thumbnail was rendered for the source-blocked row: `hasImage=false`, `hasInventoryGrid=false`.
  - Generated fresh runtime contact sheet:
    - `frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/runtime-contact-sheet-v71/item-runtime-contact-sheet-v71.png`
    - `28` real UI screenshots: `7` full-matrix cases x `4` angles.
  - Updated `backend/scripts/check-item-decomp-remaining-contract.mjs` so `items:decomp-remaining-gate` now requires the durable v69 runtime matrix, v70 source-blocked runtime proof, and v71 contact sheet by default.
  - Tightened the same gate so it now also verifies frontend generator unsupported UI and source-blocked visual UI/test evidence, including cached preview suppression and metadata-only GLB suppression.
  - Tightened the same gate again so it verifies embedded-item parity proof sources/tests for UTC, UTP, UTM, and area GIT paths.
  - Verification: `npm.cmd run test:unit -- capture-item-visual-matrix-script.spec.ts --runInBand` -> `1` suite, `1` test passed.
  - Verification: `npm.cmd run test:unit -- check-item-decomp-remaining-contract.spec.ts --runInBand` -> `1` suite, `2` tests passed.
  - Verification: `npm.cmd run test -- tests/unit/modules/items/itemVisualSupport.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/layout/ItemsModeRightPanel.test.tsx` in `frontend` -> `3` files, `26` tests passed. The run still emits existing React `act(...)` warnings in two wizard tests, but no assertion failed.
  - Verification: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts aurora-gff-area-parser.spec.ts --runInBand` -> `2` suites, `36` tests passed.
  - Verification: `npm.cmd run items:decomp-remaining-gate` in `backend` -> `status=pass`, `failureCount=0`, `sourceBlockedRuntimeCases=1`, `generatorFrontendGatePresent=true`, `visualUnsupportedFrontendGatePresent=true`, `embeddedItemParityGatePresent=true`.
- Store embedded item parity fix:
  - Found a real parser gap: `UTM StoreList -> ItemList -> Item -> PropertiesList` kept the list count but did not parse the nested property entries because the generic GFF parser depth cap stopped one level too early.
  - Fixed `backend/src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser.ts` by allowing one more nested list/struct level through `GFF_MAX_PARSED_NESTING_DEPTH`.
  - Added a full `UTM StoreList` embedded item round-trip test covering LocString StrRefs, descriptions, comments, palette/tag/flags, base item, model parts, all armor parts, material colors, cost/charges/stack, `PropertiesList`, and scripts.
  - Verification: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts --runInBand` -> `1` suite, `24` tests passed.
- UTC creature inventory/equipment item parity proof:
  - Expanded the `serializeCreatureInventoryToUtcGff` proof in `backend/test/unit/aurora-gff-template-parser.spec.ts`.
  - Covered both `ItemList.Item` and `Equip_ItemList.Item` embedded item structs with the full supported item subset: LocString StrRefs, descriptions, comments, palette/tag/flags, base item, model parts, every `ArmorPart_*`, material colors, cost/add cost/cost table/cost value, charges/stack, multiple `PropertiesList` entries, supported scripts, repo coordinates, slot mask, and drop/pickpocket/infinite flags.
  - Verification: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "full embedded item fields" --runInBand` -> `1` suite, `2` tests passed.
  - Verification: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts --runInBand` -> `1` suite, `24` tests passed.
- Placeable/container `UTP ItemList` item parity proof:
  - Added a full embedded item round-trip proof for `serializePlaceableBlueprintToUtpGff` in `backend/test/unit/aurora-gff-template-parser.spec.ts`.
  - Covered LocString StrRefs, descriptions, comments, palette/tag/flags, base item, model parts, every `ArmorPart_*`, material colors, cost/add cost/cost table/cost value, charges/stack, multiple `PropertiesList` entries, supported scripts, repo coordinates, and drop/pickpocket/infinite flags.
  - Verification: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "placeable inventory UTP" --runInBand` -> `1` suite, `1` test passed.
  - Verification: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts --runInBand` -> `1` suite, `24` tests passed.
- Area placed item `GIT ItemList` parity proof:
  - Expanded `backend/test/unit/aurora-gff-area-parser.spec.ts` so the placed-item writer/parser proof covers the full supported item subset instead of only a narrow armor sample.
  - Covered LocString StrRefs, descriptions, comments, palette/tag/flags, base item, model parts, every `ArmorPart_*`, material colors, cost/add cost/cost table/cost value, charges/stack, all supported item scripts, position, bearing, and multiple `PropertiesList` entries.
  - Verification: `npm.cmd run test:unit -- aurora-gff-area-parser.spec.ts --runInBand` -> `1` suite, `12` tests passed.
  - Verification: `npm.cmd run items:decomp-remaining-gate` in `backend` -> `status=pass`, `failureCount=0`.

## Retained ground-Item instance addendum — 2026-08-30

The earlier supported-field placement closure did not itself authorize edits
to native static `VisTransformList`. Primary Aurora ground-Item and common
visual-transform reader/writer decompilation now closes a narrower exact
retained-instance contract. Aurora Web admits physical absence or one
canonical non-default base-scope static list, performs full immutable-ordinal
CAS, and creates, replaces, or removes that list while preserving unrelated
GIT fields and paired GIC bytes. Legacy `VisualTransform`, animation,
multi-scope, malformed, aliased, default-present, and unsafe-range storage is
explicitly preserve-only.

The offline backend/frontend implementation and bounded tests are complete;
authority, admitted native shape, test evidence, and remaining guarded browser
plus Toolset/NWN gates are recorded in
`backend/docs/aurora-reverse/area-existing-item-static-visual-transform-audit-v1-2026-08-30.md`.
This addendum does not broaden the old item subsystem closure into a claim of
full Area Item or live native certification.

### P0 - source or format blockers

1. Real item generator parser/serializer/UI for `UTG`.
   - Why it remains: decompilation exposes `TNWItemGeneratorTemplate`, `TNWItemGenerator`, and `TdlgItemGeneratorEdit`, but current retail extracted `*.utg` files are `LTR V1.0`.
   - Acceptance: a real `UTG V3.2` sample or reconstructed binary/GFF contract, parser, serializer, UI, round-trip tests, and runtime proof.
   - Current correct behavior: `Item Generator Unsupported`, with no placeholder generator.

2. Source-authored no-renderable visual rows.
   - Why it remains: source coverage found `652` authored invalid-icon/no-renderable-model items plus `x3_it_camp` with no renderable model/icon source.
   - Acceptance: real asset source for those rows, or keep them explicitly unsupported/unavailable.
   - Current correct behavior: no fake thumbnails/models.

### P1 - broader Toolset parity scope

3. Full UTC creature blueprint writer.
   - Current state: item inventory/equipment payloads inside UTC are supported with full item-subset round-trip proof.
   - Remaining only if the target is full creature blueprint authoring, not item subsystem parity.

4. Whole-area `.git/.are` untouched-field parity.
   - Current state: area item placement writes and parses the full supported item field subset with a GFF round-trip proof.
   - Remaining only if Web must preserve/write every unsupported per-object Toolset field outside the current area model.

5. Pixel-perfect retail Toolset visual overlay for every armor/model permutation.
   - Current state: representative matrix and source coverage are green.
   - Remaining only if the acceptance bar becomes "every permutation matches a live Toolset oracle screenshot", not just "all known Web-renderable classes have no Web bug candidates".

6. Exact native `TdlgItemWizard`/`TdlgItemEdit` UX clone.
   - Current state: Web authoring/editor flow exists and covers item data fields that matter for the current item slice.
   - Remaining only if the UI must reproduce the native Aurora dialog flow one-to-one, including every native affordance beyond the current Web workflow.

### P2 - proof refresh / evidence debt

7. Live non-module UTM shadow-copy screenshot.
   - Current blocker: current runtime has only module-backed UTM rows (`42/42`), so source-only UTM overwrite can be unit/UI-decision proofed but not live-captured from a real source row.
   - Acceptance: add or find a non-module UTM source row, then capture create/edit/overwrite/shadow-copy proof.

8. Fresh current-run thumbnail/contact-sheet proof after any later CSS/component change.
   - Current state: refreshed on 2026-07-07 with durable v69 runtime matrix, v70 source-blocked proof, and v71 contact sheet after the latest no-placeholder thumbnail guard and capture harness changes.
   - Remaining only as a future maintenance rule: after additional thumbnail frame/layout changes, rerun the runtime capture/contact sheet and keep only failing screenshots if the sweep is clean.

## Bottom line

The decompilation-driven item objective is closed for the current source set and Web item subsystem scope. What remains is not an ordinary implementable Web-code item gap without new source data or a deliberately broader Toolset-parity target:

- `2` source/format blockers (`UTG`, no-renderable source rows),
- `4` broader Toolset-parity scopes,
- `1` live proof blocker (`non-module UTM` source row),
- `1` future refresh rule (rerun thumbnail/contact-sheet proof after later visual layout changes).

The important guardrail stays the same: source-blocked item rows and generator rows must stay explicit unsupported/unavailable until real Aurora source data exists. No placeholders.

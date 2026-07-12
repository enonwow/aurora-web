# Aurora Web Items - remaining implementation list 2026-07-03

## Runtime proof completed

- Item 3D preview now decodes real Aurora raw texture formats in `ItemModelPreviewPane`: `bmp`, `tga`, `dds`, `tpc`, `plt`.
- PLT preview receives item material palette rows for `metal1`, `metal2`, `cloth1`, `cloth2`, `leather1`, `leather2`.
- Proof runner uses real backend catalog/process data, not placeholder models:
  - `armor-aarcl009`: `17 / 17` model parts, `50` texture assets, `17` textured materials, `17` colored materials.
  - `shield-large`: `1 / 1` model parts, `2` texture assets, `1` textured material.
  - `single-part-torch`: `1 / 1` model parts, `7` texture assets, `6` textured materials.
  - `unsupported-creature-item`: `0` supported model parts, explicit unsupported state.
- Proof runner can now render a single case with `?case=...` and can consume a captured real backend fixture with `?fixture=...`. This avoids masking item-render bugs behind unstable browser-side login/catalog fetches while still rendering real processed model and texture URLs.
- Evidence:
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03/item-preview-proof-fullpage.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03/item-preview-proof-summary.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/armor-aarcl009-after-layout-proof.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/armor-aarcl009-after-layout-proof.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/shield-large-proof.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/shield-large-proof.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/single-part-torch-proof.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/single-part-torch-proof.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/unsupported-creature-item-proof-readable.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/unsupported-creature-item-proof-readable.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-after-armor-layout/item-preview-fixture-all-cases.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/armor-aarcl009-skeleton-preview-proof.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/armor-aarcl009-skeleton-preview-proof.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/shield-large-skeleton-preview-proof.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/shield-large-skeleton-preview-proof.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/single-part-torch-skeleton-preview-proof.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/single-part-torch-skeleton-preview-proof.json`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/unsupported-creature-item-skeleton-preview-proof.png`
  - `frontend/public/aurora-evidence/item-preview-proof-2026-07-03-skeleton-preview/unsupported-creature-item-skeleton-preview-proof.json`
- Main Items Mode process/cache path no longer reprocesses the same active item on every catalog page refresh once a processed object is cached. Evidence:
  - `frontend/public/aurora-evidence/items-mode-main-flow-2026-07-03/items-mode-aarcl009-stable-ready.png`
  - `frontend/public/aurora-evidence/items-mode-main-flow-2026-07-03/items-mode-aarcl009-stable-ready.json`
- Normal Items Mode can now deep-link/filter to a specific item with `itemQuery`. Exact selection prefers matching `id`, `resRef`, `tag`, or template id instead of blindly selecting the first backend search hit. Evidence:
  - `frontend/public/aurora-evidence/items-mode-main-flow-2026-07-03-after-item-query/items-mode-aarcl009-exact-ready.png`
  - `frontend/public/aurora-evidence/items-mode-main-flow-2026-07-03-after-item-query/items-mode-aarcl009-exact-ready.json`
- Items Mode background catalog fetch now reports `Loading more items...` once filtered results are visible, instead of implying the whole item list is still empty.
- Items Mode catalog loading now uses backend search when the filter is non-empty. This avoids blocking item search/preview behind the unstable full unfiltered `3160` item batch load.
- ItemPropertiesDialog armor preview layout now uses bounding-box humanoid chain assembly for body, leg, and arm chains, plus the same no-belt pelvis overlap used by the main renderer. This replaces the older fixed slot coordinate table for multi-part armor previews.
- ItemPropertiesDialog armor preview now uses the same synthetic `pmh0`/`capart.2da` anchor assembly mode as the main scene renderer when all armor attachment targets are covered. The proof reports `data-model-layout-mode=skeleton-anchors`.
- ItemPropertiesDialog `Colors` tab now has a retained runtime proof with the real `aarcl009` armor model in the dialog itself, not only the standalone item preview runner. Fixture tokens are refreshed through the live backend before asset loading, so retained fixture evidence no longer goes stale because of expired auth. Evidence:
  - `frontend/public/aurora-evidence/item-properties-dialog-proof-2026-07-05-skeleton-preview/item-properties-dialog-aarcl009-colors-skeleton-preview.png`
  - `frontend/public/aurora-evidence/item-properties-dialog-proof-2026-07-05-skeleton-preview/item-properties-dialog-aarcl009-colors-skeleton-preview.json`
- Latest ItemPropertiesDialog proof metrics for `aarcl009`:
  - `17 / 17` model sources loaded.
  - `50` texture sources, `17` textured materials, `17` colored materials.
  - `0` failed model parts and `0` failed textures.
  - `layout=skeleton-anchors`.
  - Color inputs captured as `Leather 1=5`, `Leather 2=7`, `Cloth 1=2`, `Cloth 2=3`, `Metal 1=17`, `Metal 2=8`.
- Latest skeleton-preview metrics:
  - Armor `aarcl009`: `17 / 17` model sources, `50` texture sources, `17` textured materials, `17` colored materials, `layout=skeleton-anchors`.
  - Shield `l_lshd_0`: `1 / 1` model source, `2` texture sources, `1` textured material, `layout=not-applicable`.
  - Single-part torch `nw_it_torch001`: `1 / 1` model source, `7` texture sources, `6` textured materials, `layout=not-applicable`.
  - Unsupported creature item `nw_it_creitemdr3`: `0` supported model sources, `canvasCount=0`, explicit `3D model unsupported`.
- Catalog-wide visual source coverage audit completed across all `3160` items:
  - `1207` unique visual signatures.
  - `0` web bug candidates after risky representatives were processed.
  - `653` source-blocked items, mostly authored invalid icon/model cases.
  - Evidence:
    - `frontend/public/aurora-evidence/item-visual-source-coverage-2026-07-03/item-visual-source-coverage-summary.json`
    - `frontend/public/aurora-evidence/item-visual-source-coverage-2026-07-03/item-visual-source-coverage-issues.md`
    - `frontend/public/aurora-evidence/item-visual-source-coverage-2026-07-03/item-visual-source-coverage-capture-cases.txt`

## Follow-up closure 2026-07-06

Reference source remains `C:\Projects\New Folder`; editable target remains `C:\Projects\aurora-web`.

- UTG/item-generator handling is now a hard gate, not a fake success path. `UTG ` files are classified as GFF candidates but remain unsupported until the parser/serializer is verified; the API reports parseable/support counters separately.
- Source-blocked items now carry explicit visual-support codes instead of placeholder thumbnails. Unsupported or invalid source rows are reported as source data problems, not as rendered fake assets.
- Non-module UTM/store rows now show whether they are module-backed or source-only, so edit/delete behavior does not pretend that a non-module source can be overwritten in-place.
- Shield/weapon/armor/single-part/potion/robe proof selection now uses exact ResRef matching plus hints, so the retained screenshots show the intended item instead of the first fuzzy catalog hit.
- Robe/cloak texture mapping was fixed without placeholders: cloak model parts such as `pmh0_cloak_007` derive the real `cloak_007` texture and also map Aurora's `cala_cloak` material alias when the model material does not expose the same texture name.
- Runtime proof now exposes the fallback/application/forced texture references in the item visual proof JSON for both normal model parts and armor parts.

Retained runtime proof:

- Summary: `.codex-tmp/item-proof-all/2026-07-06-summary-contract-proof-v25-full-default-four-angles-after-cloak-fix/24-item-visual-matrix-summary.json`.
- Result: `totalCases=7`, `capturedCases=7`, `failedCases=0`, `issueCaseCount=0`, `thumbnailReadiness=7/7`.
- Angles: `front=7`, `side=7`, `back=7`, `top-oblique=7`; `fullDefaultCaseSet=true`.
- Covered cases: `single-part-gem-nw-it-gem001`, `custom-wizard-armor`, `three-part-weapon-nw-wswmls002`, `shield-nw-ashlw001`, `armor-aarcl009`, `robe-cloak-l-cloak-0`, `potion-nw-it-mpotion002`.
- Retained PNG set is in `.codex-tmp/item-proof-all/2026-07-06-summary-contract-proof-v25-full-default-four-angles-after-cloak-fix/`.
- Front UI thumbnail proof after the armor orientation, thumbnail tint, captured-preview priority, and shield-direct fix: `.codex-tmp/item-proof-all/2026-07-06-v43-ui-row-thumbnails-extracted/v43-ui-row-thumbnails-contact-sheet.png`; source summary `.codex-tmp/item-proof-all/2026-07-06-front-thumbnail-proof-v43-shield-direct-armor-crop/24-item-visual-matrix-summary.json` reports `totalCases=7`, `capturedCases=7`, `failedCases=0`, `issueCaseCount=0`, `thumbnailReadiness=7/7`, `front=7`. Model-backed-only sheet: `.codex-tmp/item-proof-all/2026-07-06-v43-ui-row-thumbnails-extracted/v43-model-backed-contact-sheet.png`; 2D-source-icon-only sheet: `.codex-tmp/item-proof-all/2026-07-06-v43-ui-row-thumbnails-extracted/v43-2d-source-icon-only-contact-sheet.png`.

## Still intentionally outside this closure

- The all-3160 source coverage sweep is complete, but it is not a retained per-item pixel screenshot archive. Because the sweep found `0` web bug candidates, passing screenshots are disposable and retained proof focuses on representative visual classes plus future nonzero bug buckets.
- Armor assembly now has real textures, PLT palette colors, synthetic `capart` anchor layout, item dialog proof, and v25 four-angle runtime proof. It is still not a signed pixel-perfect retail overlay against a live Aurora Toolset oracle screenshot for every armor permutation.
- Multi-card proof pages can load more slowly than single-case proof pages because several WebGL canvases and raw texture decoders run in parallel. Keep final retained evidence as single-case or completed-matrix PNG/JSON files, and treat any all-cases screenshot captured while a card is still `loading` as disposable.

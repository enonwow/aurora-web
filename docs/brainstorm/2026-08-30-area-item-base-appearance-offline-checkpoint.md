# Area ground-Item BaseItem/appearance offline checkpoint

Date: 2026-08-30

## Scope verification

This checkpoint closes the offline implementation slice for editing an
existing ground Item's `BaseItem` and the complete Aurora appearance vector
selected by the effective `baseitems.2da` row. It stays inside the Area CRUD
program and does not activate unrelated Item fields, Docker infrastructure,
runtime services, Toolset authoring, or visual proof.

The implementation uses the already documented Aurora reader/writer evidence
and the additive FE-BE contract. No GPL source was inspected or used.

## Delivered behavior

- exact module -> ordered HAK -> vanilla `baseitems.2da` authority;
- digest/row-count-bound immutable source provenance;
- complete discriminated `ModelType` profiles `0..3`;
- atomic compare-and-swap projection, native write, and candidate readback;
- strict frontend HTTP validation and detached cloning;
- fail-closed Area-scene binding for stale or row-incoherent provenance;
- renderer-facing projection of the exact target appearance;
- retained-Item Base Item selector populated from the effective table;
- per-`ModelType` activation of model-part, armor-part, and color controls;
- cross-profile clearing of old fields and Apply/OK blocking until complete;
- local draft/history preservation of immutable provenance and editable target.

## Offline evidence

Focused backend suites for the effective table, appearance domain, parser,
projector, paired writer, candidate compiler, snapshot repositories, cache,
and application services pass. The backend production build passes.

Focused frontend suites pass 831 assertions across the new domain helper,
HTTP adapter, Area-scene mapper, local draft boundary, scene-object clone,
draft materialization, Item dialog, and App-level regression smoke. The
frontend production build passes.

All checks used one bounded process with one test worker and a 1 GiB Node heap.
No Docker command, watcher, development server, browser, capture, Toolset, or
NWN process was started.

## Remaining release gate

Offline completion is not visual release proof. A later coordinated live lane
must still prove Apply -> Save -> reopen in the browser, packed GFF readback,
Toolset Save/Build/reopen, NWN inspection, and the independent fresh tile
render/connectivity capture required by the Area authoring program.

# Item blueprint `VarTable` audit v1

Date: 2026-08-30  
Status: **offline implementation complete; live proof pending**

## Scope

This audit closes native `VarTable` authoring for Item blueprint UTI
create/update and the Items-mode wizard. It reuses the exact common Item
variable grammar already implemented for retained type-`0` Area ground Items.
It does not add Item event scripts, change retained-object CAS, or authorize
unknown variable types.

## Primary Aurora authority

The primary source is the frozen Aurora Toolset decompilation:

- `C:/Projects/New Folder/export/decompiled_all.c`;
- SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- common Item reader `FUN_00604db8`, beginning near line 299920;
- common Item writer `FUN_00605b0c`, beginning near line 300282;
- UTI wrapper writer `FUN_00648ec8`, beginning near line 337710;
- generic variable reader/writer `FUN_005e966c` / `FUN_005e9f50`.

The common Item reader delegates its member at byte offset `0x40` to the
generic variable reader after the appearance and `PropertiesList` fields. The
symmetric common writer delegates the same member to the generic writer. The
UTI wrapper invokes the common writer before adding UTI-only `PaletteID` and
`Comment`; therefore `VarTable` is part of the native UTI Item payload.

The exact grammar is the already independently frozen Item-variable profile:

| member | native type |
|---|---|
| root `VarTable` | List |
| entry struct | type `0` |
| `Name` | CExoString |
| `Type` | Int (`1`, `2`, or `3`) |
| `Value`, `Type=1` | Int |
| `Value`, `Type=2` | Float |
| `Value`, `Type=3` | CExoString |

Physical order and duplicate names are state. An empty in-memory table is
written by omitting `VarTable`. The native Item window exposes
`Variables...`; it does not establish Item event-script slots. No xoreos or
other GPL source was read or used.

## Additive contract v1

Item blueprint create/update may add optional `variableListEntries`:

```text
[
  {name, type: "int", value: signed-int32},
  {name, type: "float", value: exact-finite-binary32},
  {name, type: "string", value}
]
```

The contract is exact and ordered. Entries contain no unknown keys. Names are
NUL-free and at most 64 ECMAScript code units. String values are NUL-free and
at most 4096 code units. The list contains at most 1024 entries and the
aggregate name plus string-value budget is 1 MiB. No trimming, sorting, case
folding, deduplication, numeric coercion, or type fallback is allowed.

Omitted or empty `variableListEntries` produces no `VarTable`. A non-empty
list serializes one canonical native list and must parse back to the exact
ordered typed vector. The catalog response exposes `variableListCount` and a
JSON `variableListEntries` metadata value so an Items-mode scene object can be
reopened without losing variables.

The frontend keeps a detached ordered `itemProperties.variables` target. The
Variables editor is `ACTIVE_NOW` for an Items-mode wizard blueprint and for an
independently admitted retained ground Item. Wizard Apply/OK materializes the
validated target, and the create/update port publishes it. Invalid targets do
not produce a blueprint request.

## Budgets, diagnostics, and compatibility

The optional request member remains below the existing endpoint body budget;
there is no new endpoint, API-major version, binary body, streaming, or
chunking behavior. Existing authentication, authorization, idempotency,
overwrite, optimistic-storage, and response contracts remain unchanged.

Validation errors use the existing request-validation path. Serializer and
mapper tests provide exact local diagnostics. Telemetry may expose only the
contract revision, bounded stage, outcome, stable reason, entry count, and
duration. Names, values, ResRefs, object keys, paths, raw fields/bytes,
credentials, and host paths are prohibited from telemetry labels.

Compatibility parsers may preserve unsupported or malformed variable storage
for inspection, but it is not mutation authority. The complexity budget is
one shared backend Aurora variable validator, one shared catalog GFF field
builder, additive backend/frontend DTO members, existing wizard/editor wiring,
and focused tests; no new service or adapter family is permitted.

## Implemented offline result

The backend now uses one canonical Aurora variable validator from
`src/common/aurora/variable-table`. The retained-Area import remains a stable
re-export, while catalog HTTP validation and the native GFF writer use the
same exact target grammar. UTI and embedded common-Item serialization emit
`VarTable` after `PropertiesList`; omitted and empty targets emit no list.
The GFF parser now preserves raw CExoString payloads before field-specific
interpretation, preventing whitespace loss in variable names and string
values while existing consumers retain their own explicit normalization.

Item create/update carries the exact list into serialization, parses it back,
and exposes `variableListCount` plus JSON `variableListEntries` metadata. The
Items-mode scene mapper restores a detached typed vector. The Item properties
dialog admits the same editor for `itm_wizard_*` blueprints and for separately
proven retained ground Items. Add, edit, reorder, remove, materialization, and
payload publication all fail closed on an incomplete target. Item script
fields remain excluded.

Accepted sequential verification is `71/71` focused bounded backend
assertions, `63/63` focused frontend assertions, `13/13` capability-catalog
assertions, and both production builds. Every runner used one worker and the
one-GiB Node heap ceiling. One unrelated pre-existing assertion in the full
`catalog.application.service.spec.ts` file expects an animation event without
its newly present `sourceModelHash`; the exact Item lifecycle test was rerun
with a name filter and passed. It is not accepted as a VarTable failure.

No Docker command, container, service, watcher, browser, Chrome launch,
capture, live Toolset/NWN process, mutation test, sub-agent, xoreos source, or
other GPL source was used. Fresh guarded browser create/update/reopen, exact
candidate Toolset Save/Build/reopen, packed-resource readback, and applicable
NWN inspection remain release evidence, not offline completion evidence.

## Completion criteria

- strict request tests cover the three types, ordering/duplicates, exact
  binary32 validation, unknown keys, NULs, and aggregate budgets;
- UTI writer and parser round-trip tests prove exact list labels, GFF types,
  struct ids, omission for empty input, and typed ordered readback;
- catalog update/readback includes the variables without script publication;
- frontend editor, materializer, payload, and catalog mapper tests prove
  create/update and reopen behavior without mutating retained provenance;
- focused one-worker tests and both production builds pass under one GiB;
- fresh browser and Toolset Save/Build/reopen proof remains a separate release
  gate.

# Existing Area Creature `WalkRate` audit v1

Date: 2026-08-28  
Status: static source-closed; implementation and live release proof pending

## Decision

Aurora Web may expose the exact existing `WalkRate : Int` field of one
retained type-`4` Area GIT Creature only as a catalog-bound compare-and-swap
mutation. The stored identity is the physical row ordinal of the one effective
complete `creaturespeed.2da`. Localized text, `Label`, `2DAName`, `WALKRATE`,
`RUNRATE`, and the current frontend strings are presentation or lookup data,
not persistence authority.

When exact `WalkRate` storage is absent, the native reader derives an effective
row by matching the Creature Appearance row's `MOVERATE` token against
`creaturespeed.2da` column `2DAName`. That derived value is presentation-only:
it does not authorize Aurora Web to synthesize the missing GFF field.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |
| retail `TDLGCREATUREEDIT` RCDATA payload | `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e` |
| retail `creaturespeed.2da` from `nwn_base.key` | `6f9ba6ecfb2e814c1b5fadf6c9717abb9560bdb6a7e2994001c023b2d19a9cef` |
| retail `appearance.2da` from `nwn_base.key` | `815c0b3bce0895e9f17d4b92cb02a6d34366267b5a4b9081dece0f4eee7d7a1a` |
| retail English `dialog.tlk` | `1d6da70e0659e411012b44f956a093cc8fb61aed3b9355198ba42eb17e0649c9` |
| retail Polish `dialog.tlk` | `57ad772de605f0f13aebe63c6491ca65d76cce206b139eaa018350a9a5aea764` |

The inspected Creature-editor RCDATA is the 52,662-byte `TPF0`
`TDLGCREATUREEDIT` resource at RVA `0x00AE4698`. Direct extraction places it at
file offset `0x009DDC98`. No xoreos or other GPL source was inspected or used.

## Native GFF closure

The common Creature reader `FUN_00532174` reads exact case-sensitive label
`WalkRate` through `FUN_00aeeed8` at decompiled lines `194563-194564` and stores
it at Creature offset `+0xec`. The helper requires native GFF type id `5`, the
four-byte signed `Int`. An absent field returns default `0` and reports absence
through the reader's presence output.

When that presence flag is false, lines `194565-194708` read `MOVERATE` from
the Creature's selected physical row in `appearance.2da`, iterate
`creaturespeed.2da` from physical row `1`, compare exact `2DAName` tokens, and
store the matching physical row ordinal as the effective value at `+0xec`.
This fallback is a load-time derivation and does not prove native storage.

The common Creature writer `FUN_0053521c` writes exact label `WalkRate` through
`FUN_00aefecc` at decompiled line `195226`. The helper creates GFF type id `5`
and writes four bytes. The placed-Creature reader `FUN_0053ab24` delegates to
the common reader and the placed-Creature writer `FUN_0053ae80` delegates to
the common writer. The paired GIC record does not own this field and must
remain byte-identical for a `WalkRate`-only mutation.

Runtime use corroborates, but does not broaden, this contract. The runtime
loads `creaturespeed.2da`, reads row `0` `WALKRATE` as a baseline, resolves the
Appearance `MOVERATE` token through `2DAName` for the default path, or indexes
the table directly by stored `WalkRate`. This proves row identity and lookup;
it does not authorize inferred movement mechanics in the web editor.

## Toolset selector closure

The Creature editor RCDATA names visible group `Speed`, label `Movement Rate`,
and ComboBox `cbMovementRate`. The ComboBox is at form offset `+0x648` and has
no adjacent owned change handler.

Population routine `FUN_0045a5e0` obtains Aurora global 2DA slot `4`, clears
the ComboBox, and iterates every physical `creaturespeed.2da` row in order. It
reads exact column `Name`, resolves each positive StringRef through the current
talk table, adds the localized label, and attaches the physical row ordinal as
item data. Retail row `0` has `Name=****` and is omitted; retail rows `1..8`
all have positive `Name` StringRefs and are added in physical order.

Dialog load `FUN_0044b110` selects ComboBox index `stored WalkRate - 1`. Dialog
save/apply `FUN_0044d360` writes `selected ComboBox index + 1` to Creature
offset `+0xec`. It does not write the attached item data. Therefore exact
Toolset parity requires this positional invariant:

1. physical row `0` is not selectable because `Name` is absent or `****`;
2. every physical row `1..rowCount-1` has one usable positive `Name` StringRef;
3. no intermediate physical row is omitted, reordered, or duplicated;
4. ComboBox position plus one consequently equals the physical row ordinal.

A malformed or holed stronger override can make native UI position drift away
from its attached row data. Aurora Web must fail closed for retained editing
instead of silently repairing or reinterpreting that native behavior.

## Retail table and TLK evidence

The retail table header is:

```text
Label  Name  2DAName  WALKRATE  RUNRATE
```

| Int/physical row | Label | `Name` | `2DAName` | `WALKRATE` | `RUNRATE` | English | Polish |
| ---: | --- | ---: | --- | ---: | ---: | --- | --- |
| 0 | `PC_Movement` | `****` | `PLAYER` | 2.00 | 4.00 | not selectable | not selectable |
| 1 | `Immobile` | 2319 | `NOMOVE` | 0.00 | 0.00 | `Immobile` | `Bezruch` |
| 2 | `Very_Slow` | 2320 | `VSLOW` | 0.75 | 1.50 | `Very Slow` | `Bardzo mała` |
| 3 | `Slow` | 2321 | `SLOW` | 1.25 | 2.50 | `Slow` | `Mała` |
| 4 | `Normal` | 2322 | `NORM` | 1.75 | 3.50 | `Normal` | `Normalna` |
| 5 | `Fast` | 2323 | `FAST` | 2.25 | 4.50 | `Fast` | `Duża` |
| 6 | `Very_Fast` | 2324 | `VFAST` | 2.75 | 5.50 | `Very Fast` | `Bardzo duża` |
| 7 | `Default` | 6614 | `DEFAULT` | 0.00 | 0.00 | `Default` | `Domyślne` |
| 8 | `DM_Fast` | 6893 | `DFAST` | 5.50 | 11.00 | `DM Fast` | `Duża (MG)` |

Retail `appearance.2da` contains exact column `MOVERATE`; physical row `0`
uses token `NORM`, which resolves to physical `creaturespeed.2da` row `4`.
These rows and labels describe the inspected retail resources only. The
current module's effective resource remains authoritative.

## Frozen implementation contract

Area detail preserves exact storage and its optional binding:

```ts
type CreatureWalkRateStorage =
  | {
      present: false;
      effectiveValue?: number;
      fallback?: {
        appearanceRowIndex: number;
        moveRateToken: string;
        speedRowIndex: number;
        speed2daName: string;
      };
    }
  | {
      present: true;
      nativeType: "int";
      value: number;
      table?: {
        resourceName: "creaturespeed.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
        rowIndex: number;
        twoDaName: string;
      };
    };
```

The missing-field fallback additionally binds the selected physical Appearance
row and the independently resolved effective `appearance.2da` descriptor.
Those values explain presentation but never make `{present:false}` editable.

Effective resource precedence is one complete first hit in module, ordered
HAK, then vanilla order. Rows are never merged. A stronger present but
malformed resource blocks weaker fallback. Each 2DA input is limited to
64 MiB and at most 1,000,000 physical rows.

Retained mutation is admitted only when all of these conditions hold:

- exact `aurora_git` Creature family and non-negative immutable ordinal;
- one exact case-sensitive `WalkRate:Int` source member;
- a complete current `creaturespeed.2da` satisfying the positional invariant;
- source and target physical rows in `1..rowCount-1`, both with usable positive
  `Name` and stable table identity;
- exact catalog digest and physical row count still match at compilation;
- source and target are distinct and the source Int still equals the expected
  value on ordinal reparse.

The frontend writable identity is numeric
`creatureProperties.advancedSettings.walkRateId`. Any string movement-rate
label remains derived presentation. A changed target projects:

```json
{
  "kind": "creature",
  "sourceIndex": 0,
  "walkRate": {
    "expectedValue": 7,
    "value": 4,
    "tableSha256": "<exact creaturespeed.2da sha256>",
    "rowCount": 9
  }
}
```

The authenticated additive endpoint is
`GET /api/v1/catalog/creatures/walk-rates`. It returns a bounded, digest-bound
view of physical rows `1..rowCount-1`, including numeric row identity and
bounded localized presentation. Candidate compilation must independently
re-resolve the strongest resource and reject source, digest, row-count,
positional-invariant, or target drift before one-field Int replacement and
complete-candidate readback.

The endpoint remains within the existing API-v1 JSON envelope and
authentication/authorization contracts. It adds no binary body, pagination,
streaming, or chunking change. Normal diagnostics may expose only contract
revision, Creature family, bounded stage, approved reason code, source layer,
and duration. Values, row numbers, object IDs, hashes, paths, source keys, raw
bytes, credentials, and localized labels are excluded from metric labels.

## Explicit exclusions

- Missing, duplicate, aliased, wrong-case, wrong-type, non-canonical,
  malformed, stale, or unbound storage remains visibly `PRESERVE_ONLY`.
- Aurora Web does not create or remove `WalkRate` in a retained Creature.
- `MOVERATE` fallback is presentation only and cannot authorize mutation.
- `WALKRATE` and `RUNRATE` floats are not independently editable in this slice.
- Arbitrary Creature-template creation and runtime movement behavior remain
  outside this retained-placement property mutation.

## Implementation and completion boundary

The source authority and additive contract are closed. Implementation is not
yet claimed by this audit. Required offline closure includes TDD coverage for
effective-table precedence and malformed-stronger blocking, positional
invariant admission, exact storage/type provenance, catalog transport, detached
frontend state, reducer/materializer guards, fresh compilation, Int-only CAS,
candidate readback, paired-resource preservation, transactional publication,
and capability/program documentation.

Release additionally requires a separately coordinated fresh guarded browser
Apply/Save/reopen proof, exact-candidate Toolset Save/Build/reopen with packed
`WalkRate:Int` readback, and NWN runtime inspection under the proof-capture
safety contract. Live proof is currently `missing`; no completion claim may be
made from this static audit.

## Resource/process statement

This audit used read-only decompilation, PE/RCDATA inspection, retail KEY/BIF
resource extraction, and read-only TLK parsing. The installed Toolset
executable was never started. No Docker command, container, service, watcher,
browser, Chrome, capture, Toolset/NWN process, mutation test, xoreos source, or
other GPL source was used.

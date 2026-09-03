# Existing Area Placeable `Faction` audit v1

Date: 2026-08-19
Status: source-closed; offline implementation verified; browser, Toolset, and NWN recertification pending

## Scope

This audit closes the bounded mutation contract for one canonical
`Faction : DWord` member of one retained type-`9` Area GIT Placeable and its
binding to one physical faction ordinal in the exact module `repute.fac`. It
does not authorize mutation of faction names, parents, global flags,
reputation values, creature factions, encounter factions, `Tag`, renderer
identity, or any other object family.

## Primary Aurora and retail evidence

The primary code source is the local Aurora Toolset decompilation
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
The independently retained Toolset executable fingerprint is SHA-256
`4C15D74CE86AE3069FA2F8AFC8F3737179D6484BC991B460361D1260AA400F24`.
No xoreos or other GPL source was consulted.

Aurora's Placeable reader `FUN_0063ae68` calls the native DWord reader
`FUN_00aeee7c` with the exact label `Faction` and stores the value in the
Placeable member at index `0x18`. The paired writer `FUN_0063b8a0` calls the
native DWord writer `FUN_00aefe60` with the same member and label. This closes
the serialized type and label without inference from UI text.

The Toolset faction loader `FUN_0049e17c` opens resource type `0x7f6` (`fac`)
with resource name `repute`. It obtains the root `FactionList`, walks it in
physical list order, and reads exact `FactionName : CExoString`,
`FactionParentID : DWord`, and `FactionGlobal : Word` fields. The physical list
ordinal is passed as the faction ID. It then requires `RepList` and reads exact
`FactionID1 : DWord`, `FactionID2 : DWord`, and `FactionRep : DWord` fields.
The serializer `FUN_0049e5a0` writes the same two lists and members.

An independently retained module companion
`output/proof/tile-path-connect-native-2026-08-19/runtime-harness/crashed-temp0-2026-08-19T0106/repute.fac`,
SHA-256
`9DA73C70D0CA712FD6D324A66AC50C1D08C1EF207747554A45B35DF083CF0510`,
is a 1,889-byte `FAC `/`V3.2` GFF with root type `0xffffffff`. Its physical
factions are `0 PC`, `1 Hostile`, `2 Commoner`, `3 Merchant`, and `4 Defender`;
all have parent `0xffffffff` and global Word `1`. Its 20 directed reputation
entries use the exact three DWords and values `0`, `50`, or `100`. This corpus
confirms the decompiled loader contract with a real Toolset-produced resource.

## Admitted product profile

The v1 editor admits only an existing `Faction` field occurring exactly once
with native GFF type `DWord`, plus one exact module companion named
`repute.fac`. There is no HAK/vanilla precedence or row merging for this
module-owned resource. The file must be at most 16 MiB, be exact `FAC `/`V3.2`,
have root type `0xffffffff`, and contain exactly one `FactionList` and one
`RepList` with no parser errors.

`FactionList` contains `1..1024` structures in physical order. Each structure
must have exactly one `FactionName : CExoString`, one
`FactionParentID : DWord`, and one `FactionGlobal : Word`. A name is preserved
verbatim, contains `1..256` ECMAScript code units, and contains no U+0000. A
parent is either `0xffffffff` or a valid physical faction ordinal. Global is
exactly `0` or `1`. The structure type ID must equal the physical ordinal.

`RepList` is required for Aurora-loadable authority even though this slice does
not mutate it. It contains at most `factionCount * factionCount` structures.
Each has exactly one DWord for `FactionID1`, `FactionID2`, and `FactionRep`;
both IDs must exist, reputation is `0..100`, and directed `(ID1, ID2)` pairs
are unique. Any malformed field, duplicate, extra key, broken parent, invalid
reputation, unsupported count, or wrong type fails the catalog closed.

Area detail carries one optional shared digest-bound catalog:

```json
{
  "descriptor": {
    "resourceName": "repute.fac",
    "sourceObjectKey": "<immutable module object key>",
    "sha256": "<64 lowercase hex>",
    "sizeBytes": 1889,
    "factionCount": 5
  },
  "rows": [
    {
      "factionId": 0,
      "name": "PC",
      "parentFactionId": 4294967295,
      "isGlobal": true
    }
  ]
}
```

Area placement storage records exact present/absent native DWord provenance.
The immutable frontend provenance contains the exact source DWord plus catalog
digest and faction count. The editable target is numeric
`placeableProperties.advancedSettings.factionId`; displayed
`belongsToFaction` is derived from the selected catalog row and is never the
serialized identity.

The optional backend mutation pair has exactly:

```json
{
  "expectedValue": 2,
  "value": 3,
  "catalogSha256": "<64 lowercase hex>",
  "catalogFactionCount": 5
}
```

It is emitted only for a changed admitted physical ordinal. Unknown or
missing keys, invalid DWords, unsupported IDs, stale digest/count/value,
absent or duplicate fields, wrong native type, unchanged values, wrong
family/ordinal, and deletion collision fail closed.

## Write, preservation, and diagnostics contract

Planning reparses the exact retained Placeable ordinal and canonical DWord.
Compilation re-resolves the exact current `repute.fac` descriptor, validates
the complete catalog, and requires both expected and target physical IDs to
exist. Writing replaces only `Faction : DWord`, verifies full readback,
preserves every sibling GIT field, and preserves the paired GIC and
`repute.fac` bytes exactly. It never writes a name or blueprint.

Existing authorization, optimistic locking, idempotency, atomic publication,
recovery, and API major version remain unchanged. Diagnostics identify Area,
object ID, Placeable ordinal, field, catalog digest/count stage, and validation
stage without placing paths, names, or mutable IDs in metric labels.

## Offline implementation result — 2026-08-26

The bounded profile is implemented across the strict FAC parser and module
catalog repository, Area GIT parser and snapshot mapping, domain provenance
and changed-pair readers, draft projection, independent source replanning,
catalog re-resolution, exact DWord writing, whole-candidate readback, and the
revision-fenced ARE/GIT/GIC/IFO transaction. The retained 1,889-byte corpus is
read directly in the golden test and is bound to SHA-256
`9da73c70d0ca712fd6d324a66ac50c1d08c1ef207747554a45b35df083cf0510`.

The frontend carries a detached catalog and immutable digest/count-bound
source through the HTTP boundary, Area mapping, scene cloning, property draft,
numeric selector, Apply/OK/Cancel, reopen, and local Save. The saved-workspace
boundary now rejects a malformed or absent catalog, wrong family or ordinal,
stale digest/count, absent or unsupported physical target, mismatched derived
name, and a retained numeric target without exact provenance.

The accepted bounded offline gate is:

- nine focused backend unit suites: `1821/1821` assertions;
- Area Update atomic-publication integration: `33/33` assertions, including
  byte-identical GIC, `repute.fac`, and IFO verification;
- eight focused frontend unit/regression suites: `385/385` assertions;
- passing backend and frontend production builds; the frontend retained only
  its pre-existing large-chunk advisory.

Capability catalog revision `2026-08-26.55` keeps Placeable authoring
`PARTIAL/BLOCKED` because other property families and all live certification
gates remain incomplete. No Docker engine, container, service, watcher,
browser, capture, Toolset, NWN, or mutation-test process was started for this
closure. These results are offline evidence only.

## Required tests and completion boundary

TDD must cover exact catalog parsing, the retained five-faction corpus,
resource identity, digest and budget rejection, broken parents, malformed and
duplicate reputations, exact DWord presence, absent/duplicate/wrong-type
fields, projection, stale and unchanged pairs, unsupported IDs, deletion
collision, derived-name mapping, renderer identity independence, Apply/OK/
Cancel, clone/history, whole-struct readback, GIC and FAC byte identity, full
regression, and both builds. Mutation testing remains optional and needs
explicit current-task opt-in.

Offline gates do not replace fresh exact-candidate Toolset Save/Build/reopen,
packed readback, visible faction comparison, or NWN certification.

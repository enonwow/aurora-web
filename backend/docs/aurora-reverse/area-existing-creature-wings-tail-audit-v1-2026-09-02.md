# Existing Area Creature wings and tail audit v1

Date: 2026-09-02  
Scope: retained `Wings_New` / `Tail_New` appearance selectors on one type-`4`
Area GIT Creature, including their legacy read fallbacks.  
Status: offline implementation verified; guarded browser and native
certification pending.

## Decision

Aurora Web may expose retained wings and tail as two independent,
catalog-bound compare-and-swap members, but only after preserving the exact
native compatibility shape and the effective table identity.

Aurora reads the modern case-sensitive fields `Wings_New : DWord` and
`Tail_New : DWord` first. Only when the corresponding modern field is absent
does it fall back to legacy `Wings : Byte` or `Tail : Byte`. Aurora's common
Creature writer does not write the legacy labels: it emits only the two
modern `DWord` fields. Consequently:

- one exact modern `DWord` is the authoritative editable v1 source shape;
- one exact legacy `Byte` with no modern field is valid retained input and
  must be surfaced, rendered where possible, and preserved, but stays
  `PRESERVE_ONLY` until an explicitly tested native-shape migration is added;
- both exact modern and legacy fields may be retained, but the modern value
  is authoritative and mutation must not silently discard the legacy sibling;
- absent, duplicated, wrong-case, aliased, wrong-type, or otherwise malformed
  storage is preserve-only;
- a target is the physical row index in the one effective `wingmodel.2da` or
  `tailmodel.2da`, not a display label and not an arbitrary integer.

This contract does not claim wing/tail model-resource availability. Catalog
admission proves only that Toolset exposes the physical table row. Candidate
renderer model resolution and live Toolset/NWN appearance remain separate
release gates.

## Immutable primary authority

| Source | Size | SHA-256 |
| --- | ---: | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | 30,366,020 | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:\Projects\New Folder\export\functions.tsv` | 1,928,975 | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| `C:\Projects\New Folder\export\strings.tsv` | 2,691,636 | `864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f` |
| `C:\Projects\New Folder\export\strings_2da.tsv` | 8,070 | `620d48990d12849c391e997bc564acc1a758fa94994201fb1365f7356a0db6aa` |
| `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe` | 12,201,984 | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| `C:\Projects\nwn-last-city\Aurora\reverse\runs\NWTOOLSET_RCDATA_REFRESH_2026-05-20.json` | 495,547 | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

Only immutable decompilation artifacts and a read-only PE byte probe were
used. No xoreos or other GPL source was inspected. No Docker command,
service, watcher, browser/Chrome, capture, Toolset, NWN, mutation test, or
sub-agent was started.

## Native GFF read/write closure

The common Creature reader `FUN_00532174` reads `Wings_New` through
`FUN_00aeee7c` at `decompiled_all.c:194468-194469`; if and only if the field
was not found, it reads legacy `Wings` through `FUN_00aeed68` at lines
`194470-194472`. It performs the same sequence for `Tail_New` and legacy
`Tail` at lines `194474-194478`.

The decompiler did not name the overlapping legacy tail pointer at
`0x00bfe059`. A read-only PE virtual-address-to-file-offset probe of the
installed executable recovered the exact adjacent bytes:

```text
Wings_New\0Wings\0Tail_New\0Tail\0SoundSetFi
```

This closes the exact fallback label without relying on a guessed symbol.

`FUN_00aeee7c` at `decompiled_all.c:967969-967986` accepts only GFF type id
`4` and returns the 32-bit payload; this is native `DWord`. The fallback
helper `FUN_00aeed68` at lines `967892-967912` accepts only type id `0` and
returns its byte payload.

The common Creature writer `FUN_0053521c` calls `FUN_00aefe60` for only
`Wings_New` and `Tail_New` at lines `195164-195165`. The helper at lines
`968787-968814` creates or replaces GFF type id `4`. There are no reciprocal
legacy writes in this common writer. The placed-Creature GIT wrapper delegates
to this common lineage; paired GIC does not own these fields.

The existing dynamic-Creature construction path already reflects this native
shape transition: its frozen UTC blueprint carries legacy `Wings : Byte` and
`Tail : Byte`, while the constructed Area GIT record emits
`Wings_New : DWord` and `Tail_New : DWord`. Existing-object editing remains a
separate exact-retention contract and must not infer that a legacy-only source
can be rewritten until its migration and preservation behavior are explicitly
covered.

## Toolset selector and table closure

`FUN_0044a194` loads exact resource token `TAILMODEL` and iterates the complete
physical table row range. At `decompiled_all.c:68697-68755`, it requests exact
column `LABEL`, appends only successfully returned values to the ComboBox,
attaches the physical row ordinal as item data, and selects the item whose row
equals the retained tail value at Creature-dialog offset `+0xaf4`.

`FUN_0044a4f8` performs the corresponding `WINGMODEL` flow at lines
`68800-68869`, using exact `LABEL` and the retained wing value at offset
`+0xaf0`. The immutable string map independently contains adjacent exact
tokens `TAILMODEL`, `LABEL`, `WINGMODEL`, `LABEL` at addresses
`0x00bb1de8..0x00bb1e08`.

The change functions load the same complete tables and resolve the selected
physical row's `MODEL`, `WING_TAIL_SCALE`, and `ENVMAP` columns:

- tail: `FUN_00444250`, including table load at lines `65673-65680`, retained
  row replacement at `65704-65708`, and `MODEL` lookup at `65711-65759`;
- wings: `FUN_00444bbc`, including table load at lines `65979-65986`, retained
  row replacement at `66010-66014`, and `MODEL` lookup at `66017-66065`.

The frozen strings table includes exact error paths
`TdlgCreatureEdit::SetTail: Can't load TailModel 2DA file` and
`TdlgCreatureEdit::SetWings: Can't load WingModel 2DA file`. A missing table
is therefore not permission to accept an unbound numeric value.

The web selector must select one complete effective resource by module,
ordered-HAK, then vanilla first-hit precedence, preserve physical row
ordinals, and bind every mutation to the immutable table digest and row
count. It may display bounded `LABEL` text, but that text is not persisted
identity. Rows missing the Toolset-required `LABEL`, values outside the
effective table, and rows outside the unsigned `DWord` range are not admitted.
Weaker sources are never row-merged into the winner.

## Frozen additive cross-boundary contract

Area detail may add two exact presence-sensitive members. Each has separate
modern and legacy records and an effective value:

```ts
type CreatureAppendageStorage =
  | { present: false }
  | {
      present: true;
      value: number;
      modernDword: { present: false } |
        { present: true; nativeType: "dword"; value: number; table?: Table };
      legacyByte: { present: false } |
        { present: true; nativeType: "byte"; value: number };
    };

type Table = {
  resourceName: "wingmodel.2da" | "tailmodel.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
  rowIndex: number;
};
```

The effective value is the modern value when present and otherwise the legacy
value. A table binding is attached only to one exact modern `DWord` whose
value identifies an admitted physical row. The frontend keeps a detached
copy as `source.creatureAppendages`, while the existing numeric
`appearanceSettings.wings` / `.tail` remain editable targets only when their
corresponding modern source and effective catalog are admitted.

Each changed member projects exact compare-and-swap data:

```json
{
  "wings": {
    "expectedValue": 1,
    "value": 3,
    "tableSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "rowCount": 8
  }
}
```

`wings` and `tail` are independent optional members, but the mutation object
must be non-empty. Their resource names are fixed by member. Every member is
revalidated against the current complete effective table during candidate
compilation. The writer replaces only one exact existing modern `DWord`,
preserves legacy siblings and all unrelated GIT fields byte-for-byte, leaves
paired GIC byte-identical, and verifies candidate readback before the existing
revision-fenced ARE/GIT/GIC/IFO publication.

The authenticated catalog surface may expose bounded, digest-bound wing and
tail row queries. It must never expose raw 2DA bytes, credentials, host paths,
or unbounded results. Routine diagnostics may include only contract revision,
Creature family, bounded ordinal, approved member token, counts, stage,
duration, and stable result code; selected values, labels, model tokens,
object IDs, hashes, paths, raw fields/bytes, and credentials are prohibited
metric labels.

## Implemented offline closure

Capability revision `2026-09-02.168` implements the frozen contract through
the complete retained-Area path:

1. The backend selects one complete effective `wingmodel.2da` or
   `tailmodel.2da` by module, ordered-HAK, then vanilla first-hit precedence.
   It preserves physical row ordinals and rejects missing `LABEL`, malformed
   tables, out-of-range targets, digest/count drift, and cross-kind bindings.
2. The Area parser retains exact modern and legacy presence independently,
   applies modern-over-legacy read precedence, and attaches catalog provenance
   only to an admitted exact modern `DWord`.
3. Draft projection emits a nonempty per-member CAS with expected value,
   target row, immutable table digest, and row count. Candidate compilation
   freshly repeats effective-table admission before raw-GIT replanning.
4. The immutable-ordinal planner and typed writer replace only the selected
   existing modern `DWord`; legacy siblings, unrelated GIT fields, paired GIC,
   and IFO remain untouched. Candidate and persisted readback compare the
   complete requested target before revision-fenced publication.
5. The dynamic UTC writer was corrected to emit both modern labels as native
   `DWord`, matching the common Aurora writer rather than the former `Byte`
   encoding.
6. The authenticated HTTP catalog exposes bounded, digest-bound row pages.
   Strict frontend contracts, ports/facades, detached scene and saved-draft
   provenance, history cloning, reducers/materializers, and the Creature
   Properties dialog carry independent Wings and Tail selectors. Search and
   selection remain fail-closed; legacy-only, malformed, stale, unbound, or
   unavailable state is visibly `PRESERVE_ONLY`.

## Verification and immutable runtime binding

Focused backend domain/admission coverage passes `28/28`; the capability
catalog passes `14/14`. The complete nine-suite backend group executes
`2844/2847`; its three failures are unrelated shared-tree expectation drift:
an added animation source-model hash, the current health/VFX revision, and an
existing UTM store round-trip fixture. All appendage parser, catalog,
projection, planner, writer, candidate, repository-hydration, endpoint, and
UTC-DWord assertions pass. The affected frontend group passes `1238/1238`,
and both production builds pass.

Immutable runtime profile v23, built at `2026-09-02T10:43:14.612Z`, binds
1,813 files and 30,798,093 bytes to digest
`6138b516b501ea4df8933de5004a06678c60e69880d9f47d87fb1cdbd1f46c27`.
Profile SHA-256 is
`6f210a9f6ce5090e1836c9ed1a47132a7c67368981a735ebb6b158e916cc7b73`,
source-manifest SHA-256 is
`0035a93f32f6567ae0b7788302a62400e7b5359671cd4fa880e57067648676b2`,
and binding SHA-256 is
`8e342dc9e974de973edceb4e75014001ee272e7ee5c91197ee0a1d70dfe15e00`.
Replacement matrix plan
`0e16f6931f3c113d7474a159437d288e0da87ef0a245d27fa162543ca0cff608`
is `ready`, has verified current source identity, and remains at `0/3380`.
The immediately preceding v22 plan is historical because the final capability
revision source write occurred after its creation.

## Remaining completion boundary

This checkpoint proves bounded offline authoring, not renderer/model or native
parity. Fresh guarded browser Save/reopen with settled renderer diagnostics,
exact-candidate Toolset Save/Build/reopen and packed GFF readback, and NWN
visual behavior remain independent release gates. The 99-tileset Add/Render,
group, adjacency, PathConnect/WOK, and release-certification matrix also
remains open. No Docker command, service, watcher, browser/Chrome capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used for this checkpoint.

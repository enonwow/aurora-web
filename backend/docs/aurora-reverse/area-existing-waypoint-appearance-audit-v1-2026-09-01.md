# Existing Waypoint `Appearance` audit v1

Date: 2026-09-01

## Scope and conclusion

This audit closes the offline Aurora semantic required to edit the exact
`Appearance : Byte` of one retained type-`5` Waypoint. The stored byte is the
physical row ordinal in the strongest effective `waypoint.2da`. Aurora uses
that row's `RESREF` to build the Waypoint model. The native default when the
field is absent is row `1`, but absence is not writable provenance in Aurora
Web.

The native property UI is table-backed. It iterates physical rows, resolves
their `STRREF` labels, and retains the physical row index as the selection
identity. Aurora Web must therefore expose a digest-bound effective-table row
catalog and persist only the selected byte. It must not treat the Waypoint
blueprint ResRef, model ResRef, color label, or display text as the mutation
identity.

## Immutable authority

| Artifact | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen RCDATA JSON | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |
| retail `nwn_base.key::waypoint.2da` | `f7b336c396d748a2a59f703d52e8a341ae8872fbd8fec6ac3375c3b38b18aba6` |

No xoreos or other GPL source was consulted.

## Decompilation findings

1. Waypoint reader `FUN_00658170` begins at decompilation line `346780`.
   Lines `346938..346939` read exact `Appearance` through the Byte reader
   `FUN_00aeed68`, pass native default `1`, and store one byte at the Waypoint
   member corresponding to `param_1 + 0x18`.
2. Reciprocal writer `FUN_00658b4c` begins at line `347158`. Line `347170`
   writes the same byte through `FUN_00aefd1c` under exact label `Appearance`.
3. Waypoint model builder `FUN_006519a0` loads exact table resource
   `waypoint`, passes the stored appearance byte at object offset `0x6c` as the
   row argument to `FUN_00af3568`, and requests exact column `RESREF`. The
   resulting model ResRef is loaded as the Waypoint presentation model.
4. `FUN_00658914` loads the same table, iterates its physical rows from zero to
   row count minus one, reads exact column `STRREF`, resolves display text, and
   calls the selection sink with both display text and the physical row index.
   This establishes row ordinal, not label or model ResRef, as UI identity.

## Frozen Toolset evidence

The frozen `TDLGWAYPOINTEDIT` resource has size `3368`, RVA `0x00BBC168`, and
contains Basic-tab `lAppearance`, caption `Appearance`, and
`cbAppearance : TComboBox` with `csDropDownList`. The separate
`TDLGWAYPOINTWIZARD` resource has size `1448`, RVA `0x00BBCE90`, and contains
the same `Appearance` dropdown plus `cbAppearanceChange`.

## Retail table evidence

The installed retail `waypoint.2da` is 272 bytes, has exact columns `LABEL`,
`RESREF`, and `STRREF`, and contains five physical rows. Row `0` is blank and
is not a selectable native labelled/model row. Rows `1..4` are:

| Physical row | LABEL | RESREF | STRREF |
| ---: | --- | --- | ---: |
| 1 | `blue` | `gi_waypoint01` | 67281 |
| 2 | `red` | `gi_waypoint02` | 67282 |
| 3 | `green` | `gi_waypoint03` | 67284 |
| 4 | `yellow` | `gi_waypoint04` | 67285 |

The retail table is evidence for the default data set, not a hard-coded list:
module and ordered-HAK overrides remain authoritative through normal effective
resource precedence.

## Admitted contract

- The retained GIT field must be exactly one case-sensitive
  `Appearance : Byte`; absence, duplicates, or another native type are
  preserve-only.
- The source byte and target row are unsigned `0..255` values.
- Writable provenance requires the exact strongest effective
  `waypoint.2da`, its source layer/object key, SHA-256, byte size, physical row
  count, and a selectable row matching the source byte.
- An admitted table is `2DA V2.0`, at most 1 MiB and 256 physical rows, has
  exact `LABEL`, `RESREF`, and `STRREF` columns, and has no parser errors.
- A selectable row has a valid physical byte ordinal, a nonblank NUL-free
  ResRef of at most 16 code units, and an unsigned decimal STRREF. The label is
  optional display metadata.
- Mutation carries the complete source/target row pair plus table digest and
  row count. The backend re-resolves the current effective descriptor and
  target row before changing only `Appearance`.
- Display text, labels, ResRefs, source paths, hashes, and raw table cells are
  excluded from telemetry.

## Implemented offline closure

Checkpoint `215` and capability revision `2026-09-01.147` bind the effective
table parser/repository and HTTP catalog; exact retained GIT parsing and
snapshot hydration; detached frontend provenance and selector; draft
projection; immutable-ordinal planning; current-table/current-row
revalidation; exact GIT Byte replacement; candidate readback; and
revision-fenced atomic ARE/GIT/GIC/IFO publication. The focused bounded suites
passed `58/58` backend and `626/626` frontend assertions, and both production
builds passed under the fixed 1 GiB heap.

## Remaining live proof

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GIT readback, and NWN presentation of every selected admitted row
remain release gates. This offline audit does not claim those gates.

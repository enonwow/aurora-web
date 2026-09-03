# Existing Placeable basic-identity storage provenance evidence — 2026-08-17

This packet records the first additive, read-only Basic Identity source
boundary derived from the Aurora audit. It does not authorize native Tag,
Appearance, LocName, or TemplateResRef mutation.

The backend now reads retained type-`9` GIT Placeables with exact,
presence-sensitive storage provenance for `Tag : CExoString` and
`Appearance : DWord|Byte`. Empty Tag and absent Tag are distinct. Appearance
retains its native type, so canonical DWord, legacy Byte, and absence remain
distinct. Duplicate fields, noncanonical labels, wrong native types, malformed
strings, wrong struct families, and cross-family objects omit the complete
provenance property instead of synthesizing a value.

The module snapshot repository deep-copies this structure and the Area process
cache fingerprint includes it. The frontend HTTP boundary, pure domain reader,
Area mapper, source snapshot clone, and read-only Basic dialog all carry the
same exact shape. The UI displays Appearance only when provenance is a present
canonical DWord; it deliberately ignores the older lossy `appearanceType`
alias and a legacy Byte.

The effective `placeables.2da` resource descriptor, digest, physical row list,
immutable Tag-independent object identity, mutation pairs, writer/readback,
and fresh Toolset/NWN proof remain pending. Basic Identity CRUD is not claimed.

Mutation exclusions are bounded to equivalent or unreachable mechanics:

- the backend null field-entry guard cannot affect an emitted placement after
  the same list/coordinate admission path;
- `readNumber` cannot return undefined after the exact inline DWord/Byte type
  branch has admitted the field;
- replacing the frontend exact-key helper's `every` with `some` is equivalent
  after exact key-count equality and the subsequent required-property/type
  validation.

All semantic family, type, label, presence, empty-value, duplicate, native
type, uint32/Byte boundary, projection, clone, and canonical-display branches
remain mutation-tested.

The backend production build passed after this slice's production changes.
A later final rerun encountered an unrelated untracked VFX fixture created at
16:39:09 (`backend/scripts/create-vfx-nwn-web-row28-fixture.ts`) whose
`selectedCandidate.sourceLayer` is widened to `string`; that external TS2322
blocker is not attributed to this slice and was not modified here. The
frontend final production build passed with the existing chunk-size warning.

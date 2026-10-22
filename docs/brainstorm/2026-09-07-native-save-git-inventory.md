# Native Save typed GIT inventory (delivery v2)

## Scope and authority

The native-save review admission needs the complete saved Area object inventory,
while the bootstrap profile declares required fixtures. Its source adapter is
separate from the existing human/v2 strict fixture-count contract. No module,
HAK, profile, original receipt, Save or native window is changed by this fix.

Independent inspection of the saved r26 MOD (SHA-256
`f970bb183ab734c8cf37677244036cea80b60e10608ff07cf50bcc3aab3efcd5`)
and packed GIT (`a622b9d611afd8360518938610a30f465510468302c415dbbb62d69657844d84`)
found one creature and two placeables. The original profile requires one NPC.
Its receipt stores four-decimal coordinates; the packed GFF stores FLOAT values.
Audit copies and original identities are in the Studio output directory
`output/native-hidden-frame-implementation/r26-inventory-v2/source-audit.json`.

Primary reverse references in the central Aurora repository:

- `area-existing-creature-appearance-audit-v1-2026-08-27.md`: placed reader
  FUN_0053ab24/FUN_00532174, WORD reader FUN_00aeedc4; writer FUN_0053ae80/
  FUN_0053521c/FUN_00aefd88. `Appearance_Type` is WORD (type 2), creature struct 4.
- `area-existing-placeable-basic-identity-audit-v1-2026-08-17.md`:
  FUN_0063ae68 accepts native BYTE or canonical DWORD `Appearance`;
  FUN_0063b8a0 writes DWORD; placed object struct 9.
- The saved native GIT independently confirms creature XPosition/YPosition/
  ZPosition and placeable X/Y/Z, all FLOAT. The existing central GFF Area parser
  and `read-aurora-toolset-bootstrap-git-readback.mjs` produce receipt v1;
  `clampNumber` is exactly `Number(value.toFixed(4))`. No GPL code was consulted.

## Bounded contract

New source policy/version: `aurora-native-save-git-inventory/v1`. Only native-save
admission opts in; unknown policies fail. Default human/v2 reader and validation
remain unchanged. Typed inventory requires exact struct/field types and rejects
missing, duplicate, wrong-family or malformed fields. Every nonempty unsupported
GIT family blocks admission; the nine known object counts are checked against
receipt v1. There is no silent omission of doors/items/etc.

Receipt comparison uses the deterministic four-decimal projection only for the
versioned bootstrap GIT receipt. MOD/GIT hashes, appearance, tag and template are
exact. Packed coordinates remain raw in the inventory and runtime binding.
Required profile fixtures can use exact packed or exact four-decimal coordinates;
each must identify exactly one distinct object. Additional saved objects are
included in the admission's fixtures, identified by kind and source list index.
Declared requirements and their matches remain available separately for audit.
S07 must bind the full typed inventory, including appearance/tag and raw position.

The request/admission v1 envelope remains; its source policy and additive inventory
record are versioned. Existing requests are producer-hash bound and must be
prepared again with the new producer. Earlier frozen deliveries are immutable.

## Verification plan

Tests precede implementation: mixed-type parsing, field/struct ambiguity, numeric
types, unsupported nonempty families, receipt projection/count/version drift,
required-fixture omissions/duplicates/ambiguous matches, complete S07 binding,
deterministic numeric corpus, and exact saved r26 read-only replay. Then run native
admission/dispatch and human/v2/hidden/window regressions. Public prepare runs with
native child-process ports denied against unchanged original r26 inputs, writing
only a new evidence directory. This is offline admission preparation, not native
capture, runtime acceptance or VFX quality proof.

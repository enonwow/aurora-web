# xoreos legacy-reference quarantine

Date: 2026-08-17

## Decision

Legacy documents cited local xoreos checkouts or a mutable `master` URL without
the immutable research record required by the current GPL secondary-reference
policy. Those citations and their derived observations are not retained as
admitted evidence. They are quarantined rather than retroactively assigned an
unverified commit SHA.

The quarantine applies to xoreos-derived content in:

- `vfx-aurora-first-implementation-readiness-r90.md`;
- `creature-enrichment-spec-r63.md`;
- `minimal-runtime-2da-tlk-set-r65.md`;
- `resolver-edge-cases-corpus-r67.md`;
- `unknowns-linkedtoflags-loadscreenid-r65.md`.

## Effect

Quarantined content:

- is not Aurora runtime authority;
- is not naming or format authority for new implementation work;
- cannot close a knowledge gap or justify a test expectation;
- cannot be cited by a completion or parity claim;
- does not authorize copying, porting, translating, or structurally mirroring
  xoreos code.

No production backend or frontend import, link, or bundled xoreos component was
identified by the 2026-08-17 audit.

## Re-admission gate

Each observation must be re-researched independently. Re-admission requires a
new record containing the exact file URL and immutable commit SHA,
`sourceClass: secondary-gpl-reference`, a narrowly worded observation,
independent primary confirmation or explicit `unconfirmed` status, the behavior
it is forbidden to prove, and the resulting fixture/test/follow-up task.

Until that record exists, code must rely on Aurora decompilation, retail/NWN or
Toolset evidence, or a separately licensed authoritative specification.

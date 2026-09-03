# Existing Area Placeable HP / CurrentHP evidence — 2026-08-18

This packet records the offline-verified end-to-end mutation lane for one
retained type-`9` Area GIT Placeable carrying one canonical `HP : Short` and
one canonical `CurrentHP : Short`.

The frontend admits the single Hit Points control only from exact immutable
`aurora_git` Placeable provenance. HP is an integer in the Toolset range
`1..10000`. CurrentHP is not independently editable. It is derived from the
source pair with the recovered Aurora algorithm: signed truncating division,
preservation for a non-positive quotient, otherwise signed-Short narrowing and
a minimum-one clamp. Invalid or absent provenance cannot create a target.

The backend emits the pair only from exact native labels, types, cardinality,
and type-`9` ownership. Projection derives CurrentHP independently, planning
reparses the immutable ordinal and compares both source Shorts, and the pair
writer changes exactly the two admitted fields. Complete GIT struct and
receipt readback prove preservation of every other field; all GIC bytes remain
unchanged.

Final focused verification passed 1,367/1,367 backend tests and 128/128
frontend tests. Both production builds passed, with only the existing frontend
chunk-size warning. Dedicated mutation gates reached 100%: 206 backend and 121
frontend active mutants were killed, with zero timeouts, survivors, uncovered
mutants, or errors. Exact report sizes and hashes are in
`offline-verification-summary.json`.

Backend mutation exclusions are limited to two defensive rechecks rendered
equivalent by preceding exact invariants: parser-produced metadata contains
both HP members or neither, and projector admission cannot produce a null
domain pair after the same source/target/derivation checks. Frontend component
wiring is not duplicated in the mutation profile because it delegates directly
to the fully mutated application reducer and materializer. The former
scene-normalizer value comparison was removed as redundant after exact
presence and direct-value projection.

This is offline implementation evidence. The central Toolset automation
registry has no public HP property atom. Fresh exact-candidate Toolset
Save/Build/reopen, packed readback, and NWN runtime behaviour are not claimed.

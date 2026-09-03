# Existing Placeable editor Comments offline evidence — 2026-08-17

This directory records the immutable offline verification checkpoint for the
placed-Placeable editor `Comments` field stored in the paired Area GIC. The
admitted value is an exact `CExoString` with a product budget of 0..4096
ECMAScript code units and no U+0000. Empty is valid and remains distinct from
absence; values are never trimmed, normalized, case-folded, or truncated.

The backend binds GIT and GIC Placeable lists by exact ordinal and immutable
fingerprint, carries the exact GIC SHA-256 through copy-on-open provenance,
requires a complete changed expected/target pair, and revalidates the current
paired resources before writing. Comment-only mutation preserves the complete
GIT and all GIC siblings. GIT-only mutation preserves even parsable,
noncanonical GIC bytes exactly. Deletion collisions, stale digests/values,
wrong families, malformed pairs, and readback drift fail closed.

The frontend admits only an exact retained `aurora_git` Placeable with valid,
present comment provenance. Apply changes only Comments, preserves Description
independently, and does not materialize an absent field.

This is paired-resource storage and frontend-provenance evidence only. Fresh
Toolset Save/Build/reopen and NWN runtime certification remain pending, and the
known global regression failures are not promoted by this checkpoint.

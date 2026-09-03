# VFX renderer eligibility and retail parity contract v1

Date: 2026-08-17

## Decision

`aurora-vfx-payload/v1` gains two additive, independent fields:

- `rendererEligibility`: `blocked`, `preview_only`, or `source_backed`;
- `retailParityStatus`: `unproven`, `blocked`, or `proven`.

The existing `canonicalStatus`, `backendCanonical`,
`localOnlyNotRetailEvidence`, and `canonicalParityPromoted` fields remain
readable during the v1 compatibility window. They are legacy transport fields,
not a sufficient user-facing parity statement.

## Semantics

`rendererEligibility=source_backed` means the backend supplied source-derived
runtime/render contracts that the shared renderer may consume. It does not
mean that Aurora/NWN visual parity is proven.

`rendererEligibility=preview_only` means only a non-authoritative preview path
may consume the payload. `blocked` means the shared source-backed renderer must
not consume it.

`retailParityStatus=proven` is reserved for a payload whose exact candidate and
retail evidence pack passed the retail parity gate. `blocked` means a known
required oracle or evidence artifact is absent or failed. `unproven` means no
retail promotion decision is carried by the payload.

For the current placeable source-MDL payload the only truthful combination is:

```json
{
  "rendererEligibility": "source_backed",
  "retailParityStatus": "blocked",
  "localOnlyNotRetailEvidence": true,
  "canonicalParityPromoted": false
}
```

## Compatibility and fail-closed rules

1. New backend payloads must emit both fields.
2. Frontend normalization preserves valid explicit values.
3. During the v1 compatibility window, a legacy
   `canonicalStatus=canonical` plus `backendCanonical=true` payload maps to
   `rendererEligibility=source_backed`; other legacy payloads map to
   `preview_only` or `blocked` according to their old status.
4. Legacy parity maps to `proven` only when
   `canonicalParityPromoted=true`; otherwise it maps to `unproven`. The
   frontend must not infer retail proof from `canonicalStatus` or
   `backendCanonical`.
5. The source-backed renderer checks `rendererEligibility`, deferred hydration,
   and the presence of render contracts. It does not require retail parity,
   because local source-backed rendering and retail proof are separate gates.
6. UI and diagnostics must display both axes and must not label a merely
   source-backed payload as retail-canonical.

This is an additive v1 contract correction. A later breaking removal of legacy
fields requires a payload version increment and a migration of saved drafts.

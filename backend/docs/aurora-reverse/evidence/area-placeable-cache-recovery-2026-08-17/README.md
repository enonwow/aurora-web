# Area Placeable cache recovery offline evidence — 2026-08-17

This directory records the offline verification checkpoint for exact recovery
from `PLACEABLE_CACHE_NOT_FOUND` after the host-local Placeable processing
cache is reset while an Area remains open in the frontend.

The frontend now admits only the exact own-property error code, evicts every
lookup, index, object, pending, published, and backend-cache-key alias, advances
the Area validation generation, and performs one authoritative reprocess. The
single resolver performs at most one recovery attempt. Model and texture
delivery stop same-URL retries after an exact binary cache miss and emit one
deduplicated recovery signal per runtime and backend cache key. Other 404s and
malformed envelopes do not enter recovery.

The guarded CDP capture harness now records single payload, single contracts,
and binary asset-delivery requests as separate groups. An active binary or
single-contract 4xx therefore blocks proof instead of allowing a false-green
all-ready renderer summary.

This is offline recovery and proof-harness evidence. A clean backend restart
with an unchanged browser session and a fresh, settled saved capture artifact
has not yet been executed. The existing global frontend regression and the
broader `areas:contract-gate` remain red for independently catalogued legacy
expectations, so neither global release readiness nor runtime proof is claimed.

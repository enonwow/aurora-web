# Existing Placeable basic-identity preservation evidence — 2026-08-17

This directory records the offline frontend correction derived from the exact
Basic Identity Aurora audit. It does not authorize native identity mutation.

For retained `aurora_git` objects, Name, Tag, and Template ResRef are disabled
and defended again by the draft reducer and Apply materializer. The prior
mislabelled `Appearance Type -> draft.resRef` binding has been removed.
Template ResRef remains a separate field, while Appearance Type displays only
an exact unsigned DWord source value and is always read-only. Invalid,
fractional, negative, missing, string, or greater-than-DWord values display no
editable state.

Local seed objects retain their existing Name, Tag, and Template ResRef edit
semantics. This does not imply Aurora persistence for those local values.

The complete localized `LocName`, immutable Tag identity, effective
`placeables.2da` bytes/digest/row list, Appearance writer/readback, and fresh
Toolset/NWN proof remain pending. Basic Identity CRUD is therefore not claimed.

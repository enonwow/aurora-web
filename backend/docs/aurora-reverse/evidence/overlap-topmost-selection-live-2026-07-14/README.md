# Overlap resolution — deterministic topmost selection

This live Aurora packet proves the native topmost-selection policy for an exact
mixed-kind overlap. In one Toolset session, a `Dwarf Mercenary` and a `Water
Trough` were placed at the same viewport point and saved at exactly the same
GIT position `(60.4528, 28.7291, 0)`. Two targeted clicks in `Select Objects`
selected the same native TreeView handle, read back as `Water Trough`.

The fixture was removed with two native Undos and a second Save. The rollback
`objects.csv` equals the baseline byte-for-byte. The full `.mod` container may
be repacked by Toolset; this packet distinguishes it from exact parser-visible
GIT rollback.

The result is deliberately limited to deterministic selection of the topmost
object; it does not claim an unproven cycling mechanism for an occluded object.

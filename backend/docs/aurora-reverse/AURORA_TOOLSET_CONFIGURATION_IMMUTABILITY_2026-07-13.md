# Aurora Toolset — configuration immutability

Effective immediately: automation has **no authority** to modify, stage,
restore, replace, copy, delete, or otherwise manipulate `nwtoolset.ini`, its
MRU entries, window coordinates, or any other user Toolset configuration.

This applies to normal launch, proof, recovery, cleanup, and failure handling.
The launcher may inspect configuration read-only for diagnostics, but it must
not use that information to rewrite it. A wrong automatically loaded module is
a fail-closed blocker, not permission to change MRU or force a module.

The correct standard is to learn and use Aurora through its existing visible
state, approved process/window recovery, and Toolset-supported interactions.
No solution may claim completion if it depends on modifying Aurora/Toolset
configuration files.

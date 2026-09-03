# Area Waypoint `LocalizedName` offline checkpoint

Date: 2026-09-01  
Checkpoint: 210  
Capability catalog revision: `2026-09-01.142`

## Scope result

The exact retained type-`5` GIT Waypoint `LocalizedName` lane is implemented
end to end for the frozen inline printable-ASCII profile. Backend parsing,
immutable snapshot transport, draft projection, independent Tag/name CAS,
planning, exact native write/readback, candidate compilation, and revision-
fenced atomic publication are connected. Frontend HTTP admission, detached
mapping, provenance-gated draft state, history cloning, properties dialog,
Apply/OK/Cancel/reopen, and local Save are connected through scene facades and
ports.

TLK-backed, multilingual, malformed, non-ASCII, wrong-family, absent, and
otherwise unsupported storage remains preserve-only. Waypoint `LinkedTo`
remains preserve-only because runtime target semantics are not proven.

## Verification completed

- backend production build: pass;
- frontend production build: pass;
- backend bounded checkpoint unit tests: 35/35 pass;
- backend Area-update integration gate: 82/82 pass;
- frontend focused domain/facade/draft/dialog tests: 13/13 pass;
- frontend HTTP/mapper/workspace-draft/clone suites: 1045/1045 pass;
- frontend Waypoint properties regression: 1/1 pass;
- complete frontend regression gate: 44 files, 135/135 pass.

The complete frontend unit gate executed 5537 tests. All new Waypoint tests
passed, while two pre-existing renderer/placeable expectations failed outside
this checkpoint: the `HttpPlaceableApiPort` render-package expected shape is
stale, and one generic placeable material-side expectation differs from the
current runtime policy. These failures are recorded and are not treated as
Waypoint evidence.

## Remaining release boundary

This checkpoint does not mark Waypoint or Area authoring complete. Fresh
guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen, packed
localized-string readback, and NWN presentation proof remain blocked live
gates. The remaining Waypoint property matrix, the unresolved `LinkedTo`
runtime semantics, full tileset/render/connectivity coverage, PathConnect/WOK
proof, and final complete Area CRUD certification also remain open.

## Resource statement

All work was offline and bounded to one local process at a time with the
repository 1 GiB scripts and one test worker. No Docker command, service,
watcher, browser, Chrome, capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source was used.

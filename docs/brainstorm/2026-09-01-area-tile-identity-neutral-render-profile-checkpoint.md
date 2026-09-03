# Area tile identity-neutral render-profile checkpoint

Date: 2026-09-01  
Capability revision: `2026-09-01.148`

Successor note: the frontend `null`/`padding`/`tpad_*` runtime classifier
listed below was removed in capability revision `2026-09-01.149`. The backend
producer classifier was removed later, and revisions `.159`/`.160` now use a
zero-exclusion conservative inventory plus a source-bound v13 matrix. See
`docs/brainstorm/2026-09-01-area-tile-source-eligibility-producer-checkpoint.md`
for the current `45,034 / 8,666 / 0` disposition and `0/3380` plan state.

## Scope and result

This checkpoint removes concrete tile-model identities from shared frontend
render-readiness and black crop/void behavior. It does not add a new Aurora
runtime semantic. It migrates existing offline source calibrations to an
immutable, versioned data profile selected only by the exact MDL source
content SHA-256 already delivered by the tile process contract.

The renderer now consumes two generic policy fields:

- `blackMaterialPolicy`: generic geometry classification or hiding every
  black-material mesh;
- `sourceCropMaskPolicy`: preserve or hide remaining source crop masks.

The shared renderer contains no branch on the calibrated model ResRef, tile
ID, filename, catalog ID, or naming pattern. Renaming a model while retaining
the same source bytes therefore leaves behavior unchanged. Unknown or missing
hashes use the generic geometry-classifier profile.

## Immutable source bindings

The bundled v1 manifest binds the existing offline calibrations to these
source bytes:

| Source layer | MDL SHA-256 | Policy |
| --- | --- | --- |
| installed HAK mirror | `d2e9e820f3dcbf0a8aca4a461e45a9fca86892ed54c94c1de4b6ebe69394303a` | hide all black materials and remaining source crop masks |
| installed vanilla mirror | `0e6ca4c04b1548bcf71111cf3ddb1e9d7c3255aaf15816940852278588cca731` | hide all black materials and preserve remaining source crop masks |
| installed HAK mirror | `0e84d5a36c2b3d0ab5bedbd4ade4f3e2d58b94c5840207fc529a11165874efe5` | hide all black materials and preserve remaining source crop masks |

The manifest validator rejects an unsupported schema, malformed hash,
unknown policy, missing evidence metadata, or duplicate hash. Runtime model
diagnostics expose profile ID, manifest revision, evidence status, and bound
source hash.

## Fail-closed source availability

Three exact multi-cell group companion names had previously been embedded in
the frontend placeholder classifier. That exception disagreed with the
immutable 99-tileset source inventory, where their MDLs are unavailable. The
exception is removed. Those cells now participate in the scene identity and
remain blocked until the exact declared source exists; a sibling model or
visual bridge no longer substitutes for the missing member.

This aligns runtime readiness with the existing matrix rule that a multi-cell
group is ineligible when any non-null member is not source-resolved.

## Verification

Resource-bounded focused frontend verification passes:

- render-profile validation and hash selection: `3/3`;
- tile process readiness and fail-closed companion handling: `11/11`;
- void/crop visibility and identity-renaming invariance: `35/35`;
- tile model request/readiness behavior: `10/10`;
- aggregate focused result: `59/59` across four files with one worker;
- identity-neutral regression smoke: `1/1`;
- TypeScript and Vite production build completed and regenerated
  `frontend/dist/index.html`.

No Docker command, container, service, watcher, browser, Chrome, capture,
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used.

## Remaining blockers

This checkpoint does not certify tile rendering or complete the Area program.
The following remain open:

1. Live visual recertification of all hash-bound render profiles after source
   freeze.
2. Regeneration of the runtime-build-bound 99-tileset plan after the current
   source changes settle; the active v12 checkpoint remains `0/3378`.
3. Complete Add/Render and adjacency capture for 99 tilesets.
4. Thirty-four genuinely missing declared model sources across nine tilesets.
5. Native positive-cross and negative-noncross PathConnect proof; WOK contact
   remains geometric evidence only.
6. The `null`/`padding`/`tpad_*` placeholder naming classifier still selects
   readiness behavior by a naming convention. The current inventory compiler
   uses the same convention, so it is not independent evidence. Replacing it
   requires a typed, immutable, source-bound placeholder-status contract; it
   must not be guessed or converted into thousands of silent fallback models.

The last item is explicitly retained as
`intentional_placeholder_identity_neutral_contract_pending`; therefore the
render capability remains `partial` and release-blocked.

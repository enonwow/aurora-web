# Area Event Script Catalog and Artifact Status Audit v1 (2026-08-24)

## Decision

Aurora Web may expose a revision-bound, read-only catalog of committed module
script resources for Area event-script authoring.

The catalog may report only exact artifact presence:

- `source_and_bytecode` when the same canonical ResRef has one committed
  resource of type `2009` (`NSS`) and one of type `2010` (`NCS`);
- `source_only` when only type `2009` is present;
- `bytecode_only` when only type `2010` is present.

`source_and_bytecode` does **not** mean that the NCS was successfully compiled
from the currently committed NSS. The ERF/module resource descriptors contain
no source-to-bytecode hash, compiler revision, compile receipt, or freshness
ordering. The application must therefore report `freshness = unverified` for
every pair and must not call artifact presence `compiled`, `current`, or
`successful`.

This v1 catalog covers committed module resources only. It does not claim an
effective runtime winner across module, ordered HAK, override, campaign, or
base-game layers. Existing Area event ResRefs outside this catalog remain
preserve-first; absence from the module catalog is not proof that the runtime
resource is missing.

## Primary evidence

Frozen source artifacts were re-hashed before this audit:

| Artifact | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| `C:/Projects/New Folder/export/strings.tsv` | `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F` |
| `backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-06-area-resize/area-properties-vcl-map.json` | `6A95921D6B57F08433C15AA36C05D8A9D0B2C876BB11DA3B98A292BBA08AD0ED` |

The audited Toolset binary identity retained by the VCL evidence is
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.

No xoreos source or other GPL implementation was used.

## Toolset selector contract

The Area Properties VCL map binds:

- `actBrowseResourceExecute` to `0x0054C5E4`;
- `actEditScriptExecute` to `0x0054C6C4`;
- `cbOnScriptChange` to `0x0054C7A4`;
- `cbOnScriptEnter` to `0x0054C8FC`;
- the four Area event combo boxes at offsets `0x564`, `0x56c`, `0x57c`, and
  `0x580`.

`FUN_0054c8fc` at decompiled lines `205766-205779` calls
`FUN_006c52f8(combo, 0x7d9, ...)`. Decimal `0x7d9` is resource type `2009`,
the module `NSS` resource type. `FUN_006c52f8` delegates to
`FUN_006c4cb8`, whose lines `407560-407684` enumerate the resource manager for
the requested type and populate the combo box with bounded ResRefs.

`FUN_0054c5e4` at lines `205512-205554` uses the same `0x7d9` type for the
browse action. `FUN_0054c6c4` at lines `205612-205654` opens the selected
source through the shared script editor. The editor path `FUN_006dfbe8` uses
`%s/%s.nss`, checks type `0x7d9`, and can create the default source text
`void main() {}` when editing a previously absent source. This proves that the
Area event selector/editor surface is NSS-oriented; it does not select NCS
entries directly.

## Compiler-output contract

The Toolset script compiler is repeatedly constructed through
`FUN_00b3b6d4(inputType, outputType, debugType)` with:

- input `0x7d9` / `2009` (`NSS`);
- output `0x7da` / `2010` (`NCS`);
- auxiliary `0x810` / `2064` (the separately named `.ndb` artifact surface).

Examples include `FUN_00521f94` at decompiled line `182717` and the script
editor compile path at line `417412`. `FUN_00521f94` later processes the
compiled output as type `0x7da` at lines `182999-183006`. The resource removal
path at lines `244729-244749` independently removes the `.NSS`, `.NCS`, and
`.ndb` files together.

These facts establish the artifact roles. They do not establish that any
arbitrary retained NCS is fresh relative to an NSS with the same ResRef.

## Committed-module evidence boundary

Aurora Web's immutable module manifest records for every committed object:

- canonical logical key;
- exact unsigned resource type;
- exact size;
- SHA-256 and content-addressed key;
- the immutable module revision that covers the complete ordered object set.

The bootstrap excludes internal `__aurora` and cache sources from that
manifest. It derives the native resource type from the resource extension and
fails when a module object has an unknown type. A catalog built from this
manifest can therefore prove exact committed module artifact presence without
reading or exposing NSS/NCS bytes.

The v1 catalog must accept only a root logical key exactly equal to
`<canonical-resref>.nss` for type `2009` or `<canonical-resref>.ncs` for type
`2010`, where the ResRef is `1-16` lowercase ASCII `[a-z0-9_]`. Wrong case,
wrong extension/type pairs, nested paths, collisions, or non-canonical names
must be counted as rejected descriptors and must never be silently normalized
into a selectable row.

## Frozen application contract

1. The query is revision-bound and read-only; it never invokes a compiler or
   mutates module contents.
2. Results are sorted by canonical ResRef, filterable by an exact bounded
   lowercase substring, and paginated under a fixed response budget.
3. Descriptors expose only logical key, resource type, size, and SHA-256. NSS,
   NCS, host paths, storage keys, source text, bytecode, and secrets are not
   returned.
4. Each item reports source presence, bytecode presence, artifact status, and
   `freshness = unverified` when both artifacts exist.
5. The UI may offer NSS-backed module rows as selection assistance. It must
   show the NCS presence/freshness warning and must not claim a compile was
   performed by Aurora Web.
6. Empty ResRef remains the explicit unbind value. Existing event-script CAS,
   serialization, authorization, transaction, and readback rules remain
   unchanged.
7. Catalog absence is diagnostic only and cannot by itself reject or erase an
   existing Area event ResRef, because ordered HAK/base runtime resolution is
   not closed by this audit.

## Diagnosability and budgets

The response must include immutable module revision, total matching ResRefs,
page offset/limit, exact status counts for the complete admitted catalog, and
the rejected-descriptor count. Operational logs may record only the revision,
counts, duration, result code, and bounded pagination values; script ResRefs,
source text, bytes, storage keys, and host paths are forbidden telemetry.

V1 budgets are:

- at most `50,000` committed descriptors inspected, matching the manifest
  limit;
- at most `10,000` admitted script ResRefs;
- query search length `0-16` canonical lowercase characters;
- page limit `1-200`, default `100`;
- response size below `256 KiB`;
- no streaming; additive fields only within API v1.

Exceeding an inspection/catalog budget fails the query; it is not a truncated
success.

## Remaining proof boundary

This offline audit and catalog implementation cannot close:

1. exact runtime precedence across module, ordered HAK, override, campaign,
   and base-game layers;
2. NSS-to-NCS freshness or compiler provenance;
3. compiling NSS inside Aurora Web;
4. browser selection/save/reopen proof;
5. exact-candidate Toolset Save/Build/reopen proof;
6. NWN event-dispatch proof.

No installed skill matches an immutable, offline decompilation-plus-manifest
audit without controlling Toolset or a browser. The smallest native read-only
workflow was used. No Toolset, NWN, browser, service, capture, or repository
mutation outside this documentation artifact was started during the audit.

## Implementation checkpoint

The source-closed catalog contract is implemented through one additive,
authenticated query. The committed-snapshot reader exposes a defensive,
content-key-free descriptor view; the Area domain rejects non-canonical script
candidates and builds immutable exact-presence rows; the query service binds
the result to one captured module revision, filters and paginates it, enforces
the serialized response budget, and emits count-only telemetry. The HTTP
boundary is strict and server-authorized.

The frontend consumes the response only through a dedicated port and facade.
Its domain validator independently checks artifact/status/freshness coherence,
descriptor identity, ordering, totals, diagnostics, page bounds, and response
size. Area Properties offers only NSS-backed rows and retains any current
manual/external value. A paired row is visibly labeled as presence with
unverified freshness; `bytecode_only` rows are diagnostic and cannot be chosen
through the NSS-oriented selector.

Accepted offline gates are 21 focused backend catalog/snapshot assertions, 12
capability-catalog assertions, 36 focused frontend domain/port/facade/dialog
assertions, one regression-smoke assertion, and both production builds. The
immutable capability catalog is
revision `2026-08-24.32`. It removes the obsolete catalog-status blocker from
Area event binding and separately records web NSS editing/compilation as an
explicit not-started capability, so artifact discovery is not misreported as a
compiler implementation.

The browser, Toolset, NWN, effective-precedence, and compiler-provenance gates
listed above remain open. This checkpoint started no managed service, browser,
capture, Toolset, or NWN process while the coordinated VFX task retained that
shared lane.

## Compiler-path reverse continuation — 2026-08-26

The frozen primary sources were re-hashed before this continuation. The
decompilation SHA-256 remains
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`,
the function-index SHA-256 remains
`394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`,
and the string-index SHA-256 remains
`864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f`.
No GPL source was inspected.

The script-editor compile path at decompiled lines `417347-417703` provides
additional primary facts:

- it publishes the literal `ScriptCompiler` to the shared Toolset service
  surface before creating the compiler;
- it constructs the same internal compiler through
  `FUN_00b3b6d4(..., 0x7d9, 0x7da, 0x810)`, then binds `nwscript` and
  `WORKTEMP` inputs;
- it transfers the current editor source through `FUN_006c550c` and
  `FUN_006c5890` before calling `FUN_00b432c8`;
- a zero result enters the success presentation path at lines
  `417676-417703`; a non-zero result reads the compiler diagnostic surface at
  compiler offset `0x2c9c`, extracts an indicated source line when possible,
  and selects/bookmarks that line at `417705-417878`;
- the special negative results `-0x26f` and `-0x143e` drive an additional
  mode-confirmation branch before one retry. Their user-facing semantic names
  are not yet source-closed and must not be exposed as stable application
  error codes.

The separate bulk path `FUN_00521f94` confirms the same constructor at line
`182717`, compiler input registration, and iteration over the resulting
resource names as type `0x7da` at lines `182999-183006`. The compiler entry
`FUN_00b432c8` is internal stateful Toolset code, not evidence of an external
CLI or ABI that Aurora Web can safely call.

A bounded read-only inventory of the installed Steam NWN root found
`nwtoolset.exe` and `nwmain.exe` but no standalone `nwnsc.exe`,
`nwscript.exe`, or named compiler executable. This proves only the inspected
installation state; it does not prove that a supported compiler can never be
installed separately.

### Updated implementation boundary

The new evidence closes the Toolset editor's high-level compile lifecycle and
diagnostic branching, but not a production-safe Aurora Web execution
boundary. `properties_event_scripts_compile` therefore remains
`missing/not_started/hidden`. Implementing an in-process compiler clone,
calling internal Toolset addresses, accepting an arbitrary third-party
compiler, or treating paired NSS/NCS presence as freshness would all violate
Aurora-first and no-guessing.

The next admissible research step is to establish one supported compiler
provider contract with immutable binary/version identity, bounded source and
include inputs, deterministic NSS/NCS/NDB outputs, structured diagnostics,
freshness receipt, cancellation/resource limits, and negative fixtures. Until
that evidence exists, the application may continue to expose the existing
read-only artifact catalog and event ResRef binding only.

## External compiler-provider implementation checkpoint — 2026-08-26

The previously missing provider boundary is now partially closed. A local
`nwn_script_comp.exe` identifies itself as
`neverwinter 2.1.2 (/07a475, nim 2.2.4)` and describes itself as the CLI over
the official open-source compiler library. Its exact SHA-256 is
`8ba368d0c80149c502faad66aa5cbd200655aeec88f73048d384122ce2d84a58`.
The accompanying neverwinter.nim license is MIT; no xoreos or GPL source was
used for the adapter. The binary is an operator-supplied external provider and
is not copied into or bundled with Aurora Web.

The exact release-source lineage remains intentionally unresolved. The binary
reports short commit `07a475`, which is absent from the local audit clone whose
HEAD is `db755db7fdfa3e4245e30b2aebfbae6e75b6ea77`. Aurora Web therefore admits
the provider only by exact binary bytes, version output, hash-bound language
specification, and a complete runtime-library set. It does not claim that the
local clone is the source used to build that executable and must not bundle the
binary until release-source attribution is closed.

The new backend port and adapter implement the frozen provider contract:

- canonical target/include ResRefs and exact byte inputs;
- 256 KiB per source, 1,024 includes, and 8 MiB aggregate input limits;
- a copied invocation-owned provider directory with exact executable,
  launcher, language-specification, and runtime-library identities;
- `--no-keys`, `--no-ovr`, one worker, safe optimization level 1, NCS plus NDB,
  bounded include depth, a 30-second hard maximum timeout, 64 KiB process
  output cap, and 4 MiB artifact caps;
- deterministic source/include/provider/execution/artifact hashes and one
  freshness-receipt SHA-256;
- structured bounded diagnostics that retain severity and source line while
  removing host paths, timestamps, raw output, and source text;
- a disabled-by-default production configuration whose five identity fields
  must be supplied together before the Nest provider selects the executable
  adapter.

The real provider compiled the valid fixture twice to byte-identical results:
NCS SHA-256
`404883a3cfacd4190cc7dc0a1dc172cf342d1fdc13f6c5405eccb6bd3039e35b`
and NDB SHA-256
`f8d78a55fa7f139bbe51e037a254518fb67bcf7d493d1f8191aad86a08ac3a9a`.
The invalid fixture exited non-zero, emitted no accepted artifact, and produced
one sanitized `NWNSCRIPT_COMPILE_ERROR` at line 3. Six adapter assertions,
seven configuration assertions, module wiring, the capability catalog, and
the backend production build pass under the repository's 1 GiB limit. The
durable provider packet is
`output/proof/area-event-script-compiler-provider-audit-2026-08-26/provider-verification.json`
(SHA-256
`627a1fc21a9feb069d257d395870ff207855cbd01e3548772a233b81cdcdcd79`).

`properties_event_scripts_compile` advances from `not_started` to `partial`
and remains hidden. The remaining product work is the NSS editor, an
idempotent revision-fenced module transaction that publishes and reads back
the exact NSS/NCS/NDB set, frontend diagnostics/freshness presentation, exact
release-source attribution if the binary is ever bundled, and fresh browser,
Toolset Save/Build/reopen, plus NWN event-dispatch proof. A compile receipt by
itself does not mutate a module or prove event execution.

## Revision-fenced publication checkpoint — 2026-08-26

The backend publication boundary is now implemented for the already established
NSS `2009`, NCS `2010`, and NDB `2064` resource contract. This checkpoint does
not add a new Aurora semantic. It composes the audited resource types and the
hash-bound compiler provider through the additive FE-BE contract section
`revision-fenced NWScript validation and publication v1`.

`POST /api/v1/modules/{moduleId}/scripts/{targetResRef}/validate` performs a
non-mutating compile, while
`PUT /api/v1/modules/{moduleId}/scripts/{targetResRef}` recompiles and publishes
the exact three-resource set. Both routes are admin- and
`area.materialize.update`-protected. The raw route payload is capped at 512
KiB before JSON parsing. The domain boundary independently caps target source
at 256 KiB, includes at 1,024 entries, and the complete target-plus-include
compiler input at 8 MiB.

Include bytes are resolved only from the exact committed module revision. The
publication coordinator authorizes before reading retained idempotency, compiles
before acquiring the shared module lock, rechecks the locked head and `If-Match`,
then stages an immutable successor manifest. One fenced head CAS makes NSS, NCS,
and NDB visible together. Independent descriptor and content readback must pass
before the byte-free receipt and idempotency entry become complete.

Memory and MySQL control stores persist only the candidate manifest, journal
state, and verified receipt; source and artifact bytes are absent. Startup
recovery acquires an exact recovery lease. A retained `readback_verified`
transaction is finalized only after fresh manifest/content verification. Every
earlier state restores the exact baseline. If restoration cannot be proved, the
module is quarantined under the fencing lease, including the prepared/no-stage
edge case.

Routine telemetry contains only operation, outcome/result code, revision,
source/include/diagnostic/resource counts, and duration. It excludes module and
target identities, source/include text, artifact bytes, storage keys, provider
paths, and compiler raw output. Recovery emits a separate bounded outcome event.

Accepted offline evidence is 20 focused unit suites with 135 assertions, one
atomic integration suite with two assertions, the capability catalog gate, and
a passing backend production build. The exact packet is
`output/proof/area-event-script-publication-transaction-audit-2026-08-26/publication-verification.json`
(SHA-256
`1fcf5f5069c47033929faad95107984aefb7e43c9df2d0edab66fa85d50922c8`).
One ordinary typed Jest attempt exhausted the mandatory 1 GiB heap before an
assertion result; the repository's bounded isolated-module runner passed the
complete focused set without increasing that limit, and full TypeScript
compilation passed independently.

Capability catalog revision `2026-08-26.51` removes
`nss_snapshot_publication_transaction_not_implemented`. The capability remains
`verified/partial/hidden` because the frontend NSS editor and compiler
diagnostics are not implemented, exact release-source lineage remains unresolved
for any bundling claim, and fresh browser, Toolset Save/Build/reopen, plus NWN
event-dispatch evidence is absent. No Docker process, managed service, browser,
Toolset, or NWN process was started, stopped, or restarted for this checkpoint.

## Committed-source editor checkpoint — 2026-08-26

The remaining application-side NSS editor and diagnostics gaps are now closed
offline. The additive authenticated source query
`GET /api/v1/modules/{moduleId}/scripts/{targetResRef}/source` requires an
exact expected module revision. It verifies the immutable head, canonical
manifest identity and hash, one exact type-2009 descriptor, content identity,
the 256 KiB source budget, and a lossless UTF-8 round trip. Missing source is a
stable 404; stale revision, invalid text, corrupt/ambiguous storage, and an
unexpected infrastructure exception fail through bounded stable contracts.

The frontend now owns strict v1 validators for source commands, source
snapshots, compiler validation results, and publication receipts. A dedicated
port and HTTP adapter enforce response-size and command budgets, bind every
response back to the originating module/ResRef/revision, and discard backend
messages/details. A facade is created in the browser composition root and is
passed through the workspace boundary; React components do not import the HTTP
adapter.

The Area Events property tab can load one committed NSS source, intentionally
start a missing script as blank, edit the complete include ResRef set, validate
without mutation, show bounded line/column compiler diagnostics and artifact
size/hash metadata, and publish the exact atomic NSS/NCS/NDB successor. Source,
include, target, or revision changes invalidate retained validation and
publication state. Publish remains disabled until the current command has a
matching compiled result; a publication receipt is accepted only when all
command and compiler identities match, after which the editor advances to the
verified successor revision.

The accepted offline gate is 37 assertions across five focused backend suites,
58 assertions across seven focused frontend suites, and passing backend plus
frontend production builds. The frontend build retains the pre-existing Vite
large-chunk warning; it is not a functional failure. The exact 29-file packet
is
`output/proof/area-event-script-editor-offline-audit-2026-08-26/editor-verification.json`
(SHA-256
`d08048fe22586c38953100d699fcf37dfa37a202f1924035a57777bdc29dd2da`).

Capability catalog revision `2026-08-26.52` advances
`properties_event_scripts_compile` to `verified/implemented/hidden` and removes
the obsolete editor and frontend-diagnostics blockers. It remains hidden
because exact compiler release-source lineage is unresolved. Fresh browser,
Toolset Save/Build/reopen, and NWN event-dispatch proof also remain mandatory
program evidence and are not replaced by this offline checkpoint. No Docker,
container, service, browser, Toolset, NWN, capture, or mutation-test process was
started for this work.

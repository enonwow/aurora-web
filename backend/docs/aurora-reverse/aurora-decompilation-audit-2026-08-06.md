# Aurora decompilation and reverse-evidence audit - 2026-08-06

## Executive verdict

**Overall status: NO-GO for a claim of complete, reproducible Aurora
decompilation or canonical Aurora/NWN parity.**

The repository contains substantial, useful primary reverse evidence. The
local Ghidra export exists, its key function anchors can be reproduced, the
currently installed Aurora/NWN binaries match hashes recorded in the later VFX
audit, and the retail-parity gate correctly keeps all ten VFX fixtures blocked.

The evidence system is not yet an auditable lineage, however:

1. the May Ghidra export has no manifest binding it to an input binary,
   toolchain, analyzer profile, scripts, image base, and per-file checksums;
2. legacy reverse documents use xoreos as runtime authority in direct conflict
   with the current GPL secondary-reference policy;
3. principal readiness documents contradict the present implementation and
   later audits;
4. almost the entire 8.47 GB evidence corpus is ignored/untracked, contains
   mutable browser profiles, and is required by gates that cannot run in a
   fresh/current checkout;
5. retail runtime/render/capture/comparison evidence remains missing for every
   required VFX fixture.

Limited implementation work may continue only where a claim is bound to an
exact primary binary/export hash, the current code contract, tests, and an
explicit non-parity classification. Missing Aurora semantics remain blocked.

This was a read-only evidence audit. It did not decompile a new binary, modify
product code, run Aurora Toolset, run NWN, or promote any parity claim.

## Scope and classification rules

Repository snapshot:

- repository: `C:\Projects\aurora-web`;
- branch: `codex/tile-matrix-resume-20260729`;
- HEAD: `348e8ff0e27677b7c611c56afa4d706685b393f0`;
- effective tree: dirty, with 773 status entries before the audit reports;
- audit date: 2026-08-06.

Evidence classifications used in this report:

- **confirmed primary**: directly rechecked in the approved Aurora/NWN binary
  or the hash-identified decompiler export;
- **confirmed repository**: directly rechecked in current source, tests,
  manifests, or tracked documentation;
- **inference**: consistent with evidence but not directly bound/proven;
- **local-only**: present on this workstation but not reproducible from the Git
  revision;
- **missing**: required evidence is absent or a gate cannot read it.

Browser screenshots, local MP4 files, and application observations are never
treated as Aurora proof on their own. Completion claims must still satisfy the
project's live-proof and capture-safety contracts.

Severity meanings:

- **P0**: blocks use of a claim as authoritative or shippable Aurora evidence.
- **P1**: high-risk provenance, freshness, parity, or control-plane defect.
- **P2**: material maintainability or portability defect.
- **P3**: evidence hygiene/storage defect with lower semantic risk.

## Evidence inventory

### Primary local export and binaries

The following files were re-hashed during the audit:

| Evidence | Bytes | SHA-256 | Classification |
| --- | ---: | --- | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | 30,366,020 | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` | confirmed local primary export |
| `C:\Projects\New Folder\export\functions.tsv` | 1,928,975 | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` | confirmed local export index |
| `C:\Projects\New Folder\export\imports.tsv` | 313 | `6CC00E29A0ACC634FDE748B2B65AC1A845E3326A39A4C9F01AA641D7D3D4F5AF` | confirmed local export index |
| `C:\Projects\New Folder\export\strings.tsv` | 2,691,636 | `864AE0139451D5333307CB2BBCCCE725BBD2D2C6056AC2D5F80F9B5EA50F190F` | confirmed local export index |
| `C:\Projects\New Folder\export\strings_2da.tsv` | 8,070 | `620D48990D12849C391E997BC564ACC1A758FA94994201FB1365F7356A0DB6AA` | confirmed local export index |
| `C:\Projects\New Folder\export\xrefs_domain.txt` | 6,839 | `90E5F66C02B04FEC15F53564FEE69EF3FC22E352E931019E25995823BC87CE9F` | confirmed local export index |
| approved `bin\win32\nwtoolset.exe` | 12,201,984 | `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24` | confirmed installed binary |
| audited `bin\win32\nwmain.exe` | 21,071,872 | `3B7CB1252E0EDB2CE22D7971F333AADE027039AE30A45B4BC64732C3E6BEC73A` | confirmed installed binary |
| symbolic `bin\linux-x86\nwmain-linux` | 26,557,296 | `6D19C39BC646AF5DDBC333FF31797A4ACD9019506BCB45EF1B93B1BD5925E700` | confirmed installed binary |

The four principal hashes match
`vfx-full-decomp-implementation-audit-2026-07-16.md`. That is a strong
integrity check for the files present today. It does **not** replace a
generation manifest proving which exact binary, Ghidra configuration, scripts,
and analysis database produced `decompiled_all.c`.

### Reverse corpus size and version-control state

One enumeration during this audit found:

- 63,076 files;
- 8,468,002,213 bytes;
- 471 Markdown files;
- 3,844 JSON files;
- 3,172 PNG files;
- 180 MP4 files;
- 33,446 files without an extension;
- 9,904 UTP, 3,290 NSS, 2,038 NCS, and 1,579 UTI files.

Immediate storage split:

| Directory | Files | Bytes |
| --- | ---: | ---: |
| `artifacts/` | 45,369 | 5,697,848,824 |
| `evidence/` | 17,409 | 2,760,658,210 |
| `function-manifests/` | 13 | 17,646 |
| `proof-profiles/` | 3 | 3,947 |

Only 168 paths totaling 8,443,138 bytes are tracked by Git. The reverse tree
had 124 status entries: 7 modified and 117 untracked entries. A status entry
can represent an entire untracked directory, so it understates the number of
unversioned files.

The local corpus grew materially between two enumerations made during the same
audit. This is confirmed local evidence that the evidence root is not
immutable. The largest files are Chrome cache objects and browser-downloaded
TensorFlow Lite models inside `*.chrome-profile` directories, not curated
Aurora proof artifacts.

## Confirmed primary anchor sample

The audit re-read a representative sample of the May reverse matrix against
the current hash-identified `decompiled_all.c` and `functions.tsv`:

| Claim | Rechecked source |
| --- | --- |
| `Mod_CustomTlk` read | line 262330 contains the `s_Mod_CustomTlk` read path |
| `Mod_HakList` read | line 262516 calls `FUN_00aeeb7c` for `s_Mod_HakList` |
| GIT creature/door/placeable list reads | lines 221380, 221390, and 221420 call `FUN_00aeeb7c` with the three list keys |
| `AreaProperties` read | line 220662 calls `FUN_00aeecf8` with `s_AreaProperties` |
| transition fields | lines 213671/213674 read `LinkedToFlags`/`LoadScreenID`; lines 213699/213700 write byte/ushort values |
| function identities | `functions.tsv` contains the documented entries for `FUN_0055aba0`, `FUN_0056716c`, `FUN_00567dcc`, and `FUN_005b5bc4` |

These claims are confirmed primary for this exact export hash. They do not by
themselves prove higher-level policy such as duplicate-key resolution, full HAK
precedence, bounds behavior, or which alternative GIT call path is canonical.

## Findings

### RE-P0-01 - the primary Ghidra export has no reproducible lineage manifest

Status: **confirmed missing**.

The repository's R74 first-export standard defines a canonical packet with:

- `manifest.json`;
- toolchain/analyzer metadata;
- per-artifact checksums;
- a function inventory;
- call-graph edges;
- source/string indexes;
- per-function decompile records;
- explicit failed-decompile records.

Neither `backend/docs/aurora-reverse/exports/ghidra/...` nor the external
`C:\Projects\New Folder\export` contains that packet. The external directory
contains only six flat export files. In particular, it has no manifest,
toolchain record, checksum list, call graph, analysis-script revision, or
failed-function ledger.

The export strongly appears to be the 32-bit Toolset analysis used throughout
the May corpus, but that binary-to-export relationship is an **inference**, not
a cryptographically bound fact. A matching binary hash in a later document
does not prove that the earlier export was generated from that binary.

Impact: another workstation cannot reproduce the analysis, distinguish an
analyzer/tool drift from a semantic difference, or verify that all claims refer
to one binary lineage. This blocks promotion of the May corpus as an immutable
decompilation baseline.

Required remediation:

1. create a versioned manifest binding input binary SHA-256, size, PE image
   base, NWN build/version, Ghidra version, analyzer options, project/archive
   identity, export scripts and their hashes, export time, and every output
   hash;
2. include failed/partial decompile records and call-graph coverage;
3. store the packet in Git if small, or in immutable content-addressed storage
   with a tracked manifest and retrieval verification;
4. rerun a small deterministic anchor set and compare addresses/text hashes
   before accepting the packet.

### RE-P0-02 - legacy documents violate the xoreos secondary-reference boundary

Status: **confirmed repository policy conflict**.

Across tracked reverse Markdown, `git grep` found 93 xoreos reference lines in
14 files. Only one line contains a `github.com/xoreos` URL, and that URL points
to mutable `master`. None of those lines contains a 40-character commit SHA.
No compliant `sourceClass` record was found.

This is not only a citation-format problem. Examples include:

- `hak-resolution-spec-r63.md`, which labels xoreos source lines as "hard
  anchors" and derives numeric resource priorities, HAK reversal, and winner
  behavior from them;
- `unknowns-linkedtoflags-loadscreenid-r65.md`, which explicitly closes backend
  runtime semantics over xoreos while retail NWN remains outside the closure;
- `vfx-aurora-first-implementation-readiness-r90.md`, which links to xoreos
  `master` for unresolved flag names without immutable revision/admission
  metadata.

This conflicts with the current project rule: xoreos is GPL-3.0 secondary
format/naming evidence only and cannot establish Aurora runtime semantics.

No xoreos use was found in `backend/src` or `frontend/src`. Three utility
scripts mention only `"xoreosUsed": false`. Therefore this audit confirms a
documentation/provenance breach, **not detected source-code copying**.

Impact: any implementation decision inherited from those documents may have an
invalid authority chain and an unresolved GPL/process risk even if the current
code was independently written.

Required remediation:

1. quarantine every affected claim as `secondary_unconfirmed`;
2. for each allowed format/naming observation, record immutable repository URL
   and commit SHA, exact observation, `sourceClass`, what it does not prove,
   independent primary confirmation, and follow-up test;
3. re-derive runtime behaviors from approved Aurora/retail binaries, Toolset/NWN
   observations, or separately licensed specifications;
4. remove xoreos-derived implementation conclusions that cannot be confirmed;
5. add an automated documentation gate rejecting mutable xoreos URLs and
   missing admission records.

### RE-P1-01 - principal readiness documents contradict current implementation

Status: **confirmed source-of-truth drift**.

`vfx-aurora-first-implementation-readiness-r90.md` is dated 2026-06-02 and
still says:

- the VFX runtime is `NOT_STARTED`;
- the frontend has a preserve-only placeholder;
- the current renderer is only a scaffold/preview;
- the next best PR should begin by creating contracts that now exist.

Current source contains approximately 20,452 lines in 21 backend VFX files and
approximately 18,220 lines in ten VFX-named frontend/runtime files. It includes
versioned payloads, source policy, runtime state, retail-parity validation,
scene runtime, and a 5,940-line canonical renderer. The July full-decomp audit
also explicitly describes a substantial source-backed implementation.

The frontend knowledge base has the same pattern: its May coverage snapshot
and "not implemented" list coexist with June addenda and later code, with no
formal supersession boundary. Many source line references in the 8,831-line
readiness document no longer point to the described code.

Impact: engineers following the mandatory pre-flight reference can make the
wrong implementation decision, duplicate completed work, or treat an obsolete
gap as current. Conversely, later implementation claims can bypass earlier
HOLD decisions without one visible closure record.

Required remediation: replace accreted status prose with a generated claim
index. Every claim needs `claimId`, scope, source hashes, status, code revision,
test revision, supersedes/supersededBy, canonical-parity status, and open
blockers. Historical narrative should remain immutable but must be visibly
marked superseded.

### RE-P1-02 - the evidence corpus is local, mutable, and unavailable to required gates

Status: **confirmed**.

`.gitignore` excludes:

- `backend/docs/aurora-reverse/artifacts/`;
- `backend/docs/aurora-reverse/guard-reports/`;
- `frontend/public/aurora-evidence/`;
- Chrome profile directories;
- `.codex-tmp/`.

This makes sense for bulk data but no tracked retrieval manifest replaces the
ignored content. Four current VFX governance gates fail immediately with
`ENOENT`:

| Gate | Missing first dependency |
| --- | --- |
| retail capture setup validation | `guard-reports/vfx-domain-coordinator-latest.json` |
| retail blocker freshness | `artifacts/vfx-iteration-215/vfx-retail-blocker-packet.json` |
| runtime-health/blocker cross-check | `guard-reports/ai-factory-director-latest.json` |
| worker directive alignment | `guard-reports/vfx-domain-coordinator-latest.json` |

The ignored corpus also contains full Chrome user profiles, HTTP caches,
databases, optimization models, logs, and other mutable browser state. The
largest observed individual files were 41.67 MB cache objects and 36.78 MB
TFLite models.

Impact: proof maintenance depends on workstation residue; a fresh clone cannot
run the gates; evidence can change after capture without changing a Git commit;
and storage volume obscures the actual proof packet.

Required remediation:

1. define an evidence manifest with immutable object hashes, sizes, MIME types,
   capture identity, source revision, and external storage URI;
2. keep only intentional capture outputs and structured diagnostics; exclude
   browser profiles/caches from proof packets;
3. make gates fetch/verify their exact dependencies or fail with a single
   actionable `missing_evidence` result rather than a raw `ENOENT` stack;
4. separate ephemeral working state, diagnostic artifacts, accepted evidence,
   and retail proof physically and by schema;
5. add garbage-collection and retention policy after immutable upload.

### RE-P1-03 - canonical VFX parity remains missing for every required fixture

Status: **confirmed expected block**.

The current strict validator reports:

- fixtures: 10;
- canonical allowed: 0;
- blocked: 10;
- missing retail build records: 10;
- missing source admission: 6;
- missing parser snapshots: 10;
- missing resolver traces: 10;
- missing runtime tick dumps: 10;
- missing render-contract snapshots: 10;
- missing capture references: 10;
- missing comparisons: 10;
- `allCanonicalClaimsValid: true` because no invalid canonical promotion was
  attempted.

The evidence-pack dry run found five existing fixture packs and five missing
packs. All five existing packs are placeholders, none is ingestible, and there
are zero promotion attempts.

This is a positive fail-closed behavior. It is also a hard boundary: unit tests,
Web screenshots, local MP4s, source-backed geometry, and comparison previews do
not establish canonical Aurora/NWN parity.

Required remediation: populate one complete fixture at a time with exact
retail build identity, admitted source, parser snapshot, resolver trace,
runtime tick dump, render contract, settled capture, and synchronized
comparison. Promotion must remain impossible until every required lane passes.

### RE-P1-04 - durable loop/claim control state is stale relative to the code

Status: **confirmed**.

The VFX and Areas loop/claim registries were last updated on 2026-06-17, while
substantial implementation and audit documents continue through July and the
current tree is dated August. The VFX registry contains 88 claims and the Areas
registry 56, but their top-level state still records retail/capture blockers and
iteration assignments that required ignored guard reports. The VFX retail
manifest remains correctly non-canonical, yet the control-plane freshness
gates cannot run because their dependencies are missing.

Impact: `latest` and `active` status are not reliable current-state signals.
Historical worker completion can be mistaken for current implementation or
proof validity.

Required remediation: make claim state append-only and revision-bound; compute
"current" views from tracked/verified inputs; expire claims automatically when
source/test/evidence hashes change; and make missing control-plane dependencies
a structured blocked state.

### RE-P1-05 - strict Area/parser HOLD has no visible closure record

Status: **confirmed documentation gap; implementation impact requires claim-by-claim review**.

The May convergence set explicitly leaves strict Area/parser behavior on HOLD
until `MH-01`, `MH-02`, `MH-03`, `MH-05`, `MH-07`, and `MH-08` are closed by a
targeted Ghidra packet plus round-trip/alias/bounds tests. A search of the
tracked reverse corpus found the open/HOLD records but no document that closes
those IDs or formally unlocks the scope.

The current application has extensive Area parsing, projection, editing, and
runtime behavior. Some of it may be preserve-first or intentionally defensive
and therefore outside the strict HOLD. This audit does not infer a violation
for every Area feature. It does conclude that any strict alias, duplicate,
overflow, canonical call-path, or retail-precedence claim lacks a visible
closure chain.

Required remediation: audit current Area behaviors against the original HOLD
matrix. Mark each as preserve-only, project policy, confirmed primary, or
blocked. Close an MH identifier only with the required primary packet and
tests, then record the unlock decision explicitly.

### RE-P2-01 - tracked documentation depends on workstation-specific and temporary paths

Status: **confirmed**.

Tracked reverse documentation contains:

- 1,468 lines with absolute `C:\Users`, `C:\Projects`, or
  `C:\Program Files` references across 49 files;
- 142 `.codex-tmp` reference lines across ten files.

Examples cited by the principal VFX readiness note are missing today:

- `.codex-tmp/neverblender_40-010`;
- `backend/tmp_cot_fx01.mdl`.

Absolute paths are useful capture metadata, but they are not durable evidence
references without a content hash and portable retrieval mechanism.

Required remediation: keep the original path as provenance metadata while
also storing a content hash, logical artifact ID, immutable URI/repository path,
and verification command. Temporary paths must never be the only evidence
location.

### RE-P2-02 - the reverse index covers the May convergence set, not the current corpus

Status: **confirmed**.

`reverse-artifact-manifest-r85.md` is internally consistent: all 35 referenced
Markdown files exist. It covers the May backend convergence program, however,
not the later hundreds of VFX, Areas, Toolset, proof, and decompilation audits.
The 8,831-line R90 readiness note and multiple later implementation audits now
act as informal indexes without one current authority order.

Impact: reviewers must discover which document supersedes which by reading a
large chronological corpus, increasing the chance of accepting a stale or
scope-mismatched claim.

Required remediation: maintain small domain indexes generated from claim
metadata. Do not keep appending current status to historical readiness notes.

### RE-P2-03 - historical test evidence is not bound to the current dirty tree

Status: **confirmed**.

The July VFX implementation audit records many focused passing counts. The
current broad application audit has red backend unit/e2e and frontend
unit/regression gates. Both statements may be true at their respective
revisions, but most historical test summaries do not bind a clean tree hash,
dependency lock digest, and artifact hash strongly enough to be interpreted as
current.

Required remediation: every verification record must include commit/tree hash,
dirty diff digest or clean-tree assertion, lockfile hash, exact command,
start/end time, exit code, test runner version, and output artifact hash.

## Automated gate results

Commands were run from `backend/` unless stated otherwise.

| Gate | Exit | Result |
| --- | ---: | --- |
| `npx.cmd ts-node --transpile-only scripts/validate-vfx-retail-parity.ts` | 1 | expected blocked: 10/10 fixtures, 0 canonical allowed |
| `node scripts/check-vfx-retail-evidence-packs.mjs --out <audit-temp>` | 0 | expected fail-closed dry run; 5 missing packs, 5 placeholder packs, 0 ingestible |
| `node scripts/check-item-decomp-remaining-contract.mjs --outDir <audit-temp>` | 0 | PASS; UTG remains unsupported-gated-LTR-only, 653 source-blocked items, 0 Web-bug candidates, 7 visual-matrix cases |
| retail capture setup validation | 1 | non-runnable: missing coordinator guard report |
| retail blocker freshness | 1 | non-runnable: missing iteration-215 blocker packet |
| runtime-health/blocker cross-check | 1 | non-runnable: missing director guard report |
| worker directive alignment | 1 | non-runnable: missing coordinator guard report |

Local diagnostic outputs were written only under:

`C:\Projects\aurora-web\.codex-tmp\audit-2026-08-06\decomp`

They are not canonical evidence.

## Integrity checks that passed

1. All 35 references in `reverse-artifact-manifest-r85.md` exist.
2. All 19 `evidence/` or `artifacts/` references extracted from
   `vfx-full-decomp-implementation-audit-2026-07-16.md` exist on this
   workstation.
3. The row-22 Web MP4 hash rechecked as
   `31CEF4AFAB5842273902491ABFCB28CDBF204F746A25C5210C763459291C9882`,
   matching the audit.
4. Its synchronized comparison MP4 hash rechecked as
   `37EF72DF6D1F1C0FCC8E603B9921040BF258D28713C4FEDEE3547F2805642A97`,
   matching the audit.
5. The approved Toolset, retail Windows client, symbolic Linux client, and
   decompiler export hashes match the later VFX audit.
6. Representative address/line claims from the May validation matrix still
   match the current export.
7. The retail-parity validator and evidence-pack checker fail closed rather
   than converting placeholders into parity.
8. No xoreos reference was found in production backend/frontend source.

These checks demonstrate real value in the corpus. They do not cure the missing
lineage, portability, freshness, and retail-evidence gaps.

## Required recovery plan

### Phase 0 - establish one immutable primary lineage

1. Select the approved Toolset/runtime binaries by exact hash.
2. produce the R74-or-newer Ghidra packet with toolchain and analyzer metadata;
3. hash every input, script, database/export, and output;
4. validate the representative anchor set;
5. store a tracked manifest plus immutable artifact retrieval.

Exit: a fresh workstation can fetch, hash, and reproduce the export inventory
and anchor checks without local-path assumptions.

### Phase 1 - repair authority and claim governance

1. inventory all xoreos-derived claims;
2. quarantine them and re-derive runtime semantics from primary evidence;
3. publish domain claim indexes with supersession and freshness metadata;
4. reconcile the R90/VFX, frontend knowledge, and current implementation
   states;
5. review strict Area behavior against the unresolved HOLD matrix.

Exit: no active implementation claim depends on xoreos runtime semantics, every
current claim has one authority chain, and stale documents are visibly
superseded.

### Phase 2 - make evidence portable and gates runnable

1. separate ephemeral browser state from accepted proof;
2. upload accepted large artifacts to content-addressed immutable storage;
3. track manifests and schemas;
4. teach gates to fetch/verify exact inputs;
5. regenerate current loop/claim views from verified sources.

Exit: all evidence-governance gates run from a fresh clone and produce
structured pass/blocked/fail results without `ENOENT`.

### Phase 3 - close parity fixture by fixture

Populate complete retail packets in priority order. Preserve the existing
fail-closed validator and require the exact capture-safety contract for every
promotion.

Exit: a fixture is canonical only when all primary, runtime, render, capture,
and comparison lanes pass for the same immutable binary/model/module and code
revision. Completion of one fixture must not promote the other nine.

## Acceptance criteria for a future PASS audit

A future Aurora decompilation audit may return PASS only if:

1. the primary export is reproducible and cryptographically bound to approved
   binaries and toolchain configuration;
2. all active reverse claims have explicit fact/inference/local-only status;
3. no active runtime conclusion relies on xoreos as authority;
4. current source-of-truth indexes have no unresolved conflicts or stale
   `NOT_STARTED`/implemented contradictions;
5. every required evidence gate runs from a clean clone;
6. strict Area HOLD claims are either still blocked or explicitly closed;
7. canonical-parity claims pass the retail evidence gate rather than relying
   on screenshots, focused tests, or local comparisons;
8. the application test baseline used by the evidence is green and bound to a
   clean revision.

## Commands used

Representative commands:

```text
Get-FileHash <export-or-binary> -Algorithm SHA256
git ls-files -- backend/docs/aurora-reverse
git status --short -- backend/docs/aurora-reverse
git grep -n -i xoreos -- backend/docs/aurora-reverse/*.md
git grep -n -F .codex-tmp -- backend/docs/aurora-reverse/*.md
rg -n <anchor tokens> C:\Projects\New Folder\export\decompiled_all.c
npx.cmd ts-node --transpile-only scripts/validate-vfx-retail-parity.ts
node scripts/check-vfx-retail-evidence-packs.mjs --out <audit-temp>
node scripts/check-item-decomp-remaining-contract.mjs --outDir <audit-temp>
```

## Limitations

- No new Ghidra project or decompilation run was created.
- No live Toolset/NWN proof was requested or executed; therefore this report
  makes no new visual parity finding.
- The 8.47 GB local corpus was inventoried and sampled, not semantically
  revalidated file by file.
- Absence of detected xoreos imports is not a full forensic code-origin audit;
  it is a repository text search plus documentation-chain review.
- The dirty tree prevents attribution of current behavior to a single commit.

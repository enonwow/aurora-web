# Aurora decompilation lineage v2 Ghidra exporter

`ExportAuroraDecompilationLineageV2.java` is the Ghidra-side producer for the
session evidence consumed by the repository lineage v2 producer and independent
validator. The Ghidra script never emits an authority flag and never accepts
coverage totals from its arguments.

## Immutable packet preparation

Prepare a new packet root before starting Ghidra. The following regular files
must already exist below that root:

- the exact input PE binary;
- an exact Ghidra distribution/build artifact;
- an exact project snapshot;
- the analyzer configuration;
- a UTF-8 invocation record containing the exact headless command and its
  immutable arguments;
- a byte-identical copy of `ExportAuroraDecompilationLineageV2.java` under the
  packet root.

The `export` directory must be absent or empty. The four generated files under
`generation` must not already exist. Symlinks and paths outside the packet root
are rejected. Use a new packet root when restarting an interrupted export; keep
the same `session-id` only when it is genuinely a continuation of that session.

## Headless invocation shape

Run the script as a post-script, after analysis, against the exact program in
the snapshotted project. On Windows the command shape is:

```text
<ghidra>\support\analyzeHeadless.bat <project-dir> <project-name> \
  -process <program-name> -readOnly \
  -scriptPath <packet-root>\generation \
  -postScript ExportAuroraDecompilationLineageV2.java \
  --packet-root <packet-root> \
  --session-id ghidra-session-<stable-id> \
  --input-binary <packet-root>\input\nwtoolset.exe \
  --tool-distribution <packet-root>\tool\<distribution-artifact> \
  --project-snapshot <packet-root>\project\<snapshot> \
  --analyzer-config <packet-root>\analysis\analyzers.json \
  --invocation-log <packet-root>\generation\invocation.log \
  --exporter-script <packet-root>\generation\ExportAuroraDecompilationLineageV2.java \
  --project-id <stable-project-id> \
  --relocation-policy loader-default-recorded \
  --timeout-seconds 120
```

For a resource-bounded lineage-complete but coverage-incomplete run, append one
canonical lowercase selection argument, for example:

```text
  --target-addresses 0x005a7fc8,0x005a9f30
```

Addresses must have the exact PE width, be lowercase, sorted by the exporter,
unique, and resolve to discovered function entry points. The exporter still
records every discovered function and builds the complete in-program call
graph; non-target functions receive `decompiler_not_targeted`. The selection is
stored in `generation.decompilationSelection` in the final attestation, and the
independent validator enforces its exact relation to all function records.
This mode reduces decompiler load without making a complete-coverage claim.

The invocation record is an input manifest, not console output that continues
to change while the script is hashing it. Runtime console/application logs may
be preserved as additional evidence, but they are not substituted for the
immutable invocation record.

The script verifies that the executing source bytes match `--exporter-script`,
that the loaded program is a PE with the expected binary hash (when Ghidra
exposes it), language width, and image base, then writes:

- `generation/function-records.jsonl`;
- `generation/failure-ledger.json`;
- `generation/call-graph.jsonl`;
- `export/*.c` for successful functions;
- `generation/session-attestation.json`, last.

After Ghidra exits, run the repository producer and validator described in
`backend/docs/aurora-reverse/aurora-decompilation-lineage-contract-v2-2026-08-17.md`.
Only the independent validator result can promote lineage authority.

## Profile-bound one-shot runner

The Area tile placeholder pass must use the repository runner instead of a
manually assembled headless command:

```text
npm run tiles:placeholder-decomp-run -- \
  --profile docs/aurora-reverse/proof-profiles/area-tile-placeholder-decompilation-pass1-2026-09-01.json \
  --profile-sha256 42b04c134dc9cb8c0da4f370728761ad48736b33d3f1f71e4f57b2f81e89485e \
  --preflight-out ../.codex-tmp/area-tile-placeholder-lineage-v2/<fresh-preflight>.json
```

`run-area-tile-placeholder-decompilation-pass.mjs` validates the profile and
live memory gate before creating the fixed packet root. It stages and rechecks
the bound files, restores the exact `.gar` into a fresh project, records the
exact portable command, uses `-readOnly`, `-noanalysis`, `-max-cpu 1`, and
`GHIDRA_HEADLESS_MAXMEM=1536M`, then runs the staged producer and independent
validator. It accepts the execution lane only when the lineage validator is
authoritative and every selected function has a successful decompile record.
Semantic review remains a separate required step.

The headless restore script follows the official Ghidra 12.1.3 `RestoreTask`
archive behavior documented in the
[NSA Ghidra source](https://github.com/NationalSecurityAgency/ghidra/blob/Ghidra_12.1.3_build/Ghidra/Features/Base/src/main/java/ghidra/app/plugin/core/archive/RestoreTask.java).
The script rejects unsafe names and links, verifies `JAR_FORMAT`, skips archived
project state and marker files, creates a fresh `.rep`, and creates an empty
local `.gpr` marker only after extraction succeeds.

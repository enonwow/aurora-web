# Native Save/runtime admission v1: offline delivery

Implemented in `C:/Projects/aurora-native-hidden-pre-area`, branch
`codex/native-hidden-pre-area-20260907`. The shared `aurora-web` checkout and its
branch are unchanged. No Toolset/NWN process inspection, mutation, capture,
launch, deployment, or native qualification was performed by this implementation.
The consumer owns its actual session and all later live operations.

## Contract and limits

`aurora-toolset-native-save-runtime-admission/v1` admits a saved MOD/ordered HAK
stack and its exact recorded Toolset owner to the existing S07 runtime workflow.
Its scope is `nativeSaveReadbackAndToolsetReview`, not human Paint admission.
It never adds `accessibleSurface:true`, never claims walkability, and retains
`runtimeClaimed:false`. The human entry/v2 verifier and witness workflow remain
unchanged. File validation verifies correspondence, not reviewer authenticity.

Use the original bootstrap profile and the successful
`geometry_saved_pending_entry_observation` manifest. The current MOD must match
post-save readback, entry/direction, complete fixture set and ordered HAKs.
The Save must have succeeded without invalid/inaccessible-location dialogs,
with a clean module title, no global input, and recorded full seven-digit UTC
process StartTime. No Save, dirtying action, Paint or reopen is performed here.

JSON is limited to 16 MiB, MOD to 128 MiB, PNG to 32 MiB. HAK verification now
streams 4 MiB chunks rather than buffering whole archives: at most 256 HAKs,
4 GiB each, 64 GiB combined. Descriptor and current-path identity, size,
nanosecond timestamps and SHA-256 are checked. Changed files fail closed.
The old human/v2 receipt replay retains its existing HAK-buffer limit; this
delivery extends inspection and the new Save/review branch, not that old workflow.

## Consumer sequence

Use the same frozen checkout for every step; changing a producer script after
prepare invalidates the request. All paths below are absolute placeholders.
Do not apply an overlay over a running native operation or overwrite a divergent
central file. The delivery manifest supplies before/after hashes for review.

1. Prepare saved-file evidence offline:

```text
node C:/Projects/aurora-native-hidden-pre-area/backend/scripts/aurora-toolset-native-save-runtime-admission.mjs prepare --profile <original-profile.json> --outDir <successful-geometry-dir> --evidenceDir <new-admission-dir>
```

It creates immutable source JSON copies, request and `capture-binding.v1.json`.
The request expires after 30 minutes. Partial output is retained; choose a new
evidence directory after investigating any preparation failure.

2. The session owner uses the existing central viewport operation to produce a
new genuine capture bound to the request. Preserve any earlier unbound captures.
This is capture only: do not repeat Paint or Save.

```text
node C:/Projects/aurora-native-hidden-pre-area/backend/scripts/aurora-toolset-viewport-proof.mjs capture --module <exact.mod-basename> --area <area-resref> --out <new.png> --resultOut <new-capture.json> --bindingFile <bindingPath-from-prepare>
```

3. Actually inspect that exact PNG and write a review with this shape. Populate
the request ID, reviewer/source reference, actual UTC review time and PNG hash.
The observation text must describe what was seen, including limitations. Do not
submit this template as a review, copy a prior image's review, or label an agent
observation as a user message.

```json
{
  "version": "aurora-native-save-toolset-review/v1",
  "requestId": "<requestId>",
  "actor": { "kind": "agent", "id": "<actual-reviewer-task-id>" },
  "source": {
    "kind": "agent_observation",
    "reference": "<actual-observation-reference>",
    "recordedAt": "<actual-UTC-time-after-capture>"
  },
  "captureSha256": "<exact-PNG-SHA256>",
  "verdict": "ready_for_runtime_test",
  "observations": {
    "areaSurface": "visible",
    "blankOrPlaceholder": false,
    "entryContext": "reviewed",
    "fixtures": "reviewed",
    "details": "<actual-image-observations-and-limitations>"
  },
  "walkability": "not_evaluated",
  "runtimeClaimed": false
}
```

If the image does not support those observations, retain the failure and do not
finalize a positive review. A screenshot alone or `verified:true` is insufficient.

4. Finalize and independently validate the immutable artifact:

```text
node C:/Projects/aurora-native-hidden-pre-area/backend/scripts/aurora-toolset-native-save-runtime-admission.mjs finalize --evidenceDir <admission-dir> --png <new.png> --capture <new-capture.json> --review <actual-review.json>
node C:/Projects/aurora-native-hidden-pre-area/backend/scripts/aurora-toolset-native-save-runtime-admission.mjs validate --admission <admissionPath-from-finalize>
```

5. Build the ordinary `aur-s07-runtime-profile/v1` from the returned artifact.
Copy the exact module identity plus `area`, `entryPoint.position` and
`entryPoint.direction` into `module.area`, `module.entryPoint` and
`module.entryDirection`; retain module `resref` and measured `bytes`. Copy the
complete fixtures and ordered HAK list. Set:

```json
{
  "geometryGate": {
    "kind": "native-save-review-v1",
    "status": "verified",
    "artifact": "<admissionPath>",
    "sha256": "<actual-artifact-SHA256>"
  },
  "launch": { "mode": "central_guarded_test_module_action", "processName": "nwmain" },
  "runtimeWindow": {
    "version": "aur-s07-runtime-window-policy/v1",
    "expectedDevice": "\\\\.\\DISPLAY1", "primary": false, "placement": "working-area"
  }
}
```

The new branch additionally requires the existing enhanced evidence policy and
engine-log configuration. Required artifact kinds, in order: runtime-observation,
runtime-capture, runtime-capture-metadata, engine-load-log,
engine-load-log-metadata, runtime-visual-review. Provide the existing policy
version `aur-s07-runtime-evidence-policy/v1`, minimum capture duration and actual
engineLog path, loadingModuleResref and expected requiredTokens.

Retain a separate consumer manifest tying Studio project/revision/snapshot,
export candidate, saved MOD/cumulative HAK hashes and actual compiled loop-script
resource hash to this runtime profile. The saved MOD hash binds all packed scripts;
the admission verifier does not infer a loop interval from script bytes. Measure
the interval from actual runtime footage. For a 10-second loop, capture enough
footage for at least two complete starts (e.g. 22 seconds after entry is visible).

6. Continue the existing S07 public commands: `dry-run`, `arm`,
`baseline-engine-log`, `dispatch-test-module`, `observe`,
`prepare-runtime-window-dry-run`, `prepare-runtime-window`, followed by the
existing owned runtime capture, log capture, actual visual review and packet
assembly/validation. Every S07 command revalidates the new artifact. Do not invoke
a leaf launch or placement atom as a substitute for S07 admission.

The new dispatch requires the exact reviewed PID/full StartTime/frame/viewer/
viewport, clean visible module and Area, no modal or NWN, and full frame bounds
inside non-primary DISPLAY1. It needs no restore for that visible state. The
existing Test Module atom repeats those checks before menu refresh and before
one post. A durable intent precedes dispatch. Partial/uncertain post and any
existing intent refuse retry. Window preparation retains its own immutable
attempt and checks the exact Toolset parent's StartTime against this admission.

## Offline acceptance

46 new Save/admission/streaming/dispatch tests PASS. They include real public CLI
prepare/validate/dry-run, mocked public dispatch and window preparation, extracted
PowerShell guard execution against inert mocks, full PowerShell parse, missing or
failed Save, changed MOD/HAK/order/entry/fixtures, foreign capture, 100 ns owner
drift, mismatched review hash, expired request, missing review, boolean-only and
human-witness substitution, evidence drift and immutable retry refusal.

66 focused regressions PASS (including 36 hidden-frame tests and human/v2,
saved-source and capture provenance tests). The existing window suite passes
43 cases. A 513 MiB TEST SIMULATION HAK hashed under a 64 MiB V8 heap, with about
48 MiB process RSS; a changed-during-read case also rejects and closes its fd.
Tests never used live process ports. Full backend application/e2e merge gates
were not run: this is an isolated native-script delivery, not a merge or deploy.

Remaining live acceptance: the consumer must run this public route on its exact
still-owned saved candidate, inspect NWN footage and verify entry, VFX behavior
and loop timing. Offline success does not establish those results. R25's closed
owner is historical and cannot be reused. R26's already successful Save should
be reused; no additional module/candidate is created by this delivery.

# Predecessor VFX NWN proof workflow audit

Date: 2026-08-19  
Target Codex task: `019f5818-4b01-7f31-a7cc-ce273f90f352`  
Audit lane: read-only reconstruction of test-module construction, NWN execution,
capture, validation, and NWN-to-Aurora-Web comparison production  
Live Toolset/NWN activity during this audit: none

## Verdict

The predecessor's broad VFX proof workflow did not use the Aurora Toolset GUI
to create each fixture module. It generated and compiled fixture scripts,
copied a known lab module, and patched the MOD/ERF/GFF resources offline. The
broad runner explicitly called `prepare_module(..., real_aurora=False,
custom_runtime=False, custom_hak=False)`.

It then launched retail NWN directly with `nwmain.exe -userdirectory ...
+TestNewModule <module>`, navigated the NWN UI with window messages, captured
the exact NWN window, validated a single trigger and visible lifecycle, and
created onset-aligned NWN-versus-Aurora-Web videos and contact sheets.

The high-level proof architecture is the correct precedent for the current
row 28 meteor-swarm work:

1. offline fixture MOD;
2. exact one-trigger NWScript;
3. native NWN MP4;
4. trigger ledger and lifecycle validation;
5. Aurora Web MP4;
6. onset-aligned NWN-versus-Web comparison packet.

The historical launcher and desktop-control transport cannot be reused today.
The active proof safety contract forbids proof helpers from starting NWN,
mutating NWN settings, activating/manipulating windows, or using the retired
capture launcher. That one boundary must be replaced by AUR-S07. This is a
transport substitution, not a reinvention of the fixture or proof pipeline.

## Scope and evidence limitation

The target task's root rollout is not recoverable from the normal Codex thread
interface. The earlier full-thread audit records the same continuity failure in
`backend/docs/aurora-reverse/codex-thread-vfx-full-audit-019f5818-2026-08-17.md`.
This audit therefore does not claim a verbatim reconstruction of the
predecessor's chat actions. It reconstructs the workflow from surviving source
scripts, generated MOD manifests, trigger ledgers, raw MP4s, validation
summaries, comparison manifests, and hashes.

Confirmed facts below are directly supported by those artifacts. Statements
about intent are identified as inference.

## 1. How the test module was created

### Confirmed broad-runner path

The controlling script is:

- `backend/scripts/run-vfx-nwn-broad-proof.py`

Its fixture path:

1. generates an entry script and a trigger script;
2. compiles both to NCS;
3. calls the shared base runner's `prepare_module` function;
4. passes `real_aurora=False`, `custom_runtime=False`, and
   `custom_hak=False`.

The decisive call is at current local line 384:

```python
module_info = base.prepare_module(
    compiled,
    real_aurora=False,
    custom_runtime=False,
    custom_hak=False,
)
```

The shared base implementation is:

- `C:\Projects\nwn\VFX\scripts\source-scripts\run-skrytobojca-mark-nwn-proof.py`

Its `prepare_module` function copies a known lab MOD and calls
`inject_scripts`. The injection path edits the module resources directly. It
patches module event handlers and the entry Area, embeds the compiled scripts
and a local-vault BIC, and rebuilds the MOD. There is no `nwtoolset.exe` call in
this construction path.

### Exact surviving row 44 example

The row 44 runtime summary records:

- source lab module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\tlc_vfx_catalog_lab_iter1.mod`;
- source lab MOD SHA-256:
  `fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010`;
- generated module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_vb_row44.mod`;
- generated MOD SHA-256:
  `b8e03c0b9e1708467d57ff1b652b4c83df9c38638b0773d15033dc7448c8c790`;
- patched entry Area: `enon_test_effect`;
- default BIC: `codexvfxproofpc`;
- injected resources: `codexvfxproofpc`, `enon_test_effect`, `module`,
  `vb44entry`, and `vb44shot`;
- `customRuntimeInjected=false`;
- `customHakInjected=false`;
- MOD entry count: 5,255;
- mode: `copied_test_module`.

Evidence:

- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/preflight.json`
- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/summary.json`
- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/scripts/vb44entry.nss`
- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/scripts/vb44shot.nss`

### Meaning of `real_aurora`

The shared base runner also contains a `real_aurora=True` mode. Historical
manifests call that mode `real_aurora_lab_in_place`: it patches a real lab MOD
in place and later restores a backup. This name means a real Aurora-format lab
module was the target; it is not evidence that the Aurora Toolset GUI was
opened. The broad Aurora Web runner disabled that mode explicitly.

Conclusion: the user's hypothesis is confirmed for the broad proof workflow.
The fixture module was authored offline; Aurora Toolset was not used to create
the per-VFX test module.

## 2. How NWN was started

### Historical execution path

The shared base runner's `capture_runtime` function used:

```python
subprocess.Popen([
    str(NWN_EXE),
    "-userdirectory", str(NWN_USER_DIR),
    "+TestNewModule", module_name,
], cwd=str(NWN_EXE.parent))
```

The retail executable was:

`C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe`

Before launch it required a clean NWN process state. After launch it found the
NWN HWND, placed the window on the secondary monitor, and used local Win32
window messages to pass through the module browser and premade-character
screens. The recorded primitives include `SetForegroundWindow`,
`PostMessageW(WM_KEYDOWN/WM_KEYUP)`, and local coordinate clicks.

The surrounding capture helper could temporarily set capture-friendly NWN
configuration, including windowed placement, focus-loss auto-pause, debug text,
and chat-pane geometry, then restore the previous values. On completion the
historical runner terminated the NWN process, with a kill fallback.

### Exact surviving row 44 execution

The row 44 summary records:

- run ID: `20260716T154453Z`;
- NWN PID: `39104`;
- HWND: `6164236`;
- monitor: non-primary, `left=-1920`;
- premade-character flow used: yes;
- first gameplay observation: 12.0667 seconds;
- captured frames: 148;
- captured stage: 880 x 750;
- NWN kept open after capture: no.

This proves direct NWN execution and capture; it does not show Toolset-assisted
Test Module execution for this run.

## 3. How the one-trigger fixture worked

For fire-and-forget rows the generated entry script guarded scheduling with a
module local, established the proof camera, and delayed the trigger. The trigger
script used a second module-local guard, resolved the source and target, faced
the actors, emitted an exact log marker, and applied the selected VFX once.

For row 44 the exact invocation was:

```c
ApplyEffectAtLocation(
    DURATION_TYPE_INSTANT,
    EffectVisualEffect(VFX_IMP_ACID_S),
    GetLocation(oTarget)
);
```

The surviving ledger records:

- intended trigger count: 1;
- observed trigger-log count: 1;
- `validSingleTrigger=true`;
- script identity: `vb44shot`;
- target: `effect_test-location`;
- exact log marker:
  `AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-broad-row44 row=44 count=1 run=20260716T154453Z`.

Evidence:

- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/trigger-ledger.json`

The broad runner rejected an invalid prior capture unless an operator supplied
the explicit `--approved-recapture` switch and approval text. It did not
silently retrigger a failed VFX capture.

## 4. How the native NWN proof was captured

The historical base runner captured the NWN window repeatedly, cropped the
gameplay stage, rejected invalid/dark frames, and encoded an MP4 through
OpenCV. It also wrote best, middle, and whole-window PNG samples.

The broad runner then retimed the saved frame sequence to the observed wall
clock without triggering the VFX again. Row 44 records:

- source FPS: 12.0;
- wall-clock FPS: 7.7641115;
- frames: 148;
- capture wall-clock duration: 18.9333 seconds;
- `vfxRetriggered=false`.

The exact accepted row 44 NWN video is:

`backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/nwn-row44-one-trigger-approved-recapture.mp4`

SHA-256:
`6db297444b59edaee29c3b9e4b465cb6bee29013a693d9cec22ad0302ee5c95d`

## 5. How the NWN capture was validated

The validator is:

- `backend/scripts/validate-vfx-nwn-broad-proof.py`

It requires exactly one MP4, decodes it, builds a four-second median baseline,
and computes a per-frame count of pixels whose maximum channel differs from the
baseline by at least 42. Its visibility threshold is:

```text
max(1800, baselineP99 + max(1400, baselineP99 * 0.8))
```

It derives baseline, onset, peak, steady, last-visible, and post frames and
writes the individual PNGs plus `validated-contact-sheet.png`. It combines
image visibility with the trigger ledger, requested duration, and retry policy.

Row 44 result:

- status: `valid-single-trigger-visible-nwn-oracle`;
- exactly one trigger marker: pass;
- MP4 decode: pass;
- baseline before visible effect: pass;
- visible effect interval: pass;
- no automatic retry: pass;
- detected onset: 11.59196 seconds;
- detected peak: 12.36476 seconds;
- detected last-visible frame: 12.87996 seconds.

Evidence:

- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/validated-summary.json`
- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/validated-contact-sheet.png`

The broad manifest binds ten fixtures, reports ten valid NWN oracles, zero
invalid oracles, seven new captures, three reused references, and no automatic
retry:

- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/nwn-proof-manifest.json`

## 6. How NWN-versus-Aurora-Web proof was produced

The comparison producer is:

- `backend/scripts/create-vfx-broad-comparisons.py`

It did not relaunch NWN for comparison. It reused the validated native NWN MP4,
validated the Aurora Web recording, detected the first pixel-visible Web frame,
and aligned the detected NWN onset to that Web frame. It then produced a
side-by-side 1,280 x 444 H.264 video at 8 FPS, with NWN on the left and Aurora
Web on the right.

The Web visibility detector uses a 1.5-second median baseline and accepts a
frame when at least 100 pixels differ by a maximum channel delta of at least 20,
or when the mean delta reaches 0.5.

The producer writes:

- one comparison MP4 per fixture;
- a per-fixture contact sheet;
- a ten-fixture overview MP4;
- a ten-fixture full-set MP4;
- a combined contact sheet;
- a comparison manifest and report with explicit open parity gaps.

Exact row 44 comparison:

`backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row44-retail-20260716-pixel-aligned-v3.mp4`

SHA-256:
`1bd8bbad700b68c7bf6d5e2cf054b0810a59012b14a28d5261782d92fef353ce`

Full ten-fixture comparison:

`backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-10-fixture-full-set-pixel-aligned-v3.mp4`

SHA-256:
`bce73b88374989ee095b3f59171a65c64c99ffb00b36824ad6d520304b1e295e`

The comparison manifest correctly leaves camera and canonical visual parity
unclaimed. It describes the packet as `comparison-ready-open-parity-gaps`.

Evidence:

- `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/broad-nwn-vs-aurora-web-comparison-manifest-pixel-aligned-v3.json`

## 7. Current safety-contract conflict

The historical proof is evidence of how the predecessor worked, but several of
its transport actions are explicitly forbidden for new accepted proof by:

- `backend/docs/aurora-reverse/proof-capture-safety-contract-2026-07-10.md`;
- `backend/docs/aurora-reverse/aur-s07-runtime-execution-standard.md`.

The forbidden historical actions include:

- starting `nwmain.exe` from a proof helper;
- changing local NWN settings for capture;
- activating or repositioning the NWN window;
- sending keyboard/mouse window messages to traverse NWN UI;
- using the retired `capture_all_vfx_clips.py` route;
- automatically terminating NWN after capture.

AUR-S07 now owns the boundary:

1. validate an immutable runtime profile;
2. arm a one-time launch request without starting NWN or sending input;
3. let the user-owned Test Module action start NWN once;
4. observe one exact NWN PID/StartTime/HWND and the declared MOD/Area/entry;
5. capture the exact window without activation, z-order/geometry changes, or
   input;
6. validate hashes, runtime observation, engine/load log, and fixture binding.

## 8. Required row 28 meteor-swarm workflow

The correct takeover is to reuse the predecessor's architecture with only the
retired launch/capture transport replaced:

1. **Fixture MOD:** use the established offline MOD builder lineage; do not open
   Toolset merely to place the row 28 trigger.
2. **Exact trigger:** compile a guarded one-shot script for
   `visualeffects.2da#28`, label `VFX_FNF_METEOR_SWEARM`, model
   `vff_rainmeteor`, with a unique run ID and one trigger marker.
3. **Immutable binding:** hash the final MOD and bind ordered HAKs, Area
   `enon_test_effect`, entry coordinate, trigger script, source row, and retail
   source identity in an AUR-S07 profile.
4. **Native launch boundary:** arm AUR-S07; the user performs the single
   Toolset Test Module action. No helper launches NWN.
5. **Native recording:** capture the exact NWN PID/HWND using the AUR-S07
   no-global-input video adapter, retaining the raw MP4 and capture JSON.
6. **NWN validation:** reuse the predecessor's trigger-ledger and lifecycle
   sampling pattern, adapted only where meteor duration/area coverage requires
   explicit timing gates.
7. **Web recording:** record the same row once in Aurora Web with the required
   VFX runtime observability report and overlay disabled for final proof.
8. **Comparison:** onset-align native NWN and Aurora Web; render NWN-left/Web-
   right MP4, lifecycle contact sheet, manifest, hashes, and explicit parity
   gaps.

This preserves the predecessor's proof method. It avoids both errors observed
in the interrupted takeover: treating a browser preview as native proof and
using Aurora Toolset authoring as a substitute for the existing offline VFX
fixture builder.

## Verification performed for this audit

Read-only checks:

- inspected the broad runner and one-trigger runner for the exact
  `prepare_module` flags and recapture gate;
- inspected the shared base runner for MOD injection, NWN launch, Win32 message
  transport, and process cleanup;
- inspected the row 44 source manifest, runtime summary, trigger ledger,
  validation summary, and scripts;
- inspected the broad NWN manifest and comparison manifest;
- inspected the NWN validator and comparison producer thresholds and outputs;
- inspected the active proof safety contract and AUR-S07 standard;
- confirmed no Toolset or NWN process was launched as part of this audit.

No implementation or proof run was performed. No new native capture is claimed.

## Final classification

| Question | Confirmed answer |
| --- | --- |
| Did the broad proof create each fixture in Aurora Toolset? | No. It patched a copied test MOD offline. |
| Did it run NWN? | Yes, directly through `nwmain.exe +TestNewModule`. |
| Did it produce a real native NWN recording? | Yes. The raw MP4, trigger ledger, runtime summary, hashes, and validated lifecycle frames survive. |
| Did it create NWN-versus-Web proof? | Yes. It onset-aligned the two recordings and produced side-by-side MP4s, contact sheets, and manifests. |
| Should the old launcher be copied today? | No. The current safety contract forbids it. Use AUR-S07 for that boundary. |
| Should the fixture/validation/comparison architecture be copied? | Yes. That is the correct precedent for row 28. |

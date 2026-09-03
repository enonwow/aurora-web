# VFX row 28 native NWN proof audit — 2026-08-19

## Outcome

The final retail oracle for source row 28 is accepted as a valid native NWN,
single-trigger lifecycle proof. The immutable candidate is
`VFX_FNF_METEOR_SWARM` / `vff_rainmeteor` in `codex_vfx_row28.mod`.

The accepted NWN proof is not a Web or Toolset substitute. It is a video of the
retail `nwmain.exe` window captured with the predecessor pipeline's
per-frame `PrintWindow(PW_RENDERFULLCONTENT)` method and gameplay-frame gate.

Parity with the current Aurora Web v3 implementation is **not matched**. The
comparison packet records the mismatch instead of promoting the Web renderer.

## Immutable candidate and runtime contract

- MOD: `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_vfx_row28.mod`
- MOD SHA-256: `e4f1952687ca93d4a2ae4334bb4697eef5d9e873b3308602f7cd535dc8b2567e`
- Area: `enon_test_effect`
- Entry point: `[9.5, 3.799999952316284, 0]`
- Ordered HAK count: 59; every path and SHA-256 is bound by
  `evidence/vfx-nwn-web-row28/nwn-runtime/v1/aur-s07-runtime-profile.json`
- Geometry gate: `verified`; the candidate's 2x2 `tin01` tile semantics equal
  the source module and native Save/readback passed.
- Runtime profile: `vfx-row28-predecessor-retail-runtime-v1`
- Final runtime binding: `nwmain`, PID `29120`, start
  `2026-08-19T12:53:43.436049Z`, HWND `61082766`
- Source table label: `VFX_FNF_METEOR_SWEARM` (source typo)
- Public constant: `VFX_FNF_METEOR_SWARM`
- Model: `vff_rainmeteor`

## Predecessor-pipeline lineage

- Base runner:
  `C:\Projects\nwn\VFX\scripts\source-scripts\run-skrytobojca-mark-nwn-proof.py`
  (`6ae0fdd1c4dcc9ac23ab0ead64a6c60c3994e33bc04bbf40683ac804267bc46f`)
- Native frame capture:
  `backend/scripts/capture_all_vfx_clips.py`
  (`469400cd2527d489a81fceaff377bd383110fc943da9d7dba6e837e12d25c9bb`)
- Row-28 capture-only adapter:
  `backend/scripts/capture-vfx-nwmain-predecessor-pipeline.py`
- Launch route: central guarded Toolset **Test Module** action from the
  hash-verified AUR-S07 runtime profile.
- The capture adapter binds the exact existing PID/start/HWND. It does not
  launch NWN, inject gameplay input, activate the window, or change Z-order.

## Accepted native NWN packet

- MP4:
  `evidence/vfx-nwn-web-row28/nwn-runtime/v1/capture/nwn-row28-meteor-swarm-one-trigger-v8.mp4`
- MP4 SHA-256:
  `bdddeb001cf59bb2d6476909adc3b1d022674b06b59749f39fc11fc290dc31de`
- Dimensions/frame rate: `1460x810`, 12 fps
- Frames/duration: 477 frames, 39.75 s
- Validated summary:
  `evidence/vfx-nwn-web-row28/nwn-final/v1/validated-summary.json`
- Summary SHA-256:
  `edefa3849244012132be29e6bb3e2cb99751a2bb2c19c237275fa0fc9adda529`
- Contact sheet:
  `evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-lifecycle-contact-sheet.png`
- AUR-S07 packet:
  `evidence/vfx-nwn-web-row28/nwn-final/v1/aur-s07-runtime-packet.json`
- AUR-S07 packet validation: `verified`

Lifecycle measured from the accepted MP4:

| State | Frame | Video time |
| --- | ---: | ---: |
| Baseline sample window | 0–47 | 0.00–3.92 s |
| First visible onset | 61 | 5.083 s |
| Brightness peak | 65 | 5.417 s |
| Last bright-visible frame | 85 | 7.083 s |
| Clear post-roll sample | 476 | 39.667 s |

All proof gates passed: complete MP4 decode, baseline before onset, visible
meteor interval, clear post-roll, exact module load, exactly one trigger marker,
one final runtime binding, and capture beginning at the first candidate frame.

The engine log contains exactly one intentional marker:

`[Wed Aug 19 14:54:09] AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row28 row=28 count=1 run=20260818T164640Z`

The same log contains exactly one matching module load:

`[Wed Aug 19 14:53:47] Loading Module: codex_vfx_row28`

## NWN versus Aurora Web

- Onset-aligned comparison MP4:
  `evidence/vfx-nwn-web-row28/comparison-v1/nwn-vs-aurora-web-row28-onset-aligned-v1.mp4`
- Comparison MP4 SHA-256:
  `7a55b35fa095332547df214b43fe80d82dfcdfca0524ed524f3efe8ae731e4eb`
- Comparison contact sheet:
  `evidence/vfx-nwn-web-row28/comparison-v1/row28-nwn-vs-web-onset-aligned-contact-sheet.png`
- Comparison sheet SHA-256:
  `29027cff28b68865ac30afbdbd55b49cb5f276bad84c204a9a1bb1f4e92188e9`
- Manifest:
  `evidence/vfx-nwn-web-row28/comparison-v1/comparison-manifest.json`
- Manifest verdict: `parity: not-matched`

The NWN oracle has a much brighter scene-saturating multi-impact peak and an
approximately two-second bright-visible interval. Web v3 declares a 4.633 s
lifecycle and keeps discrete meteor chunks, rings, smoke, and sparks visible
longer. The cameras are onset-aligned, not pixel-aligned, so the packet supports
behavioral and visual-gap review rather than a pixel-equality claim.

## Attempt disclosure

The final accepted runtime execution is `runtime-execution-v9`. Eight earlier
runtime executions were rejected and are retained in the ledger:
`runtime-execution`, `runtime-execution-v2` through `runtime-execution-v8`.
There is no automatic-retry claim. Only the v8 MP4 bound to the v9 runtime is
accepted as final proof.

## Validation

The following targeted contracts passed:

- predecessor native capture contract;
- row-28 native proof validator contract;
- onset-aligned comparison contract;
- AUR-S07 guarded runtime execution contract;
- no-global-input NWN proof-window preparation contract.

The final NWN MP4, comparison MP4, and their generated packet metadata decode
and validate successfully. No additional NWN launch was used to construct the
comparison or this audit.

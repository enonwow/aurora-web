# Proof capture safety contract

Status: active. This is the acceptance boundary for Aurora Web proof PNG and MP4 artifacts.

1. A proof is valid only after the requested Area/runtime state is fresh and fully settled.
2. A runtime PNG must come from the exact Area capture hook or direct CDP `Page.captureScreenshot`; it must never fall back to an arbitrary visible canvas.
3. A proof run must not remove, hide, replace, or otherwise mutate scene objects merely to improve framing.
4. `allowPartialEvidence` and screencast transport fallbacks are forbidden for proof acceptance.
5. Pending, partial, unknown, missing, fallback, or failed texture/model states block proof acceptance.
6. Retail proof helpers must not start `nwmain.exe`, mutate local NWN settings, manipulate unrelated windows, or take over display 1. The retired `capture-area-lighting-retail-*` and `capture_all_vfx_clips.py` launchers are intentionally blocked. Use the guarded Toolset workflow or user-provided capture ingestion instead. The sole z-order exception is the public `aurora-model-proof-120s` NWN physical-capture atom when its ownership probes prove that the exact PID/StartTime/HWND is obscured. It may lease `HWND_TOP` for that exact NWN HWND with `SWP_NOMOVE|SWP_NOSIZE|SWP_NOACTIVATE|SWP_NOOWNERZORDER|SWP_NOSENDCHANGING`, perform at most one `CopyFromScreen`, and must restore and read back the exact predecessor in `finally`. It must never use `HWND_TOPMOST`, activate a window, mutate the obscurer, use global input, or use `PrintWindow`. A failed lift, identity/modal readback, capture, or exact-predecessor restore deletes the PNG and rejects the proof.
7. On this workstation, the guarded Toolset workflow may stage only the dedicated proof monitor at `X=-1920`; any target on the primary display (`X >= 0`) is rejected before the INI is changed or `nwtoolset.exe` can start. A `preflight` is read-only and reports a planned position without writing it.
8. A known Toolset Access Violation, quarantined module, stale `temp0`, or full-module target is a blocker, not an automation override. The public session manager must never append a retry/bypass flag.
9. `$playwright-interactive` may be used to keep a local browser session alive while debugging a renderer, but it does not relax any gate above. An accepted proof still requires the exact fresh runtime capture and artifact path.

Each accepted proof must record the requested Area/object identity, runtime freshness, renderer/model/texture readiness, timestamp, and the exact PNG/MP4 path. Otherwise it must write a blocker manifest rather than a captured proof.

10. A VFX proof additionally records `aurora-vfx-runtime-observability/v1` (or its blocker manifest): runtime build identity, cache key, canonical host graph, asset settlement, draw ledger, single-playback guard, and final-profile overlay state. The report must be fresh for the capture. A missing identity, unsettled asset, graph mismatch, duplicate/looping playback, non-zero overlap, or enabled final-profile overlay rejects the capture. For a final comparison state whose phase is `post`, the playback guard must additionally record `completed=true` and `postDurationHidden=true`; otherwise the capture is rejected with a post-duration blocker.

11. A top-down Area proof must bind the declared logical Area footprint,
footprint-connected camera terrain bounds, and the complete unfiltered settled
runtime terrain bounds. A remote visible mesh disconnected from the Area in XZ
must not silently control camera framing. The runtime keeps all geometry
present and unchanged, records the complete outlier bounds and decision, and
requires independent visual review. A raw frame carrying an unreviewed
runtime-bounds outlier is rejected. A matrix checkpoint advances only after an
exact artifact-hash-bound visual review accepted under
`tile-add-connect-matrix-visual-review-and-framing-recovery-contract-v1-2026-07-29.md`.

12. Proof capture is repository-global and serialized. At most one Node capture
script may own a Chrome process tree at any time, irrespective of route,
fixture, output directory, CDP port, task, or agent. Every Node capture launcher
must acquire the repository proof-capture lock before spawning Chrome, limit
Chrome to two renderer processes, and release or recover the exact lock on
normal exit, failure, timeout, interruption, or stale-owner detection. A direct
Chrome launch or alternate lock name is not an accepted proof path.

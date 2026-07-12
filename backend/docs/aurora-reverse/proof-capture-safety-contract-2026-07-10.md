# Proof capture safety contract

Status: active. This is the acceptance boundary for Aurora Web proof PNG and MP4 artifacts.

1. A proof is valid only after the requested Area/runtime state is fresh and fully settled.
2. A runtime PNG must come from the exact Area capture hook or direct CDP `Page.captureScreenshot`; it must never fall back to an arbitrary visible canvas.
3. A proof run must not remove, hide, replace, or otherwise mutate scene objects merely to improve framing.
4. `allowPartialEvidence` and screencast transport fallbacks are forbidden for proof acceptance.
5. Pending, partial, unknown, missing, fallback, or failed texture/model states block proof acceptance.
6. Retail proof helpers must not start `nwmain.exe`, mutate local NWN settings, manipulate global window z-order, or take over display 1. The retired `capture-area-lighting-retail-*` and `capture_all_vfx_clips.py` launchers are intentionally blocked. Use the guarded Toolset workflow or user-provided capture ingestion instead.
7. On this workstation, the guarded Toolset workflow may stage only the dedicated proof monitor at `X=-1920`; any target on the primary display (`X >= 0`) is rejected before the INI is changed or `nwtoolset.exe` can start. A `preflight` is read-only and reports a planned position without writing it.
8. A known Toolset Access Violation, quarantined module, stale `temp0`, or full-module target is a blocker, not an automation override. The public session manager must never append a retry/bypass flag.

Each accepted proof must record the requested Area/object identity, runtime freshness, renderer/model/texture readiness, timestamp, and the exact PNG/MP4 path. Otherwise it must write a blocker manifest rather than a captured proof.

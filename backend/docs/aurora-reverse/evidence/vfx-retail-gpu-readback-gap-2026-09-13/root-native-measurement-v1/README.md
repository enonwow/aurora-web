# Native particle measurement — 13 September 2026

The user authorized one owned NWN measurement on screen2 and cleanup. Exactly one NWN process was launched: PID 22128, start `2026-09-13T16:06:02.7881526Z`, HWND 199670. The central placement atom immediately verified non-primary `\\.\DISPLAY1`, bounds `(-1920,0,1920,1032)`. RenderDoc used pre-initialization ExecuteAndInject; this is a measurement extension, not a claimed Toolset Test Module dispatch. No global input or second game launch occurred.

Aurora had built the exact diagnostic MOD with `No errors found`. The installed diagnostic MOD hash after build was `bb34e6193b8d3f1bab21f76cd6e17655e06322bc1191a3748e4afcd4a10dffe0`; unchanged D HAK hash was `57d8a959580d66edbb2950b631c60ce219c8c2fdcf443468f5108a488d656d4a`. The control applied the same D FnF twice every five seconds: [12.5,10,1], yaw 0, scale 1 and [12.5,13,1], yaw 90, scale 2.

## Measured result

NWN created a supported OpenGL 3.3 core context on RTX 5070. Capture 17 (`gpu-capture/nwn_frame27065.rdc`, SHA256 `9eb4de9e75e4ad2f8a4ea09ade1f2dcac4a24414168c7a289de5cf6600c58736`) contains both instances in twelve normal-particle draws. Events 563,567,571,575,579,583 correspond to the first instance; 587,591,595,599,603,607 to the second. Their repeated 24/30/12-vertex groups agree with the six source emitters and their 4/5/2 particle counts.

- All twelve **entire vertex uniform blocks are identical**, including `m_mv`, despite the different placement, yaw and scale.
- `m_texture` is identity. The stock shader does not expose `m_view_inv`; this is not a claim that a custom shader can never expose it.
- The 24-byte stream already contains world placement and scaled billboard corners. Matching offsets about the two known placement origins have a factor of two, with maximum float residual `9.54e-7`; color and UV arrays match.
- Therefore recovering the per-instance root transform from **this particle pass's `m_mv`** cannot implement the proposed distance correction. This closes that specific hypothesis, not every possible resource-only solution.

Exact data: `capture17-particle-data/result.json`, SHA256 `e36cef15401feb92804000856d1137fd3c2445af51367e5a6a27e98fd527e2d4`. Compact numeric comparison: `particle-observation.json`. `gpu-phase-sample/phase-sheet.png` includes a cropped contact sheet; its capture 17 shows the two diagnostic quads. These are extracted GPU thumbnails, not physical-desktop proof or the completed artistic effect.

CPU emitter/particle centers and exact effect age were not read. Geometric quad midpoints are labelled as GPU geometry, not CPU state. This captured phase does not qualify later random scatter dynamics.

## Recovery and cleanup

The initial measurement wrapper had two binding errors (`APIUse` instead of `RegisterAPI`, then `api` instead of `name`). Both were corrected against the actual v1.46 contract. Target-control reconnections reused the same already-injected NWN PID; there was no late injection or second launch. Future startup validates these members before launching. The crash handler spawned by RenderDoc was identified by exact PID/start, parent NWN PID, path and `crashhandle --pipe` command; it does not own Qt configuration.

Six initial frames missed the short phase. A bounded denser sampling pass in the same session captured it; requested versus received counts remain explicit in receipts. All finalized RDCs remain preserved, including captures completed after the last receipt. There is no truncation claim disguised as success.

NWN did not exit after two targeted graceful close messages. The central close route then revalidated PID/start/HWND and used its exact-process fallback; zero NWN remained. Owned Aurora PID 55780 closed after the saved build. `owned-nwn-close.json` and `build/module-rebuild-state.json` record the results.

Original RenderDoc configuration was restored byte-for-byte to SHA256 `19cdc65f5a789a2ef16e0d5130d7a0a23f0974f56c72ddef8831fbe152b64034`. The diagnostic post-build MOD was archived in `after-build`. Original installed MOD/HAK were restored to their pre-measurement hashes, recorded in `package-restore.json`. The rejected original V6 remains an unchanged historical demo, **not a repaired one-ApplyEffect strike**.

## Next implementation

The retained nwn-vfx application task received the exact measurement and a bounded request to assess faithful baking of the existing scatter into parameterized animated geometry, retaining original texture, trajectory, size/lifetime/color and billboard behavior. This could share the sword/trail representation and fixed full SoundImpact timeline. Viability and implementation remain pending; no new artwork, engine patch, full-VFX repair or native acceptance is claimed.

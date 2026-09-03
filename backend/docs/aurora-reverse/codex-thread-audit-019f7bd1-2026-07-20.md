# Audit: Codex task `019f7bd1-f1fe-7ef3-ada7-cb955a27b439`

## Scope and method

This is a read-only audit of the task transcript and of its durable
`m0-v6-central-bootstrap` manifest. No Toolset, NWN, INI, process, module,
HAK, or active dialog was changed while preparing this report.

The audit separates a *saved native state* from visual or runtime proof. A
correct Appearance selection, a HAK-list entry, or a dialogue mini-preview is
not proof that the M0 model is rendered in the Area viewport or in NWN.

## Verified state at the time of audit

The durable manifest at
`C:\Projects\meshy2aurora\proof-output\m0-v6-central-bootstrap-city-exterior-20260719\bootstrap-manifest.json`
records the following, all of which are more reliable than the conversational
status messages:

- `status: saved`, with `bootstrap_saved_pending_geometry`; therefore geometry,
  Toolset viewport proof, and NWN proof are **not complete**.
- The saved module is `m2a_m0v6.mod`, SHA-256
  `029d1d113f537e8d210e891ecc8d254a2bd4dba3a90c43b8462f332b06722019`.
- Ordered HAK readback is exactly `[m2a_m0_v6]`; its recorded SHA-256 is
  `673f51a82792c7e28eb26f0595ffe96b7018cb29eef8cbc3807790a63dead82d`.
- Native GIT readback records one `nw_dwarfmerc001` fixture, Appearance_Type
  `848`, at `(10, 10, 3.2)`.
- The current native entry is `m2a_m0a6` at `(10, 10, 0)`.

These facts establish a saved candidate, not that Aurora rendered the custom
mesh. In particular, the task itself correctly conceded later that it had no
hard canvas proof of the dwarf fallback.

## What the agent did wrong

| Problem | Evidence / impact | Correct resolution |
| --- | --- | --- |
| Treated modal class as the whole build state | `TdlgVerifyModule / Build Module` was repeatedly treated as an active build even after the user pointed out `No errors found`; this produced unnecessary waiting and a scheduler. | Read the controls and semantic state: `Build` disabled + `Done` enabled + no errors means a settled results dialog. Post only the verified `Done` action, then verify the HAK list and saved module. |
| Created a recovery route for nearly every failure | The durable manifest contains over twenty one-off `invalidLocationAdjustLocation...` attempt arrays, while the shared runner gained matching commands. This is recovery proliferation, not a stable standard. | Use one finite state machine per native workflow. A new central route requires a reproduced root cause, an offline/rendering test, and a reusable contract—not merely a new error string. |
| Bypassed the existing Adjust Location standard | `AUR-S02-03` and `aurora-toolset-adjust-location-standard.md` already existed, but the task cycled through `SetWindowText`, `EN_CHANGE`, `EM_REPLACESEL`, `WM_CHAR`, TUpDown, focus and key variants. | Return to the canonical AUR-S02-03 route: capture baseline, make one mapped transaction, verify the native readback, and roll back on failure. Do not invent another transport from a single UI symptom. |
| Tested generated PowerShell in the live lane | Several failures were ordinary source-generation errors, e.g. `$index:$controlId` parse behaviour and cross-process message assumptions. They were caught only after a live route had been started. | Every dynamic PowerShell/Win32 atom must have an executable render/parse test before it can reach Toolset. Contract tests must exercise the generated script, not only search source text. |
| Called a menu path “verified” too early | The visible context-menu label `Properties` and accelerator `P` were initially inferred to be a valid route. A later live test closed the popup but did not open `TdlgCreatureEdit`. | The postcondition is mandatory: only call the route valid after exactly one `TdlgCreatureEdit / Creature Properties` appears. The failed accelerator test is useful negative evidence, not a precedent. |
| Confused a selected Appearance row with renderer proof | The selected `M2A_M0_MESHY_RIGID` row and dialog capture were discussed as though they could explain what the Area showed. The later task message explicitly withdrew the claim of a current dwarf fallback proof. | Prove resource identity first (ordered HAK, 2DA row, model resource) and then collect a fresh `TScrollBox` visual capture. Only after that is NWN runtime proof meaningful. |
| Began an MDL geometry candidate before establishing the load path | A new MDL candidate was produced in `proof-output` to move the mesh base to Z=0, despite no proof that Toolset was resolving the selected HAK/2DA/model at all. | First resolve the HAK → appearance row → model resource chain and capture its actual loaded result. Change mesh geometry only when that chain is proven and a geometry defect remains. |
| Inferred close authority too broadly | At one point ordinary continuation text was read as permission to close a Toolset session. | A session close requires an explicit owner-authorized close target. If the module is dirty, the save/discard prompt must be handled under the declared close policy. |
| Changed shared tooling during a live lane | The task repeatedly patched central Aurora code while a Toolset state was open or unresolved. That makes it hard to distinguish a Toolset fact from a newly introduced controller behaviour. | Freeze shared tooling during an active build/save/modal lane. Capture the durable state, test the fix offline, then use one expressly authorized continuation. |

## What was resolved correctly

The task did make several useful, specific corrections:

1. HAK selection was not assumed from `CB_SETCURSEL`; it eventually used the
   required selection-change notification, then verified the exact selected
   item before adding it.
2. The HAK rebuild warning was made locale-aware. Its affirmative action was
   selected only after the warning semantics and localized buttons were read.
3. Once the Build Module dialog was inspected semantically, its successful
   results state was distinguished from an active build. The subsequent durable
   HAK-list readback and module save are recorded in the manifest.
4. The failed `Properties` accelerator did not get retried blindly. The absence
   of `TdlgCreatureEdit` was treated as failure evidence.
5. The final task statement correctly narrowed the claim: it has no hard
   proof that the Area canvas currently displays the dwarf or M0 model.

## Skill and standard correction already applicable

Aurora skill suite 1.0.6 now codifies the key lesson from this task's HAK
lane: `unselected -> selected -> selection_notified -> added ->
rebuild_pending -> rebuild_running -> rebuild_settled -> saved_verified`.
While the native build dialog is genuinely running, activity is read-only;
there is no retry, additional Add/OK/affirmative, save, recovery creation, or
shared-tool patch. Work on creature placement, Appearance, viewport capture,
or runtime proof begins only after `saved_verified`.

This does not validate the current M0 model. It prevents the controller from
turning an unresolved HAK build into further unrelated mutations.

## Correct next step

Do not create another Adjust Location continuation and do not alter the MDL
yet. First make a read-only checkpoint of the saved candidate, then establish
one evidence chain:

1. exact HAK hash and ordered HAK list;
2. exact Appearance row `848` and its model-resource mapping;
3. fresh native Area viewport (`TScrollBox`) capture;
4. only if the viewport is correct, the AUR-S07 NWN route.

If any item fails, record its single failing gate and investigate that gate;
do not add a new recovery command just to try another input transport.

## Audit verdict

The agent solved the HAK attachment/save lane sufficiently to produce a saved
candidate, but it did not solve model visibility. Its central weakness was
turning every UI failure into a new recovery implementation instead of using
the existing canonical route, executable atom tests, and a single verified
postcondition. The task must remain open with Toolset visual proof and NWN
runtime proof marked `missing`.

# VFX placeable object-attachment proof audit

Date: 2026-08-13

Status: `profile-v2-matched-with-gaps`. The corrected target lineage, one saved
NWN playback, one fresh Aurora Web playback, and an onset-aligned comparison
are accepted as implementation evidence. Exact camera, scene/material response,
late-phase luminance, and pixel parity remain open.

## Source policy

- Aurora-first: yes. The runtime namespace and orientation behavior come from
  the primary retail-client decompilation recorded in
  `vfx-object-attachment-orient-with-ground-audit-2026-08-13.md`.
- Target resource identity comes from the selected module's ordered HAK list,
  the selected `placeables.2da` row, and the exact placeable MDL.
- xoreos used: no.
- One immutable NWN oracle was captured for this profile. Subsequent analysis
  reused that MP4 without launching NWN or the Toolset again.

## Recovered runtime contract

`CNWCVisualEffectOnObject::ReAttachVisualEffect` resolves object-applied
placeable VFX through the exact model-prefix namespace:

| Phase slot | Placeable node |
| --- | --- |
| Root/ground | `<prefix>_ground` |
| Impact | `<prefix>_impact` |
| Head | `<prefix>_head_hit` |

For `visualeffects.2da#50`, `VFX_IMP_DEATH`, the impact model is selected from
`Imp_Impact_Node`. The proof must therefore resolve the target placeable's
exact `<prefix>_impact` node. A center fallback, creature `impact` node, or a
display-label-derived prefix would not prove this path.

## Exact target lineage

- Source module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\tlc_vfx_catalog_lab_iter1.mod`.
- Source module SHA-256:
  `FDA307D129F0C0E17411FB5820C6C528EE66E3A079202BE5E8E38BE781CFF010`.
- Source Area: `enon_test_effect`.
- The module has 59 ordered HAKs. Aurora resource lookup traverses
  `Mod_HakList` in reverse order, so the highest-index matching resource wins.
- Five HAKs contain `placeables.2da`: index `1` (`lc_2da`), `27` (`+sic11`),
  `44` (`vale-c_and_m`), `55` (`witcher`), and `56` (`witcher2`).
- The selected table is therefore `witcher2.hak/placeables.2da`, not
  `lc_2da.hak/placeables.2da`. Its SHA-256 is
  `824A067CEAF4441ACA60A3FC75518B5D815DAE0DF5C45B4357FC97E7CC63DA9F`
  and it has 906 parsed rows.
- Selected row: `779`, label `new:Lance Rack (animated)`, model
  `plc_lancrak1`.
- Reverse HAK resolution selects
  `q_placeables.hak/plc_lancrak1.mdl` at index `54`, SHA-256
  `03B40827712F303A66D4A4E5FA74E32D6B8CDD7BDC8604A82693F1105D988C12`.
- The exact source hierarchy contains `lancrak1_impact` at Aurora-local
  position `[0, 0, 0.8500000238418579]`.
- The selected model contains no emitter nodes. It avoids contamination from
  a persistent placeable VFX while row 50 is triggered once.

The rejected profile-v1 selected row `12180` from `lc_2da`. That row is absent
from the actual winning `witcher2` table. The saved GIT object was valid and
the runtime logged exactly one trigger, but its model was not visible and no
visible VFX could be accepted. The MP4 remains diagnostic evidence only; it is
not an oracle and is never compared as a parity reference.

## Profile design

The profile preserves the complete retail `plc_chest1.utp` V3.2 field surface
and derives a dynamic UTP by changing only target identity, appearance,
scripts, and safe dynamic-target flags. Its admitted retail source SHA-256 is
`D4BC549F8FB6C682F5FEC81E9A1A3CB58AA8D6291649393EBCB29783F7CBE3F1`.
The result has:

- `TemplateResRef=vfxplcproof`;
- `Tag=vfx_placeable_target`;
- `Appearance=779`;
- `Static=0`.

The initial synthetic-minimal UTP was rejected by live retail `CreateObject`.
That run produced zero target-creation markers, zero VFX trigger markers, and
no MP4, so it is diagnostic-only and does not consume the single-trigger
oracle. Its last frame proves gameplay was running but not the requested VFX.

The placeable is created at `[12.5, 6.8, 0]` in `enon_test_effect`. The proof
PC is moved to `[12.5, 3.8, 0]`, preserving the source three-metre
source-to-target distance. The existing innkeeper remains unchanged at
`[9.5, 6.8, 0]` as context. The Web scene is re-centered on the new target:
all exact source Area models shift by `-3` on Aurora X and the innkeeper is at
normalized `[-3, 0, 0]`.

The fire-and-forget effect is applied exactly once. The live run must record
one trigger marker, one target-creation marker, zero retry/loop/overlap, the
exact prepared module hash, and one MP4. A second NWN launch is forbidden once
that oracle exists unless the user explicitly requests a recapture.

## Accepted proof packet

The corrected profile passed all five acceptance requirements:

1. Offline UTP/model readback selects row `779`, `plc_lancrak1`, and
   `lancrak1_impact`.
2. The saved NWN run contains one trigger, one target creation, no retry, and
   no loop:
   `evidence/vfx-placeable-object-attachment-row50/nwn/profile-v2/run-20260813T160758Z`.
   Its MP4 SHA-256 is
   `F12B6DC289554E3AC30D9A9F873B9A075FD255ED35062E756BA376A6402E628F`.
3. Final static Web preflight `gate-v3` called no playback hook and passed
   runtime identity, host graph, asset settlement, draw, particle-shader, and
   proof gates with an empty blocker manifest.
4. Accepted Web playback `v3` records exactly one trigger at `12 fps`, no
   loop/overlap, completed `6.15 s` source playback, clean post-roll, and zero
   terminal draws. MP4 SHA-256:
   `CF7D377CBFD51C29B006D964D9ACFF104ADE55062F1683503BF0805CAF4E7D37`.
5. The saved-NWN/Web comparison is stored under
   `evidence/vfx-placeable-object-attachment-row50/comparison/profile-v2`.
   Comparison MP4 SHA-256:
   `CA50DD6AEEA4AE1A2EB59951813819DEC7FFD05241B87B44D86490AFFE5C5395`;
   contact-sheet SHA-256:
   `5D3BE407BEF66EF2DFF218F79A44552672141E97F45CC7E2DA3F42B600E6F59B`.

The Web proof includes the exact source-player BIC contract, SHA-256
`5EDC2CE0232DAD09DB9649401DB55CCB9956ECFE98FF172E152A11AC5C1D7CC0`,
at the source-authored three-metre separation. The exact source actor and
placeable are both loaded and settled. Attachment to `lancrak1_impact` is
established; scene parity is deliberately false because the Web floor and
material response differ visibly from retail.

## Temporal review

An offline frame-difference audit used only the two accepted MP4 files. In a
fixed target-region ROI, the first strong frame is at NWN `8.500 s` and Web
`2.083 s`. Both first peaks are comparable (`79.077` versus `75.595` in the
same per-video background-delta metric), but Web retains a strong second phase
about `0.5-0.7 s` longer. This is not a repeated trigger: the Web guard reports
one trigger and zero overlap.

Payload/runtime telemetry attributes that late phase to source emitter
`Smoke01`: it starts drawing at effect time `0.433 s`, peaks at 11 particles,
and reaches zero at `2.500 s`. `souldust` and `WIND_Dummy` remain at zero.
Primary Aurora decompilation already proves start-to-end age interpolation,
so reversing `alphaStart=0` and `alphaEnd=1`, shortening source `lifeExp=1`,
or deleting the authored birthrate window would be unsupported tuning. The
remaining delta stays classified as a shape/material/composition question
until a primary Aurora audit proves a different renderer rule.

## Acceptance gate

Completion requires:

1. passing offline profile and UTP readback;
2. one saved NWN MP4 with exactly one row-50 trigger on the exact placeable;
3. one fresh Aurora Web MP4 using `targetKind=placeable`, prefix `lancrak1`, and
   source hierarchy restoration;
4. a side-by-side NWN-left/Web-right MP4 and contact sheet;
5. proof telemetry with settled assets/draws, one playback, the resolved
   `lancrak1_impact` node, and no false PASS.

All five artifacts now exist. They establish implementation correctness for
the exact-prefix placeable impact attachment path, not full visual parity.

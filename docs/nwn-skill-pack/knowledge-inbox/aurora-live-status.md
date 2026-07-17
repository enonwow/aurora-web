# Aurora Toolset Live Evidence Status

Generated: 2026-06-19T09:43:28+00:00

## Summary

- Status: `no-evidence-yet`
- Records directory: `knowledge-inbox/aurora-live-records`
- Submitted JSON records: `0`
- Valid records: `0`
- Invalid records: `0`
- Initialized-only records: `0`
- Promotion-ready atoms: `0`
- Runtime-tested atoms: `0`

## Atom Status Counts

- none

## Evidence Label Counts

- none

## Promotion-Ready Atoms

- none

## Runtime-Tested Atoms

- none

## Valid Records

- none

## Invalid Records

- none

## Maintainer Next Actions

1. If status is `no-evidence-yet`, start from `knowledge-inbox/aurora-live-first-session-command-sheet.md` and run `tools/prepare_aurora_live_session.py` with `--scenario small-location-first-pass` before the first Toolset session.
2. If status is `prepared-only-no-live-evidence`, the session scaffold exists but the operator has not returned live observations yet.
3. Use `tools/init_aurora_live_record.py` and `tools/init_aurora_live_evidence_manifest.py` only as lower-level fallbacks.
4. Validate returned records with `tools/check_aurora_live_records.py` before proposal generation.
5. Generate a proposal only when promotion-ready atoms are present and candidate references are filled.
6. Treat `toolset-observed` as Toolset evidence, not runtime proof.
7. Require `runtime-tested` client/server/log evidence before making runtime behavior claims.

## Required Commands

```powershell
python docs\nwn-skill-pack\tools\prepare_aurora_live_session.py docs\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --toolset-version <toolset-version> --nwn-version <nwn-version> --module-path-or-copy-id <module-copy> --candidate-reference draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md --candidate-reference draft-skills/nwn-server-gamedev/references/items-equipment-loot.md --candidate-reference draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md --candidate-reference draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md --candidate-reference draft-skills/nwn-server-gamedev/references/feature-design-output-template.md
python docs\nwn-skill-pack\tools\init_aurora_live_record.py docs\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --create-evidence-dirs
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_aurora_live_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-status.md
python docs\nwn-skill-pack\tools\check_aurora_live_status.py docs\nwn-skill-pack
```

## Does Not Prove

This status report does not prove Toolset correctness, client/server runtime behavior, fresh Codex answer quality, plugin install behavior, or release-candidate readiness. It only summarizes submitted Aurora live-record state.

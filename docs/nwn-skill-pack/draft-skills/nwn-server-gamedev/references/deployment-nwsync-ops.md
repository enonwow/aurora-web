# Deployment, NWSync, Ops

## Source Status

- `docs-verified`: `neverwinter.nim` README and NWSync utility source for NWSync repository tooling.
- `docs-verified`: legacy `Beamdog/nwsync` repository points to `neverwinter.nim` for newer releases.
- `docs-verified`: NWNWiki/Fandom `settings.tml` page for settings sections and config location.
- `community-example`: Steam and forum NWSync setup guides.
- `runtime-tested`: required before claiming a deployment works for a specific server/client.

## What This Domain Controls

Server config, module packaging, HAK/TLK/NWSync rollout, repository hosting, server settings, logs, backups, rollback, restarts, live migrations, and operational runbooks.

## Source-Backed Facts To Preserve

- `settings.tml` replaced most previous client/server `.ini` settings and is TOML with an embedded schema.
- `settings.tml` contains relevant sections for `net`, `nwsync`, `nwscript`, `server`, server logs, server login, server network port, server vault, and related runtime behavior.
- `neverwinter.nim` contains CLI tools and a library for NWN:EE data files, including the official open-source script compiler CLI.
- `neverwinter.nim` includes NWSync tools described as the official way to maintain a server-side NWSync repository.
- The legacy `Beamdog/nwsync` repository says the NWSync utilities moved to `neverwinter.nim`.
- `nwn_nwsync_write` generates a server-side NWSync manifest, writes data into a repository root, and updates the repository `latest` pointer unless told not to.
- `nwn_nwsync_write` can source a module, ERF/HAK, single files including TLK, or directories; `--with-module` is explicitly not for persistent worlds.
- `nwn_nwsync_print --verify` can verify presence and checksums of manifest files.
- `nwn_nwsync_prune` is for NWSync repository housekeeping, including checking `latest`, warning on metadata issues, pruning unreferenced data, warning on missing data, and cleaning directory structure.

## Design Questions

- What exact release artifact is being promoted: module, HAKs, TLK, scripts, NWSync repo, settings, database migration, or mixed?
- Which server runtime is targeted: local test, Windows server, Linux server, Docker/NWNX, hosted provider, or project-specific wrapper?
- Where is the authoritative module and custom content source?
- Which files are server-only and which must be visible to a clean client?
- What is the server's NWSync repository root, public HTTP URL, and manifest/latest promotion policy?
- Is the release using manual HAK/TLK install, NWSync, workshop/mod package, launcher, or a hybrid?
- What settings changed under `settings.tml` and how are secrets/passwords handled?
- What backup is required: module, server vault, database, campaign DB, NWSync repo, logs, and config?
- What smoke test proves a clean client can join and see content?
- What exact rollback returns the server to the previous working state?

## Implementation Path

1. Define release contents and evidence label.
2. Freeze or tag the source artifacts.
3. Validate scripts, module, HAK/TLK, and package references.
4. Build or update NWSync repository with project-approved tooling.
5. Verify the NWSync manifest/repository.
6. Backup current live state: module, vault, database/campaign DB, config, NWSync root, and logs.
7. Deploy to staging or local runtime.
8. Smoke test with a clean client profile/cache.
9. Promote to live with a written rollback plan.
10. Observe first login, first area load, first custom asset, and first persistence write after deployment.

## Recommended Output Shape

For deployment/NWSync/ops tasks, produce:

1. Release inventory table.
2. Server settings/config delta.
3. Client content distribution plan.
4. NWSync build/verify plan.
5. Backup plan.
6. Staging smoke test.
7. Live promotion steps.
8. Rollback steps.
9. Post-release observation checklist.
10. Evidence label and exact blockers.

## Runtime Verification

Test at least:

- server starts with the target module and settings;
- logs show no fatal module/script/resource errors on boot;
- clean client can connect;
- clean client receives or already has required client content;
- custom HAK/TLK/2DA/NUI/assets render or resolve as intended;
- NWSync manifest/repository verifies with tooling;
- server vault/database/campaign DB writes work after deployment;
- old client/cache failure mode is understood;
- rollback has been rehearsed or at least dry-run with file paths and backups.

## Guardrails

- Do not claim NWSync works because the repository was generated; prove a clean client can join and receive content.
- Do not use `--with-module` for persistent-world NWSync packaging without a project-specific reason and explicit review.
- Do not deploy settings/secrets into a public skill or artifact.
- Do not change HAK/TLK/NWSync at live time without a rollback plan.
- Do not prune NWSync repository data until the current and rollback manifests are known.
- Do not treat Steam/forum setup guides as authoritative; use them as practical examples only.

## Sources

- `neverwinter.nim`: https://github.com/niv/neverwinter.nim
- `nwn_nwsync_write`: https://raw.githubusercontent.com/niv/neverwinter.nim/master/nwn_nwsync_write.nim
- `nwn_nwsync_print`: https://raw.githubusercontent.com/niv/neverwinter.nim/master/nwn_nwsync_print.nim
- `nwn_nwsync_prune`: https://raw.githubusercontent.com/niv/neverwinter.nim/master/nwn_nwsync_prune.nim
- Legacy `Beamdog/nwsync`: https://github.com/Beamdog/nwsync
- NWNWiki/Fandom `settings.tml`: https://nwn.fandom.com/wiki/Settings.tml

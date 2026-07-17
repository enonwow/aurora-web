# Persistence, Database, NWNX

## Source Status

- `docs-verified`: NWN Lexicon Campaign Database function category and representative campaign DB functions.
- `docs-verified`: NWN Lexicon SQL function category, `sqlquery`, `SqlStep`, and bind/prepare flow.
- `docs-verified`: NWNX:EE main, core/plugin management, SQL, SQL migration, and NWSQLiteExtensions documentation.
- `runtime-tested`: required before claiming state survives restart, crash, migration, or rollback on a target server.

## What This Domain Controls

Character/account/server state, quest state, economy state, crafted items, object serialization, database schemas, migrations, backups, recovery, data ownership, and safe defaults.

## Source-Backed Facts To Preserve

- Object locals are useful runtime state but are not a persistence proof.
- Campaign DB functions store typed values under a campaign name, variable name, and optional player association.
- Campaign DB names are case-sensitive and spaces in the campaign name are stripped by the documented functions.
- Campaign DB variable names have practical limits in the documented function notes; avoid long concatenated names.
- Campaign DB state is independent of savegames, which is useful for persistent worlds but dangerous for rollback and single-player save assumptions.
- Built-in EE SQLite uses `sqlquery`, `SqlPrepareQueryCampaign` or `SqlPrepareQueryObject`, bind functions, and `SqlStep`.
- `SqlStep` executes and fetches a row; it can return false when a query succeeded but returned no data, so errors need explicit inspection.
- NWNX:EE is a separate server extension framework, not vanilla NWN.
- NWNX:EE is natively Linux-focused; Windows usage is through Docker or WSL/WSL2 according to the NWNX docs.
- NWNX:EE module integration requires importing the release `NWScript.zip` scripts and rebuilding scripts when updating NWNX.
- NWNX plugins are controlled by environment variables before `nwserver` starts.
- NWNX SQL supports `MYSQL`, `POSTGRESQL`, and `SQLITE` targets through `NWNX_SQL_TYPE`.
- NWNX SQL SQLite databases are stored under `UserDirectory/database`.
- NWNX SQL migration guidance prefers prepared statements over assembled strings because bound data is treated as data and avoids escaping/injection issues.
- NWNX NWSQLiteExtensions extends the built-in SQLite database and can expose read-only 2DA virtual tables when enabled.

## Design Questions

- What state actually needs persistence: account, PC, quest, world event, faction, economy, inventory, craft recipe, cooldown, location, or audit log?
- Does the server need vanilla compatibility, or is NWNX allowed?
- Is the database local SQLite, Campaign DB, NWNX SQLite, MySQL, PostgreSQL, Redis, or project-specific?
- What object owns the data: account, CD key, player name, character, module, area, guild, party, or server shard?
- What is the stable identifier and what happens when a character is renamed or imported?
- What schema version is current and how are migrations applied?
- Which writes are immediate and which are batched/debounced?
- What can be reconstructed from module files, and what is irreplaceable player data?
- What exact backup and rollback restore data without duplicating rewards or corrupting character state?
- What logs prove a write, read, migration, and rollback happened?

## Implementation Path

1. Define the state inventory and owner for each value.
2. Choose a storage lane: object locals, campaign DB, built-in SQLite, NWNX SQL, NWNX plugin storage, or external service.
3. Write an explicit schema or key naming convention with version number.
4. Prefer prepared/bound SQL APIs when using SQL.
5. Add idempotent migration scripts and record migration completion.
6. Add read/write logging with privacy-safe identifiers.
7. Add backup/export steps for all persistent stores.
8. Test first write, first read after relog, restart survival, failed-write handling, and rollback.
9. Document operational ownership: who can migrate, backup, restore, prune, and inspect data.

## Recommended Output Shape

For persistence/database/NWNX tasks, produce:

1. State inventory table.
2. Storage lane decision with vanilla-vs-NWNX label.
3. Schema/key plan with version.
4. Read/write API pattern.
5. Migration plan.
6. Backup and restore plan.
7. Runtime verification checklist.
8. Failure modes and rollback.
9. Exact blockers and evidence label.

## Runtime Verification

Test at least:

- write succeeds for a fresh character;
- read succeeds after logout/login;
- read succeeds after server restart;
- missing data returns a planned default;
- failed SQL/campaign DB operation logs a useful error;
- migration is idempotent;
- rollback restores the previous state without duplicating player rewards;
- backup can be restored into a clean staging server;
- NWNX plugin existence/config is checked before NWNX-specific scripts run.

## Guardrails

- Do not mix vanilla and NWNX advice without labeling the dependency.
- Do not assume NWNX works on native Windows.
- Do not claim persistence works from a successful write alone; prove restart and restore behavior.
- Do not build SQL by string concatenation when a prepared/bound API is available.
- Do not use player display names as the only stable key unless the server accepts rename/import risks.
- Do not store secrets or database passwords in public skill artifacts.
- Do not run migrations without a backup and a schema version check.
- Do not serialize large objects casually; define cleanup and bloat controls.

## Sources

- NWNX:EE main docs: https://nwnxee.github.io/unified/
- NWNX:EE core/plugin management: https://nwnxee.github.io/unified/dark/group__nwnx.html
- NWNX:EE SQL plugin: https://nwnxee.github.io/unified/group__sql.html
- NWNX:EE SQL migration guide: https://nwnxee.github.io/unified/md_Plugins_SQL_Migration_Guide.html
- NWNX:EE NWSQLiteExtensions: https://nwnxee.github.io/unified/group__nwsqliteextensions.html
- NWN Lexicon SQL functions: https://nwnlexicon.com/Category%3ASQL_Functions
- NWN Lexicon `SqlStep`: https://nwnlexicon.com/SqlStep
- NWN Lexicon `sqlquery`: https://nwnlexicon.com/Sqlquery
- NWN Lexicon Campaign Database functions: https://nwnlexicon.com/Categoryfunction.database.html
- NWN Lexicon `GetCampaignString`: https://nwnlexicon.com/GetCampaignString
- NWN Lexicon `SetCampaignString`: https://nwnlexicon.com/SetCampaignString

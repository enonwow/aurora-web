# Source Registry

Use this reference when a NWN task depends on external facts rather than project-local files or runtime evidence.

## Trust Tiers

- `primary`: official or project-owned source for the relevant software.
- `strong-community`: widely used community reference, useful but review before promotion.
- `community-example`: tutorial, forum, package snapshot, or example workflow; use only as a starting point.
- `local-runtime`: direct evidence from the target module/server/runtime.
- `local-intake`: Aurora Toolset live records, screenshots, local reverse-engineering notes, or decompilation-derived leads awaiting maintainer review and redaction.

## Preferred Sources By Domain

- Codex skill behavior: local `skill-creator` and the Codex manual.
- NWN:EE engine changes: Beamdog docs/changelog.
- NWScript functions and events: NWN Lexicon, especially Events, Module Events, ExecuteScript, DelayCommand, and AssignCommand.
- NWScript object context: NWNWiki/Fandom `OBJECT_SELF` plus runtime logs in the target event.
- Testing and runtime QA: `neverwinter.nim` README and `nwn_script_comp` source for compile evidence; NWN Lexicon Debug Functions, PrintString, WriteTimestampedLogEntry, SendMessageToPC, GetIsObjectValid, OBJECT_SELF, Preprocessors, GetScriptBacktrace, and NWN:EE Script Editing Tutorial for vanilla instrumentation.
- Areas and tilesets: NWNWiki/Fandom Area, Tileset, and Create area transition pages.
- Runtime area/transition scripting: NWN Lexicon Trigger Events, CreateArea, CopyArea, SetTransitionTarget, GetTransitionTarget, and GetArea.
- Creatures and encounters: NWNWiki/Fandom Creature, Encounter, Challenge Rating, and Faction pages.
- Creature/encounter scripting: NWN Lexicon Creature Events, Encounter Events, OnSpawn, OnDeath, OnPerception, CreateObject, SetSpawnInCondition, and DetermineCombatRound.
- Items, equipment, and loot structure: NWNWiki/Fandom Item, Item property, Activate item, and Tag-based scripting pages.
- Item scripting/runtime behavior: NWN Lexicon Module Events, OnAcquireItem, OnPlayerEquipItem, OnUnAcquireItem, CreateItemOnObject, GetBaseItemFitsInInventory, AddItemProperty, GetFirstItemProperty, and Item Properties Functions.
- Economy, crafting, and progression: NWN Lexicon Money Functions, Stores Functions, Experience Functions, Item Creation Functions, GetGold, HasGold, GiveGoldToCreature, TakeGoldFromCreature, GetGoldPieceValue, store gold/max-buy/infinite-stock helpers, GiveXPToCreature, GetXP, SetXP, GetJournalQuestExperience, CIUseCraftItemSkill, CICraftCheckBrewPotion, CICraftCheckScribeScroll, CraftBrewPotion, Base Item constants, and Feat constants.
- Default Toolset crafting behavior: NWNWiki/Fandom Craft Armor, Craft Weapon, and Craft Trap pages; use XP training system pages as examples only.
- Quests, dialogue, and journal: NWN Lexicon Conversation Functions, Journal Functions, ActionStartConversation, BeginConversation, Conversation Conditional Script, Conversation Action Script, Conversation End Script, Conversation Abort Script, GetPCSpeaker, GetScriptParam, SetCustomToken, ActionPauseConversation, ActionResumeConversation, AddJournalQuestEntry, and RemoveJournalQuestEntry.
- Simple conversation/journal Toolset examples: NWNWiki/Fandom Start a conversation, Add multiple journal entries, and Include questing pages, treated as examples only.
- Campaign DB and built-in SQLite: NWN Lexicon Campaign Database functions, SQL functions, `sqlquery`, and `SqlStep`.
- NUI scripting: NWN Lexicon NUI functions.
- NUI asset/system notes: nwn.wiki NUI page.
- NWNX: NWNX:EE main docs, core/plugin management, Util docs, SQL plugin, SQL migration guide, NWSQLiteExtensions, Area docs, Creature docs, Item docs, ItemProperty docs, Store docs, and SkillRanks docs.
- 2DA, TLK, and HAK structure: NWNWiki/Fandom pages plus runtime/project files.
- NWSync tooling: `neverwinter.nim` README and NWSync utility source; legacy `Beamdog/nwsync` only as a migration notice.
- NWSync setup walkthroughs: use Steam/forum guides only as examples.
- Server/client config: NWNWiki/Fandom `settings.tml` page plus target-installation settings and runtime logs.
- Aurora Toolset live intake: treat returned live records, redacted screenshots, local reverse notes, and decompilation-derived leads as `local-intake` until a maintainer review accepts a reference-promotion record; only then copy compact guidance into installed references.

## Rule

External documentation can suggest an implementation path. It does not replace runtime testing in the target module/server.

Local Aurora intake can suggest what to test or document. It does not become installed skill knowledge without review, redaction, target-reference routing, and a promotion decision.

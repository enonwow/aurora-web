# Local Aurora Reverse Ingestion

## Purpose

Capture local, non-internet knowledge from:

- Codex thread `019ed62e-3e0f-7253-91ff-f529be54abfe`,
- passive Aurora Toolset UI/UX gallery analysis in `C:\Projects\aurora-web`,
- local Aurora decompilation/export corpus in `C:\Projects\New Folder`.

This is working knowledge for the NWN server gamedev skill-pack maintainers. It is not official NWN documentation, not live Toolset verification, and not a source to copy wholesale into the installed skill.

## Verified This Turn

- Read thread `019ed62e-3e0f-7253-91ff-f529be54abfe` through the Codex thread reader.
- The thread title is `Zbierz screeny Aurora UI/UX`.
- The latest useful worker role in that thread was Worker 5: Screenshot/Gallery Analyst for teaching Codex to build locations in Aurora Toolset.
- Worker 5 wrote a passive screen-analysis report at `C:\Projects\aurora-web\docs\aurora-toolset-worker5-gallery-analysis-2026-06-18-2026.md`.
- Worker 5 wrote atom annotations at `C:\Projects\aurora-web\.codex-tmp\original-aurora-reference-screens\gallery\worker5_batch82_atom_annotations.json`.
- The gallery report says the current manifest count was `1276` and the newest analyzed screens were the Toolset palette strip and Item palette category tree.
- A 2026-06-19T08:19:16Z fresh thread probe reconfirmed that the newest thread
  page is the stopped-loop confirmation for `heartbeat-co-1-min`; paginating one
  page older re-enters the already-ingested Worker 5 batch82 turn, so no new
  screen batch or verified-live Toolset evidence was exposed.
- The same 2026-06-19T08:19:16Z probe confirmed the useful handoff action is
  live Toolset verification or an Aurora live record, not more passive mining
  from this stopped thread unless a future no-cursor read exposes a new batch.
- A 2026-06-19T09:03:17Z newest five-turn thread probe reconfirmed the same
  boundary: the loop is stopped, batch82 remains the latest useful passive UI
  intake, and the thread did not expose new atom JSON, contact sheets, or
  verified-live Toolset evidence beyond gallery index `1276`.
- The 2026-06-19T09:03:17Z probe also reconfirmed that further value from this
  source should be targeted gaps such as inventory/loot, door transition,
  sound, area light/fog, and palette, or live Toolset verification rather than
  broad repeated thread mining.
- A 2026-06-19T04:05:42Z thread status recheck confirmed the Worker 5 loop was
  stopped by the user through `heartbeat-co-1-min`, and no new verified screen
  batch was visible after batch82 / gallery index `1276` in the newest thread
  page.
- A 2026-06-19T04:05:42Z local filesystem recheck confirmed
  `C:\Projects\New Folder`, `C:\Projects\New Folder\export\decompiled_all.c`,
  `C:\Projects\New Folder\export\strings.tsv`, and
  `C:\Projects\New Folder\export\xrefs_domain.txt` are present in this
  maintainer workspace.
- `C:\Projects\New Folder` exists and contains local reverse/export material, including:
  - `C:\Projects\New Folder\export\decompiled_all.c`
  - `C:\Projects\New Folder\export\functions.tsv`
  - `C:\Projects\New Folder\export\strings.tsv`
  - `C:\Projects\New Folder\export\strings_2da.tsv`
  - `C:\Projects\New Folder\export\xrefs_domain.txt`
  - top-level CSV slices for `2da`, `are`, `area`, `creature`, `git`, `hak`, `module`, `placeable`, `tlk`, `utc`, and `utp`.

## Evidence Boundary

Use evidence label `local-reverse-lead` for this material.

This corpus may guide:

- operation taxonomy,
- naming of Aurora Toolset atoms,
- source-discovery questions,
- runtime QA checklists,
- targeted live Toolset verification.

It must not be treated as:

- official documentation,
- complete source code truth,
- live Toolset behavior,
- legal/public redistribution material,
- installable plugin content,
- proof that a generated NWN feature works.

## Thread-Derived UI Atoms

From Worker 5 batch82:

- `palette.switchBlueprintSource(Standard|Custom)` is a screen-supported atom.
- `palette.selectObjectFamilyByIcon(index_or_family)` is a screen-supported atom.
- `itemPalette.openCategory(Weapons|Armor|Miscellaneous|Creature Items|Plot Item|Tutorial)` is a screen-supported atom.
- The first loot workflow hypothesis is:
  `select Item family -> Standard tab -> expand Weapons/Miscellaneous -> choose blueprint -> insert into target inventory`.

From the 2026-06-19 follow-up thread read:

- batches 69, 70, and 71 strengthen `placeable.openBasicProperties(selected_placeable)` as a passive-screen atom for placed objects such as gong, chest, and container/dresser,
- batch74 adds passive-screen leads for `moduleWizard.createModuleShell()`, `areaWizard.createAreaShell()`, `toolset.buildModule()`, and `viewport.useCameraMovementToolbar()`,
- batch77 adds a passive-screen lead for `creature.openScriptsTab()` and creature event-handler slot inspection,
- these leads are useful for live-operator checklist sequencing, but still do not prove exact click targets, mutation safety, save behavior, or runtime effect.

From the 2026-06-19 third thread read:

- batch65 adds a passive-screen lead for `areaEditor.useTileGroupPlacementPreview()` with tile grid, placement bounds, and group palette context,
- batch67 strengthens `scriptEditor.openFullEditor()` and `area.inspectMainViewport()` with full Area Editor and Script Editor screenshots,
- batch68 adds passive-screen leads for `placeable.openScriptsTab()` and for a property-launched Script Editor flow,
- these leads support live-check planning for a small location, but they still do not prove saved GIT/ARE mutation, compile success, or runtime behavior.

From the 2026-06-19 fourth thread read:

- batch58 adds a passive-screen lead for `creature.inspectAdvancedInterface()` with faction, sound set, perception range, variables, and module-tree context,
- batch59 strengthens `creature.openBasicProperties()`, `creature.openScriptsTab()`, `scriptEditor.openFullEditor()`, and Area Editor palette/tile inspection leads,
- batch62 adds passive-screen leads for `area.inspectProperties()`, `area.useResizeRotateMenu()`, `tile.inspectBlockProperties()`, `sound.openProperties()`, and `item.openPropertiesWithHelp()`,
- batch63 strengthens `moduleWizard.createModuleShell()` and `areaWizard.createAreaShell()` with a complete startup-to-first-area tutorial sequence,
- batch64 strengthens `conversation.openEditor()` with a full Toolset shell and dialogue-tree screen,
- these leads fill important server-design lanes, but they still do not prove field semantics, save/reopen behavior, compiled-resource output, or runtime player-visible effects.

From the 2026-06-19 fifth thread read:

- batch51 strengthens `area.inspectMainViewport()` and adds a passive-screen lead for `areaEditor.inspectFullMapView()` with full Area Editor / map-scale prefab context,
- batch52 strengthens `conversation.openEditor()`, `scriptEditor.openFullEditor()`, `sound.openProperties()`, `area.inspectMainViewport()`, and palette-family inspection with RPG Design Workshop Toolset captures,
- batch53 adds passive-screen leads for `door.openProperties()`, `door.inspectTransitionWarnings()`, `placeable.openContextMenu()`, and old Toolset Area Editor / Script Editor workflows,
- batch55 adds passive-screen leads for `waypoint.openProperties()`, labelled main-window layout, Area Editor grid/selector variants, and additional Script Editor views,
- batch56 strengthens `placeable.openScriptsTab()` and the property-launched Script Editor workflow with an academic CAE 2008 figure,
- batch57 adds passive-screen leads for `plotWizard.inspectPropsAndPlotNodes()` from Balduran `Plot Wizard` `Props` and `Plot Nodes` steps,
- these leads are especially useful for quest/scaffold, door/transition, waypoint, and script-event planning, but they still do not prove click routes, save behavior, warning causes, or runtime player traversal.

From the 2026-06-19 sixth thread read:

- batch45 strengthens `scriptEditor.openFullEditor()`, `scriptEditor.findText()`, `item.openProperties()`, `creature.openScriptsTab()`, `conversation.openEditor()`, and `toolset.inspectEnvironmentOptions()` from official World Builder Guide references,
- batch46 strengthens `conversation.openEditor()` and `conversation.inspectDialogueTree()` with two Chez-Alice dialogue-tree variants,
- batch47 adds passive-screen leads for `store.inspectMerchantInventoryProperties()` and strengthens `scriptEditor.openFullEditor()` with NWScript function-panel context,
- batch48 adds a passive-screen lead for `placeable.inspectInventoryProperties()` with `Has Inventory` and `Inventory...`,
- batch49 adds passive-screen leads for `module.inspectCustomContentHakList()` and `sound.paintPlacedSoundObject()` from `Module Properties -> Custom Content`, Sound Palette, and Paint Sounds screens,
- batch50 adds passive-screen leads for `module.inspectXpScale()` and `palette.inspectToolsetIconReferences()` from NWNWiki Toolset references,
- local reverse symbols checked during this pass include `Mod_XPScale`, `Mod_HakList`, `Mod_Hak`, `TdlgStoreEdit`, `TdlgFindInstance`, `TdlgEnvironment`, and `TdlgSoundEdit`,
- these leads are useful for module setup, custom content, progression, inventory, store/economy, and Toolset-productivity planning, but they still do not prove HAK load success, runtime XP scaling, buy/sell behavior, container access, or audio playback.

From the 2026-06-19 seventh thread read:

- batch34 strengthens `scriptEditor.openFullEditor()`, `scriptEditor.inspectFunctionBrowser()`, `area.inspectProperties()`, and adds a low-confidence `visualScripting.inspectActionPalette()` lead that must stay separate from standard NWScript authoring,
- batch35 strengthens `conversation.openEditor()` and adds passive-screen leads for `journal.openEditor()`, `journal.editCategoryEntry()`, and acquired-item condition/property-sheet context,
- batch36 strengthens `journal.openEditor()` and adds `journal.bindConversationConditionAction()` as a quest-state lead that crosses journal, conversation, and script design,
- batch37 strengthens `area.inspectProperties()`, `waypoint.openProperties()`, and `toolset.buildModule()`,
- batch38 strengthens `conversation.openEditor()`, `door.openProperties()`, item properties, script help/function descriptions, object script-slot inspection, placeable palette navigation, and module contents area-list inspection,
- batch39 strengthens `areaWizard.selectTilesetAndSize()`, `creatureWizard.selectAppearancePortrait()`, and palette-panel inspection,
- batch41 strengthens `item.inspectSpecialAbilities()`, `area.inspectProperties()`, `areaTransition.openDialog()`, and `plotWizard.inspectOutputSummary()`,
- batch42 strengthens item/script/creature/area/door/property and terrain-map screen families from local Aurora duplicate-pass findings,
- batch43 adds passive-screen leads for `area.placeStartLocation()`, `creature.placeFromPalette()`, and `conversation.inspectDialogueTree()`,
- batch44 strengthens portrait and Creature Wizard confirmation flows and adds an encounter dialogue during module-load flow,
- local reverse symbols checked during this pass include `TdlgJournalEditor`, `TJournalFile`, `TJournalCategory`, `TJournalEntry`, `@:JournalEditor`, `_dlgJournalEditor`, `actJournalEditExecute`, `TdlgAreaTransition`, `TdlgAreaWizard`, `TdlgCreatureWizard`, `TdlgConversationEditor`, `TdlgScriptEditor`, `TdlgItemEdit`, `TdlgCreatureEdit`, `TdlgDoorEdit`, `TdlgWaypointEdit`, `Mod_Area_list`, `Build_Module`, `Build_Unused_Conversations`, `Build_Missing_Areas`, and `Build_Compile_Scripts`,
- these leads improve quest/journal, wizard, transition, build, placement, and module-navigation planning, but they still do not prove UI routes, persisted GFF changes, build success, or runtime server behavior.

From the 2026-06-19 cursor-recovery pass:

- the previously stored thread cursor `019ed95c-1738-7153-bb5b-67fac613709c` was rejected by the current thread reader as unknown,
- a fresh no-cursor read recovered the valid reader chain through
  `019edbdf-c019-7293-99db-2a5a10518cb0` to
  `019edb5b-e004-7ca0-872e-c623bda1a178`,
- the recovered page mostly overlapped already mapped screen-supported
  material from batches 72, 73, 76, 77, 79, 80, and 82,
- local reverse search during recovery confirmed additional symbol-led gaps:
  `TdlgFactionEditor`, `TdlgFactionSelect`, `FactionSystem`, `FactionList`,
  `TdlgEncounterEdit`, `TdlgEncounterWizard`, `TfraEncounterCreatureList`,
  `TNWEncounterInstance`, `TNWEncounterSpawnPoint`, `TdlgStoreSetupWizard`,
  `TdlgResOpen`, `TdlgResOpenSound`, `@:ResOpenDialog`, `TdlgTriggerEdit`,
  `TdlgTriggerWizard`, `OnEnter`, `OnExit`, `OnTrapTriggered`,
  `Build_Missing_Encounters`, and `Build_Compile_Encounters`,
- these are useful backlog lanes for Toolset live checks, but remain
  `local-reverse-lead` only until a passive screen or live record verifies
  actual UI routes and runtime behavior.

From the 2026-06-19 eighth thread read:

- cursor `019edb5b-e004-7ca0-872e-c623bda1a178` was accepted and returned
  next cursor `019edb05-cadf-7541-b87d-a15beb465586`,
- most of the page was overlap or no-new-value search reporting, but batch66
  adds a separately useful passive-screen lead for Game Watch Japan 2002
  `Area Wizard` size selection and full `Area Editor` creature placement with
  blueprint palette, module tree, viewport, and build/status panel,
- later no-new-value searches on the same page are useful coverage notes for
  UAlberta 2009/2010, Aurora-ScriptEase, realms.su, Game Watch 2003,
  MobyGames, official BioWare builders/images, Neverwinter CZ, Vault-related
  leads, HoTU manual, Amethyst Dragon, and ResearchGate/ACM, but they do not
  add promotable Toolset operation atoms.

Skill implication:

- Add batch66 as support for existing `areaWizard.selectTilesetAndSize()` and
  `creature.placeFromPalette()` live checks, not as a new standalone skill
  reference.
- Keep negative/no-new source coverage in maintainer research artifacts only;
  do not burden installed skill references with search-history detail.

From the 2026-06-19 ninth thread read:

- cursor `019edb05-cadf-7541-b87d-a15beb465586` was accepted and returned
  next cursor `019eda6f-1926-7f82-ba9a-326b3e1e75de`,
- the page did not add a new unmapped Toolset operation atom for this workflow,
- it re-confirmed already ingested screen-supported leads for batch65 Game
  Watch Japan 2002 `Area Editor`, batch59 Spanish-localized `Area Editor` /
  palette / `Creature Properties` / `Script Editor`, and batch58 GiantBomb
  `Creature Properties` Advanced/Interface,
- because `019eda6f-1926-7f82-ba9a-326b3e1e75de` is already covered by the
  fourth intake page above, this recovered cursor chain is now looping into
  known material.

Skill implication:

- Stop treating this cursor chain as an efficient source of new facts unless a
  future task needs exact historical source coverage.
- The better next improvement path is live Toolset verification for symbol-led
  gaps, or schema/template work for capturing those gaps after a human run.
- Because the newest thread page now ends at the stopped-loop confirmation, do
  not schedule more passive thread mining from this source by default.

Still hypothesis:

- exact icon-to-family mapping,
- hover tooltips,
- selected-state behavior,
- whether the same palette sequence works identically for creature, placeable, door, trigger, and sound families,
- final insertion behavior into placeable inventory, creature inventory, or merchant inventory.
- whether archived wizard/build screens match the currently installed Aurora Toolset build closely enough for modern operator automation.
- whether Script Editor behavior is identical when opened directly and when launched from creature/placeable event slots.
- whether tile group placement preview, paint, undo, save, reopen, and build form one safe repeatable workflow.
- whether area properties, resize/rotate menu actions, and tile/block properties mutate the same ARE/TILE data paths or separate persisted structures.
- whether placed sound properties map cleanly to `TNWSoundInstance` / `CExoSoundSource` runtime playback without extra HAK or resource-picker requirements.
- whether `Creature Properties -> Advanced/Interface` should be a single checklist or split into faction, perception, sound set, and variable sub-atoms.
- whether Plot Wizard output is still appropriate for modern NWN server design, or should be treated only as a legacy quest-scaffolding aid beside explicit conversation/journal/script plans.
- whether door transition warnings are caused by missing targets, invalid door state, unsaved area data, or other validation conditions.
- whether waypoint properties should be promoted as a standalone atom or only as support for start locations, transitions, encounters, and scripted movement.
- whether `Module Properties -> Custom Content` edits need separate Toolset restart/load/build checks before any HAK/TLK guidance can be trusted.
- whether `Mod_XPScale` is enough for runtime progression design or needs separate server-side XP/reward validation.
- whether placeable inventory UI maps cleanly to player access, lock/trap behavior, and important item safety in a multiplayer module.
- whether store/merchant inventory properties require separate setup wizard, open-store script, buy/sell modifier, and client transaction tests.
- whether `TdlgJournalEditor` plus journal screens are enough to split journal
  category editing, entry editing, and conversation condition/action binding
  into separate promotion candidates.
- whether area-transition dialog setup uses door, trigger, and waypoint target
  choices uniformly enough to share one transition checklist.
- whether `Build_Module`/`Build_*` strings map to the same Toolset build
  warnings seen by a modern operator, and which warnings are release blockers.
- whether area/creature wizard screens still match the installed Toolset
  closely enough for automation-safe instructions.
- whether start-location marker placement and `Mod_Entry_*` module fields must
  be verified in one record or two separate records.
- whether faction editing should be a first-class live atom or only a support
  atom for creature, encounter, store, and reputation design.
- whether encounter creation requires separate records for the encounter
  object, creature list, spawn points, faction, reset behavior, and OnEnter /
  OnExit scripts.
- whether the generic resource picker `TdlgResOpen` and sound-specific
  `TdlgResOpenSound` should share one checklist shape or be split by resource
  family.
- whether trigger geometry/properties and `OnTrapTriggered` should be validated
  in one flow or separated into trigger shape, trap behavior, and script slots.

## Decompiled Dialog And Object Taxonomy

The local strings corpus exposes a useful Toolset taxonomy:

| Skill-pack domain | Decompiled/export terms found | Use for skill design |
| --- | --- | --- |
| Locations / areas | `TdlgAreaWizard`, `TdlgAreaProperties`, `DefaultAreaProperties`, `*.ARE` | Treat area creation and area property editing as separate atoms. |
| Door transitions | `TdlgDoorEdit`, `TdlgDoorWizard`, `TdlgAreaTransition`, `@:AreaTransitionDialog`, `TNWDoorTemplate`, `TNWDoorInstance`, `*.UTD` | Model door blueprint/edit work separately from area-transition linking. |
| Triggers | `TdlgTriggerEdit`, `TdlgTriggerWizard`, `TNWTriggerTemplate`, `TNWTriggerInstance`, `triggerpalcus.itp` | Treat trigger blueprint/edit as its own atom family, with palette support. |
| Sounds | `TdlgSoundEdit`, `TdlgSoundWizard`, `TdlgSoundSetSelect`, `TdlgResOpenSound`, `TNWSoundTemplate`, `TNWSoundInstance`, `CExoSoundSource` | Keep sound object placement, sound-set selection, and resource-open flow distinct. |
| Placeables | `TdlgPlaceableEdit`, `TdlgPlaceableWizard`, `TNWPlaceableTemplate`, `TNWPlaceableInstance`, `*.UTP` | Separate placeable blueprint selection, placed instance editing, and inventory-bearing containers. |
| Items / loot | `TdlgItemEdit`, `TdlgItemWizard`, `TdlgItemGeneratorEdit`, `TdlgInventory`, `TfraMainInventory`, `TNWItemTemplate`, `TNWItemInstance`, `NWInventoryObjectRef`, `*.UTI` | Treat item blueprint editing, inventory insertion, and generated loot separately. |
| Creatures / encounters | `TdlgCreatureEdit`, `TdlgCreatureWizard`, `TNWCreatureTemplate`, `TNWCreatureInstance`, `TfraEncounterCreatureList`, `TNWEncounterInstance`, `*.UTC` | Keep creature blueprint, creature instance, encounter creature list, and encounter placement distinct. |
| Encounters / spawn points | `TdlgEncounterEdit`, `TdlgEncounterWizard`, `TfraEncounterCreatureList`, `TNWEncounterInstance`, `TNWEncounterSpawnPoint`, `Encounter List`, `Build_Missing_Encounters`, `Build_Compile_Encounters` | Treat encounter object setup, spawn-point placement, creature list, reset behavior, and build checks as separate from single creature placement. |
| Factions / reputation | `TdlgFactionEditor`, `TdlgFactionSelect`, `FactionSystem`, `FactionList`, `FactionName`, `FactionRep`, `Belongs to Faction`, `actEditorFactionExecute` | Route faction/reputation design as a shared dependency for creatures, encounters, stores, and hostile/friendly behavior. |
| Conversations / journals | `TdlgConversationEditor`, `TdlgConversationInput`, `TdlgConversationSearch`, `TdlgConversationTest`, `TfraConversationTree` | Model dialogue authoring, input/editing, search, and conversation test as separate UI flows. |
| Scripts | `TdlgScriptEditor`, `TdlgScriptWizard`, `TdlgScriptSearch` | Keep script creation, editing, and search separate from object event binding. |
| Module setup | `TdlgModuleWizard`, `TdlgModuleSelect`, `Mod_*` fields | Treat module metadata, entry point, events, HAK/TLK, and area list as module-level design atoms. |
| HAK/TLK/custom content | `TNWHakPak`, `TNWHakPakList`, `TNWHakPakResource`, `ResourceInHak`, `HAK V1.0`, `CTlkTable`, `dialog.tlk`, `Mod_CustomTlk` | Keep HAK resource lookup and custom TLK handling in the custom-content pipeline. |
| Resource pickers | `TdlgResOpen`, `TdlgResOpenSound`, `@:ResOpenDialog`, `_dlgResOpen`, sound resource actions | Keep generic resource selection separate from sound preview/playback and custom content availability checks. |
| GIT / placed objects | `TGITFile`, `CResGFF`, typed `TGITFile` handlers for creature, door, encounter, item, placeable, sound, and trigger instances | Treat placed-object operations as GIT-backed area-instance mutations that need runtime/live verification. |

## Module Fields Worth Promoting To Design Checklists

The string corpus includes module field names that map well to server-design checklists:

- identity: `Mod_ID`, `Mod_MinGameVer`, `Mod_Creator_ID`, `Mod_Version`, `Mod_Name`, `Mod_Tag`, `Mod_Description`, `Mod_UUID`,
- entry point: `Mod_Entry_Area`, `Mod_Entry_X`, `Mod_Entry_Y`, `Mod_Entry_Z`, `Mod_Entry_Dir_X`, `Mod_Entry_Dir_Y`,
- time/progression: `Mod_DawnHour`, `Mod_DuskHour`, `Mod_MinPerHour`, `Mod_StartMonth`, `Mod_StartDay`, `Mod_StartHour`, `Mod_StartYear`, `Mod_XPScale`,
- module events: `Mod_OnHeartbeat`, `Mod_OnModLoad`, `Mod_OnModStart`, `Mod_OnClientEntr`, `Mod_OnClientLeav`, `Mod_OnActvtItem`, `Mod_OnAcquirItem`, `Mod_OnUsrDefined`, `Mod_OnUnAqreItem`, `Mod_OnPlrDeath`, `Mod_OnPlrDying`, `Mod_OnPlrEqItm`, `Mod_OnPlrLvlUp`, `Mod_OnSpawnBtnDn`, `Mod_OnPlrRest`, `Mod_OnPlrUnEqItm`, `Mod_OnCutsnAbort`, `Mod_OnPlrChat`, `Mod_OnPlrTarget`, `Mod_OnPlrGuiEvt`, `Mod_OnPlrTileAct`, `Mod_OnNuiEvent`,
- custom content: `Mod_CustomTlk`, `Mod_HakList`, `Mod_Hak`, `Mod_Expan_List`,
- campaign/global state: `Mod_GVar_List`, `Mod_Area_list`, `Mod_CutSceneList`, `Mod_StartMovie`, `Mod_DefaultBic`, `Mod_PartyControl`.

Skill implication:

- The server feature design template should ask about module-level event scripts and entry/start state when a feature touches login, item acquisition, NUI, tile actions, chat, death, rest, or cutscene behavior.

## 2DA And Model Dependency Leads

The local 2DA strings show several Toolset/runtime-sensitive model dependencies:

- `C2DA`, `CRes2DA`, `CResHelper<CRes2DA,2017>`,
- `Classes.2DA` name StrRef validation,
- `WingModel 2DA`,
- `TailModel 2DA`,
- `CAPart 2DA`,
- `CloakModel 2DA`,
- `FeatPref2DA`,
- `SkillPref2DA`,
- `SpellPref2DA`,
- `Equip2DA`.

Skill implication:

- Custom content guidance should distinguish "edit a 2DA row" from "prove Toolset can load the row and build the model".
- 2DA guidance should include StrRef validation, model resource presence, and Toolset preview/build checks before runtime testing.

## QA Error Strings Worth Turning Into Checks

Useful error strings found in local exports:

- `TdlgCreatureEdit::LoadClasses: Invalid Strref found in Name field of Classes.2DA`
- `TdlgCreatureEdit::SetWings: Can't load WingModel 2DA file`
- `TdlgCreatureEdit::SetTail: Can't load TailModel 2DA file`
- `TdlgCreatureEdit::CreateModel: Can't load CAPart 2DA file`
- `TdlgItemEdit::Cloaks: Can't load CloakModel 2DA file`
- `TdlgItemEdit::CreateModel(): Tried to append non-existent model %s`
- `TdlgInventory::GetItemFromInventoryObject(): Item template '%s' does not exist`
- `TNWDoorInstance::CreateModel(): Cannot find model '%s'`
- `TNWDoorInstance::CreateModel(): No model name for door appearance type %d, generic type %d.`
- `TGITFile::LoadDoorInstances(): Could not build model for door instance %d. Door object will not be created.`
- `TGITFile::ProcessGitFile(): Caught exception while processing area`
- `Error: could not open dialog.tlk`
- `ResourceInHak`

Skill implication:

- The QA ladder should include Toolset open/preview/build failure modes, not only NWScript compile/runtime logs.
- A good generated plan should include "what Toolset error would falsify this custom content change".

## Candidate Skill-Pack Additions

Do not add raw decompilation to the installed skill.

Good future additions:

1. Add a compact `references/aurora-toolset-operation-taxonomy.md` after live verification confirms the main atoms.
2. Add a maintainer-only local reverse source registry for `C:\Projects\New Folder`.
3. Extend `feature-design-output-template.md` with module-level event slots when the requested feature touches login, NUI, tile actions, item acquisition, player death/rest/chat, or cutscenes.
4. Extend `two-da-hak-tlk-pipeline.md` with Toolset-load and model-build checks based on the error-string leads above.
5. Extend `locations-areas-tilesets.md` with separate atoms for area creation, area properties, door editing, and area-transition linking.
6. Extend `items-equipment-loot.md` with separate atoms for item palette category, item blueprint edit, inventory insertion, and item generator edit.

## Generated Symbol Index

The first requested local research step has been converted into a regenerable maintainer artifact:

- generated index: `docs/nwn-skill-pack/local-aurora-symbol-index.md`,
- generator: `docs/nwn-skill-pack/tools/generate_local_aurora_symbol_index.py`,
- gap analysis against the current draft skill references: `docs/nwn-skill-pack/local-aurora-skill-reference-gap-analysis.md`,
- live operator checklist for a small location: `docs/nwn-skill-pack/local-aurora-small-location-live-operator-checklist.md`,
- regeneration command:
  `python docs\nwn-skill-pack\tools\generate_local_aurora_symbol_index.py --reverse-root "C:\Projects\New Folder" --out docs\nwn-skill-pack\local-aurora-symbol-index.md --json-summary`.

Current generated summary:

- parsed text rows: `29323`,
- Toolset dialogs: `74`,
- Toolset frames: `26`,
- module fields: `55`,
- TNW templates: `10`,
- TNW instances: `10`,
- resource extensions: `15`,
- resource systems: `12`.

Evidence boundary:

- This index is `local-reverse-lead` evidence only.
- It is useful for finding operation boundaries and QA leads.
- It is not official documentation, live Toolset proof, runtime proof, or material to copy directly into the installed skill.

## Still Hypothesis

- The decompiled symbol names reflect useful operation boundaries, but they do not prove exact UI steps.
- The `TGITFile` typed handlers imply placed-object operations are area-instance/GIT-backed, but exact write behavior still needs controlled module tests.
- Error strings are excellent QA leads, but the exact UI path to trigger each error still needs live Toolset reproduction.
- Batch82 palette atoms should be validated against a live Toolset window before being promoted to skill reference guidance.

## Next Local Research Steps

1. Run `local-aurora-small-location-live-operator-checklist.md` on a disposable module.
2. Convert filled evidence rows into a reviewed reference-promotion proposal.
3. Promote only the reviewed, compact taxonomy into the draft skill references after the live operator confirms enough steps.
4. Pause passive thread intake on the recovered cursor chain for now:
   `019edb05-cadf-7541-b87d-a15beb465586` returns to already ingested cursor
   `019eda6f-1926-7f82-ba9a-326b3e1e75de`. Continue only with a fresh
   no-cursor read or a different source if exact historical coverage is needed.
5. Treat the 2026-06-19T09:03:17Z newest five-turn read as a freshness check,
   not a new content source: it confirms no new batch after batch82 and pushes
   the workflow toward live evidence or a different targeted source.

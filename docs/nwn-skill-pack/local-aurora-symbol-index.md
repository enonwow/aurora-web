# Local Aurora Symbol Index

## Purpose

Provide a compact, regenerable index of local Aurora Toolset reverse-engineering symbols for NWN server gamedev skill-pack maintainers.

Evidence label: `local-reverse-lead`.

This is maintainer research material. Do not copy raw decompilation into the installed skill, and do not treat symbol names as official NWN documentation or live Toolset verification.

## Inputs

- Reverse root: `C:\Projects\New Folder`
- Parsed files:
  - `export\strings.tsv`
  - `export\strings_2da.tsv`
  - `export\xrefs_domain.txt`
- Parsed text rows: `29323`
- Generated at: `2026-06-18T21:05:58Z`

## Domain Coverage Leads

| Domain | Found symbols | Skill-pack implication |
| --- | --- | --- |
| `areas` | `TdlgAreaWizard`, `TdlgAreaProperties`, `*.ARE` | Separate area creation, area property editing, and placed-object validation. |
| `door_transition` | `TdlgDoorEdit`, `TdlgDoorWizard`, `TdlgAreaTransition`, `TNWDoorInstance`, `*.UTD` | Separate door editing from area-transition linking and model/build checks. |
| `triggers` | `TdlgTriggerEdit`, `TdlgTriggerWizard`, `TNWTriggerInstance` | Treat trigger blueprints and trigger instances as a dedicated atom family. |
| `sounds` | `TdlgSoundEdit`, `TdlgSoundWizard`, `TdlgSoundSetSelect`, `TdlgResOpenSound`, `TNWSoundInstance` | Keep sound object placement, sound-set selection, and resource-open flows separate. |
| `placeables` | `TdlgPlaceableEdit`, `TdlgPlaceableWizard`, `TNWPlaceableInstance`, `*.UTP` | Separate placeable blueprint edits from placed instances and container inventory. |
| `items_inventory` | `TdlgItemEdit`, `TdlgItemWizard`, `TdlgItemGeneratorEdit`, `TdlgInventory`, `TNWItemInstance`, `*.UTI` | Separate item blueprint edits, inventory insertion, and generated loot. |
| `creatures_encounters` | `TdlgCreatureEdit`, `TdlgCreatureWizard`, `TNWCreatureInstance`, `TNWEncounterInstance`, `*.UTC` | Separate creature blueprints, creature instances, encounter lists, and spawn points. |
| `conversation_script` | `TdlgConversationEditor`, `TdlgConversationInput`, `TdlgConversationSearch`, `TdlgConversationTest`, `TdlgScriptEditor`, `TdlgScriptWizard` | Keep dialogue authoring/test/search and script edit/search as distinct flows. |
| `custom_content` | `C2DA`, `CRes2DA`, `CTlkTable`, `TNWHakPak`, `ResourceInHak`, `Mod_CustomTlk`, `Mod_HakList` | Use Toolset-load checks for 2DA, TLK, HAK, and resource lookup changes. |
| `git_placed_objects` | `TGITFile`, `CResGFF`, `TNWCreatureInstance`, `TNWDoorInstance`, `TNWItemInstance`, `TNWPlaceableInstance`, `TNWSoundInstance`, `TNWTriggerInstance` | Treat placed-object work as area-instance/GIT-backed until live tests prove behavior. |

## Toolset Dialog Symbols

| Symbol | Sources | Example |
| --- | --- | --- |
| `TdlgAbout` | `export\strings.tsv` | TdlgAbout |
| `TdlgAddPopupText` | `export\strings.tsv` | TdlgAddPopupText |
| `TdlgAreaProperties` | `export\strings.tsv` | TdlgAreaProperties |
| `TdlgAreaTransition` | `export\strings.tsv` | TBMemFuncP2<TdlgAreaTransition,void> * |
| `TdlgAreaWizard` | `export\strings.tsv` | TdlgAreaWizard |
| `TdlgBlueprintWizard` | `export\strings.tsv` | TdlgBlueprintWizard |
| `TdlgChooser` | `export\strings.tsv` | TdlgChooser |
| `TdlgColorSelection` | `export\strings.tsv` | TdlgColorSelection |
| `TdlgComments` | `export\strings.tsv` | TdlgComments |
| `TdlgConfirmation` | `export\strings.tsv` | TdlgConfirmation |
| `TdlgConversationEditor` | `export\strings.tsv` | TdlgConversationEditor |
| `TdlgConversationInput` | `export\strings.tsv` | TdlgConversationInput |
| `TdlgConversationSearch` | `export\strings.tsv` | TdlgConversationSearch |
| `TdlgConversationTest` | `export\strings.tsv` | TdlgConversationTest |
| `TdlgCreatureEdit` | `export\strings.tsv, export\strings_2da.tsv` | TdlgCreatureEdit |
| `TdlgCreatureWizard` | `export\strings.tsv` | TdlgCreatureWizard |
| `TdlgDoorEdit` | `export\strings.tsv` | TdlgDoorEdit |
| `TdlgDoorWizard` | `export\strings.tsv` | TdlgDoorWizard |
| `TdlgEncounterEdit` | `export\strings.tsv` | TdlgEncounterEdit |
| `TdlgEncounterWizard` | `export\strings.tsv` | TdlgEncounterWizard |
| `TdlgEnvironment` | `export\strings.tsv` | TdlgEnvironment |
| `TdlgFactionEditor` | `export\strings.tsv` | TdlgFactionEditor |
| `TdlgFactionSelect` | `export\strings.tsv` | TdlgFactionSelect |
| `TdlgFindInstance` | `export\strings.tsv` | TdlgFindInstance |
| `TdlgGeneratorChooser` | `export\strings.tsv` | TdlgGeneratorChooser |
| `TdlgHakPak` | `export\strings.tsv` | TdlgHakPak |
| `TdlgImportExport` | `export\strings.tsv` | TdlgImportExport |
| `TdlgInventory` | `export\strings.tsv` | TdlgInventory |
| `TdlgItemEdit` | `export\strings.tsv, export\strings_2da.tsv` | TdlgItemEdit |
| `TdlgItemGeneratorEdit` | `export\strings.tsv` | TdlgItemGeneratorEdit |
| `TdlgItemWizard` | `export\strings.tsv` | TdlgItemWizard |
| `TdlgJournalEditor` | `export\strings.tsv` | TdlgJournalEditor |
| `TdlgLoadScreen` | `export\strings.tsv` | TdlgLoadScreen |
| `TdlgLocation` | `export\strings.tsv` | TdlgLocation |
| `TdlgModuleSelect` | `export\strings.tsv` | TdlgModuleSelect |
| `TdlgModuleWizard` | `export\strings.tsv` | TdlgModuleWizard |
| `TdlgMultiSelect` | `export\strings.tsv` | TdlgMultiSelect |
| `TdlgNewEditStringExternal` | `export\strings.tsv` | TdlgNewEditStringExternal |
| `TdlgOptions` | `export\strings.tsv` | TdlgOptions |
| `TdlgPaletteChooser` | `export\strings.tsv` | TdlgPaletteChooser |
| `TdlgPlaceableEdit` | `export\strings.tsv` | TdlgPlaceableEdit |
| `TdlgPlaceableWizard` | `export\strings.tsv` | TdlgPlaceableWizard |
| `TdlgPlotNodeWizard` | `export\strings.tsv` | TdlgPlotNodeWizard |
| `TdlgPlotWizard` | `export\strings.tsv` | TdlgPlotWizard |
| `TdlgPortrait` | `export\strings.tsv` | TdlgPortrait |
| `TdlgProgress` | `export\strings.tsv` | TdlgProgress |
| `TdlgPropEdit` | `export\strings.tsv` | TdlgPropEdit |
| `TdlgResOpen` | `export\strings.tsv` | TdlgResOpen |
| `TdlgResOpenSound` | `export\strings.tsv` | TdlgResOpenSound |
| `TdlgResTypeSelector` | `export\strings.tsv` | TdlgResTypeSelector |
| `TdlgResourceSelection` | `export\strings.tsv` | TdlgResourceSelection |
| `TdlgScriptEditor` | `export\strings.tsv` | TdlgScriptEditor |
| `TdlgScriptSearch` | `export\strings.tsv` | TdlgScriptSearch |
| `TdlgScriptWizard` | `export\strings.tsv` | TdlgScriptWizard |
| `TdlgSituatedEdit` | `export\strings.tsv` | TdlgSituatedEdit |
| `TdlgSituatedMultiEditor` | `export\strings.tsv` | TdlgSituatedMultiEditor |
| `TdlgSoundEdit` | `export\strings.tsv` | TdlgSoundEdit |
| `TdlgSoundSetSelect` | `export\strings.tsv` | TdlgSoundSetSelect |
| `TdlgSoundWizard` | `export\strings.tsv` | TdlgSoundWizard |
| `TdlgStoreEdit` | `export\strings.tsv` | TdlgStoreEdit |
| `TdlgStoreSetupWizard` | `export\strings.tsv` | TdlgStoreSetupWizard |
| `TdlgStoreWizard` | `export\strings.tsv` | TdlgStoreWizard |
| `TdlgSystemUsage` | `export\strings.tsv` | TdlgSystemUsage |
| `TdlgTileProperties` | `export\strings.tsv` | TdlgTileProperties |
| `TdlgTokenSelector` | `export\strings.tsv` | TdlgTokenSelector |
| `TdlgTriggerEdit` | `export\strings.tsv` | TdlgTriggerEdit |
| `TdlgTriggerWizard` | `export\strings.tsv` | TdlgTriggerWizard |
| `TdlgVarTable` | `export\strings.tsv` | TdlgVarTable |
| `TdlgVerifyModule` | `export\strings.tsv` | TdlgVerifyModule |
| `TdlgWarning` | `export\strings.tsv` | TdlgWarning |
| `TdlgWaypointEdit` | `export\strings.tsv` | TdlgWaypointEdit |
| `TdlgWaypointWizard` | `export\strings.tsv` | TdlgWaypointWizard |
| `TdlgWelcome` | `export\strings.tsv` | TdlgWelcome |
| `TdlgWizard` | `export\strings.tsv` | TdlgWizard |

## Toolset Frame Symbols

| Symbol | Sources | Example |
| --- | --- | --- |
| `TfraBlueprintSelect` | `export\strings.tsv` | TfraBlueprintSelect |
| `TfraConversationTree` | `export\strings.tsv, export\strings_2da.tsv` | TfraConversationTree |
| `TfraEncounterCreatureList` | `export\strings.tsv` | TfraEncounterCreatureList |
| `TfraMainInventory` | `export\strings.tsv` | TfraMainInventory |
| `TfraMainPalette` | `export\strings.tsv` | TfraMainPalette |
| `TfraPlotManager` | `export\strings.tsv` | TfraPlotManager |
| `TfraProgress` | `export\strings.tsv` | TfraProgress |
| `TfraScriptEditorColor` | `export\strings.tsv` | TfraScriptEditorColor |
| `TfraSituatedAdvanced` | `export\strings.tsv` | TfraSituatedAdvanced |
| `TfraSituatedBasic` | `export\strings.tsv` | TfraSituatedBasic |
| `TfraSituatedComments` | `export\strings.tsv` | TfraSituatedComments |
| `TfraSituatedDesc` | `export\strings.tsv` | TfraSituatedDesc |
| `TfraSituatedLock` | `export\strings.tsv` | TfraSituatedLock |
| `TfraSituatedScripts` | `export\strings.tsv` | TfraSituatedScripts |
| `TfrmAreaResize` | `export\strings.tsv` | TfrmAreaResize |
| `TfrmCreatureLevelupWizard` | `export\strings.tsv` | TfrmCreatureLevelupWizard |
| `TfrmFrame` | `export\strings.tsv` | TfrmFrame |
| `TfrmHelp` | `export\strings.tsv` | TfrmHelp |
| `TfrmIFOProp` | `export\strings.tsv` | TfrmIFOProp |
| `TfrmObjectList` | `export\strings.tsv` | TfrmObjectList |
| `TfrmPreview` | `export\strings.tsv` | TfrmPreview |
| `TfrmProperties` | `export\strings.tsv` | TfrmProperties |
| `TfrmTrap` | `export\strings.tsv` | TfrmTrap |
| `TfrmViewer` | `export\strings.tsv` | TfrmViewer |
| `TfrmViewerArea` | `export\strings.tsv` | TfrmViewerArea |
| `Tfrmproperties` | `export\strings.tsv` | @@Tfrmproperties@Finalize |

## Template And Instance Symbols

### Templates

| Symbol | Sources | Example |
| --- | --- | --- |
| `TNWCreatureTemplate` | `export\strings.tsv, export\strings_2da.tsv` | TNWCreatureTemplate |
| `TNWDoorTemplate` | `export\strings.tsv` | TNWDoorTemplate |
| `TNWEncounterTemplate` | `export\strings.tsv` | TNWEncounterTemplate |
| `TNWItemGeneratorTemplate` | `export\strings.tsv` | TNWItemGeneratorTemplate |
| `TNWItemTemplate` | `export\strings.tsv` | TNWItemTemplate |
| `TNWPlaceableTemplate` | `export\strings.tsv, export\strings_2da.tsv` | TNWPlaceableTemplate |
| `TNWSoundTemplate` | `export\strings.tsv` | TNWSoundTemplate |
| `TNWStoreTemplate` | `export\strings.tsv` | TNWStoreTemplate |
| `TNWTriggerTemplate` | `export\strings.tsv` | TNWTriggerTemplate |
| `TNWWaypointTemplate` | `export\strings.tsv` | TNWWaypointTemplate |

### Instances

| Symbol | Sources | Example |
| --- | --- | --- |
| `TNWCreatureInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWCreatureInstance *,TUserAction *> * |
| `TNWDoorInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWDoorInstance *,TUserAction *> * |
| `TNWEncounterInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWEncounterInstance *,TUserAction *> * |
| `TNWItemInstance` | `export\strings.tsv, export\strings_2da.tsv` | TBMemFuncP4<TGITFile,void,TNWItemInstance *,TUserAction *> * |
| `TNWPlaceableInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWPlaceableInstance *,TUserAction *> * |
| `TNWSoundInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWSoundInstance *,TUserAction *> * |
| `TNWStartPositionInstance` | `export\strings.tsv` | TNWStartPositionInstance |
| `TNWStoreInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWStoreInstance *,TUserAction *> * |
| `TNWTriggerInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWTriggerInstance *,TUserAction *> * |
| `TNWWaypointInstance` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWWaypointInstance *,TUserAction *> * |

## Module Fields

| Symbol | Sources | Example |
| --- | --- | --- |
| `Mod_Area_list` | `export\strings.tsv` | Mod_Area_list |
| `Mod_Creator_ID` | `export\strings.tsv` | Mod_Creator_ID |
| `Mod_CustomTlk` | `export\strings.tsv` | Mod_CustomTlk |
| `Mod_CutSceneList` | `export\strings.tsv` | Mod_CutSceneList |
| `Mod_DawnHour` | `export\strings.tsv, export\strings_2da.tsv` | Mod_DawnHour |
| `Mod_DefaultBic` | `export\strings.tsv` | Mod_DefaultBic |
| `Mod_Description` | `export\strings.tsv` | Mod_Description |
| `Mod_DuskHour` | `export\strings.tsv, export\strings_2da.tsv` | Mod_DuskHour |
| `Mod_Entry_Area` | `export\strings.tsv` | Mod_Entry_Area |
| `Mod_Entry_Dir_X` | `export\strings.tsv, export\strings_2da.tsv` | Mod_Entry_Dir_X |
| `Mod_Entry_Dir_Y` | `export\strings.tsv, export\strings_2da.tsv` | Mod_Entry_Dir_Y |
| `Mod_Entry_X` | `export\strings.tsv, export\strings_2da.tsv` | Mod_Entry_X |
| `Mod_Entry_Y` | `export\strings.tsv, export\strings_2da.tsv` | Mod_Entry_Y |
| `Mod_Entry_Z` | `export\strings.tsv, export\strings_2da.tsv` | Mod_Entry_Z |
| `Mod_Expan_List` | `export\strings.tsv, export\strings_2da.tsv` | Mod_Expan_List |
| `Mod_GVar_List` | `export\strings.tsv` | Mod_GVar_List |
| `Mod_Hak` | `export\strings.tsv` | Mod_Hak |
| `Mod_HakList` | `export\strings.tsv` | Mod_HakList |
| `Mod_ID` | `export\strings.tsv` | Mod_ID |
| `Mod_IsSaveGame` | `export\strings.tsv` | Mod_IsSaveGame |
| `Mod_MinGameVer` | `export\strings.tsv` | Mod_MinGameVer |
| `Mod_MinPerHour` | `export\strings.tsv, export\strings_2da.tsv` | Mod_MinPerHour |
| `Mod_Name` | `export\strings.tsv` | Mod_Name |
| `Mod_OnAcquirItem` | `export\strings.tsv` | Mod_OnAcquirItem |
| `Mod_OnActvtItem` | `export\strings.tsv` | Mod_OnActvtItem |
| `Mod_OnClientEntr` | `export\strings.tsv, export\strings_2da.tsv` | Mod_OnClientEntr |
| `Mod_OnClientLeav` | `export\strings.tsv` | Mod_OnClientLeav |
| `Mod_OnCutsnAbort` | `export\strings.tsv` | Mod_OnCutsnAbort |
| `Mod_OnHeartbeat` | `export\strings.tsv, export\strings_2da.tsv` | Mod_OnHeartbeat |
| `Mod_OnModLoad` | `export\strings.tsv, export\strings_2da.tsv` | Mod_OnModLoad |
| `Mod_OnModStart` | `export\strings.tsv, export\strings_2da.tsv` | Mod_OnModStart |
| `Mod_OnNuiEvent` | `export\strings.tsv` | Mod_OnNuiEvent |
| `Mod_OnPlrChat` | `export\strings.tsv` | Mod_OnPlrChat |
| `Mod_OnPlrDeath` | `export\strings.tsv` | Mod_OnPlrDeath |
| `Mod_OnPlrDying` | `export\strings.tsv` | Mod_OnPlrDying |
| `Mod_OnPlrEqItm` | `export\strings.tsv` | Mod_OnPlrEqItm |
| `Mod_OnPlrGuiEvt` | `export\strings.tsv` | Mod_OnPlrGuiEvt |
| `Mod_OnPlrLvlUp` | `export\strings.tsv` | Mod_OnPlrLvlUp |
| `Mod_OnPlrRest` | `export\strings.tsv` | Mod_OnPlrRest |
| `Mod_OnPlrTarget` | `export\strings.tsv` | Mod_OnPlrTarget |
| `Mod_OnPlrTileAct` | `export\strings.tsv` | Mod_OnPlrTileAct |
| `Mod_OnPlrUnEqItm` | `export\strings.tsv` | Mod_OnPlrUnEqItm |
| `Mod_OnSpawnBtnDn` | `export\strings.tsv` | Mod_OnSpawnBtnDn |
| `Mod_OnUnAqreItem` | `export\strings.tsv` | Mod_OnUnAqreItem |
| `Mod_OnUsrDefined` | `export\strings.tsv` | Mod_OnUsrDefined |
| `Mod_PartyControl` | `export\strings.tsv` | Mod_PartyControl |
| `Mod_StartDay` | `export\strings.tsv, export\strings_2da.tsv` | Mod_StartDay |
| `Mod_StartHour` | `export\strings.tsv, export\strings_2da.tsv` | Mod_StartHour |
| `Mod_StartMonth` | `export\strings.tsv, export\strings_2da.tsv` | Mod_StartMonth |
| `Mod_StartMovie` | `export\strings.tsv` | Mod_StartMovie |
| `Mod_StartYear` | `export\strings.tsv, export\strings_2da.tsv` | Mod_StartYear |
| `Mod_Tag` | `export\strings.tsv` | Mod_Tag |
| `Mod_UUID` | `export\strings.tsv` | Mod_UUID |
| `Mod_Version` | `export\strings.tsv` | Mod_Version |
| `Mod_XPScale` | `export\strings.tsv, export\strings_2da.tsv` | Mod_XPScale |

## Resource Extensions And Systems

### Resource Extensions

| Symbol | Sources | Example |
| --- | --- | --- |
| `*.ARE` | `export\strings.tsv` | *.ARE |
| `*.DLG` | `export\strings.tsv` | *.DLG |
| `*.GIT` | `export\strings.tsv` | *.GIT |
| `*.NCS` | `export\strings.tsv` | *.NCS |
| `*.NSS` | `export\strings.tsv` | *.NSS |
| `*.UTC` | `export\strings.tsv` | *.UTC |
| `*.UTD` | `export\strings.tsv` | *.UTD |
| `*.UTE` | `export\strings.tsv` | *.UTE |
| `*.UTG` | `export\strings.tsv` | *.UTG |
| `*.UTI` | `export\strings.tsv` | *.UTI |
| `*.UTM` | `export\strings.tsv` | *.UTM |
| `*.UTP` | `export\strings.tsv` | *.UTP |
| `*.UTS` | `export\strings.tsv` | *.UTS |
| `*.UTT` | `export\strings.tsv` | *.UTT |
| `*.UTW` | `export\strings.tsv` | *.UTW |

### Resource Systems

| Symbol | Sources | Example |
| --- | --- | --- |
| `C2DA` | `export\strings.tsv, export\strings_2da.tsv` | C2DA * |
| `CRes2DA` | `export\strings.tsv, export\strings_2da.tsv` | CRes2DA |
| `CResGFF` | `export\strings.tsv` | CResGFF |
| `CTlkTable` | `export\strings.tsv` | CTlkTable |
| `HAK V1.0` | `export\strings.tsv` | HAK V1.0 |
| `ResourceInHak` | `export\strings.tsv` | ResourceInHak |
| `TGITFile` | `export\strings.tsv` | TBMemFuncP4<TGITFile,void,TNWCreatureInstance *,TUserAction *> * |
| `TNWHakPak` | `export\strings.tsv` | TNWHakPak |
| `TNWHakPakList` | `export\strings.tsv` | TNWHakPakList |
| `TNWHakPakResource` | `export\strings.tsv` | TNWHakPakResource |
| `TNWHakPakResourceList` | `export\strings.tsv` | TNWHakPakResourceList |
| `dialog.tlk` | `export\strings.tsv` | Error: could not open dialog.tlk |

## QA Error Leads

### areas_git

- TGITFile::ProcessGitFile(): Caught exception while processing area '%'
- TGITFile::ProcessGitFile(): Caught exception while processing area '%'
- TGITFile::ProcessGitFiles(): Caught exception while processing area '%s'
- TGITFile::ProcessGitFiles(): Caught exception while processing area '%s'

### creatures

- TdlgCreatureEdit::SetWings: Can't load WingModel 2DA file
- TdlgCreatureEdit::SetTail: Can't load TailModel 2DA file
- TdlgCreatureEdit::CreateModel: Can't load CAPart 2DA file
- TdlgCreatureEdit::LoadClasses: Invalid Strref found in Name field of Classes.2DA.  Please fix the Strref for
- TCreatureListFiles::GetItemTemplateFromResRef(): Item template '%s' does not exist
- TNWCreatureTemplate::SetWings: Can't load WingModel 2DA file
- TNWCreatureTemplate::SetTail: Can't load TailModel 2DA file
- TdlgCreatureEdit::SetWings: Can't load WingModel 2DA file
- TdlgCreatureEdit::SetTail: Can't load TailModel 2DA file
- TdlgCreatureEdit::CreateModel: Can't load CAPart 2DA file
- TdlgCreatureEdit::LoadClasses: Invalid Strref found in Name field of Classes.2DA.  Please fix the Strref for
- TNWCreatureTemplate::SetWings: Can't load WingModel 2DA file

### custom_content

- ModelType for appearance not found in 2DA. This should not happen!
- Error: could not open dialog.tlk
- CExoApp::Initialize: Can't load %s 2DA file
- ModelType for appearance not found in 2DA. This should not happen!
- CExoApp::Initialize: Can't load %s 2DA file
- 0058a781		PUSH s_Error:_could_not_open_dialog.tlk_00c1da79	Data

### door_transition

- TNWDoorInstance::CreateModel(): Cannot find model '%s'
- TNWDoorInstance::CreateModel(): No model name for door appearance type %d, generic type %d.
- TGITFile::LoadDoorInstances(): Could not build model for door instance %d. Door object will not be created.
- TNWDoorTemplate::BuildModel(): Cannot find model '%s'

### general

- EInvalidOperation &
- System::Classes::EInvalidOperation
- EInvalidOperation *
- EInvalidGraphic &
- Vcl::Graphics::EInvalidGraphic
- EInvalidGraphic *
- EInvalidCastPDw
- \rEInvalidImageLU~
- \rEInvalidImage,U~
- EInvalidOperationXY~
- EInvalidOperation4Y~
- EInvalidOp &

### items_inventory

- TdlgItemEdit::Cloaks: Can't load CloakModel 2DA file
- nwttmplt::CreateImage: Can't load CloakModel 2DA file
- TdlgInventory::GetItemFromInventoryObject(): Item template '%s' does not exist
- TNWItemInstance::CreateModel: Can't load CloakModel 2DA file
- nwttmplt::CreateImage: Can't load CloakModel 2DA file
- int nShow = OBJECT_INVALID != GetItemPossessedBy(GetPCSpeaker(), \%s\");"
- int nShow = OBJECT_INVALID != GetItemPossessedBy(GetPCSpeaker(), \%s\");"
- u"Invalid item level assignment"
- u"Invalid level (%d) for item \"%s\""
- u"GroupIndex cannot be less than a previous menu item's GroupIndex"
- u"Item not found"
- TdlgItemEdit::Cloaks: Can't load CloakModel 2DA file

## Candidate Atom Checklist

- `area.createWithWizard` from `TdlgAreaWizard`.
- `area.editProperties` from `TdlgAreaProperties`.
- `door.editBlueprintOrInstance` from `TdlgDoorEdit` and `TNWDoorInstance`.
- `door.linkAreaTransition` from `TdlgAreaTransition`.
- `trigger.editBlueprintOrInstance` from `TdlgTriggerEdit` and `TNWTriggerInstance`.
- `sound.editPlacedSound` from `TdlgSoundEdit`, `TdlgSoundSetSelect`, and `TNWSoundInstance`.
- `placeable.editBlueprintOrInstance` from `TdlgPlaceableEdit` and `TNWPlaceableInstance`.
- `inventory.insertItem` from `TdlgInventory`, `TfraMainInventory`, and `NWInventoryObjectRef`.
- `item.editBlueprint` and `item.generateLoot` from `TdlgItemEdit` and `TdlgItemGeneratorEdit`.
- `creature.editBlueprintOrInstance` from `TdlgCreatureEdit` and `TNWCreatureInstance`.
- `conversation.editAndTest` from `TdlgConversationEditor` and `TdlgConversationTest`.
- `script.createEditSearch` from `TdlgScriptWizard`, `TdlgScriptEditor`, and `TdlgScriptSearch`.
- `module.configureEventsAndEntry` from `Mod_*` fields.
- `customContent.verify2daHakTlkLoad` from `C2DA`, `CTlkTable`, `TNWHakPak`, and `ResourceInHak`.

## Still Hypothesis

- Symbol boundaries are useful taxonomy leads, not exact UI scripts.
- `TGITFile` and `CResGFF` indicate area/placed-object persistence lanes, but exact mutation behavior needs controlled module tests.
- Error strings identify QA checks to attempt, but live Toolset reproduction is still required.
- This index should inform future compact skill references only after maintainer review.

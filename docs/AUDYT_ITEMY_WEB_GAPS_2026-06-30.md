# Audyt itemow Aurora Web - luki po porownaniu z dekompilacja

Data: 2026-06-30
Repo: C:\Projects\aurora-web
Oracle/dekompilacja: C:\Projects\New Folder

## Zrodla sprawdzone

- C:\Projects\New Folder\AUDYT_ITEMY.md
- C:\Projects\New Folder\item-retail-extract\extract-summary.json
- C:\Projects\New Folder\item-retail-extract\2da-summary.json
- C:\Projects\New Folder\item-retail-extract\gff-summary.json
- C:\Projects\New Folder\item-retail-extract\itp-summary.json
- C:\Projects\New Folder\item-retail-extract\utm-summary.json
- C:\Projects\New Folder\item-retail-extract\nwscript-item-api-summary.json
- backend/src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser.ts
- backend/src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository.ts
- backend/src/modules/catalog/application/catalog-processing.helpers.ts
- frontend/src/modules/items/application/itemSceneObjectMapper.ts
- frontend/src/modules/items/application/itemCreationWizard.ts
- frontend/src/modules/layout/components/ItemsModePanel.tsx
- frontend/src/modules/layout/components/SceneObjectAddPanel.tsx

## Co dekompilacja zamyka informacyjnie

Aurora traktuje itemy jako pelny podsystem Toolsetu, nie jako dodatek do inventory.
Minimalny kontrakt z dekompilacji obejmuje:

1. UTI parser/serializer dla TNWItem.
2. PropertiesList parser/serializer oraz lookup itempropdef.2da i IPRP_*.
3. baseitems.2da jako zrodlo typow, slotow, ikon, model metadata, kosztow i ograniczen.
4. Assembler modeli dla single-part, three-part, armor, cloak i specjalnych property.
5. Icon composer oddzielony od 3D preview.
6. NWInventoryObjectRef dla embedded/resref/random itemow.
7. Equipment slot mask mapping 0x1..0x20000.
8. TNWItemInstance dla GIT/palety z transform, comment i PaletteID.
9. Store UTM: 5 bucketow StoreList, WillNotBuy i WillOnlyBuy.
10. Item generator i RandomList/RandomResRef.
11. ITP palette loader/writer dla itempalstd, itempal i itempalcus.itp.
12. UI editory: item, item property, inventory, store restricted items, generator.
13. Round-trip tests na realnych zasobach.

Retail evidence:

- nwn_base.key ma 2763 UTI, 75 ITP, 42 UTM, 597 TWO_DA.
- itempalstd.itp ma 72 foldery i 2754 liscie RESREF.
- itempal.itp ma 8 kategorii root i jest szkieletem/custom tree.
- UTM retail ma 42 store templates, 210 StoreList bucketow i 4597 item entries.
- baseitems.2da ma 113 wierszy i 67 kolumn.
- itempropdef.2da ma 88 wierszy.
- IPRP tables obejmuja m.in. iprp_spells 540, iprp_spellcost 241, iprp_costtable 31.
- armor parts: capart.2da ma 19 wierszy, parts_* zwykle 201 wierszy, parts_robe 39 wierszy z hide flags.

## Co Aurora Web juz ma

- KEY/BIF reader zna typy UTI, ITP i UTM na poziomie runtime resource constants.
- Generic GFF parser czyta UTI root fields: TemplateResRef, BaseItem, names/descriptions, Comment, PaletteID, Tag, Plot, Cost, AddCost, Charges, StackSize, Identified, Stolen, Cursed.
- Parser czyta ModelPart1..3, ArmorPart_* oraz material colors Leather/Cloth/Metal.
- Parser czyta PropertiesList jako surowe pola: PropertyName, Subtype, CostTable, CostValue, Param1, Param1Value, ChanceAppear.
- Backend ma minimalny UTI GFF V3.2 writer dla TemplateResRef, LocName/Description, BaseItem, ModelPart1..3, ArmorPart_*, material colors, pricing/state i PropertiesList.
- Backend ma endpoint POST /catalog/items/blueprints, ktory zapisuje .uti do module resource layer i od razu przetwarza blueprint do item preview/runtime.
- Backend ma module-backed item UTI lifecycle: `POST /catalog/items/blueprints`, `PUT /catalog/items/blueprints/:resRef` i `DELETE /catalog/items/blueprints/:resRef`.
- Backend buduje ItemRuntimeProjection z identity, classification, visual, pricing, state, palette, itemProperties i scripts.
- baseitems.2da jest ladowane z glowymi polami UI/walidacji: label, modelType, defaultModel, defaultIcon, inv size, equip slots, costs, stacking, property limits i store metadata.
- Frontend ma decoder masek `EquipableSlots` 0x1..0x20000 na czytelne sloty Aurora/NWN.
- itempropdef.2da jest ladowane do runtime property metadata i wizardowego dropdownu property.
- Frontend mapuje itemy na SceneObject z model parts, armor parts, material colors, pricing/state i propertyList.
- Jest 3D preview/render path dla single/three-part itemow i armor part candidates.
- Items Mode ma item icon preview oparty o realne assety pasujace do baseitems `DefaultIcon`, model part resref albo item `ResRef`; metadata bez assetu nie generuje sztucznego obrazka.
- Jest Preview Editor w prawym panelu dla zmian model parts/armor parts/colors.
- Jest New Item wizard, ktory tworzy custom SceneObject z bazowego itemu.
- New Item wizard zapisuje custom item jako module-backed UTI przez backend i dopiero potem dodaje przetworzony item do listy custom.
- Custom itemy sa nadal trzymane w lokalnej liscie UI dla aktywnej sesji i pojawiaja sie w Area Add Panel.
- Area Add Panel ma rodzine Items, filtry custom/standard, StorePanel categories i wspoldzielony filtr drzewa ITP dla itemow.
- Items Mode laduje Stores catalog takze we wlasnym trybie, ma filtr sekcji Stores po nazwie/resref/tagu i pozwala stabilnie operowac module-backed UTM po refreshu.

## Status implementacji po petli 2026-06-30

Zamkniete w tej petli:

- Backend laduje itempropdef.2da ze snapshotu/runtime fallback i wzbogaca PropertiesList o label, SubTypeResRef, CostTableResRef, Param1ResRef, GameStrRef, Cost, StackType i Flags.
- Backend rozszerza baseitems.2da runtime projection o DefaultIcon, inv slot size, EquipableSlots, StorePanel, StorePanelSort, BaseCost, Stacking, item multiplier, property limits i charge metadata.
- Hydracja itemow z runtime poprawia armor bez modelPart1..3, bo baseitems sa uzupelniane po BaseItem, a nie tylko po model parts.
- Frontend przenosi nowe item metadata do SceneObject, ItemPresentation, inspectora i wizardu.
- Wizard Properties tab pokazuje realny slownik itempropdef.2da jako dropdown zamiast samych pol numerycznych.
- Inspector pokazuje czytelne property, Default Icon, Inventory Size, Equip Slots, Store Panel i Property Slots.
- UTI writer zapisuje wizard-created itemy do module storage jako realne .uti.
- Endpoint tworzenia blueprintu robi write -> parse -> process round-trip i zwraca objectKey/templateId/cache/item.
- Endpoint update itemu sprawdza istniejacy `resRef.uti`, zapisuje nowa wersje z `overwrite: true`, robi process round-trip i zwraca nowy preview payload.
- Endpoint delete itemu usuwa tylko module-backed `resRef.uti` z module storage i invaliduje snapshot/template cache.
- Frontend New Item wizard buduje payload UTI z armor parts, material colors i PropertiesList oraz uzywa backendowej odpowiedzi do preview/listy.
- Frontend Items Mode ma Edit/Duplicate/Delete dla wizard-created itemow: Edit aktualizuje module-backed UTI, Duplicate tworzy nowy ResRef przez create flow, Delete usuwa backendowy UTI gdy obiekt jest source-backed.
- Wizard i inspector rozwijaja `baseitems.2da EquipableSlots` z hex maski do nazw slotow, np. `0x1C030` -> Right Hand, Left Hand i creature weapon slots.
- Backend zwraca slownik item property z itempropdef.2da + IPRP table chains.
- Wizard property editor pokazuje dropdowny subtype/cost table/cost value/param1 value tam, gdzie slownik zna tabele.
- Lista itemow w Items Mode sklada miniatury z `baseItemDefaultIcon`, fallback model-part resref albo item `resRef`, pokazuje zrodlo ikony i material color swatches.

Dowody runtime zapisane:

- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\01-item-property-inspector-castspell.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\02-wizard-property-castspell.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\03-armor-baseitems-inspector.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\04-single-part-item-c-pet-net.png (metadata-only; brak MDL/GLB w manifiescie)
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\05-single-part-large-shield.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\06-create-blueprint-api-response.json
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\07-wizard-type-open.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\08-wizard-identity-filled.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\09-wizard-visual-armor-colors-filled.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\10-wizard-properties-property-filled.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\11-wizard-created-backend-preview.png
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\12-ui-created-codex-runtime-armor-api-proof.json
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\13-item-property-dictionary-iprp-proof.json
- C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-06-30\14-wizard-iprp-dropdown-chain.png

Status po domknieciu petli 2026-07-02:

- Brak otwartych Web-code punktow z tej listy audytowej.
- Koszt/ILR ma broad strict gate na 96 live przypadkach, 0 strict issues.
- Context-aware armor/robe/cloak composer, icon composer grid, source unsupported UI, NWScript-style item command layer i formalny item-generator unsupported path sa zamkniete.
- Embedded `Item.PropertiesList` jest zachowywane w parserze, mapperach frontendu i scene clone; pelny UTC creature blueprint writer nie jest udawany jako wspierany kontrakt, bo obecny zapis pozostaje waskim inventory/equipment writerem.
- Retail/source overwrite jest obslugiwany jako kontrolowana module shadow-copy/rename decyzja. Live UTM proof 31 pokazal jednak, ze aktualny runtime ma 42/42 sklepy jako `modules/current`, 0 non-module UTM do screena retail shadow-copy.
- Pozostaja tylko blokery zrodlowe/warunkowe: realny GFF `UTG` dla item generatora, ewentualne dodatkowe reguly ILR z dekompilacji oraz source-authored itemy bez realnego modelu/ikony.

## Status runtime visual matrix 2026-07-02

Zamkniete w petli 2026-07-02:

- Items Mode ma realne preview dla itemow z modelami, bez placeholderow: three-part weapon, shield, armor, cloak/robe oraz custom wizard armor skladaja sie z dostarczonych GLB/PLT/DDS assetow.
- Single-part/misc itemy bez renderowalnego modelu uzywaja realnego inventory/raw texture icon fallback, nie generowanego sztucznego obrazka.
- Renderer nie preferuje juz ikony, kiedy obiekt ma realne armor/model part resolutions.
- Frontend syntetyzuje brakujace `modelPartCandidates` i `armorPartModelCandidates` z katalogowych `modelPartResRefs`, `armorParts`, `armorPreviewContext` i `modelAssetCandidates`, jezeli async process preview jeszcze nie zdazyl zapisac pelnego processed objectu.
- Loader tekstur ma limit rownoleglosci i dluzsze timeouty dla realnych DDS/PLT assetow; status `partial` nie jest traktowany jako sukces.
- Proof runner czeka na oczekiwany preview mode, zapisuje progres po kazdym case, rozroznia `loaded/partial/missing`, flaguje mode mismatch, mesh bounds i niepelne texture loads.

Dowod runtime:

- Summary: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\24-visual-matrix\24-item-visual-matrix-summary.json`
- Wynik: `totalCases=7`, `capturedCases=7`, `failedCases=0`, `issueCaseCount=0`, `capturedAt=2026-07-02T11:46:05.915Z`.
- Screeny:
  - `single-part-gem-nw-it-gem001-*`: icon fallback, mesh 1, real raw texture icon.
  - `three-part-weapon-cnr-b-dagger-*`: `model-part-assets`, mesh 4, textures 16/16, material maps 2.
  - `shield-l-lshd-0-*`: `model-part-assets`, mesh 1, textures 2/2, material maps 1.
  - `armor-aarcl009-*`: `armor-part-assets`, mesh 17, textures 34/34, material maps 12.
  - `robe-cloak-l-cloak-0-*`: `model-part-assets`, mesh 20, textures 14/14, material maps 1.
  - `potion-nw-it-mpotion002-*`: icon fallback, mesh 1, real raw texture icon.
  - `custom-wizard-armor-*`: `armor-part-assets`, mesh 17, textures 34/34, material maps 12.

Pelny source coverage proof 2026-07-02:

- Runner: `backend/scripts/audit-item-visual-source-coverage.mjs`.
- Summary: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\26-visual-source-coverage\26-item-visual-source-coverage-summary.json`
- Issue list: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\26-visual-source-coverage\26-item-visual-source-coverage-issues.md`
- Wynik: `totalItems=3160`, `uniqueVisualSignatures=1207`, `issueItemCount=653`, `issueSignatureCount=113`, `sourceBlockedItemCount=653`, `webBugCandidateItemCount=0`.
- Status counts: `811 ready-model-and-icon`, `1649 ready-icon-fallback-model-missing`, `47 ready-model-only`, `652 authored-invalid-icon-no-renderable-model`, `1 missing-renderable-model-and-icon-source`.
- Browser proof explicit unsupported rows: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\27-browser-source-issue-screens\007-tall-viewport-preview-unsupported-rows.png`.

Pozostaje poza zamknieta macierza visual preview:

- Pelny item generator UI/parser/serializer tylko dla prawdziwego parseable GFF `UTG`; obecne `*.utg` w sprawdzonym source secie sa LTR V1.0 i pozostaja jawnie `unsupported`.
- Full UTC creature blueprint writer tylko jesli scope zostanie rozszerzony na kompletna edycje creature blueprintow; obecny kontrakt jest waski i zapisuje inventory/equipment bez udawania pelnego Toolset writer.
- Dalsze ILR parity tylko jesli dekompilacja pokaze reguly ponad obecny gate `StackSize` vs `ILRStackSize`.
- Source-authored unsupported/no-renderable-model przypadki maja pozostac oznaczane jako unsupported zamiast dostawac placeholder.

## Braki P0

### P0.1 Realny zapis UTI/GFF i module persistence

Status 2026-06-30: minimalny writer UTI, module-backed create flow oraz module-backed update/delete sa zaimplementowane. Wizard konczy sie realnym .uti w module storage, update robi round-trip write -> parse -> process na istniejacym `resRef.uti`, a delete usuwa konkretny module-backed UTI. UI ma Edit/Duplicate/Delete dla wizard-created itemow; Duplicate idzie przez create flow z nowym ResRef.
Status 2026-07-01: kreator itemow ma explicit overwrite/rename UX dla kolizji `ResRef`. Tryb Create blokuje zapis przy istniejacym `ResRef`, dopoki uzytkownik nie wybierze `Use <next free ResRef>` albo swiadomie nie zaznaczy overwrite; ta decyzja idzie do `overwrite` payloadu blueprinta. WorkspaceLayout czysci stare localStorage custom item entries, gdy backendowy katalog ma juz ten sam `ResRef`, wiec module-backed UTI nie dubluje sie z lokalnym szkicem.
Status 2026-07-01 proof 14-17: runtime CDP pokazuje create/edit/duplicate/delete wizard-created UTI w Items Mode po kontrolowanym przejsciu aplikacji; summary zapisane w `C:\Projects\aurora-web\.codex-tmp\item-proof-all\14-22-item-store-lifecycle-proof-summary.json`.

Zaimplementowane:

- GFF writer dla UTI V3.2.
- Serializer TNWItem fields, PropertiesList, armor parts, colors, PaletteID, Comment.
- Round-trip test: realny UTI -> parse -> edit -> serialize -> parse -> porownanie pol.
- Endpoint POST /catalog/items/blueprints.
- Endpoint PUT /catalog/items/blueprints/:resRef.
- Endpoint DELETE /catalog/items/blueprints/:resRef.
- Frontend `ItemApiPort.updateItemBlueprint()` i `deleteItemBlueprint()`.
- Items Mode Edit/Duplicate/Delete dla wizard-created itemow z zachowaniem UI id po update i bez kasowania retailowych blueprintow.
- Items Mode wykrywa kolizje `ResRef` w New Item wizard, oferuje rename do nastepnego wolnego `ResRef` albo explicit overwrite, a create payload zachowuje `overwrite: true` tylko po swiadomym wyborze.
- WorkspaceLayout usuwa stare lokalne custom item entries, gdy backendowy katalog zawiera juz ten sam `ResRef`.
- Runtime proof: codex_runtime_ar zapisany jako modules/current/codex_runtime_ar.uti z torso=44, metal1=18 i PropertiesList count=1.
- Unit proof: `npm.cmd test -- catalog.application.service.spec.ts -t "item UTI" --runInBand` -> 1 targeted test passed.
- Unit proof: `npx.cmd vitest run tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/items/httpItemApiPort.test.ts tests/unit/modules/items/itemCreationWizard.test.ts` -> 3 files, 25 tests passed.
- Unit proof 2026-07-01: `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/layout/WorkspaceLayout.itemCustomPruning.test.ts` -> 3 files, 21 tests passed.
- Build/typecheck proof: `npm.cmd run build` w backend -> PASS; `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.

### P0.2 Aurora-style item property editor

Surowe PropertiesList sa juz czytane i przenoszone, a UI zna itempropdef.2da.
Brakuje jeszcze pelnego Aurora dropdown chain opartego o IPRP_*.

Status 2026-06-30: itempropdef.2da, labels, property dropdown, IPRP chain dropdowns, pierwsze specjalne walidacje property oraz IPRP cost context sa zaimplementowane dla tabel dostepnych w module/hak/retail extract. Zostaje pelna kalkulacja kosztow i ILR parity obejmujaca armor/model special handling.

Zaimplementowane:

- Loadery IPRP_* wskazywane przez SubTypeResRef, CostTableResRef i Param1ResRef.
- Dropdown chain: property -> subtype -> cost table/value -> param1/value -> chance.
- Preview/serializer mutations dla pelnych item properties po P0.1.
- Loader itempropdef.2da.
- Czytelne nazwy property w inspectorze, nie tylko liczby.
- Wizard property selector oparty o itempropdef.2da.
- Wizard waliduje specjalne property: CastSpell wymaga spell subtype i cost table/value uses; Light, OnHit, UnlimitedAmmo i Poison ostrzegaja o brakujacym subtype; cost table bez cost value oraz cost value bez cost table dostaja ostrzezenia.
- Wizard serializuje `PropertyName=48`/OnHit z aurorowym wymuszeniem `CostTable=24` (`0x18`), zgodnie z zachowaniem loadera z dekompilacji.
- Wizard liczy decompilation-guided Aurora cost estimate: `BaseCost`, `ItemMultiplier`, `AddCost`, normalne property cost rows, specjalna agregacja `CastSpell` (`PropertyName=15`), branch `PotionCost`/`WandCost` oparty o `iprp_spells.2da` (`CasterLvl`, `InnateLvl`, `PotionUse`, `WandUse`, `GeneralUse`) oraz dostepne `parts_* COSTMODIFIER` dla armorow z backendowych metadanych.
- Backendowy slownik property wystawia teraz bazowy `itempropdef.2da Cost`, a backend runtime projection przenosi `armorPartCostModifier*` i `armorPartCostModifierTotal` z `parts_*.2da`.
- Runtime proof: CastSpell ma subTypeTable=iprp_spells, subtypeOptions=517, costTable=3/SpellUse/iprp_chargecost i costValueOptions=14.
- Unit proof: `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts` -> 1 file, 10 tests passed.

Do implementacji:

- ILR parity i snapshoty kosztow na wiekszej macierzy probek UTI z retail extract.

### P0.3 Prawdziwa paleta ITP

Aurora ma itempalstd.itp z 2754 liscmi RESREF i 72 folderami.
Aurora Web mialo heurystyczne kategorie na podstawie tekstu/resrefu.

Status 2026-06-30: ITP tree, UI filter i module-backed custom palette writer sa zaimplementowane dla Items Mode oraz Add-to-Area.
Backend parsuje itempalstd.itp, itempal.itp i itempalcus.itp z module/hak/vanilla/local extract, wybiera aktywne zrodlo po liczbie lisci, preferuje module-backed `itempalcus.itp` z realnymi liscmi i zwraca drzewo do frontendu. Frontend pokazuje native select palety, filtruje liste itemow po RESREF-ach z wybranej galezi w panelu Items oraz w Area Add Panel i umie zapisac aktualnie przefiltrowane itemy jako custom `itempalcus.itp`. Dodany jest tez TLK resolver dla etykiet STRREF z mapowaniem host-local `/host/nwn-game`, potwierdzony testem; screenshot z aktualnego dzialajacego procesu backendu byl zrobiony przed przeladowaniem tej ostatniej poprawki, wiec nadal pokazuje `StrRef ...`.

Zaimplementowane:

- ITP V3.2 tree walker dla itempalstd.itp, itempal.itp, itempalcus.itp.
- Mapowanie STRREF/NAME/RESREF na foldery i liscie oraz TLK fallback dla STRREF labels.
- `GET /catalog/items/palette-tree`.
- Frontendowy filtr palety w panelu Items.
- Wspolny helper `itemPaletteTreeFilter` zasila Items Mode i SceneObjectAddPanel tym samym zbiorem folderow/lisci/resrefow.
- Add-to-Area/SceneObjectAddPanel filtruje itemy po wybranym wezle ITP i przelicza kategorie StorePanel na zwezonej liscie.
- Writer `serializeItemPaletteToItpGff()` zapisuje ITP V3.2 z `MAIN`, rekurencyjnym `LIST`, `NAME`, `STRREF`, `ID` i `RESREF`.
- `PUT /catalog/items/palette-tree/custom` zapisuje `itempalcus.itp` jako module-backed resource type 2030, parsuje round-trip i zwraca aktywne custom tree.
- Frontend `ItemApiPort.writeCustomItemPalette()` oraz przycisk `Save Custom` w Items Mode buduja `Custom Items -> StorePanel categories -> RESREF leaves`.
- Dowody:
  - `.codex-tmp/item-subsystem-proof-2026-06-30/15-item-palette-tree-api-proof.json`
  - `.codex-tmp/item-subsystem-proof-2026-06-30/16-items-itp-palette-tree.png`
  - `.codex-tmp/item-subsystem-proof-2026-06-30/17-items-itp-palette-ui-proof.json`
  - `npm test -- aurora-gff-itp-palette-parser.spec.ts`
  - `npm test -- catalog.application.service.spec.ts --runInBand`
  - `npx vitest run tests/unit/modules/layout/SceneObjectAddPanel.test.tsx tests/unit/modules/layout/ItemsModePanel.test.tsx`
  - `npx tsc -b --pretty false`
  - `npm.cmd test -- aurora-gff-itp-palette-parser.spec.ts --runInBand` -> 1 file, 3 tests passed.
  - `npm.cmd test -- catalog.application.service.spec.ts -t "itempalcus" --runInBand` -> 1 targeted service test passed.
  - `npx.cmd vitest run tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/layout/SceneObjectAddPanel.test.tsx tests/unit/modules/items/httpItemApiPort.test.ts` -> 3 files, 33 tests passed.
  - `npm.cmd run build` w `backend` -> PASS.

Do implementacji:

- Runtime screenshot po jednym kontrolowanym przeladowaniu backendu/frontendu powinien pokazac TLK-resolved folder labels i filtr ITP w Area Add Panel zamiast tylko dowodow unit/typecheck.

### P0.4 Inventory/equipment editor

Parser potrafi czytac ItemList i Equip_ItemList, a creature entries moga byc wzbogacone item template metadata.
Status 2026-06-30: creature properties dialog ma edytowalny Inventory tab dla `ItemList` i `Equip_ItemList`.
Mozna dodac/usunac wpis, zmienic `InventoryRes`/`EquippedRes`, `RandomResRef`, `RandomList`, repo X/Y, slot mask `Equip_ItemList` przez mapowanie 0x1..0x20000 oraz flagi Dropable/Pickpocketable/Infinite.
Dodany jest rowniez waski serializer UTC dla tych list: `serializeCreatureInventoryToUtcGff` zapisuje `ItemList` i `Equip_ItemList`, a parser round-trip potwierdza zgodnosc. Parser i serializer zachowuja tez `RandomResRef` oraz `RandomList` przy wpisach inventory/equipment, wiec random item references nie sa gubione przy tym waskim round-tripie.
Status 2026-06-30, placeable/container slice: placeable preview mapper czyta katalogowe UTP metadata `plot`, `useable`, `hasInventory` oraz JSON `inventoryItemListEntries`; Area mapper przenosi `placeableProperties.inventoryItems` z template object do instancji GIT; placeable properties dialog ma osobna zakladke `Inventory` z edycja `ItemList` (`ResRef`, `RandomResRef`, `RandomList`, linked UTI, repo X/Y, Dropable/Pickpocketable/Infinite).
Status 2026-06-30, waski UTP writer: `serializePlaceableBlueprintToUtpGff` zapisuje `TemplateResRef`, `LocName`, `Tag`, `Comment`, `Plot`, `Useable`, `HasInventory`, `Appearance`, `Static` oraz placeable/container `ItemList`; parser round-trip potwierdza `inventoryItemListEntries`, `RandomResRef`, `RandomList`, repo X/Y i flagi Dropable/Pickpocketable/Infinite.
Status 2026-06-30, placeable/container save path: backend zna resource type UTP 2044, wystawia `POST /catalog/placeables/blueprints`, `PUT /catalog/placeables/blueprints/:resRef` i `DELETE /catalog/placeables/blueprints/:resRef`, zapisuje realne `.utp` do module storage, buduje katalogowy TemplateRecord i invaliduje snapshot/template cache. Frontendowy `HttpPlaceableApiPort` ma create/update/delete dla tego path.
Status 2026-07-01, embedded item summary/write path: backendowy GFF parser czyta pole typu `STRUCT` i rozpoznaje zagniezdzony `Item` wewnatrz creature `ItemList`/`Equip_ItemList`, placeable/container `ItemList` oraz UTM `StoreList.ItemList` jako `embeddedItem` summary (`TemplateResRef`, `Tag`, `LocalizedName`, `BaseItem`, `PropertiesList` count, struct type/field count). Frontend creature mapper, placeable mapper, scene factory, draft clone i scene clone zachowuja to summary, wiec wpis bez `InventoryRes`/`EquippedRes`/`Random*` nie znika z projekcji. Creature i placeable inventory UI pokazuja taki wpis jako `Embedded ...` w kolumnie Linked UTI. Wspolny GFF writer zapisuje pole `STRUCT`, a waskie writery UTC/UTP/UTM serializuja zagniezdzone `Item` structs w inventory/equipment/store lists. Store wizard prefill zachowuje embedded-only StoreList entries, pokazuje `Embedded ...` i wysyla embedded-only entries w payloadzie create/update, zamiast je odfiltrowywac.
Status 2026-07-01, flag evidence: przeglad dekompilacji w `C:\Projects\New Folder\export\decompiled_all.c` pokazuje odczyt/zapis `Dropable`, `Pickpocketable` i `Infinite` przy creature `ItemList` oraz `Equip_ItemList`, wiec obecne trzy checkboxy dla obu creature contextow nie sa usuwane bez mocniejszego dowodu Toolset UI.
Status 2026-07-02, embedded property preservation/editor: parser czyta realne `Item.PropertiesList` entries z zagniezdzonych itemow, frontend creature/placeable mappers przenosza `itemPropertyListEntries`, a scene clone robi deep copy tych entries. Creature inventory/equipment dialog ma teraz mini-editor zagniezdzonego `Item` struct (`TemplateResRef`, `Tag`, `LocName`, `LocName` strref, `BaseItem`, `Struct Type`) oraz edycje serialized `PropertiesList` pol (`PropertyName`, `Subtype`, `CostTable`, `CostValue`, `Param1`, `Param1Value`, `ChanceAppear`). Scene draft i scene normalization robia deep copy/preserve tych entries, wiec UI nie jest tylko tekstowym opisem. To zamyka utrate properties przy waskim UTC/UTP/UTM inventory/store contract. Pelny UTC creature blueprint writer pozostaje jawnie niewspieranym zakresem tej sciezki, a nie placeholderem.
Status 2026-07-06, fuller embedded TNWItem preservation/write path: wspolny embedded item writer uzywa tego samego rdzenia pol co UTI writer dla obslugiwanych pol itemu (`Description`, `DescIdentified`, `Comment`, `PaletteID`, `Plot`, `ModelPart1..3`, koszt/charges/stack, `Identified`/`Stolen`/`Cursed`, armor body parts, material colors, `PropertiesList`, item scripts). Parser wyciaga te pola z zagniezdzonego `Item` struct, backend schema przyjmuje je dla store/placeable embedded item payloads, a frontend scene/creature/placeable/store contracts i normalizatory zachowuja je zamiast odchudzac do summary. To zamyka utrate pelniejszych embedded item fields w waskim inventory/equipment/store/placeable path. Nadal nie oznacza to pelnego UTC creature blueprint writera dla calego creature blueprintu.

Dowody:

- `frontend/tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx` - add/edit/remove dla `ItemList` i `Equip_ItemList`.
- `backend/test/unit/aurora-gff-template-parser.spec.ts` - UTC writer round-trip dla inventory/equipment.
- `npx.cmd vitest run CreaturePropertiesDialog` - PASS.
- `npm.cmd test -- aurora-gff-template-parser.spec.ts --runInBand` - PASS.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` - PASS.
- `npm.cmd run build` w `backend` - PASS.
- `npx.cmd vitest run tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts` -> 2 files, 6 tests passed.
- `npx.cmd vitest run tests/unit/modules/items/itemEquipSlots.test.ts tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx` -> 2 files, 5 tests passed.
- `npx.cmd vitest run tests/unit/modules/placeables/placeablePreviewSceneMapper.test.ts tests/unit/modules/areas/areaSceneMapper.test.ts tests/unit/modules/scene/domain/sceneFactory.test.ts tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx` -> 4 files, 27 tests passed.
- `npx.cmd vitest run tests/unit/modules/scene/sceneFactory.test.ts tests/unit/modules/scene/application/sceneMutationsFacade.placeableProperties.test.ts tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx` -> 3 files, 12 tests passed.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.
- `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts --runInBand` -> 1 suite, 20 tests passed.
- `npm.cmd run test:unit -- catalog.application.service.spec.ts -t "placeable UTP" --runInBand` -> 1 suite, 2 tests passed, 134 skipped.
- `npx.cmd vitest run tests/unit/modules/placeables/httpPlaceableApiPort.test.ts` -> 1 file, 12 tests passed.
- `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "embedded Item" --runInBand` -> 1 suite, 1 test passed, 20 skipped.
- `npx.cmd vitest run tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts tests/unit/modules/scene/domain/sceneFactory.test.ts` -> 2 files, 14 tests passed.
- `npx.cmd vitest run tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts tests/unit/modules/scene/domain/sceneFactory.test.ts` -> 3 files, 16 tests passed.
- `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "UTM store buckets" --runInBand` -> 1 suite, 1 test passed, 20 skipped.
- `npx.cmd vitest run tests/unit/modules/placeables/placeablePreviewSceneMapper.test.ts tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx` -> 2 files, 11 tests passed.
- `npx.cmd vitest run tests/unit/modules/stores/storeCreationWizard.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 2 files, 12 tests passed; existing React act warnings in ItemsModePanel suite remain.
- `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts --runInBand` -> 1 suite, 21 tests passed.
- `npm.cmd run test:unit -- template-processing.schemas.spec.ts aurora-gff-template-parser.spec.ts --runInBand` -> 2 suites, 28 tests passed.
- `npm.cmd run test:unit -- catalog.application.service.spec.ts -t "creates module-backed store UTM|creates module-backed placeable UTP" --runInBand` -> 1 suite, 2 tests passed, 134 skipped.
- `npx.cmd vitest run tests/unit/modules/stores/storeCreationWizard.test.ts` -> 1 file, 4 tests passed.
- `npm.cmd run build` w backend -> PASS.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` w frontend -> PASS.
- `npm.cmd run build` w `backend` -> PASS.
- `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.
- 2026-07-02 embedded property proof: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "serializes creature inventory"` -> PASS.
- 2026-07-02 frontend mapper/clone proof: `npx.cmd vitest run tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts tests/unit/modules/layout/workspaceSceneObjectClone.creatureProperties.test.ts` -> 2 files, 7 tests passed.
- 2026-07-06 fuller embedded TNWItem proof: `npm test -- aurora-gff-template-parser.spec.ts template-processing.schemas.spec.ts` w `backend` -> 2 suites, 33 tests passed.
- 2026-07-06 frontend embedded item preservation proof: `npx.cmd vitest run tests/unit/modules/scene/domain/sceneFactory.test.ts` w `frontend` -> 1 file, 10 tests passed.
- 2026-07-06 frontend inventory/store/placeable mapper proof: `npx.cmd vitest run tests/unit/modules/stores/storeCreationWizard.test.ts tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts tests/unit/modules/placeables/placeablePreviewSceneMapper.test.ts` w `frontend` -> 3 files, 18 tests passed.
- 2026-07-06 backend UTM/UTP save proof: `npm test -- catalog.application.service.spec.ts -t "creates module-backed store UTM|creates module-backed placeable UTP"` w `backend` -> 2 targeted tests passed, 150 skipped.
- 2026-07-06 type proof: `npx.cmd tsc -p tsconfig.json --noEmit` w `backend` -> PASS; `npx.cmd tsc -p tsconfig.app.json --noEmit` w `frontend` -> PASS.
- 2026-07-06 limited visual matrix proof: `node backend/scripts/capture-item-visual-matrix-cdp.mjs` with `ITEM_VISUAL_MATRIX_CASES=single-part-gem-nw-it-gem001,shield-l-lshd-0,armor-aarcl009` and `ITEM_VISUAL_MATRIX_ANGLES=front` -> summary `.codex-tmp/item-proof-all/2026-07-06-embedded-item-regression-visual-matrix/24-item-visual-matrix-summary.json`, `totalCases=3`, `capturedCases=3`, `failedCases=0`, `issueCaseCount=0`; PNG proof files: `single-part-gem-nw-it-gem001-front.png`, `shield-l-lshd-0-front.png`, `armor-aarcl009-front.png`.

Do implementacji:

- Brak otwartych code punktow w obecnym waskim inventory/equipment/store contract.
- Pelny embedded item editor dla wszystkich pol zagniezdzonego itemu oraz full UTC creature writer sa oddzielnym, szerszym Toolset-blueprint scope. Obecnie preserve/write path zachowuje pelniejsze pola, ale UI mini-editor nadal pokazuje waski, bezpieczny zestaw. Nie udajemy kompletnej edycji creature blueprintow.

### P0.5 Stores UTM

Runtime resource reader zna UTM type 2051, ale nie ma pelnego store runtime/editor path.
Retail ma 42 UTM, 5 bucketow StoreList na store i 4597 item entries.

Status 2026-06-30: parser UTM V3.2 czyta root fields, StoreList buckety, ItemList entries i restricted BaseItem lists. Backend kataloguje UTM jako TemplateKind `store`, wystawia `GET /catalog/stores` oraz preview, a frontend ma StoreApiPort, mapper `StoreApiListItem -> SceneObject(kind="stores")` i laduje stores do Area Add Panel. Drugi etap zapisuje nowe sklepy jako realne `.utm` przez `POST /catalog/stores/blueprints`, a Items Mode ma `New Store` wizard dla 5 bucketow StoreList, wielu itemow w kazdym bucketcie i list restricted base items. Trzeci etap dodaje module-backed Store editor: `PUT /catalog/stores/blueprints/:resRef`, `DELETE /catalog/stores/blueprints/:resRef`, frontendowe Edit/Duplicate/Delete i prefill formularza z metadanych UTM.
Status 2026-07-01: runtime proof 14-22 potwierdza Items Mode Store create/edit/duplicate/delete, Store -> Area Add Panel bez recznego reloadu i Item create/edit/duplicate/delete. Przy okazji naprawiony zostal load Stores catalog w Items Mode oraz dodany filtr Stores po resref/tagu, zeby custom UTM nie znikal poza pierwszymi 8 wierszami po refreshu.

Zaimplementowane:

- Parser UTM V3.2 dla MarkUp, MarkDown, BlackMarket, BM_MarkDown, OnOpenStore i Store ID.
- StoreList[5] z ItemList entries: InventoryRes, RandomResRef, RandomList, Repos_PosX, Repos_Posy, Infinite.
- WillNotBuy i WillOnlyBuy jako listy BaseItem.
- Retail aggregate test: 42 UTM, 210 StoreList bucketow, 4597 item entries, max bucket 136.
- `TemplateKind = "store"`, `StoresController`, `CatalogApplicationService.listStores/getStorePreview`.
- Frontend `HttpStoreApiPort`, `storeSceneObjectMapper`, loader/cache w `WorkspaceLayout` i Area Add Panel support przez `SceneObjectKind="stores"`.
- Serializer UTM V3.2 dla `ResRef`, `LocName`, `Tag`, `Comment`, `MarkUp`, `MarkDown`, `BlackMarket`, `BM_MarkDown`, `OnOpenStore`, `ID`, pieciu bucketow `StoreList`, wpisow `InventoryRes`, embedded `Item` struct, `RandomResRef/RandomList/Repos_PosX/Repos_Posy/Infinite` oraz `WillNotBuy/WillOnlyBuy`.
- `POST /catalog/stores/blueprints` robi write -> parse round-trip i zapisuje `.utm` do module resource layer jako resource type 2051.
- Nowe module-backed store template dostaja `TemplateKind="store"`, prefiks `str_`, objectKey, store counts i JSON metadata dla StoreList/restricted base items.
- Frontend `HttpStoreApiPort.createStoreBlueprint()` i `StoreCreationWizardDraft -> StoreApiBlueprintCreatePayload`.
- Items Mode pokazuje osobny przycisk `New Store`, sklada payload UTM z 5 bucketow StoreList, wieloma wpisami ItemList per bucket, konkretnym `InventoryRes`, embedded-only `Item` struct albo losowymi `RandomResRef`/`RandomList`, `WillNotBuy`, `WillOnlyBuy`, cenami i `BlackMarket`, a po sukcesie dopisuje wynik do katalogu Stores uzywanego przez Area Add Panel.
- Module blob storage ma opcjonalne `deleteModuleObject()` w local/S3 adapterach.
- Backend `PUT /catalog/stores/blueprints/:resRef` aktualizuje istniejacy module-backed `.utm` tym samym serializerem UTM i zwraca 404, jesli blueprint nie istnieje.
- Backend `DELETE /catalog/stores/blueprints/:resRef` usuwa tylko znormalizowany `modulePrefix/<resRef>.utm`, invaliduje snapshot/template caches i zwraca usuniety objectKey.
- Frontend `HttpStoreApiPort.updateStoreBlueprint()` i `deleteStoreBlueprint()` sa typowane i testowane.
- Items Mode ma sekcje Stores z Edit/Duplicate/Delete. Edit odtwarza draft z metadanych `storeListEntries`, `WillNotBuy/WillOnlyBuy`, cen i flag; Duplicate tworzy nowy bezpieczny ResRef; Delete usuwa z katalogu lokalnego po sukcesie backendu.
- Items Mode sekcja Stores ma filtr po name/resref/category/tags/metadanych, a `WorkspaceLayout` laduje Stores catalog rowniez w `items_mode`, nie tylko w Areas Mode.
- 2026-07-02 overwrite/rename UX: Store wizard wykrywa kolizje `ResRef`, blokuje Create bez decyzji, oferuje `Use <next free ResRef>` albo `Save as module shadow-copy`. Edit store rozroznia module-backed records po `createdByStoreWizard`/`sourceGeneratedBy`/`sourceObjectKey=modules/current/...`; module-backed idzie przez `PUT`, a source/retail record idzie przez `POST` z `overwrite: true` jako shadow-copy.
- Dowody jednostkowe:
  - `npm test -- aurora-gff-template-parser.spec.ts -t "serializes store blueprints"` -> PASS.
  - `npm test -- catalog.application.service.spec.ts -t "store UTM"` -> PASS, 2 tests.
  - `npm run build` w `backend` -> PASS.
  - `npx vitest run tests/unit/modules/stores/storeCreationWizard.test.ts tests/unit/modules/stores/httpStoreApiPort.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> PASS, 3 files / 14 tests.
  - `npx tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.
  - 2026-07-02 `npx.cmd vitest run tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/stores/storeCreationWizard.test.ts` -> 2 files, 20 tests passed.
  - 2026-07-02 runtime proof 31: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\31-store-overwrite\31-store-overwrite-summary.json`; screeny `31-store-resref-conflict-cdp.png` i `32-store-shadow-copy-overwrite-ready-cdp.png` pokazuja blokade i odblokowanie overwrite. Ten runtime ma `storeSourceCoverage.total=42`, `moduleBacked=42`, `nonModuleSource=0`, wiec nie ma realnego non-module UTM store do live screena shadow-copy create.

Do implementacji:

- Brak otwartego Web-code punktu dla store overwrite/rename. Pozostaje tylko blocker zrodlowy: aktualny runtime nie dostarcza non-module UTM store, wiec live proof source/retail shadow-copy create nie moze byc wykonany bez dodatkowej probki.

### P0.6 Pelny baseitems.2da model

Aurora Web czyta z baseitems.2da tylko label, modelType i defaultModel.
Aurora uzywa 67 kolumn, m.in. EquipableSlots, DefaultIcon, BaseCost, Stacking, MaxProps, MinProps, PropColumn, StorePanel, ChargesStarting, ILRStackSize, ReqFeat*, Weapon*.

Status 2026-06-30: runtime metadata z baseitems.2da jest rozszerzone i widoczne w inspectorze/wizardzie. Backend wystawia `GET /catalog/items/base-items`, frontend laduje pelna tabele `baseitems.2da` do kreatora i wizardowy wybor typu nie zalezy juz wylacznie od zaladowanych probek UTI. Kreator pokazuje walidacje z baseitems.2da dla stack size, charges, max/min props, ReqFeat*, EquipableSlots, ILRStackSize oraz BaseCost/ItemMultiplier/AddCost context. `EquipableSlots` ma juz decoder maski 0x1..0x20000 na nazwy slotow Aurora/NWN w wizardzie i inspectorze. StorePanel/StorePanelSort sa uzywane jako aurorowa kolejnosc backendowych itemow i virtual baseitems w Items Mode, gdy metadata sa dostepne. Add-to-Area item categories uzywaja teraz StorePanel jako kanonicznego zrodla dla Armor, Weapons, Potions / Scrolls, Magic Items i Miscellaneous, z wyjatkami dla Creature Items, Plot Item i Tutorial. Status 2026-07-01: creature item reference enrich przenosi z powiazanego UTI `itemBaseItem` i `itemBaseItemEquipableSlots` do JSON `ItemList`/`Equip_ItemList`; frontend mapper, scene factory i creature properties draft zachowuja te pola, a dialog `Equipped Items` pokazuje `Slot OK` albo `Slot mismatch` porownujac `Equip_ItemList.slotMask` z `baseitems.2da EquipableSlots`.

Do implementacji:

- Dalsza walidacja equip slots w kontekscie rasowych/creature-only slotow i faktycznych zasad postaci; podstawowe porownanie `Equip_ItemList.slotMask` kontra `baseitems.2da EquipableSlots` dla powiazanego UTI jest juz zaimplementowane.
- Runtime/browser screenshot po kontrolowanym odswiezeniu frontendu potwierdzajacy nowe kategorie Add-to-Area.

Zaimplementowane:

- Rozszerzony ParsedItemBaseItemTwoDaRow o glowne kolumny potrzebne UI/walidacji.
- Runtime projection przenosi DefaultIcon, inv size, equip slots, costs/stacking/property limits/store metadata.
- Armor/base item metadata sa hydratowane po BaseItem takze wtedy, gdy UTI nie ma modelPart1..3.
- `GET /catalog/items/base-items` zwraca pelne wiersze baseitems.2da: EquipableSlots, DefaultIcon, BaseCost, Stacking, MaxProps, MinProps, PropColumn, StorePanel, StorePanelSort, ChargesStarting, ILRStackSize, ReqFeat0..4 i pola weapon.
- Frontend `HttpItemApiPort.getItemBaseItems()` oraz virtual `SceneObject` templates `itm_baseitem_*` zasilaja Item Creator type picker.
- Wizard rozpoznaje armor po BaseItem 16 i bron trzyczesciowa po weapon `ItemClass/ModelType`, nawet gdy typ pochodzi z samego baseitems.2da bez sample UTI.
- Wizard validation blokuje `StackSize > Stacking` i `propertyList.length > MaxProps`, pokazuje warning dla charges przy `ChargesStarting=0`, info dla `MinProps` i `ReqFeat*`.
- Wizard validation pokazuje `EquipableSlots` context, warning gdy `StackSize > ILRStackSize`, oraz context kosztowy `BaseCost` / `ItemMultiplier` / `AddCost`.
- `itemEquipSlots` dekoduje Aurora/NWN equip slot masks: Head, Chest, Boots, Arms, hands, cloak/rings/neck/belt/ammo oraz creature weapon/skin slots; nieznane bity sa zachowane jako `Unknown 0x...`.
- Items inspector pokazuje `Equip Slots` jako hex + nazwy slotow, nie tylko surowa wartosc z 2DA.
- Creature properties dialog pokazuje zgodnosc albo konflikt `Equip_ItemList.slotMask` z `baseitems.2da EquipableSlots` powiazanego itemu.
- `compareItemSceneObjectsByAuroraStorePanel()` sortuje itemy po `baseItemStorePanel`, potem `baseItemStorePanelSort`, a dopiero potem po nazwie/resrefie.
- WorkspaceLayout uzywa tej kolejnosci dla backendowych UTI oraz virtual `baseitems.2da` templates.
- SceneObjectAddPanel klasyfikuje itemy do Add-to-Area po `baseItemStorePanel`: 0 Armor, 1 Weapons, 2 Potions / Scrolls, 3 Magic Items, 4 Miscellaneous. Creature-item baseitems (`it_cr_*`, `cslashweapon`, `cpiercweapon`, `cbludgweapon`, `cslshprcweap`, `creatureitem`) nadpisuja StorePanel, zeby nie wpadaly falszywie do Weapons/Armor.
- Dowody:
  - `npx vitest run tests/unit/modules/items/itemSceneObjectMapper.test.ts` -> PASS, 5 tests.
  - `npx vitest run tests/unit/modules/items/itemCreationWizard.test.ts` -> PASS.
  - `npx.cmd vitest run tests/unit/modules/items/itemEquipSlots.test.ts tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 3 files, 21 tests passed.
  - `npx vitest run tests/unit/modules/layout/SceneObjectAddPanel.test.tsx` -> PASS, 21 tests.
  - `npx.cmd vitest run tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts tests/unit/modules/scene/domain/sceneFactory.test.ts` -> 3 files, 17 tests passed.
  - `npm.cmd run build` w backend -> PASS.
  - `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` w frontend -> PASS.
  - `npx tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.

## Braki P1

### P1.1 Armor preview nadal nie jest pelnym Aurora composerem

Item armor preview buduje modele przez sztywny prefix pmh0_, czyli human male phenotype 0.
To jest podglad, nie pelny context-aware equipment composer.

Status 2026-07-01: zamkniety zostal wazny fragment decompilation-guided composer path:
backend czyta `parts_robe.2da` hide flags dla `ArmorPart_Robe`, filtruje zasloniete body parts
z `itemModelRefs` i expose'uje `armorRobeHiddenSlots` w runtime/frontowym inspectorze.
Backend czyta tez `cloakmodel.2da` dla itemow typu cloak/BaseItem 80: `MODEL`, `TEXTURE`,
`ICON`, `HIDEWING`, `HIDETAIL`, `HIDESHOL`, `HIDESHOR`, buduje cloak model ref w formacie
z dekompilacji `pmh0_cloak_###`, dodaje texture/icon refs do asset lookupu i pokazuje je w
frontendowym inspectorze. Shield black-key backer w rendererze jest teraz `DoubleSide`, zeby
tarcza nie byla pusta od srodka po obroceniu.

Dowody 2026-07-01:

- Backend unit: `npm.cmd run test:unit -- catalog-processing.helpers.spec.ts -t "cloakmodel-backed" --runInBand` -> 1 targeted test passed.
- Backend unit: `npm.cmd run test:unit -- catalog.application.service.spec.ts -t "cloak items" --runInBand` -> 1 targeted test passed.
- Backend unit: `npm.cmd run test:unit -- catalog.application.service.spec.ts -t "robe armor" --runInBand` -> 1 targeted test passed.
- Frontend unit: `npx.cmd vitest run tests/unit/modules/items/itemSceneObjectMapper.test.ts tests/unit/modules/items/itemPresentation.test.ts` -> 2 files, 11 tests passed.
- Frontend unit: `npx.cmd vitest run tests/unit/modules/placeables/placeableThreeAssetLoader.textureMapping.test.ts -t "single-piece item shield"` -> 1 targeted test passed.
- Runtime proof po backend refresh: `.codex-tmp/item-subsystem-proof-2026-07-01/01-armor-aarcl009-items-mode.png`, `02-shield-l-lshd-0-items-mode.png`, `03-single-part-cnr-b-dagger-items-mode.png`, `05-cloak-l-cloak-0-after-backend-refresh.png`.

Do implementacji:

Zamkniete 2026-07-02:

- New Item wizard ma context-aware armor mannequin: preset human male/female P0/P2, edytowalny prefix modelu `pmh0_`/`pfh2_`, gender, phenotype i race model.
- Wizard zapisuje `armorPreviewContext` do SceneObject/blueprint payload, a walidacja wykrywa zly prefix oraz brakujace zrodla CAPART/parts_* dla wpisanych partow.
- Renderer itemow aplikuje source-runtime effects dla item model parts i armor parts, jesli zaladowany MDL/GLB ma takie metadane: animmesh, danglymesh, alpha, selfillum color i texture cycle.
- Retail cloak `l_cloak_0`/`pmh0_cloak_001` jest poprawnie renderowany jako statyczny model: source MDL ma `newmodel pmh0_cloak_001` i `setsupermodel pmh0_cloak_001 pmh0`, ale nie ma `node danglymesh`; `pmh0_robe001` ma tylko `danglymesh 0`, wiec Web raportuje `danglymeshStatus=not-applicable` zamiast generowac fikcyjny ruch.
- Managed runtime proof dla cloaka: `.codex-tmp/item-proof-all/28-cloak-runtime-effects-canonical/24-item-visual-matrix-summary.json` -> `issueCaseCount=0`, front/side/top-oblique, `meshCount=20`, `modelTextureLoadedCount=14/14`, `runtimeEffectStatus=not-applicable` zgodnie ze zrodlem.
- Screeny proof: `.codex-tmp/item-proof-all/28-cloak-runtime-effects-canonical/robe-cloak-l-cloak-0-front.png`, `robe-cloak-l-cloak-0-side.png`, `robe-cloak-l-cloak-0-top-oblique.png`.
- Wizard context proof: `.codex-tmp/item-proof-all/26-wizard-context/26-item-wizard-context-summary.json` oraz screeny `26-item-wizard-armor-context-default.png`, `27-item-wizard-armor-context-pfh2-edited.png`, `28-item-wizard-armor-context-finish.png`.
- Unit/build proof: `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 26 tests passed; `npx.cmd vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.creatureRenderPayload.test.ts -t "item cloak danglymesh"` -> targeted test passed; `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.

### P1.2 Icon composer

Dekompilacja rozdziela icon composer od 3D preview.
Status 2026-06-30: pierwszy webowy icon preview dla listy itemow jest zaimplementowany, ale nie jest to jeszcze pelny Aurora icon pipeline. Status 2026-07-01: item asset manifest lookup dostal `itemIconRefs` z `DefaultIcon`, wiec backend moze znalezc ikonowe texture/material assets nawet dla itemow bez modeli. Frontendowy icon composer preferuje browser-displayable texture asset (`png`, `webp`, `jpg`, `svg`, `gif`) pasujacy do `DefaultIcon`, a gdy go nie ma, szuka realnego assetu po pierwszym model part resref albo item `resRef`. Dla raw `tga`, `bmp`, `dds`, `tpc` i `plt` composer wystawia `raw-texture`, Items Mode dekoduje widoczne TGA/BMP/DDS/TPC/PLT asynchronicznie do PNG data URL przez lokalny decoder. Metadata-only `DefaultIcon`/model part/resRef nie tworzy juz syntetycznego `data:image/svg+xml`; item bez realnego assetu pokazuje jawny brak preview. TGA obejmuje uncompressed/RLE truecolor/grayscale; BMP obejmuje 24/32-bit BI_RGB, bottom-up/top-down, row padding i alpha fallback; DDS/TPC ida przez istniejacy Aurora TPC/DDS decoder. Status 2026-07-02: webowy icon composer parity dla obecnego katalogu jest zamkniety bez placeholderow: PLT thumbnail dekoduje material rows z kolorow Leather/Cloth/Metal, lista itemow renderuje inventory thumbnail grid z wymiarow `InvSlotWidth/InvSlotHeight`, a backend materializuje osobny `item-list-icons` cache entry przed oddaniem URL-a assetu, zeby decoded raw icon nie lapal losowego 404.

Zaimplementowane:

- `composeItemIconPreview()` wybiera zrodlo ikony w kolejnosci: `baseItemDefaultIcon`, model part resref, item `resRef`, ale zwraca preview tylko wtedy, gdy istnieje realny asset pasujacy do wybranego resrefu.
- Miniatura uwzglednia material colors jako swatches oraz count model parts.
- Items Mode przekazuje realny browser-displayable asset albo decoded raw texture do `SceneObjectThumbnail`; metadata-only item zostaje bez sztucznego obrazka.
- `SceneObjectThumbnail` ma globalna blokade generated fallback dla `kind=items`, wiec rowniez Add-to-Area nie pokazuje syntetycznych item previews.
- Backendowy asset lookup rozpoznaje `itemIconRefs` i zwraca texture/material assets dla `baseitems.2da DefaultIcon`.
- Frontendowy composer uzywa browser-displayable texture assetu jako `asset-texture`, gdy manifest ma zgodny asset ikony.
- Frontendowy composer rozpoznaje raw TGA jako `raw-texture`, a Items Mode dekoduje widoczne TGA asynchronicznie do PNG data URL; jesli decode sie nie uda, preview pozostaje jawnie niedostepny.
- Status 2026-07-01: listowy backend dopina `modelAssetCandidates` do item metadata i prymuje cache delivery dla realnych icon assets, wiec `GET /catalog/items` zwraca asset-backed ikonki bez potrzeby uruchamiania pelnego preview process per row.
- Status 2026-07-01: frontendowy matcher akceptuje indeksowane warianty ikon Aurory, np. `DefaultIcon=iwlcfg` z realnym plikiem `iwlcfg_049.tga`.
- Status 2026-07-01: raw icon decode uzywa bearer tokenu aktualnej backendowej sesji, bo asset delivery endpoint jest chroniony; nie ma juz silent 401 dla TGA/PLT preview.
- `itemRawTextureDecoder` dekoduje TGA 24/32-bit, grayscale oraz RLE do RGBA i canvas PNG data URL.
- Frontendowy raw icon path rozpoznaje teraz BMP obok TGA; decoder obsluguje 24/32-bit BI_RGB, padded rows, top-down/bottom-up i niewykorzystany zerowy alpha channel.
- Frontendowy raw icon path rozpoznaje teraz DDS/TPC/PLT; DDS/TPC korzysta z aurorowego TPC/DDS decoder path, a PLT renderuje grayscale RGBA fallback.
- PLT thumbnail path mapuje material colors na aurorowe rows: Metal1->2, Metal2->3, Cloth1->4, Cloth2->5, Leather1->6, Leather2->7.
- Items Mode pokazuje inventory thumbnail grid z realnego decoded/raw/browser assetu i slot dimensions z `baseitems.2da`; itemy bez assetu nie dostaja obrazka zastepczego.
- Backend `GET /catalog/items` zapisuje osobny `item-list-icons` cache entry dla assetow ikon, zanim zwroci `modelAssetCandidates.assetUrl`; URL-e miniatur sa teraz stabilne i mozliwe do pobrania przez chroniony endpoint assetow.
- Raw icon decode w Items Mode ma bearer-token fallback z localStorage oraz retry na gotowosc cache, ale po backendowym cache materialization pozytywny path konczy sie `iconDecodeStatus=decoded`.
- Unit proof: `npx.cmd vitest run tests/unit/modules/items/itemIconComposer.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 2 files, 11 tests passed.
- Unit proof: `npm.cmd run test:unit -- catalog-processing.helpers.spec.ts -t "item DefaultIcon refs|collectPlaceableAssetsFromSnapshot" --runInBand` -> 1 suite, 9 tests passed, 54 skipped.
- Unit proof: `npx.cmd vitest run tests/unit/modules/items/itemIconComposer.test.ts` -> 1 file, 6 tests passed.
- Unit proof 2026-07-01: `npx.cmd vitest run tests/unit/modules/items/itemRawTextureDecoder.test.ts tests/unit/modules/items/itemIconComposer.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/layout/WorkspaceLayout.itemCustomPruning.test.ts` -> 4 files, 20 tests passed.
- Unit proof 2026-07-01: `npx.cmd vitest run tests/unit/modules/items/itemRawTextureDecoder.test.ts tests/unit/modules/items/itemIconComposer.test.ts` -> 2 files, 18 tests passed.
- Unit proof 2026-07-01: `npx.cmd vitest run tests/unit/modules/items/itemIconComposer.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/items/itemSceneObjectMapper.test.ts` -> 3 files, 30 tests passed.
- Runtime proof 2026-07-01: `C:\Projects\aurora-web\.codex-tmp\item-subsystem-proof-2026-07-01\06-real-item-preview-boxer-gloves.png` pokazuje `boxer_gloves` z realnego `iwlcfg_049.tga` zdekodowanego do PNG; DOM proof: 1 `data:image/png`, 0 `data:image/svg+xml`, 0 missing previews dla filtrowanego itemu.
- Unit proof 2026-07-02: `npx.cmd vitest run tests/unit/modules/items/itemIconComposer.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 2 files, 28 tests passed.
- Backend unit proof 2026-07-02: `npm.cmd run test:unit -- catalog.application.service.spec.ts -t "item icon candidates"` -> 1 targeted test passed; `listItems` materializuje icon cache, a `getProcessedPlaceableAsset` zwraca realny TGA blob.
- Managed runtime proof 2026-07-02: `.codex-tmp/item-proof-all/29-icon-grid-dagger-stable-real/24-item-visual-matrix-summary.json` -> `issueCaseCount=0`, case `three-part-weapon-cnr-b-dagger`, front/side/top-oblique, `meshCount=4`, `modelTextureLoadedCount=16/16`.
- DOM proof 2026-07-02: `selectedRowState.iconDecodeStatus=decoded`, `imageSourceKind=decoded-data-url`, `gridLabel="CNR_B_DAGGER inventory icon grid 1 x 1"`, `gridTitle="iwswdg inventory 1 x 1"`, `hasImage=true`.
- Screeny proof 2026-07-02: `.codex-tmp/item-proof-all/29-icon-grid-dagger-stable-real/three-part-weapon-cnr-b-dagger-front.png`, `three-part-weapon-cnr-b-dagger-side.png`, `three-part-weapon-cnr-b-dagger-top-oblique.png`.
- Current typecheck note 2026-07-01: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` blokuje sie na dwoch istniejacych unused-symbol w `workspaceObjectMeshLayer.ts`, poza zakresem icon preview patcha.
- Historyczny frontend typecheck po wczesniejszej zmianie icon preview: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.

Do implementacji:

- Brak otwartych punktow Web w P1.2 po proofie 2026-07-02. Source-authored itemy bez realnego modelu/ikony pozostaja jawnie unsupported/unavailable, bez placeholderow.

### P1.3 Item generator

Dekompilacja ma TNWItemGeneratorTemplate, TNWItemGenerator i TdlgItemGeneratorEdit.
Retail type 2036 w bazowym KEY to LTR V1.0, nie GFF item generator sample.

Status 2026-06-30: pelny generator itemow nadal nie jest zaimplementowany, ale istniejace item contexts przestaly gubic random references. Parser GFF czyta `RandomResRef` i `RandomList` w UTC `ItemList`/`Equip_ItemList` oraz UTM `StoreList.ItemList`; waskie serializery UTC/UTM zapisuja te pola z powrotem. Store wizard w webie potrafi juz tworzyc i edytowac UTM `StoreList.ItemList` z konkretnym `InventoryRes` albo losowymi `RandomResRef`/`RandomList`. Creature inventory/equipment dialog mapuje i edytuje `RandomResRef`/`RandomList` dla `ItemList` oraz `Equip_ItemList`.

Status 2026-07-01: generator nie jest udawany placeholderem. Backend wystawia `GET /catalog/items/generator-support`, skanuje `*.utg` z module snapshot oraz skonfigurowanych katalogow `AURORA_ITEM_GENERATOR_SOURCE_DIRS`, klasyfikuje naglowki jako `gff-candidate`, `ltr-lexicon` albo `unknown` i zwraca `ready`/`unsupported`/`no-sources`. Dev compose montuje `C:\Projects\New Folder\item-retail-extract\utg` read-only do backendu, a live runtime raportuje 4 zrodla, 0 GFF, 4 LTR. Items Mode pokazuje `Item Generator Unsupported`, licznik `0 GFF / 4 LTR` i pierwszy realny plik `animal.utg: LTR V1.0`.
Status 2026-07-02: formalny unsupported path jest zamkniety bez placeholderow. Web nie pokazuje kreatora item generatora dla LTR `*.utg`, nie generuje fikcyjnego parsera i nie tworzy sztucznego wizardu. Backend ma tez pozytywny gate dla przyszlych zrodel: jesli module snapshot zawiera naglowek `UTG V3.2`, `getItemGeneratorSupport()` zwraca `ready` i klasyfikuje zrodlo jako `gff-candidate`.

Do implementacji warunkowo:

- Parser/serializer generatora dopiero po potwierdzeniu formatu GFF `UTG`; bazowe retail KEY type 2036 sa `LTR V1.0`, wiec nie wolno z nich budowac fikcyjnego kreatora itemow.
- Pelny UI generatora itemow i testy na realnym zasobie tylko wtedy, gdy probka zostanie znaleziona albo format zostanie odtworzony z dekompilacji.

Dowody:

- Live API/runtime proof: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\09-13-cdp-runtime-proof-summary.json`.
- Screenshot proof: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\13-item-generator-support-unsupported-cdp.png`.
- Live endpoint proof 2026-07-01: `GET /_aurora/v1/catalog/items/generator-support` -> `status=unsupported`, `sourceCount=4`, `gffCandidateCount=0`, `ltrLexiconCount=4`, all source headers `LTR V1.0`.
- Managed runtime proof 2026-07-02: `.codex-tmp/item-proof-all/30-generator-support/30-item-generator-support-summary.json` -> endpoint `status=unsupported`, `supported=false`, `sourceCount=4`, `gffCandidateCount=0`, `ltrLexiconCount=4`.
- Screenshot proof 2026-07-02: `.codex-tmp/item-proof-all/30-generator-support/30-item-generator-support-unsupported-cdp.png` pokazuje `Item Generator Unsupported`, `0 GFF / 4 LTR` i `animal.utg: LTR V1.0`.
- Backend unit proof 2026-07-02: `npm.cmd run test:unit -- catalog.application.service.spec.ts -t "item generator support"` -> 1 targeted test passed; `UTG V3.2` w module snapshot klasyfikuje sie jako `gff-candidate` i `ready`.
- Backend unit proof 2026-07-06: `npm test -- catalog.application.service.spec.ts -t "item generator support"` w `backend` -> 1 targeted test passed, 151 skipped; unsupported LTR/no-GFF gate i przyszly `UTG V3.2` ready gate pozostaja aktywne.
- Frontend unit/API proof 2026-07-01: `npm.cmd test -- ItemsModePanel.test.tsx httpItemApiPort.test.ts itemCreationWizard.test.ts itemCostCalculator.test.ts` -> 4 files, 36 tests passed.
- Backend build/type proof 2026-07-01: `npm.cmd run build` in `backend` -> PASS; frontend typecheck `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.
- `npm.cmd test -- aurora-gff-template-parser.spec.ts --runInBand` -> 1 file, 19 tests passed.
- `npm.cmd run build` w backend -> PASS.
- Frontend unit dla store wizard/panel `RandomResRef`/`RandomList`: `npx.cmd vitest run tests/unit/modules/stores/storeCreationWizard.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 2 files, 12 tests passed.
- Frontend unit dla store API port po opcjonalnym `InventoryRes`: `npx.cmd vitest run tests/unit/modules/stores/httpStoreApiPort.test.ts` -> 1 file, 5 tests passed.
- Frontend typecheck po store random refs: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.
- Frontend unit dla creature inventory/equipment `RandomResRef`/`RandomList`: `npx.cmd vitest run tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts` -> 2 files, 6 tests passed.
- Frontend scene factory regression dla random item refs: `npx.cmd vitest run tests/unit/modules/scene/sceneFactory.test.ts tests/unit/modules/scene/domain/sceneFactory.test.ts` -> 2 files, 19 tests passed.
- Frontend typecheck po creature random refs: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.

### P1.4 NWScript-style item API model

Audit retail nwscript potwierdza itemy jako runtime API: CreateItemOnObject, CopyItem, inventory slots, Get/Set charges, stack, cursed, stolen, AddItemProperty itd.
Status 2026-07-02: Aurora Web ma frontendowy `itemCommandLayer` dla script-style operacji itemowych bez placeholderow: create/copy, modify identity/position, charges, stack, flags (`identified/stolen/cursed/plot`), add/update/remove property oraz batch runner zatrzymujacy sekwencje na pierwszym bledzie. Wynik komendy moze byc zmaterializowany do backendowego `ItemApiBlueprintCreatePayload`, wiec ten sam model konczy sie realnym zapisem UTI przez istniejace create/update blueprint API.

Zaimplementowane:

- Command layer dla create/copy/modify item.
- Unified state mutators dla identified/stolen/cursed/charges/stack.
- Property add/remove flow zgodny z runtime projection.
- Property update flow dla istniejacego wpisu `PropertiesList`.
- Batch runner dla sekwencji komend w stylu skryptowym.
- Helper `buildAuroraItemCommandBlueprintPayload()` laczacy command result z backendowym UTI payloadem.
- Unit proof 2026-07-02: `npx.cmd vitest run tests/unit/modules/items/itemCommandLayer.test.ts` -> 1 file, 6 tests passed.

## Braki P2

### P2.1 Property cost calculation parity

Status 2026-06-30: czesciowa parity jest zaimplementowana. Frontend ma wspolny `itemCostCalculator`, wizard zapisuje wyliczony `Cost` na tworzonym obiekcie/payloadzie, a backend hydratowal metadane `armorPartCostModifier*` z `parts_*.2da`. Kalkulator uwzglednia `BaseCost`, `ItemMultiplier`, `AddCost`, zwykle property costs, specjalna agregacje `PropertyName=15`/CastSpell, `PotionCost`/`WandCost` branch dla potion/scroll/wand na podstawie `CasterLvl` i `InnateLvl` z `iprp_spells.2da`, usage flags `PotionUse`/`WandUse`/`GeneralUse` oraz dostepne armor `COSTMODIFIER`.

Status 2026-07-02: dodany zostal proof runner `backend/scripts/audit-item-cost-ilr-matrix.mjs` dla live `POST /catalog/items/process` na macierzy 11 realnych retail/module UTI: armor, weapon, shield, potion, wand, scroll, stacked ammo, gem AddCost, trap AddCost i property-heavy creature item. Artefakt `.codex-tmp/item-proof-all/25-cost-ilr-matrix/25-item-cost-ilr-matrix-summary.json` pokazuje po poprawkach `11 exact / 0 delta / 0 unresolved` na swiezym backendzie proofowym `http://127.0.0.1:3100/api/v1`. Zamkniete w tej rundzie: StackSize mnozy koszt przed AddCost, surowe opcje dictionary moga byc resolve po `rowId`, zerokosztowe `UseLimitation*` nie psuja statusu, backend ma mapowania cost table `3 -> iprp_chargecost`, `6 -> iprp_soakcost`, `17 -> iprp_trapcost`, `23 -> iprp_spelllvlimm`, `itempropdef.2da` moze uzupelniac zerowe runtime `Cost` wartosci retail fallbackiem, a armor ma dekompilacyjna sciezke `parts_chest.ACBONUS -> armor.2da COST -> baseItemBaseCost`. Frontend ma squared positive-property raw score, CastSpell Potion/Scroll/Wand branch, trap/soak/spell-level-immunity koszt oraz specjalny brak korekty `-1` dla `PropertyName=1`/Armor.

Status 2026-07-02 broad strict: `backend/scripts/audit-item-cost-ilr-matrix.mjs` ma teraz tryb `ITEM_COST_ILR_CASE_MODE=broad`, ktory pobiera live katalog itemow i wybiera 96 przypadkow z bucketow armor/robe-cloak/shield/three-part/cast-spell/property-heavy/add-cost/charged/stacked/ILR/single-part/baseitem-diversity. Swiezy proof na backendzie `http://127.0.0.1:3100/api/v1` z `ITEM_COST_ILR_STRICT=1` zakonczyl sie `0 strict issues`: `78 exact`, `18 source-delta`, `0 delta`, `0 unresolved`. `source-delta` jest jawny, ale nie jest liczony jako blad kalkulatora w broad auto discovery, bo oznacza zapisany w UTI `Cost` rozny od kosztu wynikajacego z aktualnych runtime 2DA/HAK; pelna lista jest w `.codex-tmp/item-proof-all/25-cost-ilr-matrix/25-item-cost-ilr-matrix-issues.md`.

Do implementacji:

- Rozszerzyc ILR parity poza StackSize vs `ILRStackSize` status, jesli dekompilacja wskaze dodatkowe reguly.

### P2.2 Lepsze dowody wizualne

Poprzednie dowody pokazywaly kilka scen, ale komplet itemowy wymaga macierzy:

- single-part item,
- three-part weapon,
- shield,
- armor multi-part,
- robe/cloak,
- potion/scroll/misc,
- custom item z wizardu,
- item placed in area,
- inventory/store entry po wdrozeniu P0.4/P0.5.

Kazdy przypadek powinien miec screenshoty z przodu, boku, tylu i top/oblique oraz JSON z runtime projection.

Status 2026-07-01: live Items Mode proof po odswiezeniu backendu istnieje dla armor `aarcl009`, shield `l_lshd_0`, single/three-part dagger `cnr_b_dagger` oraz cloak `l_cloak_0` z `pmh0_cloak_001`.

Status 2026-07-02: runtime angle matrix jest wykonana dla 7 kanonicznych przypadkow (`single-part`, `three-part weapon`, `shield`, `armor`, `robe/cloak`, `potion/misc`, `custom wizard armor`) z front/side/back/top-oblique i `issueCaseCount=0`. Dodatkowo pelny source coverage live katalogu 3160 itemow wykazal 653 source-blocked itemy i 0 kandydatow na bug Web; screenshot UI pokazuje `Preview unsupported` dla source-blocked rows. P2.2 ma tez zamkniety proof runtime dla item placed in area, inventory/equipment entry oraz store entry: proof 09-13 pokazuje Add-to-Area i creature inventory/equipment slot validation, a proof 14-22 pokazuje Store -> Area Add Panel.

## Pelna lista pozostala po proofie 31

### Do implementacji w kodzie

Brak otwartych Web-code punktow z audytu item subsystemu po petli 2026-07-02.

Zamkniete po tej implementacji 2026-07-02:

1. Embedded `Item` w creature `ItemList`/`Equip_ItemList` nie jest juz tylko etykieta `Embedded ...`; dialog ma edytor glownego structa, `LocName` strref i serialized `PropertiesList`.
2. Creature draft builder, scene apply path i scene normalization robia deep copy/preserve `embeddedItem.itemPropertyListEntries`.
3. Backendowy waski UTC writer nadal zapisuje `ItemList`/`Equip_ItemList` z embedded `Item.PropertiesList`; round-trip test potwierdza zapis.

Warunkowe/scope-only, nieaktywne bez nowych zrodel albo decyzji projektowej:

1. Full UTC creature writer tylko jesli web ma wejsc w kompletna edycje creature blueprintow, a nie waski inventory/equipment contract.
2. Parser/serializer prawdziwego item generatora tylko po dostarczeniu realnego GFF `UTG` albo potwierdzeniu formatu z dekompilacji.
3. Dalsze ILR parity tylko jesli dekompilacja pokaze reguly ponad obecny gate `StackSize` vs `ILRStackSize`.
4. Live source/retail UTM shadow-copy create screenshot tylko po dostarczeniu non-module UTM store sample; aktualny runtime ma 42/42 stores jako `modules/current`.

### Do domkniecia proofem/runtime matrix

Brak otwartych proof-only punktow w P2.2 po 2026-07-02. Visual runtime gate ma 7 kanonicznych przypadkow z katami, item placed in area, inventory/equipment entry, Store -> Area Add Panel oraz source coverage dla 3160 itemow; 653 source-blocked przypadki sa jawnie oznaczane zamiast renderowane placeholderem.

### Blokery zrodlowe, nie placeholdery Web

1. Brak realnej GFF probki `UTG`; retail type 2036 z aktualnego extractu to `LTR V1.0`, dlatego Web pokazuje `Item Generator Unsupported` zamiast tworzyc fikcyjny wizard. Kod ma gotowy support gate i przejdzie w `ready`, gdy snapshot dostarczy naglowek `UTG V3.2`.
2. 652 source-authored unsupported/no-renderable-model itemy z invalid icon/model source (`DefaultIcon=iinvalid_*`); Web ma je oznaczac jako unsupported, nie probowac wymyslac preview.
3. `x3_it_camp`: source ma `it_encamp_001`, ale nie ma renderowalnego web modelu ani realnego default icon source; pozostaje explicit unavailable/source-blocked.
4. Brak non-module UTM store w aktualnym runtime proof 31 (`total=42`, `moduleBacked=42`, `nonModuleSource=0`), wiec source/retail UTM overwrite jest potwierdzony unitowo i przez UI decision path, ale nie ma realnego live source row do shadow-copy create screena.

## Status uczciwy

Itemy nie sa pelnym Toolsetowym podsystemem itemow.
Mamy juz realny odczyt i zapis UTI w module storage, bazowy wizard tworzenia itemu, itempropdef + IPRP dropdown chain, bogatsze baseitems metadata, palete ITP w Items Mode i Add-to-Area z module-backed custom `itempalcus.itp`, inventory/equipment UI, Store UTM katalog/add-to-area flow z create/edit/duplicate/delete dla module-backed UTM, webowy preview/wizard wariantow, live proof 09-13 dla generator-support/Add Objects/Add-to-Area/creature equipment slot validation, live proof 14-22 dla item lifecycle/store lifecycle/Store -> Area Add Panel oraz live proof 23 dla ITP palette filter w Area Add Panel po swiezym runtime wejsciu.
Aktualizacja 2026-07-02 po proofie 31: context-aware armor/robe/cloak composer, broad strict gate kosztow/ILR, icon composer parity z inventory thumbnail grid, formalny generator unsupported path, NWScript-style item command layer, embedded `Item.PropertiesList` preservation/editor oraz overwrite/rename/shadow-copy decision path sa zamkniete jako Web-code. Pozostale punkty to blokery zrodlowe albo szerszy scope Toolset blueprint authoring, nie placeholdery do dopisania w obecnym Web flow.

## Dowody z petli 2026-06-30

- 2026-07-02 final build: `npm.cmd run build` w `frontend` -> PASS; `npm.cmd run build` w `backend` -> PASS.
- 2026-07-02 final frontend proof: `npx.cmd vitest run tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/stores/storeCreationWizard.test.ts` -> 2 files, 20 tests passed.
- 2026-07-02 final embedded proof: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "serializes creature inventory"` -> PASS; `npx.cmd vitest run tests/unit/modules/creatures/creatureSceneObjectMapper.test.ts tests/unit/modules/layout/workspaceSceneObjectClone.creatureProperties.test.ts` -> 2 files, 7 tests passed.
- 2026-07-02 embedded editor proof: `npx.cmd vitest run tests/unit/modules/layout/components/properties/CreaturePropertiesDialog.test.tsx tests/unit/modules/layout/workspaceObjectPropertyDrafts.creatureProperties.test.ts tests/unit/modules/scene/domain/sceneFactory.test.ts` -> 3 files, 16 tests passed.
- 2026-07-02 embedded parser proof po `LocName` strref: `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "embedded Item"` -> PASS; `npm.cmd run test:unit -- aurora-gff-template-parser.spec.ts -t "serializes creature inventory"` -> PASS.
- 2026-07-02 frontend build note po embedded editorze: `npx.cmd tsc -b` -> PASS; `npx.cmd vite build --emptyOutDir false` -> PASS. Standard `npm.cmd run build` przeszedl typecheck, ale Vite clean zatrzymal sie na istniejacym/otwartym `dist/aurora-evidence` (`ENOTEMPTY`) przed bundlingiem.
- 2026-07-02 final backend gates: `npm.cmd run test:unit -- catalog.application.service.spec.ts -t "item icon candidates|item generator support"` -> 2 tests passed.
- 2026-07-02 runtime proof 31: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\31-store-overwrite\31-store-overwrite-summary.json`, screenshots `31-store-resref-conflict-cdp.png`, `32-store-shadow-copy-overwrite-ready-cdp.png`.
- Frontend unit: `npx vitest run tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/items/itemSceneObjectMapper.test.ts tests/unit/modules/items/httpItemApiPort.test.ts tests/unit/modules/layout/objectAddDragPayload.test.ts tests/unit/modules/stores/httpStoreApiPort.test.ts tests/unit/modules/stores/storeSceneObjectMapper.test.ts` -> 6 files, 27 tests passed.
- Frontend typecheck: `npx tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.
- Backend unit dla store writer: `npm test -- aurora-gff-template-parser.spec.ts -t "serializes store blueprints"` -> passed.
- Backend unit dla store blueprint service: `npm test -- catalog.application.service.spec.ts -t "creates module-backed store UTM blueprints"` -> passed.
- Backend build: `npm run build` -> passed.
- Frontend unit dla store wizard/API/editor: `npx vitest run tests/unit/modules/stores/storeCreationWizard.test.ts tests/unit/modules/stores/httpStoreApiPort.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 3 files, 14 tests passed.
- Frontend unit dla item StorePanel ordering: `npx vitest run tests/unit/modules/items/itemSceneObjectMapper.test.ts` -> 1 file, 5 tests passed.
- Frontend unit dla item baseitems validation context, special property validation, OnHit forced cost table i IPRP property cost context: `npx.cmd vitest run tests/unit/modules/items/itemCreationWizard.test.ts` -> 1 file, 10 tests passed.
- Frontend unit dla Add-to-Area StorePanel categories oraz ITP palette filter: `npx vitest run tests/unit/modules/layout/SceneObjectAddPanel.test.tsx` -> 1 file, 22 tests passed.
- Frontend targeted panel proof: `npx vitest run tests/unit/modules/layout/SceneObjectAddPanel.test.tsx tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 2 files, 27 tests passed.
- Backend unit dla ITP parser/writer: `npm.cmd test -- aurora-gff-itp-palette-parser.spec.ts --runInBand` -> 1 file, 3 tests passed.
- Backend unit dla custom `itempalcus.itp` service write/read: `npm.cmd test -- catalog.application.service.spec.ts -t "itempalcus" --runInBand` -> 1 targeted test passed.
- Frontend unit dla custom palette API/UI + Add-to-Area ITP: `npx.cmd vitest run tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/layout/SceneObjectAddPanel.test.tsx tests/unit/modules/items/httpItemApiPort.test.ts` -> 3 files, 33 tests passed.
- Frontend unit dla item icon composer i Items Mode thumbnail wiring: `npx.cmd vitest run tests/unit/modules/items/itemIconComposer.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 2 files, 11 tests passed.
- Backend unit dla item UTI update/delete lifecycle: `npm.cmd test -- catalog.application.service.spec.ts -t "item UTI" --runInBand` -> 1 targeted test passed.
- Frontend unit dla item create/edit/duplicate/delete UI, API update/delete i wizard validation: `npx.cmd vitest run tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/items/httpItemApiPort.test.ts tests/unit/modules/items/itemCreationWizard.test.ts` -> 3 files, 25 tests passed.
- Frontend unit dla equip slot decoder + wizard/Items panel: `npx.cmd vitest run tests/unit/modules/items/itemEquipSlots.test.ts tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx` -> 3 files, 21 tests passed.
- Backend unit dla RandomResRef/RandomList preserve w UTC/UTM parser/writer: `npm.cmd test -- aurora-gff-template-parser.spec.ts --runInBand` -> 1 file, 19 tests passed.
- Frontend unit dla kosztow itemow, wizardowego `Cost` i mapowania armor cost modifiers: `npx.cmd vitest run tests/unit/modules/items/itemSceneObjectMapper.test.ts tests/unit/modules/items/itemCostCalculator.test.ts tests/unit/modules/items/itemCreationWizard.test.ts` -> 3 files, 17 tests passed.
- Backend unit dla runtime projection `armorPartCostModifier*`: `npm.cmd test -- catalog-processing.helpers.spec.ts --runInBand` -> 1 file, 62 tests passed.
- Frontend panel/API regression po przepieciu wizardowego kosztu: `npx.cmd vitest run tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/items/httpItemApiPort.test.ts` -> 2 files, 15 tests passed.
- Frontend typecheck: `npx tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.
- Frontend typecheck po item cost calculator: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.
- Frontend typecheck po icon preview: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.
- Frontend unit dla `PotionCost`/`WandCost` CastSpell branch i usage flags: `npx.cmd vitest run tests/unit/modules/items/itemCostCalculator.test.ts` -> 1 file, 4 tests passed.
- Backend unit dla `iprp_spells.2da` `CasterLvl`/`InnateLvl`/`PotionUse`/`WandUse`/`GeneralUse` w property dictionary: `npm.cmd test -- catalog.application.service.spec.ts -t "CastSpell caster level" --runInBand` -> 1 targeted test passed.
- Frontend item regression po polach spell usage: `npx.cmd vitest run tests/unit/modules/items/itemCostCalculator.test.ts tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/items/httpItemApiPort.test.ts tests/unit/modules/items/itemSceneObjectMapper.test.ts` -> 4 files, 26 tests passed.
- Frontend typecheck po `PotionCost`/`WandCost`: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.
- Cost/ILR matrix proof 2026-07-02: fresh backend proof run with `ITEM_AUDIT_API_BASE_URL=http://127.0.0.1:3100/api/v1 node backend\scripts\audit-item-cost-ilr-matrix.mjs` -> `.codex-tmp\item-proof-all\25-cost-ilr-matrix\25-item-cost-ilr-matrix-summary.json`, 11 cases, `11 exact / 0 delta / 0 unresolved`.
- Cost/ILR broad strict proof 2026-07-02: one-session fresh backend job on `http://127.0.0.1:3100/api/v1` with `ITEM_COST_ILR_CASE_MODE=broad`, `ITEM_COST_ILR_STRICT=1`, `ITEM_COST_ILR_BUCKET_LIMIT=8`, `ITEM_COST_ILR_MAX_CASES=96` -> `.codex-tmp\item-proof-all\25-cost-ilr-matrix\25-item-cost-ilr-matrix-summary.json`, 96 cases, `78 exact / 18 source-delta / 0 strict issues`; source deltas listed in `.codex-tmp\item-proof-all\25-cost-ilr-matrix\25-item-cost-ilr-matrix-issues.md`.
- Frontend unit po StackSize/rowId/no-cost/melee-cost branch: `npx.cmd vitest run tests/unit/modules/items/itemCostCalculator.test.ts` -> 1 file, 10 tests passed.
- Backend unit dla dodatkowych cost table mappings: `npm.cmd test -- --runTestsByPath test/unit/catalog.application.service.spec.ts -t "maps item property cost table indexes beyond the original base set" --runInBand` -> 1 targeted test passed.
- Backend unit cross-check CastSpell dictionary po zmianach dictionary source selection: `npm.cmd test -- --runTestsByPath test/unit/catalog.application.service.spec.ts -t "exposes CastSpell caster level and usage flags from iprp_spells.2da" --runInBand` -> 1 targeted test passed.
- Frontend unit po armor.2da base cost i unsuppressed Armor property raw score: `npx.cmd vitest run tests/unit/modules/items/itemCostCalculator.test.ts tests/unit/modules/items/itemCreationWizard.test.ts tests/unit/modules/layout/ItemsModePanel.test.tsx tests/unit/modules/items/itemPresentation.test.ts tests/unit/modules/items/itemSceneObjectMapper.test.ts` -> 5 files, 53 tests passed.
- Backend unit po `armor.2da` base cost, cost table fallback i CastSpell dictionary: `npm.cmd test -- --runTestsByPath test/unit/catalog.application.service.spec.ts -t "derives armor base cost|uses local retail item property cost tables|exposes CastSpell caster level|maps item property cost table indexes" --runInBand` -> 4 targeted tests passed.
- Frontend typecheck po finalnym cost parity: `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> passed.
- Backend build po finalnym cost parity: `npm.cmd run build` -> passed.
- Backend build po `iprp_spells` usage fields: `npm.cmd run build` -> passed.
- Backend build after custom palette writer: `npm.cmd run build` -> passed.
- Backend build after item UTI lifecycle: `npm.cmd run build` -> passed.
- Backend build po `parts_*.2da` cost metadata: `npm.cmd run build` -> passed.
- Backend broad unit check: `npm test -- aurora-gff-template-parser.spec.ts catalog.application.service.spec.ts` -> new store tests passed, but the broad service suite still has 2 unrelated creature fallback diagnostic expectation failures around `CREATURE_RENDER_BASE_SKELETON_MODEL_ASSETS_READY` vs `...PARTIAL`.
- Runtime proof 09-13 domyka generator-support, Add Objects, Add-to-Area i creature equipment slot validation. Runtime proof 14-22 domyka Item Edit/Duplicate/Delete, Store New/Edit/Duplicate/Delete oraz Store -> Area Add Panel. Runtime proof 23 domyka TLK-resolved ITP Area Add Panel po swiezym runtime wejsciu.

## Dowody z petli 2026-07-01 proof 09-13

- CDP runtime summary: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\09-13-cdp-runtime-proof-summary.json`.
- Generator unsupported screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\13-item-generator-support-unsupported-cdp.png`.
- Add Objects full catalog screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\09-add-objects-windowed-full-catalog-cdp.png`.
- Creature filter screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\10-add-objects-tanarukk-filter-cdp.png`.
- Add-to-Area screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\11-area-add-to-area-tanarukk-cdp.png`.
- Inventory/equipment slot validation screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\12-creature-inventory-equipment-slot-ok-cdp.png`.
- Runtime assertions: `generatorState.hasUnsupported=true`, `generatorState.hasCounts=true`, `generatorState.hasLtrHeader=true`; `itemGeneratorUnsupported.bytes=103899`; `Items family=3157`, `Stores family=42`, `Creatures family=1577`; `TM_TANARUKK_SKEW` placed by canvas point `{x:676,y:425}`; slot validation shows Right Hand and Creature Bite as `Slot OK`.
- Live endpoint proof: `GET /_aurora/v1/catalog/items/generator-support` -> `status=unsupported`, `sourceCount=4`, `gffCandidateCount=0`, `ltrLexiconCount=4`, first source `animal.utg: LTR V1.0`.
- Verification 2026-07-01: `npm.cmd test -- ItemsModePanel.test.tsx httpItemApiPort.test.ts itemCreationWizard.test.ts itemCostCalculator.test.ts` -> 4 files, 36 tests passed.
- Verification 2026-07-01: frontend typecheck `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.
- Verification 2026-07-01: backend build `npm.cmd run build` -> PASS.

## Dowody z petli 2026-07-01 proof 14-22

- CDP runtime summary: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\14-22-item-store-lifecycle-proof-summary.json`.
- Item created screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\14-item-lifecycle-created-cdp.png`.
- Item edited screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\15-item-lifecycle-edited-cdp.png`.
- Item duplicated screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\16-item-lifecycle-duplicated-cdp.png`.
- Item deleted screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\17-item-lifecycle-deleted-cdp.png`.
- Store created screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\18-store-lifecycle-created-cdp.png`.
- Store edited screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\19-store-lifecycle-edited-cdp.png`.
- Store duplicated screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\20-store-lifecycle-duplicated-cdp.png`.
- Store -> Area Add Panel screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\21-store-area-add-panel-cdp.png`.
- Store deleted screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\22-store-lifecycle-deleted-cdp.png`.
- Runtime assertions: `itemLifecycle.createdVisible=true`, `itemLifecycle.editedVisible=true`, `itemLifecycle.duplicatedVisible=true`, `itemLifecycle.deleteClicked=true`; `storeLifecycle.createdVisible=true`, `storeLifecycle.editedVisible=true`, `storeLifecycle.duplicatedVisible=true`, `storeLifecycle.deleteClicked=true`; `storeAddPanel.rowVisible=true`; proof resrefs `pfitm230383`, `pfitm23038_3159`, `pfstr230383`, `pfstr230383_044`.
- Verification 2026-07-01: `npm.cmd test -- ItemsModePanel.test.tsx SceneObjectAddPanel.test.tsx httpItemApiPort.test.ts itemCreationWizard.test.ts itemCostCalculator.test.ts httpStoreApiPort.test.ts storeCreationWizard.test.ts storeSceneObjectMapper.test.ts` -> 8 files, 70 tests passed.
- Verification 2026-07-01: frontend typecheck `npx.cmd tsc -p tsconfig.app.json --noEmit --pretty false --incremental false` -> PASS.
- Verification 2026-07-01: backend build `npm.cmd run build` -> PASS.
- Known test warning: existing ItemsModePanel tests still emit React `act(...)` warnings; assertions pass and the warnings were present before this proof slice.

## Dowody z petli 2026-07-01 proof 23

- CDP runtime summary: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\23-itp-palette-area-add-panel-summary.json`.
- ITP palette Area Add Panel screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-all\23-itp-palette-area-add-panel-cdp.png`.
- Runtime assertions: selected ITP option `- Melee Weapons / 69 items`, `optionCount=2827`, `activeFamily=Items 3157 templates`, `paletteSummary=69 resrefs from itempalstd`, visible rows include `x3_it_emeraldsh`, `x3_it_rubysh`, `x0_manti_spikes`, `nw_it_crewss001`.
- Verification 2026-07-01: `npm.cmd test -- SceneObjectAddPanel.test.tsx` -> 1 file, 23 tests passed.

## Post-fix visual sweep 2026-07-01

- Sweep representatives: 150 unique item visual signatures from 393 item templates.
- Clean screenshots deleted: 113.
- Issue screenshots kept: 37 in `C:\Projects\aurora-web\.codex-tmp\item-visual-sweep\issues`.
- Current post-fix summary: `C:\Projects\aurora-web\.codex-tmp\item-visual-sweep\post-fix-summary.json`.
- Remaining issue list: `C:\Projects\aurora-web\.codex-tmp\item-visual-sweep\remaining-issue-audit.md`.
- Remaining issue data: `C:\Projects\aurora-web\.codex-tmp\item-visual-sweep\remaining-issue-audit.json`.
- Visual eligibility audit: `C:\Projects\aurora-web\.codex-tmp\item-visual-sweep\visual-eligibility-audit.md`.
- Visual eligibility data: `C:\Projects\aurora-web\.codex-tmp\item-visual-sweep\visual-eligibility-audit.json`.
- New browser proof:
  - `C:\Projects\aurora-web\.codex-tmp\item-proof-continue\07-boxer-gloves-empty-source-after-renderer-guard.png`
  - `C:\Projects\aurora-web\.codex-tmp\item-proof-continue\08-boxer-gloves-empty-source-settled.png`

Findings from the 2026-07-01 partial sweep:

- The partial 393-template/150-signature sweep found 37 source-side visual gaps. That result is superseded by the 2026-07-02 full live catalog audit below.
- Renderer guard treats empty item GLBs as `empty-model-icon-fallback` only when a real icon asset exists, or `empty-model-missing-icon` when it does not. The icon fallback loader no longer shows a text placeholder while waiting for a real texture.
- Model naming fix: `it_misc` and `it_smlmis3` are now treated as single-piece item model classes. This corrected issue rows from names like `it_misc_b_206` / `it_smlmis3_b_166` to `it_misc_206` / `it_smlmis3_166`.

## Current remaining item visual work 2026-07-01

- UI state for source-authored no-visual items is implemented: item rows and the Item Inspector now show `Preview unsupported` instead of silently presenting an empty/placeholder preview. Proof screenshot: `C:\Projects\aurora-web\.codex-tmp\item-proof-continue\09-unsupported-item-preview-notice.png`.
- Live runtime proof after controlled host-local backend/frontend startup is now available:
  - `C:\Projects\aurora-web\.codex-tmp\item-proof-continue\10-boxer-gloves-empty-source-model-live.png`
  - `C:\Projects\aurora-web\.codex-tmp\item-proof-continue\11-c-pet-net-preview-unsupported-live.png`
- The visible UI contract gap is closed. Item metadata now carries model asset `sizeBytes`, and the item visual support classifier marks suspicious tiny web GLBs with no real icon as `Preview unavailable`.
- Superseded by full 2026-07-02 audit: `boxer_gloves` is now `ready-model-only` in source coverage (`wlcfg_049`, 4 renderable web model assets, 0 real icon textures), so it is not counted as a current unresolved visual blocker.
- Current unresolved visual list after full 3160-item audit remains source-side: 652 authored invalid-icon/no-renderable-model items (`DefaultIcon=iinvalid_*`) and 1 missing renderable model/icon source (`x3_it_camp`). The web UI labels unsupported/unavailable cases instead of pretending they are renderable.
- Verification:
  - `npm.cmd test -- itemVisualSupport.test.ts itemSceneObjectMapper.test.ts ItemsModePanel.test.tsx ItemsModeRightPanel.test.tsx` -> 4 files, 26 tests passed.
  - `npm.cmd run build` in `frontend` -> passed.

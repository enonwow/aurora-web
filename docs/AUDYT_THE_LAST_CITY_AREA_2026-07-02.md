# Audyt Area: the_last_city / watki / dokumentacja / dekompilacja

Data: 2026-07-02
Repo edytowalne: `C:\Projects\aurora-web`
Reverse/dekompilacja Aurory: `C:\Projects\New Folder`
Snapshot modulu uzywany przez backend: `C:\Users\enonw\Documents\Neverwinter Nights\LC-Decompiled\temp0`
Packed module dla Toolset oracle: `C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city - codex.mod` w dokumentacji; nazwy plikow na dysku uzywaja dlugiej kreski.

## 0. Werdykt

`Area` w `aurora-web` nie jest jeszcze zamknietym parytetem Aurory. Jest w stanie "duzo danych juz wchodzi, ale parytet wizualny i integralnosc modulu nadal sa nieudowodnione".

Najwazniejsze fakty:

1. `the_last_city` w aktualnym loose snapshot ma 169 kompletow `.are/.git/.gic`.
2. Aktualny parser backendu bez bledu policzyl 57,651 obiektow GIT.
3. Stara luka "tylko 5 typow GIT" jest w kodzie w duzej mierze zamknieta: backend czyta 9 typow, repo je dopina, frontend mapuje je do sceny.
4. Nadal brakuje pierwszoklasowo: `module.ifo`, `.gic`, `SpawnPointList`, writer/round-trip i aktualny Toolset-vs-Web screenshot proof po ostatnich zmianach.
5. Dotychczasowe watki pokazaly, ze najwiekszy blad procesu to nie brak patchy, tylko nadmierne uznawanie metryk/testow za parytet wizualny.

Operacyjnie: nastepny krok nie powinien zaczynac sie od kolejnej zmiany renderera. Powinien zaczac sie od proof packetu dla jednego area: surowe ARE/GIT/GIC/module.ifo, Toolset top-down, Web top-down, frame JSON i jawne porownanie.

## 1. Zrodla i rozdzial sciezek

Trzeba trzymac trzy sciezki oddzielnie:

| Rola | Sciezka | Znaczenie |
| --- | --- | --- |
| Editable repo | `C:\Projects\aurora-web` | Tu mozna zmieniac kod. |
| Aurora reverse | `C:\Projects\New Folder` | Decompiler/CSV/strings jako dowod zachowania Aurory. |
| Module loose snapshot | `C:\Users\enonw\Documents\Neverwinter Nights\LC-Decompiled\temp0` | To obecnie czyta backend przez `/host/nwn-docs/LC-Decompiled/temp0`. |
| Toolset oracle | `C:\Users\enonw\Documents\Neverwinter Nights\modules` | Tu lezy packed `the_last_city ... codex.mod`, ktory powinien byc otwierany w Toolsecie. |

`backend/config/runtime-settings.json` ustawia:

- `moduleDecompiledPath`: `/host/nwn-docs/LC-Decompiled/temp0`
- `modulePackedPath`: pusty string
- `sources.area.includeModuleTemp0`: `true`
- `sources.area.includeModulePacked`: `false`
- `sources.area.includeHaks`: `false`
- `sources.area.includeVanilla`: `false`

`docker-compose.yml` mapuje:

- `C:/Users/enonw/Documents/Neverwinter Nights:/host/nwn-docs:ro`
- `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights:/host/nwn-game:ro`

Wniosek: obecny runtime Areas bazuje na loose decompiled snapshot, nie na packed `.mod`. Toolset oracle i backend snapshot moga sie rozjechac, jesli nie potwierdzimy wersji.

## 2. Watki: co juz wiadomo

### 2.1 `019f189f` - glowny dlugi watek Areas

Ten watek wykonalo realna prace, ale wpadl w petle: metryka/test/runtime wyglada lepiej, potem screenshot nadal sie rozjezdza, potem patchowany jest renderer/capture, potem powstaje kolejna niejednoznacznosc.

Potwierdzone efekty:

- parser/repo/frontend zostaly rozszerzone na 9 typow GIT;
- `enon_bakery` stalo sie glownym malym barometrem wizualnego parytetu;
- powstaly capture scripts i artefakty porownawcze;
- runtime pokazywal poprawy w diagnostyce, ale nie zamknal parytetu screenshotowego.

Otwarte problemy z tego watku:

- zbyt czeste "global fix" bez swiezego Toolset oracle;
- Bakery byla uzywana jako dowod zbyt szeroki dla calego `Area`;
- zmieniano jednoczesnie render semantics i proof infra;
- tekstury/materialy i tile orientation pozostaly watpliwe;
- `module.ifo`, `.gic`, `SpawnPointList` i writer/round-trip pozostaly poza parytetem.

### 2.2 `019f225c` - audyt watku i przejecie pracy

Ten watek jest korekta procesu. Najwazniejsza regula: Aurora first.

Praktycznie oznacza to:

1. najpierw otworzyc lokalizacje w oryginalnym Toolsecie;
2. zrobic top-down screenshot;
3. dopiero potem porownywac Web;
4. nie patchowac renderera bez oracle dla tego konkretnego area.

Ten watek takze zapisal raport `docs/AUDYT_WATKU_019f189f_AREAS_DEKOMPILACJA_2026-07-02.md`, ktory trafnie rozdziela realny postep od niezamknietego parytetu.

### 2.3 Watki factory Areas `019ed47a...`

Factory/heartbeat watki przyniosly realne elementy:

- source/render tile contract;
- placeable/door metadata lookup;
- bounded payload queues;
- camera frame i runtime snapshoty;
- diagnostyka loading/asset readiness;
- dokumenty kontekstowe w `backend/docs/aurora-reverse/areas-context-pack.md` i `areas-loop-state.json`.

Jednoczesnie `areas-loop-state.json` nadal pokazuje blokery:

- brak finalnego browser visual verification dla czesci slice;
- `_IKEA` nadal potrzebuje swiezego runtime capture po normalizacji cache/modeli;
- tile GLB/material binding i door DWK/WOK pozostaly niezamkniete;
- pelny retail/Toolset parity nie zostal udowodniony.

### 2.4 Watki camera parity `019ef91d` i `019f0481`

Najwazniejszy wniosek: Area camera powinna zachowywac sie 1:1 z Placeables camera, poza framing slack dla rozmiaru area. Nie nalezy wymyslac osobnej filozofii sterowania Area, bo wtedy screenshoty i proof zaczynaja mierzyc inny widok niz oracle.

### 2.5 `019f0de5` - cienie i swiatlo

Ten watek jest istotny dla Area, bo dekompilacja wskazuje pola i zachowanie dotyczace:

- `ShadowOpacity`;
- `Sun*` i `Moon*`;
- `Tile_MainLight1`, `Tile_MainLight2`;
- `Tile_SrcLight1`, `Tile_SrcLight2`;
- przelacznik Toolset `Use Area Lighting`.

To jest osobna warstwa parytetu. Geometria moze byc "na miejscu", a obraz nadal nie bedzie Toolset-like bez swiatel, cieni, fog/sky i tile lights.

### 2.6 Watki Toolset/live proof

Uzyteczne ustalenia:

- nie przejmowac globalnie kursora;
- kontrolowac Toolset przez targetowane akcje/Win32, gdy to mozliwe;
- poprawny modul ma tytul zawierajacy `the_last_city` i `codex.mod`;
- readiness state jest w `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-current-window-state.json`;
- dla area `_ikea` aktywny viewer to `TfrmViewerArea`.

## 3. Dokumentacja lokalna

### 3.1 `docs/AUDYT_AREAS_FULL_2026-06-30.md`

Ten audyt jest starszy, ale nadal bardzo wazny. Czesciowo sie zestarzal, bo obecny kod ma juz 9 typow GIT, natomiast jego glowne ostrze pozostaje aktualne:

- `module.ifo` ma byc autorytatywnym zrodlem listy areas;
- `.gic` jest czescia integralnosci area;
- `SpawnPointList` nie moze znikac przy Encounter;
- ARE root fields i tile fields musza byc preserve/round-trip aware;
- writer/export bez `.gic` i `module.ifo` nie bedzie Toolset-parity.

### 3.2 `docs/AUDYT_WATKU_019f189f_AREAS_DEKOMPILACJA_2026-07-02.md`

Ten dokument jest najlepszym stanem procesu: przyznaje realny postep, ale nie pozwala uznac go za zamkniecie Areas. Jego najwazniejsza regula jest nadal aktualna: nie zmieniac semantyki renderera lub capture, dopoki nie ma proof packetu dla wybranego area.

### 3.3 `docs/AUDYT_AREA_RENDER.md`

Ten dokument pokazuje historie blednej hipotezy o dzieleniu GIT coordinates przez 10. Finalny wniosek: source coordinates sa juz w tile units. Aktualny kod idzie dalej:

- object X: `areaWidth - sourceX`;
- object Z: `sourceY`;
- offset X: `-sourceOffsetX`;
- offset Z: `sourceOffsetY`;
- yaw: `sourceYaw`;
- tile center: `col + 0.5`, `row + 0.5`;
- tile model/image orientation: `normalize(-sourceOrientation)`.

To trzeba traktowac jako aktualna implementacje, nie jako udowodniony parytet. Stare notatki i aktualny kod sa miejscami w napieciu, wiec rozstrzyga tylko porownanie Toolset/Web.

### 3.4 `docs/AUDYT_AREA_BUGS.md`

Ten dokument wskazuje ryzyka parsera:

- DWORD powinien byc unsigned (`>>> 0`), nie signed (`| 0`);
- Wizard known spells class 10 nadal jest wazna lekcja dla GFF;
- bounds dla area dimensions sa niespojne;
- classic NWN 1.69 czesto wymaga CP-1252/TLK awareness, nie prostego UTF-8;
- row/col i tile grid nie moga byc zgadywane z samego width.

### 3.5 `backend/docs/aurora-reverse/areas-context-pack.md`

To jest kontekst factory. Dobry do poznania stanu tile/door/model contracts, ale nie wystarcza jako dowod parytetu. Zawiera wiele "readiness" i "contract" elementow, ktore musza byc zakonczone runtime screenshotem.

### 3.6 `backend/docs/aurora-reverse/areas-toolset-oracle-controls.md`

To jest instrukcja dla Toolset oracle. Ma byc uzywana przed kazdym porownaniem wizualnym Area:

- uruchom Toolset;
- otworz `the_last_city ... codex.mod`;
- wybierz target area;
- przejdz do top-down/stabilnego widoku;
- zapisz screenshot i state;
- dopiero potem odpal Web capture.

## 4. Dekompilacja Aurory: kotwice Area

W `C:\Projects\New Folder\export\strings.tsv`, `area.csv`, `are.csv`, `git.csv`, `module.csv` znalezione sa kotwice potwierdzajace, ze Aurora traktuje Area szerzej niz obecny viewer:

### 4.1 Module authority

Znalezione stringi:

- `Mod_Area_list`;
- `Area_Name`;
- `Mod_Entry_Area`.

Wniosek: poprawna lista areas powinna byc powiazana z `module.ifo`, a skan `.are` jest tylko fallbackiem/diagnostyka.

### 4.2 GIT object lists

Znalezione stringi:

- `Encounter List`;
- `StoreList`;
- `TriggerList`;
- `WaypointList`;
- `SpawnPointList`.

Wniosek: obecny parser dobrze, ze czyta Encounter/Store/Trigger/Waypoint, ale `SpawnPointList` nadal jest osobna luka parytetu.

### 4.3 Area UI/Toolset actions

Znalezione kotwice:

- `TArea`;
- `TAreaData`;
- `TAreaTile`;
- `TAreaInstanceData`;
- `TAreaGroup`;
- `TdlgAreaProperties`;
- `TdlgAreaWizard`;
- `TdlgAreaTransition`;
- `TfrmAreaResize`;
- `TfrmViewerArea`;
- `actAreaResizeExecute`;
- `actAreaRotateExecute`;
- `actVerifyAreaExecute`;
- `actShowAreaStatsExecute`;
- `actAreaExportExecute`;
- `actAreaImportExecute`;
- `Show Spawnpoint Markers`;
- `Use Area Lighting`.

Wniosek: Area w Toolsecie to nie tylko render, ale takze resize/rotate/verify/import/export, properties, transitions, spawnpoint markers i lighting controls.

### 4.4 Lighting/tile fields

Znalezione kotwice:

- `ShadowOpacity`;
- `Tile_MainLight1`;
- `Tile_MainLight2`;
- `Tile_SrcLight1`;
- `Tile_SrcLight2`.

Wniosek: renderer Area musi miec oddzielny checkpoint dla oswietlenia. Bez tego screenshot moze byc geometrycznie poprawny, ale wizualnie nadal nie-Aurorowy.

## 5. the_last_city: profil danych Area

Policzone przez aktualny backend parser na `C:\Users\enonw\Documents\Neverwinter Nights\LC-Decompiled\temp0`.

### 5.1 Komplet plikow

| Typ | Liczba |
| --- | ---: |
| `.are` | 169 |
| `.git` | 169 |
| `.gic` | 169 |

To jest wazne: `.gic` istnieje dla kazdego area w snapshot, ale kod Areas nie ma go jako first-class component.

### 5.2 Aggregate GIT objects

| Kind | Count |
| --- | ---: |
| placeables | 53,595 |
| doors | 668 |
| creatures | 184 |
| encounters | 0 |
| items | 180 |
| sounds | 578 |
| stores | 6 |
| triggers | 217 |
| waypoints | 2,223 |
| total | 57,651 |

Wniosek: w tym module `Area` jest glownie problemem placeables + tile/material/render, nie tylko GFF enumeration.

### 5.3 Najciezsze area po obiektach

| Area | Size | Tileset | Tiles | Objects | Najwazniejszy sklad |
| --- | ---: | --- | ---: | ---: | --- |
| `wvv_crypt_1` | 24x16 | `tdc01` | 384 | 3,106 | 2,890 placeables, 43 doors, 142 waypoints |
| `wnd_citycentral` | 13x13 | `tcm01` | 169 | 1,627 | 1,609 placeables |
| `wnd_sewers_ship` | 29x15 | `tdx01` | 435 | 1,591 | 1,383 placeables, 162 waypoints |
| `wnd_shipyard` | 15x12 | `tcm01` | 180 | 1,532 | 1,476 placeables, 28 doors |
| `wnd_shipyard_mag` | 15x29 | `tdx01` | 435 | 1,502 | 1,362 placeables |
| `wnd_hospital` | 8x8 | `sic11` | 64 | 1,501 | 1,474 placeables |
| `_ikea` | 16x16 | `tcm01` | 256 | 1,136 | 1,136 placeables |

### 5.4 Targety robocze

| Area | Po co uzywac |
| --- | --- |
| `enon_bakery` | Maly parytet wizualny: 4x4, `sic11`, 197 obiektow, latwy Toolset/Web compare. |
| `_ikea` | Stress test placeables i runtime/load: 16x16, 1,136 placeables. |
| `mtt_ikea_v2` | Alternatywny stress target: 16x16, 981 placeables. |
| `wvv_crypt_1` | Najciezszy GIT target: 3,106 obiektow, drzwi, dzwieki, waypointy. |
| `wnd_citycentral` | Ciezki city/tcm01 target: 1,627 obiektow. |

Nie wolno uogolniac wyniku z `enon_bakery` na `_ikea` albo `wvv_crypt_1`. Bakery jest bramka wizualna, nie pelny certyfikat modulu.

## 6. Aktualny kod Areas

### 6.1 Co jest juz realnie w kodzie

Backend parser:

- `backend/src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser.ts`
- `parseAreaObjectsFromGitGff` czyta:
  - `placeablelist`;
  - `doorlist`;
  - `creaturelist`;
  - `encounterlist`;
  - `itemlist`/`list`;
  - `soundlist`;
  - `storelist`;
  - `triggerlist`;
  - `waypointlist`.

Backend repository:

- `backend/src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository.ts`
- `buildAreaObjects` dopina wszystkie 9 typow do `AreaRecord.objects`.

Frontend mapper:

- `frontend/src/modules/areas/application/areaSceneMapper.ts`
- `BACKEND_KIND_TO_SCENE_KIND` mapuje wszystkie 9 typow na scene kinds.

Render coordinates:

- `frontend/src/modules/layout/adapters/three/workspaceAreaRenderCoordinates.ts`
- obecnie robi X mirror dla obiektow, nie mirroruje tile center, i odwraca orientation tile przez `-sourceOrientation`.

### 6.2 Co jest tylko czesciowe

Frontend ma template lookup tylko dla:

- `placeables`;
- `doors`;
- `items`.

Nowe typy GIT sa mapowane do sceny, ale nie oznacza to pelnego Toolset-like renderu/inspektora dla kazdego typu. Triggery, waypointy, stores, sounds i encounters musza miec osobne decyzje UI/render/properties, inaczej sa "dane w scenie", nie parytet Toolset.

### 6.3 Co nadal nie istnieje first-class

Narrow source grep w Areas nie znalazl rzeczywistego wsparcia dla:

- `module.ifo`;
- `Mod_Area_list`;
- `Area_Name`;
- `Mod_Entry_Area`;
- `.gic`;
- `SpawnPointList`.

To nie znaczy, ze zadne dokumenty o tym nie istnieja. Znaczy, ze aktualny kod runtime Areas nadal nie ma tego jako normalnego komponentu domeny.

## 7. Najwieksze ryzyka

### 7.1 Parytet wizualny jest nadal nieudowodniony

Najwieksza luka to nadal: Toolset top-down vs Web top-down dla konkretnego area. Bez tego nie da sie rozstrzygnac, czy zle sa:

- coordinate transform;
- tile orientation;
- tile model/crop/void model;
- material/texture lookup;
- placeable model lookup;
- lighting/fog/sky;
- camera framing.

### 7.2 Renderer ma zbyt duzo hipotez bez oracle

Aktualna transformacja (`areaWidth - sourceX`, `-sourceOrientation`) moze byc poprawna albo kompensowac inny blad. Trzeba ja zatwierdzac screenshotem, nie intuicja.

### 7.3 `module.ifo` brak jako authority

Skan 169 `.are` dziala teraz, bo snapshot jest ladny i kompletny. Ale Aurora/Toolset ma modulowa liste areas i entry area w `module.ifo`. Bez tego UI moze pokazac inna kolejnosc, brakowac start location, lub nie wykrywac rozjazdow snapshotu.

### 7.4 `.gic` brak jako preservation

Skoro snapshot ma 169 `.gic`, a runtime go ignoruje, round-trip/export nie moze byc uczciwie nazwany Toolset-parity.

### 7.5 Brak `SpawnPointList`

W `the_last_city` aktualny parse zwrocil 0 encounters, wiec to nie jest najpilniejszy widoczny blocker dla Bakery/IKEA. Ale dekompilacja potwierdza `SpawnPointList`, wiec domenowo to nadal luka.

### 7.6 `_ikea` nie jest pierwszym dobrym targetem parytetu

`_ikea` jest bardzo dobry do stress/load, ale zly jako pierwszy dowod parytetu, bo ma 1,136 placeables. Jedna zla tekstura, model cache albo culling potrafi zamazac pierwotna przyczyne.

## 8. Zalecana kolejnosc prac

### Krok 1: proof packet dla `enon_bakery`

Wygenerowac jeden katalog artefaktow, np.:

`backend/docs/aurora-reverse/artifacts/areas-runtime-capture/enon_bakery-proof-YYYYMMDDTHHMMSSZ/`

Minimalna zawartosc:

- `raw.are.summary.json`;
- `raw.git.summary.json`;
- `raw.gic.status.json`;
- `module-ifo-area-entry.json` albo `not-parsed-yet.json`;
- `objects.csv`;
- `tiles.csv`;
- `toolset-topdown.png`;
- `web-topdown.png`;
- `web-frame.json`;
- `comparison.json`;
- `verdict.md`.

Acceptance:

- screenshot Toolset istnieje i jest dla tego samego area;
- screenshot Web istnieje i jest dla tej samej kamery/top-down;
- porownanie opisuje roznice: tile placement, object placement, texture/material, lighting, camera.

### Krok 2: zamrozic renderer na czas diagnozy

Do czasu proof packetu nie zmieniac semantyki:

- `workspaceTerrainMesh.ts`;
- `workspaceObjectMeshLayer.ts`;
- `WorkspaceCanvasViewport.tsx`;
- `workspaceAreaRenderCoordinates.ts`;
- capture scriptow, jesli zmiana utrudnia porownanie.

### Krok 3: `module.ifo` diagnostics

Dodac parser/diagnostyke:

- `Mod_Area_list`;
- `Area_Name`;
- `Mod_Entry_Area`;
- entry position/direction;
- porownanie z plikami `.are/.git/.gic`.

Acceptance:

- lista 169 areas jest pokazana jako `module.ifo` vs filesystem;
- brak/extra resource ma jawna diagnostyke;
- start area jest widoczny w API lub debug payload.

### Krok 4: `.gic` parse/preserve

Najpierw wystarczy jawnie:

- wykryc `.gic`;
- hashowac;
- pokazac status w payload/proof packet;
- zachowac passthrough.

Pelny parser komentarzy moze byc pozniej, ale ignorowanie pliku musi sie skonczyc.

### Krok 5: `SpawnPointList`

Dodac jako sidecar do encounters. Nawet jesli aktualny `the_last_city` parse ma 0 encounters, dekompilacja potwierdza pole i Toolset ma "Show Spawnpoint Markers".

### Krok 6: dopiero potem poprawki renderu

Po proof packet wybrac jedna rozbieznosc:

- geometry;
- texture/material;
- tile orientation;
- camera;
- lighting.

Naprawiac tylko te jedna warstwe i od razu recapture.

### Krok 7: `_ikea` i ciezkie area

Dopiero po Bakery:

- `_ikea` jako load/placeable stress;
- `mtt_ikea_v2` jako alternatywa;
- `wvv_crypt_1` jako najciezszy multi-kind proof;
- `wnd_citycentral` jako city/tcm01 proof.

## 9. Konkluzja

Aktualny stan Areas jest lepszy niz stare audyty z 2026-06-30 sugeruja w warstwie GIT object list: 9 typow jest juz w kodzie i parse `the_last_city` dziala bez bledow dla 169 areas.

Ale to nadal nie jest Area parity. Prawdziwe braki sa teraz wyzej:

- autorytet modulu (`module.ifo`);
- integralnosc area (`.are/.git/.gic`);
- widzialny Toolset/Web parytet;
- oswietlenie i materialy;
- writer/round-trip.

Najkrotsza uczciwa sciezka: `enon_bakery` proof packet, potem `module.ifo` + `.gic` diagnostics, potem jedna warstwa renderu naraz. Bez tego kolejny patch renderera bedzie tylko kolejnym ruchem w tej samej mgle.

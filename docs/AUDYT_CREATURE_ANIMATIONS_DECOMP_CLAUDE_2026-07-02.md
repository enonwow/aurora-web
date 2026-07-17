# Audyt Creature Animations: Aurora decomp + projekty Claude

Data: 2026-07-02  
Zakres: dlaczego animacje creature w aurora-web nadal moga dzialac niepoprawnie.

## Status

Ten audyt laczy trzy zrodla:

- Aurora decomp w `C:\Projects\New Folder`.
- Implementacje w `C:\Projects\aurora-web`.
- Projekty referencyjne w `C:\Projects\Claude`.

`C:\Projects\Clause` nie istnieje lokalnie. Istnieje `C:\Projects\Claude`.

## Najwazniejszy wniosek

Aktualny stan po poprawkach z 2026-07-02:

1. Wybrane animacje creature nie sa juz oceniane po samym `playing`. Proof-runner potrafi deterministycznie probkowac canvas runtime w czasie `0.0/0.2/0.5/0.9s` i kazda klatka ma hash oraz status hooka.
2. Reprezentatywne przypadki pokazuja realna zmiane pozy: direct/supermodel creature (`nw_bathorror`), multipart humanoid (`nw_halfcel001`), direct animal/monster (`c_kocrachn`, `nw_raven`).
3. `animroot` i `setanimationscale` nie sa juz tylko pozycjami z audytu: aktualny kod przenosi `animRoot` przez source-animation contract i skaluje `positionKeys` dla direct source clips.
4. Inspector nie powinien juz nazywac wybranej animacji multipart `safe pose`; runtime odtwarza anchored multipart playback.

To nadal nie jest 110% zgodnosci z Aurora runtime. Pozostale roznice:

1. Creature `AnimationState` nadal nie mapuje sie na clip/action, ale inspector i runtime oznaczaja to jawnie jako `unmapped` albo `overridden by animation`.
2. Nasz runtime ma `AnimRun-lite` nad `THREE.AnimationMixer` dla loop/once, transition metadata i event telemetry, ale nie jest pelna lista `AnimRun` Aurory z pelnym crossfade/stackiem akcji.
3. Track filtering usuwa brakujace targety, co ukrywa czesc awarii i moze zamienic animacje w czesciowy ruch.
4. Part-based humanoid/equipment assembly nadal wymaga oracle przeciw Aurorze: moze wygladac ruchowo poprawnie, ale attachment/driver skeleton/weapon parts musza byc sprawdzane osobno.
5. Nie ma jeszcze pelnego sweepu 1693 creature template z motion metrics; sa reprezentatywne proofy.

## Proof po poprawkach

### `cdp-proof-2026-07-02-ui-label-final-hook-kocrachn-raven`

Katalog:

`C:\Projects\aurora-web\frontend\public\aurora-evidence\creatures\cdp-proof-2026-07-02-ui-label-final-hook-kocrachn-raven`

Modele:

- `c_kocrachn`, clip `ca1slashl`: MP4 `47413` bajtow, `videoStartPlayback=playing`, `issues=''`, `suppressedTracks=''`, `uniqueFrameHashes=4/4`, `frameModes=proof-runtime-hook`.
- `nw_raven`, clip `ca1slashl`: MP4 `48132` bajtow, `videoStartPlayback=playing`, `issues=''`, `suppressedTracks=''`, `uniqueFrameHashes=4/4`, `frameModes=proof-runtime-hook`.

### `cdp-proof-2026-07-02-ui-label-final-hook-halfcel-bathorror`

Katalog:

`C:\Projects\aurora-web\frontend\public\aurora-evidence\creatures\cdp-proof-2026-07-02-ui-label-final-hook-halfcel-bathorror`

Modele:

- `nw_halfcel001`, clip `1hslashl`: MP4 `55098` bajtow, `videoStartPlayback=playing`, `issues=''`, `suppressedTracks=''`, `uniqueFrameHashes=4/4`, `frameModes=proof-runtime-hook`.
- `nw_bathorror`, clip `1hslashl`: MP4 `75069` bajtow, `videoStartPlayback=playing`, `issues=''`, `suppressedTracks=''`, `uniqueFrameHashes=4/4`, `frameModes=proof-runtime-hook`.

Wazne: starsze Page screenshots nie byly wiarygodnym dowodem ruchu, bo mogly lapac overlay `Loading render payload`. Aktualny proof uzywa canvas-only runtime hooka i failuje probkowanie klatek, jezeli status zawiera issue.

## Aurora decomp: potwierdzenia

### Toolset panel nie jest pelnym runtime gry

`C:\Projects\New Folder\export\decompiled_all.c:840994` (`@TAuroraPanel@AuroraAnimate`) robi krok renderu panelu: viewport, scena, render, swap buffers. To nie jest kompletna logika combat/action creature.

Wniosek: decomp Toolsetu daje parser/preview/rendering semantics, ale nie pelna tabele akcji gry.

### Parser MDL rejestruje kluczowe komendy

`C:\Projects\New Folder\export\decompiled_all.c:881733` rozpoznaje:

- `setsupermodel`
- `setanimationscale`
- `classification`
- `newmodel`
- `newanim`
- `beginmodelgeom`
- `donemodel`

`C:\Projects\New Folder\export\decompiled_all.c:881821` rejestruje handler `newanim`, a `:881827` i `:881828` rejestruja `setsupermodel` i `setanimationscale`.

### Blok animacji ma length, event, transtime, animroot

`C:\Projects\New Folder\export\decompiled_all.c:886382` i dalej:

- czyta `animlength`/`length`,
- zbiera `event`,
- sortuje eventy po czasie,
- czyta `transtime`,
- czyta `animroot` do struktury animacji,
- dopiero potem parsuje node/controller keys.

Wniosek: `animroot` i `transtime` nie sa komentarzem. To czesc modelu animacji.

### Runtime Aurory ma liste AnimRun, nie proste "play clip"

`C:\Projects\New Folder\export\decompiled_all.c:845926` (`FUN_00a1baa8`) aktualizuje aktywne animacje:

- przechodzi po liscie aktywnych animacji,
- aktualizuje czas przez delta,
- zawija czas dla loop,
- obsluguje poczatek/koniec animacji,
- uzywa fade/crossfade value,
- wywoluje aplikacje animacji na wezly,
- odpala eventy animacji po przekroczeniu czasu.

`C:\Projects\New Folder\export\decompiled_all.c:844151` (`FUN_00a18254`) szuka animacji po nazwie w modelu i supermodel chain, z fallbackiem do `default`.

`C:\Projects\New Folder\export\decompiled_all.c:844407` (`FUN_00a186fc`) odpala eventy z przedzialu czasu, rowniez przy wrap/loop.

Wniosek: status `playing` w Three.js nie oznacza jeszcze zgodnosci z Aurora `AnimRun`.

## aurora-web: status roznic

### 1. `animroot` - zaadresowane w kontrakcie, nadal w regresji

Aktualny kod czyta `animroot` z ASCII i binary MDL, przenosi je w source animation metadata i przy budowie source clipow mapuje track root modelu na `animRoot`, jezeli taki node istnieje w scenie.

Dowody kodowe:

- `backend/src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter.ts` ma `animRoot?: string` w `AuroraSourceAnimationSummary`.
- `parseSourceAnimationBlock` obsluguje linie `animroot`.
- `parseBinarySourceAnimations` czyta `BINARY_ANIMATION_ANIMROOT_OFFSET`, a fallbackiem jest nazwa root node animacji.
- `frontend/src/modules/placeables/adapters/three/placeableThreeAssetLoader.ts` zapisuje `auroraMdlSourceAnimationRoot` i retargetuje model-root track na `animRoot`.
- Test `retargets source animation model-root tracks to animroot and scales positions` blokuje regresje.

Ryzyko pozostaje w danych: skan w `.codex-tmp\module-blob-mirror\modules\current\__aurora\sources` wskazywal 74 pliki `.mdl` z `animroot`, w tym creature-like/animal/supermodel. Te modele musza zostac w stalej macierzy regresji.

### 2. `setanimationscale` - zaadresowane dla direct source clips, nadal wymaga macierzy danych

Aktualny kod przenosi `animationScale` i skaluje `positionKeys` przy budowie source clipow. Dla animacji odziedziczonych skala jest zapisana na animacji, co odpowiada podejsciu z `borealis_nwn_mdl`: animacja niesie skale modelu-wlasciciela.

Dowody kodowe:

- ASCII i binary converter przekazuja `animationScale` do `sourceAnimations`.
- `buildAuroraSourceAnimationClips` mnozy pozycje przez `resolveAuroraSourceAnimationScale(scene, animation)`.
- `buildAuroraSupermodelAnimationClips` skaluje position tracks przy retargetowaniu supermodelu.
- Test `retargets source animation model-root tracks to animroot and scales positions` potwierdza wartosc skali na trackach i metadata.

Modele z realnym non-1 scale nadal powinny byc w macierzy: `rothe_a`, `c_bearblck`, `c_cat_lion`, `c_cat_crag`, `c_hobwiz`, `c_drgblack66`, `a_fa`.

### 3. Creature `AnimationState` jest jawnie niemapowany

Creature mapper czyta `animationState` i `animationName`:

- `frontend/src/modules/creatures/application/creatureSceneObjectMapper.ts:714`
- `frontend/src/modules/creatures/application/creatureSceneObjectMapper.ts:715`

Renderer zapisuje `creatureAnimationState` jako userData:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:579`
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:735`

Wybor clipa creature uzywa tylko `advancedSettings.animationName`:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:8255`

Dla porownania placeables maja mapowanie `AnimationState -> default/open/close/dead/on/off`:

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts:11703`

Skutek: creature z samym `AnimationState` nie odpali aurorowego stanu. Aktualny runtime zapisuje status `unmapped`, a inspector pokazuje `state mapping: unmapped`. Gdy istnieje jawne `animationName`, inspector pokazuje `overridden by animation`. Nadal potrzebna jest osobna mapa creature/action/stance, jesli chcemy rzeczywista zgodnosc z Aurora action state.

### 4. `AnimRun-lite` istnieje, ale nie jest pelnym `AnimRun` Aurory

`frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts` tworzy `THREE.AnimationMixer`, ale nie jest juz tylko prostym `play clip`:

- czyta loop mode (`loop`/`once`) z metadata clipa,
- ustawia `THREE.LoopOnce` z `clampWhenFinished` albo `LoopRepeat`,
- przenosi `transitionSeconds`,
- zapisuje `creatureAnimationPlaybackAnimRunMode: "aurora-lite"`,
- liczy eventy z clip metadata i oznacza eventy przetworzone,
- zapisuje completed action names.

Nadal nie ma pelnego odpowiednika:

- pelnego stacku wielu `AnimRun`,
- aurorowego priority/transition stack,
- pelnego fade/crossfade miedzy kolejnymi action states,
- per-action time scale/weight,
- default animation lookup z model/supermodel chain,
- konca animacji z usunieciem/odpaleniem nastepnej.

Skutek: proste loop/idle/slash proofy moga wygladac poprawnie, ale combat/cast/death/transition nadal nie sa pelna semantyka Aurory.

### 5. Missing target filter ukrywa awarie

`frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:7986` usuwa tracki, ktorych target node nie istnieje.

To daje stabilny runtime, ale:

- clip moze zostac czesciowo pusty,
- `playbackStatus: playing` nadal bedzie prawdziwy,
- MP4 moze pokazac brak realnego ruchu albo ruch tylko czesci ciala.

Wniosek: kazdy proof animacji musi zawierac screenshot/MP4 i pixel-motion/contact-sheet, nie tylko actionNames.

### 6. Root motion jest przyblizeniem

Direct supermodel retarget w creature wlacza:

- `suppressRootDummyPositionTracks: true`
- `suppressRootPositionTracks: true`

Wlasne source-skinning root motion jest neutralizowane heurystycznie:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:8197`
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:13630`

To jest OK dla statycznego preview, ale nie jest pelna semantyka gry. Walk/run beda wygladac inaczej niz runtime, bo Aurora rozdziela local pose od movement/controller.

### 7. Part-based humanoids i equipment nadal sa ryzykowne

`workspaceObjectMeshLayer.ts` sklada:

- direct model,
- skeleton,
- part models,
- equipment models,
- source-anchor skeleton fallback,
- supermodel retarget clips.

Ten system moze powodowac powielenia widocznej geometrii, jesli driver skeleton/anchor/source geometry nie zostanie konsekwentnie ukryty albo jesli companion geometry dostaje retarget z duplikatami nazw.

Miejsca ryzyka:

- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:12418`
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:13495`
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:13630`

To tlumaczy starszy problem ze screenem: jezeli widac dodatkowe glowy/body/partie, to screenshot jest zly nie dlatego, ze clip nie istnieje, tylko dlatego, ze renderuje sie wiecej niz jedna hierarchia/part lub zly driver.

## Projekty Claude: co jest przydatne

### `borealis_nwn_mdl`

Najbardziej uzyteczne zrodlo referencyjne.

`C:\Projects\Claude\borealis_nwn_mdl\include\borealis\nwn\mdl\Animation.hpp`:

- `Animation` ma `transitionTime`, `animRoot`, `events`, `animationScale`.
- Komentarz mowi, ze `animationScale` jest przechwytywany z modelu-wlasciciela, aby animacje dziedziczone z supermodelu zachowaly swoja skale.

`C:\Projects\Claude\borealis_nwn_mdl\src\AsciiParser.cpp`:

- parsuje `setanimationscale`,
- parsuje `transtime`,
- parsuje `animroot`,
- parsuje `event`,
- stempluje animacje `anim.animationScale = model.animationScale`.

`C:\Projects\Claude\borealis_nwn_mdl\src\AnimationPlayer.cpp`:

- przy odtwarzaniu znajduje `animRoot` w modelu,
- aplikuje animacje do poddrzewa,
- mnozy `transform.position` przez `m_CurrentAnim->animationScale`.

`C:\Projects\Claude\borealis_nwn_mdl\src\Loader.cpp`:

- rekurencyjnie laduje supermodel chain,
- mergeuje brakujace wezly,
- dodaje animacje z supermodelu tylko jesli nie ma konfliktu nazw.

### `nwn_mdl_webviewer`

Uzyteczny jako prostszy webowy odpowiednik.

`C:\Projects\Claude\nwn_mdl_webviewer\js\loader.js`:

- lower-case map nazw node dla case-insensitive remap,
- mapuje root supermodelu na root main modelu,
- skaluje `posKeys` przez `animationScale`,
- adoptuje animacje z supermodelu skeletonu po zlozeniu part modelu.

`C:\Projects\Claude\nwn_mdl_webviewer\js\animation.js`:

- ma wlasny keyframe player,
- aplikuje position/orientation/scale/alpha/light/animmesh,
- resetuje rest pose po supermodel merge.

### `Radoub`

Potwierdza creature-part assembly direction.

`C:\Projects\Claude\Radoub\Quartermaster\Quartermaster\Services\ModelService.cs`:

- creature dziedziczy animacje z supermodel chain.

`C:\Projects\Claude\Radoub\Radoub.UI\Radoub.UI\Services\MdlPartComposer.cs`:

- composite creature dziedziczy animation list ze skeletonu.
- composite uzywa skeleton bone hierarchy jako root, zeby lookup animacji znalazl bone names.

`C:\Projects\Claude\Radoub\Radoub.UI\Radoub.UI\Services\MdlPartBoneMap.cs`:

- jawna mapa part type -> bone name (`head -> head_g`, `chest -> torso_g`, itd.).

## Lista problemow i status

## Dlaczego modele zostaja/powielaja sie

Aktualny `rebuildObjectMeshes()` czysci caly `objectLayer` na starcie przez `clearObjectLayer(runtime)`, a `clearObjectLayer()` zatrzymuje animacje, dispose'uje geometrie/materialy i robi `runtime.objectMeshById.clear()`. To oznacza, ze klasyczny przeciek "stary root zostal w scenie po zmianie obiektu" nie jest obecnie najbardziej prawdopodobna przyczyna.

Najbardziej prawdopodobne przyczyny widocznego efektu "modele zostaja" sa wewnatrz jednego aktualnego creature root:

1. **Driver skeleton/source geometry zostaje renderowalna.** Part-based humanoid potrzebuje skeletonu jako drivera animacji, ale jego mesh/placeholder/source geometry musi byc konsekwentnie ukryta. Jesli `visibleSkeletonMeshCount > 0`, widac dodatkowe cialo/glowe albo fragmenty.
2. **Fallback primitive lub placeholder nie znika po doladowaniu modelu.** Kod usuwa `primitiveFallbackMesh` po udanym loadzie, ale trzeba to egzekwowac w proof-runnerze przez `rootChildCount` i visible mesh diagnostics.
3. **PartGroup + source/companion geometry sa jednoczesnie widoczne.** Runtime sklada `partGroup`, skeleton/source-anchor nodes i czasem companion/source hierarchy. Jesli geometrii nie oznaczono jako render-suppressed, animacja wyglada jak duplikat modelu.
4. **Equipment/weapon jest skladany z wielu partow i moze wygladac jak duplikat.** NWN weapon models skladaja sie z blade/middle/top; to nie zawsze jest blad. Blad jest wtedy, gdy kilka pelnych weapon/root group zostaje pod tym samym anchorem albo fallback marker zostaje razem z finalnym modelem.
5. **Retarget do duplikatow nazw node'ow moze poruszyc zly obiekt.** Filtr parent/uuid ogranicza ten blad, ale pelny sweep powinien dalej lapac przypadki, gdzie source/skeleton/part maja te same nazwy i ruch trafia do widocznej geometrii, ktora miala byc driverem.
6. **Proof page screenshot moze mylic UI/loading overlay z modelem.** Dlatego aktualny proof powinien uzywac canvas-only hooka, a page screenshot traktowac tylko jako dowod stanu UI.

Diagnostyka, ktora powinna byc wymagana przy kazdym takim przypadku:

- `creatureRenderLoadedModelVisibleSkeletonMeshCount` albo rownowazne visible skeleton diagnostics musi byc `0`.
- `creatureRenderLoadedModelRenderSuppressedMeshCount` i nazwy suppressed mesh musza byc zapisane.
- `rootChildCount` nie moze rosnac po kolejnych zmianach animacji/modelu.
- `creatureAnimationMixerSuppressedMissingTargetTrackCounts` musi byc puste/zero.
- Proof musi miec canvas-only frame samples z unikalnymi hashami i bez `loading_overlay_visible`.

### Zamkniete: `animroot` source-animation path

Zakres zamkniety:

- backend source animation type ma `animRoot?: string`.
- ASCII parser czyta `animroot`.
- binary parser zachowuje `animRoot` z naglowka animacji albo root node.
- frontend source clip metadata przenosi `auroraMdlSourceAnimationRoot`.
- model-root track jest mapowany na `animRoot`, gdy root istnieje w scenie.
- test pokrywa przypadek root modelu `pfa0` -> `rootdummy`.

Do regresji danych zostaja modele z `animroot` innym niz model name.

### Zamkniete: `animationScale` dla direct source clips

Zakres zamkniety:

- source animation jest stemplowana skala modelu-wlasciciela.
- `buildAuroraSourceAnimationClips` skaluje position tracks.
- `buildAuroraSupermodelAnimationClips` nadal skaluje position tracks po retargetowaniu.
- test pokrywa `animationScale: 2` i metadata clipa.

Do regresji danych zostaja modele z realnym non-1 scale: `rothe_a`, `c_bearblck`, `c_cat_crag`, `c_drgblack66`, `a_fa`.

### P0: pokazac w UI/proof, kiedy clip jest czesciowo wyciety

Zakres:

- jezeli `filterCreatureAnimationClipsForExistingPlaybackNodes` usuwa tracki, inspector ma pokazac warning jako blad animacji, nie tylko userData.
- proof runner ma failowac, gdy selected clip po filtrze ma 0 albo bardzo malo trackow wzgledem oryginalu.

### Ograniczenie jawne: creature animation state/action mapping

Zakres:

- nie udawac, ze `AnimationState` dziala dla creature - aktualnie spelnione przez runtime dataset i inspector.
- dodac mapowanie tylko wtedy, gdy mamy potwierdzona tabele action -> clip.
- na teraz: jesli istnieje `animationState` bez `animationName`, pokazac `unmapped` zamiast cichego auto-idle.

### P1: rozwinac `AnimRun-lite` do blizszej zgodnosci

Zakres:

- doprecyzowac fade/crossfade wedlug `transtime` dla zmian clipow.
- zrobic per-action time scale/weight/priority.
- ustalic default lookup z model/supermodel chain zgodnie z Aurora.
- obslugiwac koniec animacji z usunieciem/odpaleniem nastepnej akcji.

### P1: supermodel chain merge semantics

Zakres:

- porownac aktualny retarget-only approach z `borealis` merge node trees.
- dla part creature: skeleton jako autoratywny root animacji, parts/equipment jako geometry followers.
- unikac widocznego renderowania driver skeleton/source geometry.

### P2: root motion policy

Zakres:

- zostawic preview-safe neutralization dla walk/run, ale jawnie opisac jako preview.
- dla proofow aktywnego ruchu mierzyc pose motion oddzielnie od world/root motion.

### P2: pelny proof standard

Kazdy fix animacji musi miec:

- screenshot canvas,
- MP4,
- frame samples/contact sheet,
- selected clip name,
- actionNames,
- available clip count,
- selected clip track count przed i po filtrze,
- motion bbox/centroid z klatek MP4.

Samo `playbackStatus: playing` nie jest proofem.

## Najblizsze modele do regresji

Modele/rodziny, ktore powinny byc w stalej macierzy:

- `nw_chicken` / `c_a_chicken`: direct source clips, `animroot`, source-skinning.
- `nw_bathorror`: direct model + supermodel, poprzednio naprawiony explicit supermodel clip.
- `x2_mephduer001`: direct model + supermodel, poprzednio naprawiony explicit supermodel clip.
- `tm_cr_hlfdragred`: model z duza lista supermodel clips; testowac poprawne requested clip (`1hslashl`), a nie bledny `ca1slashl`.
- `rothe_a`, `porcine_a`, `feline_a`: HAK animal models z `animroot`; dobre do stalej regresji.
- `c_bearblck`, `c_cat_crag`, `c_drgblack66`: non-1 `setanimationscale`; dobre do stalej regresji scale.

## Kolejnosc implementacji

1. Proof runner: fail na missing-target track suppression i brak pixel motion.
2. UI inspector: pokazywac partial animation jako problem.
3. Creature `AnimationState`: potwierdzona mapa action/state -> clip, jesli chcemy realne odtwarzanie stanow.
4. AnimRun-lite parity: transition stack, priority, time scale i koniec/nastepna akcja.
5. Part/skeleton driver visibility audit dla powielen geometrii.
6. Stala macierz regresji dla `animroot` i non-1 `setanimationscale`.

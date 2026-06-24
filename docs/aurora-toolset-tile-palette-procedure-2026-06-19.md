# Aurora Toolset tile/palette preview-only procedure

Data: 2026-06-19

Rola: `5/6 DOC PATCHER TILE PROCEDURE`

Status: docs-only procedure. Nie jest to nowy live proof.

## Zakres

Ta procedura opisuje bezpieczny atom preview-only dla prawej palety
tile/terrain: `Features`, `Groups` i `Terrain`/tile templates. Atom ma zrobic
widoczny, screenshotowy proof palety i ewentualnego preview bez paint, bez save
i bez utrwalania zmian w module.

Zakazane w tym atomie:

- uruchamianie Aurory/Toolsetu albo przejmowanie okna poza przydzielonym live
  pilotem;
- globalna mysz, globalne `SendKeys`, drag na canvasie;
- klik `WM_LBUTTONDOWN/UP` w canvas po wyborze tile/group/template;
- `Save`, `OK`, `Apply`, `Finish`, `Build Module`, zapis modulu albo
  potwierdzenie save promptu;
- awansowanie group paint, `Tile Properties` albo parsed tree-label inventory
  bez osobnego dowodu.

Dozwolone dla przyszlego live pilota, jesli live-lock jest jego: pasywna
enumeracja, full-window screenshot, right-palette crop, celowane komunikaty do
ustalonego `HWND` prawego `TTreeView`/toolbaru palety oraz rollback do
`Placeables` + `Select Objects`.

## Zrodla obowiazujace

- `ORCH-010` jest aktualna zaakceptowana czysta baza: `cleanBaseline=true`,
  `modalCount=0`, `responding=true`, brak `Old File Format` i brak
  `Area Properties`, plus full-frame PNG.
- `ORCH-012` daje pasywny canvas/right-palette region proof. To jest tylko
  anchor pomiarowy/crop proof, nie render parity, nie akcja, nie mutacja.
- `ORCH-013` daje pasywny proof prawego panelu i detekcji prawego
  `TTreeView`. To nie jest parsed inventory, command routing ani rollback.
- `ORCH-014` daje pasywny proof lewego `TTreeView`. Nie wolno z niego
  wywodzic parsed area list, `_ikea`, area-open state, komendy ani mutacji.
- `ORCH-018` jest `blocker/incomplete` dla tej procedury. Nie wolno traktowac
  go jako clean baseline, palette proof ani dowod command routing, dopoki nie
  ma realnego PNG, `summary.json`, `responding=true`, `modalCount=0` i
  jawnego claimu bez mocniejszych wnioskow niz dowody. Pusty, summary-only albo
  niejednoznaczny `ORCH-018` blokuje atom zamiast go odblokowywac.
- `ORCH-020` daje lekcje reliable `HWND` targeting dla prawej palety:
  nie nazywac helpera klasy okna `Cls`, bo koliduje z istniejacym aliasem/
  nazwa funkcji; uzywac jednoznacznego `Get-ClassNameSafe`. Targetem akcji jest
  prawy `TTreeView` potwierdzony bounds + cropem, nie pierwszy znaleziony
  `TTreeView`. Dla branch pulse `Features` znany klientowy punkt expandera to
  `x=13 y=9` wzgledem prawego `TTreeView`. Dowod musi zawierac screenshoty:
  before full-window, before right-palette crop, crop po `Features` expand,
  after rollback full-window i after rollback right-palette crop. Visual rollback
  caveat: jesli po rollbacku na canvasie zostaje terrain/feature preview albo
  zielona poswiata, wynik jest `blocker=visual_rollback_incomplete`, nie sukces.
- `ORCH-021` jest post-live runner proof, nie tylko spec: rzeczywisty skrypt
  `.codex-tmp/aurora-orchestrator/right-palette-features-pulse.ps1` wykonal
  runner-backed right-palette `Features` pulse i rollback. Evidence:
  `.codex-tmp/aurora-live-evidence/orch-021-runner-right-palette-features-pulse-20260619-004936-567`.
  `summary.json` ma `status=completed`, `afterDiffers=true`,
  `rollbackMatchesBefore=true`, `modalCountBefore=0`, `modalCountAfter=0`,
  `responding=true`, `mutation=false`, `save=false`, `canvasInput=false`,
  `clickPulse.down/up=true`, `clickRollback.down/up=true`, oraz komplet pieciu
  PNG + `summary.json`.
- `ORCH-023` dodaje atom nauki palety dla podkategorii `City` pod
  `Features`, wykonany runnerem/targetowanymi komunikatami na prawym
  `TTreeView`, bez globalnej myszy, bez `SendKeys`, bez canvas input i bez
  save. Evidence:
  `.codex-tmp/aurora-live-evidence/orch-023-features-city-subcategory-pulse-20260619-005430-720`.
  `summary.json` potwierdza `mutation=false`, `save=false`,
  `canvasInput=false`, `modalCount=0`, `responding=true`,
  `cityDiffers=true`, `rollbackMatchesBefore=true`.

Starsze ustalenia terrain/palette:

- HB-S36: prawa paleta Terrain pokazala rooty `Features`, `Groups`, `Terrain`;
  `Groups` rozwinieto do `Theater (5x5)`; rollback przez powrot na ikone
  `Placeables` zdjal zielony preview skuteczniej niz `Esc`.
- HB-S37: `WM_COMMAND 73` wlaczyl `Select Terrain`; klik istniejacego tile dal
  niebieski outline bez paint; `WM_COMMAND 74` przywrocil `Select Objects`.
- HB-S38/S39/S40/S50: popup `Tile Properties` mozna ujawnic, ale dialog
  pozostaje `gap`; nie powtarzac blokujacego `SendMessage WM_CHAR` do popupu.
- HB-S41/S42: pojedynczy paint `[T] Floor Up, MAIN` byl mutacja live i wymagal
  `Undo`; ten atom nie powtarza paint.
- HB-S43/S44/S45: `Groups` sa tileset-dependent; zielony group preview nie jest
  dowodem paint, a origin/top-left click nie rozwiazal group paint.

## Warunek startowy

Przed jakimkolwiek dotknieciem palety przyszly live pilot musi miec:

1. Zamkniety clean-baseline proof z `ORCH-010` albo nowszy rownowazny baseline:
   full-window PNG + `summary.json`, `modalCount=0`, `responding=true`.
2. Pasywny full-window screenshot biezacego Toolsetu.
3. Prawy panel i prawy `TTreeView` potwierdzone screenshotem/cropem na bazie
   wzorca `ORCH-013`.
4. Brak modalnych okien, save promptow, `Old File Format`, `Area Properties`
   i popupow `#32768`.
5. Jawny claim: `mutation=false`, `save=false`, `paint=false`,
   `previewOnly=true`.

Jesli ktorykolwiek punkt nie jest spelniony, atom konczy sie blockerem i nie
wykonuje akcji palety.

## Runner dla branch pulse

Do najwezszego atomu `Features` branch pulse istnieje juz runner:

`.codex-tmp/aurora-orchestrator/right-palette-features-pulse.ps1`

Komenda z katalogu `C:\Projects\aurora-web` dla kolejnych kontekstow:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex-tmp\aurora-orchestrator\right-palette-features-pulse.ps1 -EvidenceRoot C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence -AtomId <context-id>-right-palette-features-pulse -TargetX 13 -TargetY 9
```

Runner nie jest launcherem Aurory i nie zastapuje live-locka. Wymaga juz
otwartego, zweryfikowanego Toolsetu; jego outputem ma byc evidence packet
analogiczny do ORCH-021. Dla innego branch/root zmienic `-AtomId` i dopiero po
osobnym dowodzie zmieniac `-TargetX/-TargetY`; punkt `13,9` jest znanym
klientowym hintem dla `Features` expandera prawego `TTreeView`.

## Atom ORCH-023: Features -> City

To jest procedura nauki palety: wolno uczyc sie stabilnego targetowania
prawego `TTreeView` i screenshotowac stan palety, ale nie daje to pozwolenia na
paint, canvas click, save, ani zadna mutacje modulu. Zakaz globalnej myszy i
globalnego `SendKeys` pozostaje bez wyjatku.

Evidence:

`.codex-tmp/aurora-live-evidence/orch-023-features-city-subcategory-pulse-20260619-005430-720`

Sekwencja atomu:

1. Zacznij od collapse baseline prawej palety. Baseline screenshot:
   `01-before-collapsed-palette.png`, hash
   `2ED4036E15457D9468D6152663FDD433630EFB2245F29BD44DF3EF03D3F9BB5B`.
2. Targetuj potwierdzony prawy `TTreeView`, nie pierwszy znaleziony tree i nie
   wspolrzedne ekranu. Rozwin `Features` punktem klientowym `x=13 y=9`.
   Screenshot po `Features`: `02-features-expanded.png`.
3. W tym samym prawym `TTreeView` targetuj podkategorie `City` punktem
   klientowym `x=31 y=57`. Screenshot po `City`:
   `03-city-expanded-or-selected.png`, hash
   `54887272C7FBA15E4DEDF8FDD02F8D0951F721952681FB39530C66DAE0FEACAB`.
4. Rollback wykonaj w odwrotnej kolejnosci: najpierw `City` przez `x=31 y=57`,
   potem `Features` przez `x=13 y=9`. Nie klikaj canvasu i nie zapisuj.
5. Zrob screenshot rollbacku `04-rollback-collapsed.png` i porownaj hash z
   baseline. W ORCH-023 rollback hash rowna sie baseline:
   `2ED4036E15457D9468D6152663FDD433630EFB2245F29BD44DF3EF03D3F9BB5B`.

Runner bazowy pozostaje:

`.codex-tmp/aurora-orchestrator/right-palette-features-pulse.ps1`

ORCH-023 mozna traktowac jako wzorzec rozszerzenia runnera na podkategorie:
najpierw doprowadzic palete do collapse baseline, potem wykonac jeden
targetowany branch/root i jeden targetowany child pulse, a na koniec przywrocic
oba stany i udokumentowac hash rollbacku.

## Sequence runner palette atoms

Parametryzowany runner dla sekwencji punktow prawej palety:

`.codex-tmp/aurora-orchestrator/right-palette-sequence-pulse.ps1`

Runner nie jest launcherem Aurory, nie otwiera Toolsetu i nie przejmuje
globalnego wejscia. Kazdy atom zaklada juz otwarte, zweryfikowane okno pod
live-lockiem oraz potwierdzony prawy `TTreeView`. Zakazy pozostaja twarde:
bez globalnej myszy, bez globalnego `SendKeys`, bez save, bez canvas input,
bez paint i bez prob utrwalania zmian w module. Output promotowalny wymaga
PNG screenshotow oraz `summary.json`; sam summary, pusty folder albo opis bez
obrazu nie wystarcza.

Canonical warm-up wolno uznac tylko wtedy, gdy rollback hash zgadza sie z
before hash. Jesli hash po rollbacku nie pasuje do baseline, atom konczy sie
blockerem i nie moze byc uzyty jako czysty start dla kolejnych sekwencji.

Komendy praktyczne z katalogu `C:\Projects\aurora-web`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex-tmp\aurora-orchestrator\right-palette-sequence-pulse.ps1 -EvidenceRoot C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence -AtomId <context-id>-features-city -Points '13,9:features;31,57:city'
```

`Features -> City`: atom po ORCH-023 dla wejscia w podkategorie `City` pod
`Features`. Jest to palette proof/learning atom, nie paint permission.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex-tmp\aurora-orchestrator\right-palette-sequence-pulse.ps1 -EvidenceRoot C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence -AtomId <context-id>-groups-city -Points '13,27:groups;31,63:city'
```

`Groups -> City`: ORCH-026d pokazal widoczne city group sets:
`Arena`, `City Gate`, `Gatehouse`, `House`, `Inn`, `Plaza`, `Pub`,
`Tower Gate`. Nie rozszerzac tego claimu poza widoczne group sets i
powiazany screenshot/summary evidence packet.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex-tmp\aurora-orchestrator\right-palette-sequence-pulse.ps1 -EvidenceRoot C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence -AtomId <context-id>-terrain-road -Points '13,45:terrain;31,207:road'
```

`Terrain -> Road`: ORCH-027 pokazal `Terrain` root oraz `Road` jako leaf/no
further visible expansion. Nie overclaim: to nie jest dowod parsed inventory,
road sub-tree ani render parity; tylko widoczny leaf/no further visible
expansion w tym atomie.

Single-root warm-up/diagnostic atoms:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex-tmp\aurora-orchestrator\right-palette-sequence-pulse.ps1 -EvidenceRoot C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence -AtomId ORCH-024-groups-root -TargetX 13 -TargetY 27
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex-tmp\aurora-orchestrator\right-palette-sequence-pulse.ps1 -EvidenceRoot C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence -AtomId ORCH-025-terrain-root -TargetX 13 -TargetY 45
```

ORCH-024 to single runner dla `Groups` root (`TargetX=13`,
`TargetY=27`). ORCH-025 to single runner dla `Terrain` root (`TargetX=13`,
`TargetY=45`). Traktowac je jako root pulse/warm-up evidence, nie jako
pozwolenie na preview canvasu, paint, save ani inventory claim bez osobnego
dowodu.

## Procedura preview-only

1. Zapisz evidence folder dla atomu, np.
   `.codex-tmp/aurora-live-evidence/tile-palette-preview-only-YYYYMMDD-HHMMSS`.
2. Zrob `01-before-full-window.png` oraz `02-before-right-palette.png`.
3. W `summary.json` zapisz claim, aktywny module/area tab jesli jest pasywnie
   widoczny, liczbe modali, `responding`, oraz bounds/klase prawego
   `TTreeView`.
4. Ustal prawy `TTreeView` tylko przez child inventory i widoczny crop.
   Nie uzywaj remote-memory read/write do drzewa. Helper klasy okna ma byc
   jednoznaczny, np. `Get-ClassNameSafe`; nie uzywaj nazwy `Cls`. Jesli nie da
   sie rozroznic prawego drzewa od lewego, stop:
   `blocker=right_ttreeview_ambiguous`.
5. Jesli paleta nie jest w trybie Terrain/tile, przelacz ja tylko celowanym
   komunikatem do znanego toolbaru/panelu palety. Zrob screenshot po
   przelaczeniu. Jesli przelaczenie wymaga globalnej myszy albo globalnego
   `SendKeys`, stop.
6. Rozwin tylko widoczne rooty prawego `TTreeView`, po jednym kroku:
   `Features`, `Groups`, `Terrain`. Po kazdym kroku zrob crop prawej palety.
   Dla najbezpieczniejszego pulse `Features` uzyj punktu klientowego expandera
   `x=13 y=9` wzgledem potwierdzonego prawego `TTreeView`; nie traktuj tego
   jako wspolrzednych ekranu ani punktu canvasu. Nie zakladaj, ze lista itemow
   jest taka sama dla kazdego tilesetu/area.
7. Dla `Features`: celem jest lista i screenshot widocznych pozycji. Nie
   wybieraj feature, ktory aktywuje canvas paint, chyba ze atom wprost chce
   tylko screenshot preview i ma rollback z punktu 10.
8. Dla `Groups`: wolno wybrac pojedynczy widoczny prefab tylko do preview.
   Jesli canvas pokazuje czerwony preview, zrob screenshot i stop dla tego
   prefabu: `blocker=red_preview_no_paint`. Jesli preview jest zielony, zrob
   screenshot i nadal traktuj go jako preview-only, nie jako paint.
9. Dla `Terrain`/tiles: wolno rozwinac template list i zaznaczyc item tylko do
   screenshotu preview. Po wyborze template nie klikaj canvasu. Sam zielony
   outline/preview nie jest mutacja ani sukces paint.
10. Rollback po kazdym wyborze preview:
    - najpierw przywroc `Select Objects` przez `WM_COMMAND 74`, jesli byl
      aktywny `Select Terrain` albo selection outline;
    - przelacz prawa palete z powrotem na `Placeables`, bo HB-S36 pokazal, ze
      to usuwa terrain preview skuteczniej niz samo `Esc`;
    - opcjonalnie zwin rooty prawego `TTreeView`, ale tylko jesli collapse nie
      ponownie aktywuje paint itemu. Jesli zwiniecie jest ryzykowne, zostaw
      tree expanded i zapisz to w summary.
11. Zrob `NN-after-rollback-full-window.png` i
    `NN-after-rollback-right-palette.png`. Finalny stan musi pokazywac brak
    modali i czytelny Toolset; preferowany stan: `Placeables` + `Select`.
    Jesli full-window/canvas nadal pokazuje terrain/feature preview, zielona
    poswiate albo selection ghost po rollbacku, nie promuj wyniku: zapisz
    `blocker=visual_rollback_incomplete`.
12. W `summary.json` zapisz:
    - `previewOnly=true`;
    - `mutation=false`;
    - `save=false`;
    - `canvasClick=false`;
    - `paintAttempted=false`;
    - `rollbackMethod=["WM_COMMAND 74","Placeables palette restore"]`;
    - screenshot list;
    - kazdy blocker bez awansu claimu.

## Screenshot proof

Minimalny komplet promotowalny dla preview-only:

- full-window before;
- right-palette crop before;
- right-palette crop z widocznym prawym `TTreeView`;
- crop po rozwinieciu `Features`, `Groups` albo `Terrain`, zalezne od claimu;
- dla `ORCH-020`/branch pulse: crop po `Features` expand wykonanym na prawym
  `TTreeView` przez punkt klientowy `x=13 y=9`;
- dla `ORCH-021`/runner proof: komplet runnera
  `orch-021-runner-right-palette-features-pulse-20260619-004936-567`,
  obejmujacy five PNG + `summary.json`, `afterDiffers=true`,
  `rollbackMatchesBefore=true`, `modalCountAfter=0`, `responding=true`,
  `mutation=false`, `save=false`, `canvasInput=false`;
- canvas/region crop tylko jesli claim dotyczy widocznego preview;
- full-window after rollback;
- right-palette crop after rollback, jesli atom dotykal prawego tree;
- `summary.json`.

Dowod niepromotowalny:

- folder pusty;
- samo `summary.json` bez PNG;
- full-window hash delta bez region/crop dla palety;
- screenshot zielonego preview opisany jako paint;
- screenshot po rollbacku z nadal widocznym terrain/feature preview opisany
  jako clean rollback;
- screenshot prawego panelu opisany jako parsed tree-label inventory, jesli
  etykiety nie zostaly wyciagniete osobnym, bezpiecznym mechanizmem.

## Rollback i collapse

Kolejnosc przywracania:

1. Zamknij ewentualny popup targetowanym `PostMessage Escape`; nie klikaj go
   globalna mysza.
2. Jesli jest terrain selection, wyslij `WM_COMMAND 74` (`Select Objects`).
3. Przywroc prawa palete na `Placeables`.
4. Zrob screenshot rollbacku.
5. Dopiero potem probuj collapse prawego tree, jesli potrzebny jest clean crop.

`Esc`, wybor root `Terrain` albo wybor root `Features` nie sa wystarczajacym
rollbackiem same w sobie. Jesli doszlo do przypadkowego paint, atom jest
niepoprawny preview-only: wykonaj toolbar `Undo`, potem `WM_COMMAND 74`,
`Placeables`, screenshot i oznacz wynik jako blocker, nie jako sukces.

## Blockery

Natychmiastowy stop:

- brak aktualnego clean baseline;
- `modalCount>0`, save prompt, `Old File Format`, `Area Properties` albo popup
  `#32768`;
- prawy `TTreeView` nie istnieje, jest niewidoczny albo bounds nie pasuja do
  right-palette crop;
- helper targetowania klasy okna nadal uzywa kolizyjnej nazwy `Cls` zamiast
  jednoznacznego `Get-ClassNameSafe`;
- wymagane przelaczenie palety wymaga globalnej myszy lub globalnego
  `SendKeys`;
- nie ma PNG + `summary.json`;
- `ORCH-018` jest nadal `blocker/incomplete`, pusty/summary-only,
  niejednoznaczny albo przeczy baseline;
- czerwony preview dla group/template, gdy nastepny krok wymagalby klikniecia;
- zielony preview po rollbacku nadal zaslania canvas;
- `Features` pulse wykonano na lewym `TTreeView`, pierwszym znalezionym
  `TTreeView`, wspolrzednych ekranu albo innym punkcie niz klientowe
  `x=13 y=9` prawego tree bez osobnego dowodu;
- ktokolwiek inny trzyma live-lock albo aktualnie wykonuje atom na tym samym
  oknie/panelu.

Znane nierozwiazane gapy, ktorych ta procedura nie zamyka:

- dialog `Tile Properties`;
- pewny group paint;
- `verified-after-reopen`;
- parsed right-palette inventory;
- render parity canvasu.

## Next safe atom

`TILE-PAL-RIGHT-TTREEVIEW-BRANCH-PULSE-001`: po aktualnym clean baseline
wykonac targeted right `TTreeView` branch pulse jako najbezpieczniejszy
praktyczny atom. Dla `Features` uzyc gotowego runnera
`.codex-tmp/aurora-orchestrator/right-palette-features-pulse.ps1`, chyba ze
live owner potrzebuje nowego parametryzowanego wariantu:

- `01-before-full-window.png`;
- `02-before-right-palette.png`;
- potwierdzenie prawego `TTreeView` przez child inventory i crop;
- targetowanie klasy okna helperem `Get-ClassNameSafe`, bez funkcji/helpera
  nazwanego `Cls`;
- celowany pulse tylko na branch `Features` prawego `TTreeView` przez punkt
  klientowy expandera `x=13 y=9`, bez wyboru liscia i bez canvas click;
- `03-right-ttreeview-features-expanded.png` pokazujacy branch po pulse;
- `04-after-full-window.png` po neutralnym powrocie/rollbacku;
- `05-after-right-palette.png` po rollbacku prawej palety;
- `summary.json` z exact screenshot list oraz `previewOnly=true`,
  `paint=false`, `save=false`, `mutation=false`, `canvasClick=false`, oraz
  `targetClassHelper="Get-ClassNameSafe"` i
  `featuresExpanderClientPoint={"x":13,"y":9}`.

Atom nie powinien probowac `Tile Properties`, preview na canvasie, group paint,
paint pojedynczego tile, save ani save/reopen.

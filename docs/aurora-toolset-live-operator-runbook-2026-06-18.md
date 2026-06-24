# Aurora Toolset live operator runbook

Data: 2026-06-18

Rola: Worker 1, Aurora Live Operator STANDBY. Ten dokument jest runbookiem
operacyjnym dla przyszlego live replay. Nie jest ticketem do wykonania akcji w
Aurora Toolset i nie zastepuje historycznych notatek.

## Zakres

Cel pipeline'u to nauczyc Codexa atomowych operacji w natywnym Aurora Toolset,
tak aby mozna bylo zlozyc mala lokacje end-to-end. Live operator wykonuje tylko
konkretny atom z ticketu koordynatora. Bez ticketu live operator pozostaje w
trybie STANDBY: czyta dokumenty, przygotowuje checklisty i nie wysyla zadnego
inputu do Toolsetu.

Zrodla bazowe:

- `docs/aurora-toolset-atomic-operations-index-2026-06-18.md`
- `docs/aurora-toolset-atomic-operation-checklists-2026-06-18.md`
- `docs/aurora-toolset-learning-roadmap-2026-06-18.md`
- `docs/aurora-toolset-session-recovery-findings-2026-06-18.md`
- najnowsze `docs/aurora-toolset-*-findings-2026-06-18.md`

## Guardraile

- Nie dotykac live okna Aurora Toolset bez wyraznego ticketu koordynatora.
- Nie przejmowac globalnego kursora i nie robic globalnych dragow/klikow.
- Nie uzywac globalnego `SendKeys`.
- Preferowac celowane komunikaty do konkretnego `HWND` Toolsetu lub child
  control.
- Nie zapisywac modulu bez osobnej, jawnej zgody. `OK`, `Apply`, `Open`,
  `Build Module`, `Test Module`, `Setup Area Transition`, `Remove` i podobne
  akcje wymagaja ticketu z mutacja.
- Nie traktowac samego odczytu technicznego jako dowodu. Dla live replay
  dowodem jest screenshot, seria screenshotow, reopened properties, object
  count, menu-state readback plus screenshot albo jasny blocker.
- Nie zaliczac screena, ktory nie pokazuje czytelnego Aurora Toolset albo
  wlasciwego dialogu.
- Nie uzywac `UIAutomationClient` / `ValuePattern` na VCL polach Toolsetu jako
  standardowej metody inputu.
- Nie uzywac remote-memory read/write na `TTreeView`.
- Nie wysylac zwyklego `SendMessage WM_CHAR` do popupu `#32768` bez timeoutu;
  HB-S50 zablokowal automatyzacje przy probie `Tile Properties`.
- Jezeli tytul modulu ma `*`, zapisac ten fakt jako stan startowy. Nie
  "naprawiac" go zapisem.
- Po kazdym atomie przywrocic czytelny stan roboczy: brak modali, `Select
  Objects` gdy dotyczy, `Show All` po filtrach, `Placeables` po terrain
  preview, restore dla `Fog`/`Use Area Lighting`/`Display Grid`.

## Szybka sciezka inputu live

Wniosek z live recovery 2026-06-18 ok. 21:28-21:36:

- Najszybsza praktyczna sciezka dla VCL Toolsetu to batch:
  `PostMessage` do konkretnego child `HWND` -> krotki wait 250-500 ms ->
  screenshot -> kolejny `PostMessage`.
- Nie uzywac synchronicznego `SendMessage` jako domyslnej metody inputu.
  Przy `WM_RBUTTON*` i `WM_KEYDOWN Enter` potrafil czekac az Aurora obsluzy
  akcje; komenda konczyla timeoutem, mimo ze Toolset pozostawal
  `Responding=True` i akcja mogla wykonac sie po stronie UI.
- `TCM_SETCURSEL` zmienia indeks `TPageControl`, ale nie wystarcza jako dowod
  zmiany strony: dla area tabs przestawil zakladke na `enon_bakery`, lecz
  viewer dalej raportowal ` - d_und`; dla dialogu `Trigger Properties` potrafil
  przestawic naglowek karty bez przeladowania zawartosci. Do przejscia kart
  potrzebny jest prawdziwy event klikniecia do kontrolki albo inny handler VCL.
- Szybki replay zakladek dialogu dzialal przez `PostMessage` klikow w
  `TPageControl`: Basic, Scripts, Advanced, Comments zostaly zebrane w jednej
  serii w ok. 2 sekundy.
- Dowod live: zaznaczenie triggera `d_und_t_left` z drzewa modulu otworzylo
  `TdlgTriggerEdit` po targetowanym `Enter`; potem dialog zamknieto przez
  `Cancel`, bez zapisu i bez mutacji modulu.

Dowody z tej rundy:

- `.codex-tmp/aurora-live-evidence/hb-live-click-recovery/05-after-tree-doubleclick-20260618-213245.png`
- `.codex-tmp/aurora-live-evidence/hb-live-click-recovery/07-after-enter-timeout-20260618-213422.png`
- `.codex-tmp/aurora-live-evidence/hb-live-click-recovery/trigger-basic-20260618-213627-374.png`
- `.codex-tmp/aurora-live-evidence/hb-live-click-recovery/trigger-scripts-20260618-213627-837.png`
- `.codex-tmp/aurora-live-evidence/hb-live-click-recovery/trigger-advanced-20260618-213628-285.png`
- `.codex-tmp/aurora-live-evidence/hb-live-click-recovery/trigger-comments-20260618-213628-720.png`

## Zasada jednego live operatora

Aurora Toolset jest jednowatkowym zasobem. W danym momencie tylko jeden live
operator moze wysylac komunikaty do okna Toolsetu.

Orkiestracja z subagentami:

- Mozna delegowac jednego subagenta jako live-pilota tylko wtedy, gdy glowny
  agent nie dotyka Toolsetu w tym samym czasie.
- Live-pilot dostaje jeden mikro-atom, katalog dowodow i jednoznaczny rollback.
- W czasie pracy live-pilota glowny agent moze robic tylko prace poza UI:
  dokumentacja, analiza screenshotow, przygotowanie kolejnego ticketu.
- Pozostali subagenci moga przygotowywac targety, checklisty i opisy, ale nie
  wolno im wysylac inputu do Aurora Toolset.
- Po zakonczeniu live-pilota wymagane jest potwierdzenie: `Responding=True`,
  brak modali, sciezki screenshotow i informacja, czy byla jakakolwiek mutacja.
- Najlepsze tickety dla pilota w overlapie to atomy widokowe albo dialog-only:
  kamera/viewport, karta properties + `Cancel`, picker + `Cancel`, menu toggle
  z natychmiastowym rollbackiem. Mutacje obiektow zostaja przy glownym
  operatorze, dopoki pilot nie jest sprawdzony na serii prostych atomow.
- Timeout pilota powinien byc krotki: jesli po ok. 60 sekundach nie ma raportu,
  glowny agent robi pasywny screenshot stanu, wysyla `STOP` do pilota i dopiero
  po potwierdzeniu czystego stanu przejmuje Toolset.
- Jesli istniejace sidecary sa wolne jako piloci, preferowac osobnego
  dedykowanego `fast pilot` z jednym atomem widokowym i minimalnym kontekstem.
  Taki pilot powinien zwrocic wynik w 30-60 sekund; inaczej traci lock.
- W petli heartbeat nie wolno zostawiac Aurory bez aktywnego live workera, jesli
  jest bezpieczny atom do wykonania. Gdy glowny agent robi dokumentacje,
  manifest, analize screenow albo czeka na wynik narzedzia, powinien oddelegowac
  dokladnie jednego subagenta jako live-pilota pod lockiem. Brak aktywnego
  klikajacego workera jest dopuszczalny tylko podczas pasywnego preflightu,
  cleanupu, nieoczekiwanego modala, Access Violation albo gdy nie ma
  jednoznacznie bezpiecznego mikro-atomu.

### Orkiestracja 5 subagentow

W trybie wieloagentowym Aurora Toolset ma dokladnie jednego operatora UI. Reszta
pracuje poza UI i nie wysyla inputu do Toolsetu.

| Rola | Odpowiedzialnosc | Zakaz |
| --- | --- | --- |
| Live-pilot pod lockiem | Wykonuje jeden mikro-atom z ticketu, zbiera before/after, robi rollback/cancel i oddaje stan koncowy. | Nie bierze drugiego atomu bez nowego ticketu i locka. |
| Manifest/screen-curator | Porzadkuje sciezki screenow, opisuje co pokazuje kazdy plik, wykrywa braki w evidence packu. | Nie klika, nie robi UI inputu, nie promuje statusu samodzielnie. |
| Target-finder | Szuka najlepszego area/obiektu/dialogu na podstawie docs, manifestow, screenow i poprzednich findings. | Nie zgaduje celu, jesli source/screen nie potwierdza targetu. |
| Checklist/doc-updater | Przygotowuje checklisty, proposed doc snippets i finalny wpis: status, kroki, dowody, rollback, pulapki. | Nie wpisuje `verified-live`, jesli dowod jest tylko screen-supported albo gap. |
| Reviewer/QA | Sprawdza, czy dowody wystarczaja do statusu, czy rollback byl wykonany i czy nie zostaly modale/dirty side effects. | Nie liczy testow, readbackow ani pustych screenow jako dowodu live. |

Protokol:

1. Koordynator wydaje ticket i przyznaje live lock tylko live-pilotowi.
2. Live-pilot raportuje start: ticket id, atom, target, katalog dowodow i plan
   rollbacku.
3. Sidecary pracuja rownolegle tylko poza UI: targety, manifest, checklisty,
   propozycje wpisow i review.
4. Po akcji live-pilot oddaje: `Responding=True/False`, modale, mutacja tak/nie,
   zapis modulu tak/nie, sciezki screenow, rollback/cancel.
5. Manifest/screen-curator sprawdza komplet screenow i nazwy etapow.
6. Reviewer/QA decyduje, czy status moze awansowac, czy zostaje blocker/gap.
7. Checklist/doc-updater dopiero wtedy przygotowuje wpis do docs.
8. Jesli live-pilot nie raportuje w ustalonym czasie, koordynator zatrzymuje
   pilota, zbiera pasywny stan i nie przekazuje locka dalej, dopoki stan UI nie
   jest jasny.

Minimalny handoff live-pilota:

```text
Ticket:
Atom:
Target:
Dowod before:
Dowod after:
Rollback/cancel:
Stan koncowy:
Responding:
Modale:
Mutacja modulu:
Zapis modulu:
Blocker:
```

- Pierwszy test dedykowanego pilota `Copernicus` potwierdzil workflow locka:
  pilot zwrocil before/after, `Responding=True` i brak modali. Jednoczesnie
  klik dolnego toolbara kamery w punkt `client=(230,20)` nie zmienil hasha PNG,
  wiec sam klik toolbaru nie jest wystarczajacym atomem sukcesu. Ticket pilota
  musi wymagac walidacji obrazu i miec konkretny, znany efekt albo jasny
  `changed=False` jako wynik negatywny.
- Drugi test pilota z `Trigger Properties -> Advanced -> Variables` trafil w
  nie ten przycisk i otworzyl `Edit String` (`TdlgNewEditStringExternal`)
  zamiast `Variables` (`TdlgVarTable`). To jest dobry blocker dowodowy:
  koordynaty na kartach dialogow musza byc wyprowadzane z aktualnych child
  controls po przeladowaniu karty, nie z zalozonego ukladu. Po takim blockerze
  zamknac najpierw `Edit String` przez `Cancel`, potem macierzysty dialog przez
  `Cancel`.

Przed akcja live operator musi miec ticket z:

- identyfikatorem ticketu;
- atomem do wykonania;
- zakresem: obserwacja, widokowy toggle, dialog-only, mutacja z rollbackiem;
- dozwolonym obszarem/obiektem;
- dozwolona metoda inputu;
- wymaganym rollbackiem;
- zakazami specyficznymi dla atomu.

Jesli nie wiadomo, czy inny worker ma aktywna kontrole nad Toolsetem, operator
nie wykonuje akcji. Handoff wymaga finalnego screena stanu, informacji o
otwartych modalach, stanie trybu selection/palette/filter i czy modul jest
dirty.

## Standardowy cykl ticketu live

1. Intake: przeczytaj ticket i powiazany wpis z indeksu/checklisty. Ustal, czy
   to atom obserwacyjny, widokowy, czy mutacja.
2. Claim: potwierdz u koordynatora, ze jestes jedynym live operatorem dla tego
   okna.
3. Preflight:
   - potwierdz `nwtoolset.exe`;
   - znajdz poprawne widoczne `TfrmFrame`, nie puste/genericzne okno;
   - potwierdz brak nieoczekiwanych modali;
   - zrob screenshot startowy;
   - potwierdz aktywny modul/area/obiekt i stan dirty `*`, jesli widoczny;
   - potwierdz plan rollbacku.
4. Before evidence: zapisz screenshot `before`. Dla dialogow wielozakladkowych
   planuj overview plus kazda widoczna zakladke/panel.
5. Execute: wykonaj jedna minimalna akcje z ticketu. Nie lacz atomow.
6. After evidence: zrob screenshot `after`; przy widokowych toggle zbierz tez
   stan menu albo diff, jesli byl wymagany.
7. Rollback/cancel:
   - dialog-only: `Cancel`, `Done` albo `Exit` zgodnie z docem atomu;
   - widokowy toggle: przywroc stan startowy;
   - terrain paint: `Undo`, potem `Select Objects` i `Placeables`;
   - object filter: `Show All`.
8. Postflight:
   - screenshot po rollbacku;
   - `Responding=True` albo jasny blocker;
   - brak otwartego popupu/modala;
   - opis, czy byla mutacja i czy modul zapisano.
9. Log: dopisz wynik do nowego/odpowiedniego dokumentu tylko zgodnie z
   instrukcja koordynatora. Nie nadpisuj historycznych notatek.

## Screenshot naming

Uzywac osobnego katalogu dla ticketu:

```text
.codex-tmp/aurora-live-operator-YYYYMMDD/<ticket-id>/
```

Nazwy plikow:

```text
hb-<seq>-<ticket-id>-<atom-slug>-<stage>.png
```

`<seq>` jest monotoniczne w ramach sesji lub katalogu. `<stage>` powinno byc
jednym z:

- `preflight`
- `before`
- `menu`
- `after`
- `after-toggle`
- `after-rollback`
- `modal`
- `blocker`
- `final`

Przykladowo:

```text
hb-548-w1-s51-display-grid-before.png
hb-549-w1-s51-display-grid-after-toggle.png
hb-550-w1-s51-display-grid-after-rollback.png
```

Dla properties/editorow wielozakladkowych:

```text
hb-551-w1-s52-door-properties-overview.png
hb-552-w1-s52-door-properties-basic.png
hb-553-w1-s52-door-properties-area-transition.png
hb-554-w1-s52-door-properties-after-cancel.png
```

Nie zaliczac screena jako dowodu, jezeli pokazuje Codex, zly monitor, pusty
prostokat, ghost window albo nieczytelny dialog.

## Modal i recovery

Modal oczekiwany:

1. Zrob screenshot modala.
2. Dzialaj tylko na przycisku dozwolonym w tickecie (`Cancel`, `Done`, `Exit`,
   czasem `OK` dla nie-mutujacego warningu).
3. Po zamknieciu zrob screenshot stanu glownego Toolsetu.

Modal nieoczekiwany albo destrukcyjny prompt:

1. Nie zgaduj.
2. Zrob screenshot.
3. Zamknij tylko jesli znany bezpieczny przycisk jest oczywisty.
4. W innym przypadku zatrzymaj atom i oddaj blocker koordynatorowi.

Access violation, ghost window albo `Responding=False`:

1. Zrob screenshot blockera.
2. Nie kontynuuj atomu na tym samym oknie.
3. Zamknij lub zrestartuj Toolset zgodnie z ticketem recovery.
4. Przy backup recovery wybierz `Tak`/`Yes`.
5. Po recovery nie wykonuj `File > Open` dla tego samego modulu.
6. Najpierw zrob screenshot odzyskanego drzewa/stanu.
7. Dopiero potem otwieraj najblizszy znany widok area albo zakoncz ticket
   konkretnym blockerem.

Znane pulapki recovery:

- Po backup recovery ponowne `File > Open` jest niepotrzebne i moze popsuc
  stan sesji.
- `_ikea` po recovery moze otworzyc `Old File Format` / `Area Properties` z
  pustym `Name`; `OK` moze dac `Invalid Filename`. Wtedy zamknac przez
  `Cancel` i raportowac blocker, nie zapisywac.
- `Find Instance` plus `UIAutomationClient` / `ValuePattern` doprowadzil do
  ghost window; nie powtarzac jako standardowej sciezki.

## Atomy gotowe do live replay

Te atomy mozna replayowac po ticketcie koordynatora, bo maja screenshotowe
dowody i znany rollback/cancel. Mutujace warianty sa w nastepnej sekcji.

| Atom | Status roboczy | Warunek replay | Rollback / koniec |
| --- | --- | --- | --- |
| Start Toolset + modul + `_ikea` / area render | `safe-repeatable` z recovery caveat | Potwierdz poprawne okno, realny render, nie samo drzewo | Bez zapisu; po recovery nie robic `File > Open` |
| Poprawny viewport/canvas | `safe-repeatable` | Operacja trafia w inner `TScrollBox`, nie rame | Jesli brak efektu, stop i re-identyfikacja |
| Kamera pan/rotate/zoom | `safe-repeatable` dla znanych sterowan | Screenshot before/after i diff/wyrazna zmiana | Odwrotna sekwencja albo osobny zweryfikowany reset |
| Placeable selection + Object Properties | `safe-repeatable` | Istniejacy placeable, properties jako `TdlgPlaceableEdit` | `Cancel` |
| Placeable properties tabs | `safe-repeatable` | Overview plus kazda widoczna karta | `Cancel` |
| Area context menu -> `View Area` | `opened-live` | Area z drzewa, np. `enon_bakery` | Brak mutacji; screenshot renderu |
| Top menu atlas | `opened-live` | Otworzyc menu i tylko screenshot | `Esc` do popupu |
| `View -> Object Filters -> Show None/Show All` | `safe-repeatable` | Aktywny canvas i widoczne obiekty | Zawsze `Show All` |
| `Environment -> Display Grid` | `safe-repeatable` | Znany stan startowy menu | Toggle do stanu startowego |
| `Environment -> Use Area Lighting` | `safe-repeatable` widokowo | `enon_bakery`; spodziewany ciemny screen | Drugi toggle; czytelny widok |
| `Environment -> Fog` | `safe-repeatable` widokowo | Znany stan startowy | Drugi toggle do stanu startowego |
| Area Properties safe-cancel | `opened-live` | Tylko dokumentacja kart i `Environment Options` | `Cancel` w obu dialogach |
| Sound Properties existing `Fireplace` | `opened-live` | `hx_tygiel_under -> Sounds -> Fireplace` | `Cancel`; po playbacku `Stop` |
| Door Properties tabs | `opened-live` | Istniejace drzwi, np. `hx_undertyg_gatemain` | `Cancel`; osobne otwarcia dla kart sa bezpieczniejsze |
| Trigger Properties existing trigger | `safe-repeatable` po refreshu | Preferowac `d_und`, prawdziwy dialog `TdlgTriggerEdit` | `Cancel` |
| Creature Properties existing `Inzynier` | `opened-live` | Istniejacy creature, bez wizard finish | `Cancel` |
| Creature inventory/equipment observe | `opened-live` | Warning przez dozwolone `OK`; bez `Never warn again` | `Cancel` inventory, potem `Cancel` properties |
| Conversation Editor observe | `opened-live` | Otworzyc, udokumentowac panele | `Done`, bez zapisu |
| Script Editor observe | `opened-live` | Tylko panele referencji/outputu | `Exit`, bez compile/save |
| Journal Editor observe | `opened-live` | Tylko panele i struktura | `Cancel` |
| Faction Editor observe | `opened-live` | Basic/Advanced tylko screenshot | `Cancel` |
| Options observe | `opened-live` | Sekcje tylko screenshot | `Cancel`, bez zmian globalnych |
| Module Properties observe | `opened-live` | Karty Basic/Events/Advanced/Description/Custom Content | `Cancel` |
| Module event script `Edit` observe | `opened-live` | Otworzyc istniejacy `_main_on_acqu` | `Exit`, potem `Cancel` |
| Module event resource picker observe | `opened-live` | Otworzyc `Select Resource`, filtry tylko obserwacyjnie | `Cancel`, potem `Cancel` |
| Terrain palette / groups preview | `partial-live`/`opened-live` | Bez klikniecia canvasu; kolor preview jako dowod | `Placeables`, `Select Objects` |
| Select Terrain + existing tile selection | `safe-repeatable` dla selection | `WM_COMMAND 73`, klik istniejacego tile | `WM_COMMAND 74` |
| Tile Properties popup only | `partial-live` | Tylko ujawnienie popupu, nie aktywacja | `PostMessage Escape`, `Select Objects` |

Uwaga po HB-010/HB-011: dla toggle z menu sama zmiana stanu menu nie zawsze
wystarcza jako dowod wizualny. `Display Grid` na `d_und` zmienil stan menu, ale
nie zmienil pikseli bez dodatkowego repaintu; `Fog` zmienil stan menu i hash
obrazu, a rollback wrocil bitowo do startu.

## Atomy wymagajace zgody przed mutacja

Kazdy punkt ponizej wymaga ticketu, ktory wprost dopuszcza mutacje oraz opisuje
rollback. Bez tego operator moze co najwyzej wykonac obserwacje/dialog-only.

- Zapis modulu w dowolnej formie.
- `OK` albo `Apply` w Area/Module/Placeable/Door/Trigger/Creature/Sound
  Properties, chyba ze ticket jednoznacznie mowi, ze to zamkniecie jest
  dozwolone.
- Placeable appearance, flagi `Plot`/`Useable`/`Static`, pola numeric,
  rename, add new placeable, move placeable.
- Placeable inventory: wlaczenie `Has Inventory`, otwarcie contents po zmianie,
  dodanie/usuniecie itemu.
- `Adjust Location` dla placeable/door/sound/trigger: sam dialog jest nadal
  gapem; edycja wspolrzednych wymaga osobnej zgody.
- Area Properties: preset `Visual`, `Customize Environment`, lighting/fog/day
  night/weather, `OK`/`Apply`.
- Door `Setup Area Transition`, zmiana destination, lock, trap, key, faction,
  initial state.
- Trigger creation/drawing volume, scripts, variables, faction/cursor/highlight
  changes.
- Creature wizard finish, appearance/stat/class/script changes, inventory item
  edits, `Dropable`/`Pickpocketable` toggles.
- Sound radius/cutoff/position/active/play-style/volume po `OK`; playback moze
  byc ticketem obserwacyjnym, ale nie jest dowodem slyszalnosci.
- Terrain/tile paint, eraser, raise/lower, wall/floor changes, group paint.
  Jedyny potwierdzony paint `[T] Floor Up, MAIN` ma rollback przez `Undo`, ale
  nadal wymaga zgody przed powtorka.
- Tile Properties dialog: nadal `gap`; nie probowac agresywnej aktywacji popupu
  ani `SendMessage WM_CHAR` bez timeoutu.
- Palette context menu `Update Instances`, `Edit Copy`, `Find Text` oraz
  podobne pozycje, dopoki context menu nie ma bezpiecznej sciezki.
- `Build Module`, `Test Module`, `Verify Area`, `Area Statistics`.
- Toolset `Options` global preferences.
- Faction Editor: dodawanie/usuwanie fakcji, macierz relacji, `Global Effect`.
- Conversation/Journal/Script: nowy zasob, compile, save, przypinanie skryptu,
  `Open` w `Select Resource`.
- Module Properties: globalne event hooki, `Custom Content` HAK/TLK, start
  area i wspolrzedne startu.
- `Remove`, `Cut`, `Add To Palette` w context menu dowolnego obiektu.

## Atomy nadal gap / nie uzywac jako pewnego rollbacku

- `Go to Start Location` jest `partial-live`: nie cofnal kontrolowanego pan w
  HB-S35. Nie uzywac jako pewnego rollbacku po panowaniu.
- `Tile Properties` dialog nie jest `opened-live`; mamy selection i popup, nie
  dialog.
- Group paint pozostaje nierozstrzygniety nawet przy zielonym preview
  `[Jungle] Camp 2 (1x2)`.
- Palette context menu dla `Find Text`/`Edit Copy`/`Update Instances` pozostaje
  gapem.
- Placeable inventory dla `ZEP_SAFE001` pozostaje gapem; creature inventory nie
  promuje placeable inventory.
- Area Properties targeted popup activation bez globalnej myszy jest gapem w
  nowszym refreshu; historyczny safe-cancel screenshot jest wazny, ale nie
  promuje aktualnej targetowanej aktywacji.
- Find Instance tag-search pozostaje gapem; `GetWindowText` nie jest dowodem
  widocznego wpisania filtra.

## Minimalny final report operatora

Po ticketcie operator oddaje koordynatorowi:

```text
Ticket:
Atom:
Zakres: observation / view-toggle / dialog-only / mutation-with-rollback
Stan startowy:
Akcja:
Dowod before:
Dowod after:
Rollback/cancel:
Stan koncowy:
Mutacja modulu: tak/nie
Zapis modulu: tak/nie
Blocker:
Nastepny bezpieczny krok:
```

Jesli nie bylo ticketu live, final report ma brzmiec: STANDBY, dokumentacja
gotowa, live Toolset nietkniety.

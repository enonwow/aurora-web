# Aurora Toolset: next-atom scheduler

Data: 2026-06-18

Rola: Worker 5/6, next-atom scheduler. Ten plik jest backlogiem mikro-atomow
20-60 sekund. Nie jest raportem live i nie promuje statusow bez nowych
screenshotow. Zalozenia bezpieczenstwa: nie uruchamiac Aurory, nie dotykac
okna bez live ticketu, nie uzywac globalnej myszy, globalnych dragow ani
globalnego `SendKeys`; preferowac pasywna inspekcje, screenshoty i celowane
`PostMessage`/`WM_COMMAND` do znanego `HWND`.

## Kolejka atomow

### Atom 01

- id: `NXA-WH-001`
- goal: W 20-60 sekund potwierdzic pasywnie, ze juz otwarty viewer to `_winds_houses`, a nie puste okno Toolsetu.
- live action: Zrobic screenshot startowy i pasywnie odczytac visible top-level/child titles: `TfrmFrame`, `TfrmViewerArea - _winds_houses`, aktywny modul.
- no-mouse method: `EnumWindows`/`EnumChildWindows` plus screenshot z konkretnego `HWND`; zero inputu do Toolsetu.
- rollback: Brak mutacji; jesli target nie jest `_winds_houses`, przerwac bez prob otwierania area.
- screenshot proof: Jeden full-frame screenshot z widocznym `_winds_houses` i zapisany tekstowy dump tytulow okien.
- risk: Niski; jedyne ryzyko to pomylenie aktywnego viewer child z pustym frame.
- expected blocker: Brak `TfrmViewerArea - _winds_houses`, zasloniety viewer albo nieczytelny screenshot.

### Atom 02

- id: `NXA-WH-002`
- goal: W 20-60 sekund wskazac realny canvas `_winds_houses`, zeby kolejne atomy nie trafialy w ramke viewer.
- live action: Pasywnie znalezc inner `TScrollBox`/canvas child pod `TfrmViewerArea - _winds_houses` i zrobic screenshot kadru.
- no-mouse method: `EnumChildWindows`, klasy i recty kontrolek; bez klikow i bez focusowania okna.
- rollback: Brak mutacji; jesli nie ma jednoznacznego canvasu, zakonczic jako blocker.
- screenshot proof: Screenshot viewer oraz dump `HWND/class/rect` dla prawdopodobnego canvasu.
- risk: Niski; blad targetowania moze zepsuc nastepne atomy, dlatego ten atom niczego nie wysyla.
- expected blocker: VCL child recty nie ujawniaja canvasu albo screenshot pokazuje modal/popup zamiast area.

### Atom 03

- id: `NXA-WH-003`
- goal: W 20-60 sekund potwierdzic widokowy toggle `Display Grid` na `_winds_houses` i natychmiast go przywrocic.
- live action: Screenshot before, celowany toggle `Display Grid`, screenshot after, drugi toggle restore, screenshot restored.
- no-mouse method: `PostMessage`/`WM_COMMAND` do `TfrmFrame` dla znanego ID `104`; menu-state readback jesli dostepny.
- rollback: Drugi toggle do stanu startowego; jesli stan menu nie jest czytelny, przerwac po restored screenshot.
- screenshot proof: Trzy screenshoty: before, grid changed, restored; najlepiej z pixel diff albo menu-state.
- risk: Niski; view-only, bez zapisu modulu.
- expected blocker: Aktywny frame nie przyjmuje `WM_COMMAND`, grid jest niewidoczny w tym kadrze, albo stan startowy byl nieznany.

### Atom 04

- id: `NXA-WH-004`
- goal: W 20-60 sekund sprawdzic `Fog` jako widokowy toggle na `_winds_houses` i przywrocic stan startowy.
- live action: Screenshot before, toggle `Fog`, screenshot after, toggle restore, screenshot restored.
- no-mouse method: `PostMessage`/`WM_COMMAND` do `TfrmFrame` dla znanego ID `106`; bez menu klikow.
- rollback: Drugi toggle do wartosci startowej; jesli efekt jest subtelny, nadal wymagany restored screenshot.
- screenshot proof: Before/after/restored screenshoty plus informacja, czy diff byl widoczny.
- risk: Niski-sredni; efekt moze byc bardzo subtelny i latwo o falszywy sukces.
- expected blocker: Brak wizualnej roznicy, nieznany stan menu albo widok zbyt ciemny/zasloniety.

### Atom 05

- id: `NXA-WH-005`
- goal: W 20-60 sekund sprawdzic `Use Area Lighting` na `_winds_houses` i nie zostawic ciemnego widoku.
- live action: Screenshot before, toggle `Use Area Lighting`, screenshot after, natychmiastowy restore, finalny screenshot.
- no-mouse method: `PostMessage`/`WM_COMMAND` do `TfrmFrame` dla znanego ID `107`; zadnych globalnych klikow.
- rollback: Drugi toggle do stanu startowego; jesli scena robi sie czarna, restore jest pierwsza akcja po screenshotcie.
- screenshot proof: Before/after/restored screenshoty, z finalem pokazujacym czytelna area bez modali.
- risk: Sredni; lighting moze prawie zaciemnic scene i utrudnic dalsza prace.
- expected blocker: Nieczytelny after-screen, brak menu-state, albo restore nie daje obrazu podobnego do before.

### Atom 06

- id: `NXA-LC-006`
- goal: W 20-60 sekund przygotowac baseline Last City area-building bez mutacji.
- live action: Potwierdzic aktywny modul `the_last_city - codex.mod` i widoczna docelowa/testowa area; zrobic baseline screenshot canvasu.
- no-mouse method: Pasywny window/title dump, screenshot z `TfrmFrame`; jesli area nie jest widoczna, nie otwierac jej bez osobnego live ticketu.
- rollback: Brak mutacji; jesli area nie jest juz otwarta, zapisac blocker zamiast wykonywac `View Area`.
- screenshot proof: Full canvas z nazwa area oraz drzewo/tytul potwierdzajacy target.
- risk: Niski; atom jest obserwacyjny.
- expected blocker: Nie ma otwartej Last City/test area albo inny worker ma live lock.

### Atom 07

- id: `NXA-LC-007`
- goal: W 20-60 sekund ustawic dowod siatki do budowania tile bez trwalej zmiany sceny.
- live action: Na docelowej area wykonac `Display Grid` before/after/restore albo, jesli grid juz jest wlaczony, tylko potwierdzic stan startowy screenem.
- no-mouse method: Celowany `WM_COMMAND 104` do frame oraz screenshoty; bez globalnego klikania menu.
- rollback: Przywrocic stan startowy gridu; finalnie zostawic kadr czytelny.
- screenshot proof: Before/after/restored albo one-shot z grid-on plus menu-state, zalezne od stanu startowego.
- risk: Niski; tylko view-state.
- expected blocker: Grid nie jest widoczny na danym tilesecie/kadrze albo stan startowy nie da sie odczytac.

### Atom 08

- id: `NXA-LC-008`
- goal: W 20-60 sekund potwierdzic bezpieczny terrain/tile preview pod Last City bez paintu.
- live action: Wybrac jeden tile/floor pasujacy do slice, doprowadzic do zielonego preview w pustej kratce, zrobic screenshot, wyjsc do `Select Objects`/`Placeables`.
- no-mouse method: Celowane komendy do znanych toolbar/menu controls; jesli potrzebny canvas hit, tylko targetowany message do inner `TScrollBox`, nie globalna mysz.
- rollback: Nie klikac paint; przelaczyc z powrotem na `Select Objects` i/lub `Placeables`, finalny screenshot bez zielonego preview.
- screenshot proof: Paleta/wybor tile, zielony preview, restored canvas bez preview.
- risk: Sredni; pomylony hit moze wykonac paint zamiast preview.
- expected blocker: Brak stabilnego template, czerwony preview, albo zielony preview nie znika po restore.

### Atom 09

- id: `NXA-LC-009`
- goal: W 20-60 sekund wykonac jeden testowy single-tile paint tylko w test area i natychmiastowy rollback.
- live action: Z before-screenem i zielonym preview kliknac jedna kratke, zrobic after-screen, uzyc `Undo`, przywrocic `Select Objects`.
- no-mouse method: Targetowany `PostMessage` do inner `TScrollBox` dla paint click; toolbar `Undo` przez znany command/toolbar control.
- rollback: `Undo` natychmiast po after-screen; finalny screenshot musi pokazac powrot geometrii.
- screenshot proof: Before, preview, after paint, after undo, final restored.
- risk: Sredni-wysoki; mutuje geometrie, wiec tylko test area i bez zapisu modulu.
- expected blocker: `Undo` nie cofa paintu, click trafia w zla kratke, albo preview bylo czerwone/nieczytelne.

### Atom 10

- id: `NXA-LC-010`
- goal: W 20-60 sekund sprawdzic group footprint dla Last City bez paintu grupy.
- live action: Wybrac jedna mala grupe/prefab, pokazac zielony/czerwony footprint na area, zrobic screenshot i wyjsc z trybu preview.
- no-mouse method: Celowane komendy do palety i inner canvas; bez globalnego drag/klik.
- rollback: Nie paintowac grupy; przelaczyc na `Select Objects`/`Placeables`, finalny screenshot bez footprintu.
- screenshot proof: Paleta group, footprint preview, final restored.
- risk: Sredni; poprzednie proby group paint byly niejednoznaczne, wiec ten atom jest preview-only.
- expected blocker: Brak grup zgodnych z tilesetem, footprint czerwony, albo origin/top-left nadal niejasny.

### Atom 11

- id: `NXA-LC-011`
- goal: W 20-60 sekund dodac jeden prosty placeable-clutter do testowej Last City area albo zablokowac bez skutkow ubocznych.
- live action: Wybrac znany template typu barrel/crate/brazier, zanotowac object count, dodac jedna instancje, screenshot after.
- no-mouse method: Celowane paleta/template selection i targetowany click-message do inner `TScrollBox`; bez globalnej myszy.
- rollback: Jesli `Undo` dla add jest potwierdzony w tej sesji, uzyc go po screenie; inaczej nie zapisywac modulu i oznaczyc cleanup jako osobny atom.
- screenshot proof: Paleta/template, canvas before z count, canvas after z nowym placeable, count after.
- risk: Wysoki wzgledem view-only, bo to mutacja obiektu.
- expected blocker: Template nie wybiera sie pewnie, click nie dodaje obiektu, count nie rosnie o dokladnie 1, albo brak sprawdzonego undo.

### Atom 12

- id: `NXA-LC-012`
- goal: W 20-60 sekund przesunac jeden zaznaczony placeable w kontrolowanym kierunku.
- live action: Zrobic before-screen zaznaczonego placeable, wykonac maly move, zrobic after-screen i potwierdzic count bez zmiany.
- no-mouse method: Targetowane `WM_LBUTTONDOWN/MOVE/UP` do inner `TScrollBox` albo znana metoda drag na konkretnym `HWND`; zero globalnego kursora.
- rollback: Opposite move wedlug before-screena albo `Undo`, jesli dziala dla move; finalny screenshot restored albo jawnie `left-mutated-unsaved`.
- screenshot proof: Before selected object, after moved object, object count before/after, restored screenshot jesli rollback wykonany.
- risk: Sredni; move moze byc pomylony z trybem dodawania placeable.
- expected blocker: Obiekt nie jest zaznaczony, drag dodaje nowy obiekt, albo count sie zmienia.

### Atom 13

- id: `NXA-LC-013`
- goal: W 20-60 sekund nazwac/tagowac testowy placeable i potwierdzic reopened properties.
- live action: Otworzyc properties wybranego placeable, wpisac `lc_atom_prop_01` w jedno pole Name/Tag, `OK`, reopen, screenshot.
- no-mouse method: `WM_COMMAND 70`/targeted Enter dla properties; `EM_SETSEL` + `EM_REPLACESEL` do aktywnego `TEdit`; bez `UIAutomation ValuePattern`.
- rollback: Jesli wartosc bledna, przywrocic wartosc startowa z before-screen, `OK`, reopen i screenshot; bez zapisu modulu.
- screenshot proof: Basic tab before, po wpisaniu, reopened Basic tab po `OK`, final canvas.
- risk: Sredni-wysoki; stale handle albo zle pole moze wpisac tekst nie tam, gdzie trzeba.
- expected blocker: Nie da sie pewnie wskazac `TEdit`, properties otwieraja sie dla innego obiektu, albo reopen nie pokazuje zmiany.

### Atom 14

- id: `NXA-LC-014`
- goal: W 20-60 sekund sprawdzic ambient Last City przez fog/lighting preview z pelnym restore.
- live action: Na czytelnym kadrze wlaczyc tylko jeden toggle: `Fog` albo `Use Area Lighting`, zrobic after-screen, przywrocic stan startowy.
- no-mouse method: `WM_COMMAND 106` albo `107` do `TfrmFrame`; jeden toggle na atom, nie oba naraz.
- rollback: Drugi toggle do startu; jesli scena robi sie zbyt ciemna, restore przed kolejnymi screenshotami.
- screenshot proof: Before, after ambient, restored.
- risk: Sredni; lighting moze zaciemnic canvas i utrudnic QA.
- expected blocker: Brak widocznego diffu, nieczytelny kadr, albo restore nie daje podobienstwa do before.

### Atom 15

- id: `NXA-LC-015`
- goal: W 20-60 sekund otworzyc jeden dialog interakcji Last City obserwacyjnie i zamknac bez mutacji.
- live action: Wybrac najbezpieczniejszy dostepny target: sound marker, door albo trigger; otworzyc properties, zrobic screenshot kluczowej zakladki, `Cancel`.
- no-mouse method: Tree/dialog open przez targetowane messages do znanego child control i `WM_COMMAND`/button `Cancel`; bez popupu aktywowanego globalnym klikiem.
- rollback: `Cancel` w dialogu; finalny screenshot canvasu bez modala i bez zmiany.
- screenshot proof: Target w tree/canvas, properties overview, kluczowa zakladka (`Positioning`, `Area Transition` albo `Scripts`), final no-modal.
- risk: Sredni; zly target moze otworzyc inny dialog albo modal potomny.
- expected blocker: Nie ma widocznego targetu, `Cancel` nie zamyka dialogu, albo otwiera sie niespodziewany picker/editor.

### Atom 16

- id: `NXA-QA-016`
- goal: W 20-60 sekund sprawdzic komplet evidence packu po jednym live atomie.
- live action: Bez dotykania Toolsetu porownac raport pilota z plikami screenshotow: before, after, rollback/restored, final no-modal.
- no-mouse method: `Get-ChildItem`, `rg`, hash/size/timestamp; zadnego inputu do okna.
- rollback: Jesli brakuje screena, nie dopisywac sukcesu; zwrocic `missing-proof` i prosbe o jeden brakujacy artefakt.
- screenshot proof: Lista sciezek screenshotow oraz informacja, ktory etap pokazuje kazdy plik.
- risk: Niski; ryzyko tylko dokumentacyjne: uznanie pustego/nieczytelnego screena.
- expected blocker: Screenshoty sa puste, powtarzaja ten sam hash, nie pokazuja Toolsetu albo nie maja restored/final.

### Atom 17

- id: `NXA-QA-017`
- goal: W 20-60 sekund sklasyfikowac wynik atomu bez zawyzania statusu.
- live action: Przypisac `observed-only`, `preview-only`, `mutated-live`, `rolled-back`, `verified-after-reopen` albo `blocked` na podstawie dowodow.
- no-mouse method: Praca na markdown/logach/screenshot manifest; bez UI inputu.
- rollback: Jesli status jest niepewny, cofnac klasyfikacje do `blocked` albo `needs-more-proof` w notatce roboczej.
- screenshot proof: Cytowane sciezki dowodow, nie nowy screenshot.
- risk: Niski-sredni; blad statusu moze przesunac pipeline na zbyt ryzykowny atom.
- expected blocker: Brak reopen properties, brak count before/after, brak restored screenshot albo tylko techniczny readback.

### Atom 18

- id: `NXA-QA-018`
- goal: W 20-60 sekund sprawdzic, czy rollback/cancel naprawde zostawil czysty stan UI.
- live action: Ocenic final screenshot: brak modali, brak popupu, czytelny canvas, `Select Objects`/paleta/filters przywrocone wedlug ticketu.
- no-mouse method: Oglad screenshotow i ewentualny pasywny OCR/metadata; zero komunikatow do Toolsetu.
- rollback: Jesli final jest brudny, oznaczyc `cleanup-required` i przygotowac osobny atom cleanup, bez samodzielnego klikania.
- screenshot proof: Final no-modal/restored screenshot oraz lista wykrytych problemow.
- risk: Niski; ryzyko polega na przeoczeniu otwartego child dialogu albo aktywnego preview.
- expected blocker: Finalny screenshot nie obejmuje calego frame, jest zasloniety albo nie pokazuje trybu narzedzia.

### Atom 19

- id: `NXA-QA-019`
- goal: W 20-60 sekund dopasowac wynik live atomu do backlogu Last City i wybrac nastepny najbezpieczniejszy krok.
- live action: Zaktualizowac lokalna notatke decyzyjna: co zostalo udowodnione, co zablokowane, jaki atom jest nastepny.
- no-mouse method: Markdown-only, `rg` po docs i evidence paths; bez live UI.
- rollback: Jesli wnioski sa sprzeczne z dowodem, porzucic notatke i zostawic status `blocked`.
- screenshot proof: Linki/sciezki do screenshotow uzytych w decyzji oraz krotka macierz `before/after/rollback`.
- risk: Niski; ryzyko dokumentacyjne, nie runtime.
- expected blocker: Brak jednoznacznego proofu lub konflikt miedzy raportem pilota a screenshotami.

### Atom 20

- id: `NXA-QA-020`
- goal: W 20-60 sekund przygotowac gotowy ticket dla nastepnego live-pilota.
- live action: Zlozyc krotki handoff: atom id, target, dozwolona metoda, wymagane screenshoty, rollback, timeout 60 s.
- no-mouse method: Markdown/text only; bez dotykania Toolsetu.
- rollback: Jesli ticket nie ma targetu lub rollbacku, nie wysylac go pilotowi; wrocic do `NXA-QA-019`.
- screenshot proof: Ticket wskazuje wymagane screenshoty, a nie deklaruje ich wykonania.
- risk: Niski; zly ticket moze spowodowac, ze pilot wejdzie w za szeroki atom.
- expected blocker: Brak live locka, brak potwierdzonego targetu albo brak zgody na mutacje.

## Najlepszy kolejny atom dla live-pilota

Rekomendacja: `NXA-WH-003`.

Dlaczego: jest widokowy, krotki, ma znany rollback tym samym commandem, nie
mutuje modulu i daje latwo porownywalne before/after/restored screenshoty. To
lepszy pierwszy pilot niz mutacja Last City, bo jednoczesnie testuje lock,
targetowanie `TfrmFrame`, screenshot pipeline i dyscypline rollbacku bez
dotykania danych modulu.

Minimalny ticket pilota:

```text
Ticket: NXA-WH-003
Atom: Display Grid toggle + restore na juz otwartym _winds_houses
Target: widoczne TfrmFrame / TfrmViewerArea - _winds_houses
Dozwolona metoda: targeted PostMessage/WM_COMMAND 104, screenshoty z HWND
Zakaz: zero globalnej myszy, zero SendKeys, zero Save
Dowod before: full-frame screenshot _winds_houses
Dowod after: screenshot po zmianie Display Grid
Rollback/cancel: drugi WM_COMMAND 104 do stanu startowego
Stan koncowy: screenshot restored, brak modali, Responding=True
Timeout: 60 sekund
Blocker: brak _winds_houses, brak frame HWND, brak widocznej zmiany albo restore
```

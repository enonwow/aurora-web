# Aurora Toolset: location-building readiness board

Data audytu: 2026-06-18

Cel: ocenic, co realnie pomaga jutro zbudowac mala lokacje w Aurora Toolset,
bez awansowania statusow ponad dostepny live dowod. Ten board nie dotyka live
okna Aurory i nie zmienia statusow w indeksie. `gap`, `partial-live` i
`opened-live` zostaja tak nazwane, dopoki nie ma screenshotow i twardego
dowodu z live Toolsetu.

Zrodla przeczytane:

- [aurora-toolset-atomic-operations-index-2026-06-18.md](aurora-toolset-atomic-operations-index-2026-06-18.md)
- [aurora-toolset-atomic-operation-checklists-2026-06-18.md](aurora-toolset-atomic-operation-checklists-2026-06-18.md)
- [aurora-toolset-learning-roadmap-2026-06-18.md](aurora-toolset-learning-roadmap-2026-06-18.md)

## Board gotowosci workflow

| Workflow / kompozycja | Wymagane atomy | Status kazdego atomu | Brakujacy live dowod | Najblizszy bezpieczny ticket dla live operatora |
| --- | --- | --- | --- | --- |
| Wejscie do pracy na lokacji | V01 uruchom Toolset/modul/area; S19 area tree context -> View Area; V02 poprawny viewport/canvas; V03 kamera; S20 Go to Start Location | V01 `safe-repeatable`; S19 `opened-live`; V02 `safe-repeatable`; V03 `safe-repeatable`; S20 `partial-live` | Aktualny, swiezy screenshot target area przed edycja; pewny reset/recenter po pan/zoom nadal nieudowodniony. | Otworzyc docelowa area przez `View Area`, zrobic baseline screenshot, potwierdzic inner `TScrollBox`, zapisac pozycje kamery i nie wykonywac mutacji. |
| Prosty rozrost wnetrza / terrain shell | S08 terrain palette; EXP-025 pojedynczy tile paint `[T] Floor Up, MAIN`; toolbar Undo; restore `Select Objects`/`Placeables`; S22 Display Grid | S08 rodzina `partial-live`; pojedynczy paint `mutated-live`; Undo/restore udokumentowane; S22 `safe-repeatable`; Tile Properties `gap`; group paint `gap` | Brak `verified-after-reopen`; brak pewnego `Tile Properties`; brak powtarzalnego paintu grupy/prefabu; brak dowodu save/reopen po geometrii. | Na testowym obszarze i tylko po zgodzie: jeden zielony single-tile paint, screenshot before/after, natychmiast `Undo`, restore `Placeables`; nie promowac dalej bez reopen albo osobnego save planu. |
| Dekoracje i obiekty placeable | V04 select placeable + properties; V05 tabs; V09 add new placeable; V10 rename; V06 appearance; V07 flags; V11 move; S01 Adjust Location | V04/V05 `safe-repeatable`; V09/V10/V06/V07 `verified-after-reopen`; V11 `safe-repeatable`; S01 `gap` | Brak dokladnej edycji wspolrzednych; warianty template poza podstawowym barrel nadal slabo pokryte; brak osobnego atomu delete/copy/duplicate. | Dodac jeden nie-Barrel template pasujacy do Last City na testowym obszarze, nazwac, ustawic flagi, potwierdzic object count i reopened properties; nie zapisywac modulu bez zgody. |
| Skrzynia z lootem | V09 add placeable; V10 rename; V07 `Plot`/`Useable`/`Static`; S03 placeable inventory; S14 Find Instance/tag search | V09/V10/V07 `verified-after-reopen`; S03 `gap`; S14 dialog `opened-live`, tag-search `gap` | Nie otwarto live `Inventory Contents` dla placeable; `ZEP_SAFE001` nie jest stabilnie wybierany; techniczny readback filtra nie jest dowodem wpisania tagu. | Zaczac od stabilnego wyboru kandydata `ZEP_SAFE001` albo testowego pojemnika, otworzyc tylko inventory/contents editor, zrobic screenshot i zamknac `Cancel`; bez dodawania itemu. |
| Drzwi z przejsciem | S06 Door Properties; Area Transition tab; `Setup Area Transition`; walidacja markerow/target area | S06 `opened-live`; Door Properties tabs refresh `opened-live`; `Setup Area Transition` `gap` | Brak kontrolowanego setupu przejscia; brak potwierdzenia target area/door/waypoint po mutacji; brak bezpiecznego testowego duplikatu drzwi. | Na istniejacych drzwiach tylko odtworzyc wszystkie tabs i spisac stan lock/trap/transition przez screenshoty; `Setup Area Transition` dopiero po zgodzie albo na testowym duplikacie. |
| Ambient zaulka / sound | S05 Sound Properties; sound marker/radius; Play/Stop; volume restore; gestsza lokacja | S05 `opened-live`; playback/volume dialog-only `safe-repeatable` with `Cancel`; sound placement/radius mutation not verified | Screenshot nie dowodzi slyszalnosci; brak kontrolowanej zmiany radius/cutoff/loop/random; brak dowodu placement sound markera. | Na `hx_tygiel_under -> Sounds -> Fireplace` odtworzyc properties, radius/volume screeny, `Play`/`Stop`, restore raw volume `127`, `Cancel`; osobno zanotowac, ze audio wymaga innego dowodu niz screenshot. |
| Mgla i swiatlo obszaru | S04 Area Properties; Environment Options; S23 Use Area Lighting; S24 Fog; S22 Display Grid | S04 `opened-live`; targeted popup activation `gap`; S23/S24/S22 `safe-repeatable` jako widokowe toggle z restore | Brak kontrolowanej mutacji wartosci fog/lighting/day-night; Area Properties dla `enon_bakery` ma znane sciezki, ale targeted activation bywa niestabilne; brak saved before/after. | Otworzyc `Area Properties` znana bezpieczna sciezka, udokumentowac `Visual`/`Environment Options`, zamknac `Cancel`; propozyc jedna odwracalna zmiane dopiero jako osobny ticket po zgodzie. |
| NPC z dialogiem | S09 Creature Properties; S13 Creature inventory/equipment; S10 Conversation/Journal/Script; S16/S17 script/resource picker; NPC creation/binding | S09/S13/S10/S16/S17 `opened-live`; NPC creation/binding `screen-supported` albo nieudowodnione live | Brak dodania NPC; brak przypiecia conversation do creature; brak skryptowego bindingu na NPC; brak reopen po mutacji. | Na istniejacym `d_und -> Creatures -> Inzynier` otworzyc `Creature Properties`, przejsc `Scripts`/conversation-related fields, screenshoty, `Cancel`; creation/binding osobno po zgodzie. |
| Trigger sceny | S07 Trigger Properties; trigger Scripts tab; S10 Script Editor; rysowanie nowego trigger volume; binding eventu | Istniejacy `Trigger Properties` po HB-S49 `safe-repeatable`; Script Editor `opened-live`; new trigger volume `gap`; binding mutation `screen-supported`/gap | Brak rysowania nowego triggera; brak kontrolowanego wpisania/przypiecia skryptu; overlay triggerow moze zepsuc czytelnosc screenshotow. | Na `d_und` otworzyc istniejacy trigger, udokumentowac `Scripts` i visible fields, `Cancel`; nie rysowac nowego trigger volume w tym samym tickecie. |
| Szybka walidacja kadru po edycji | V02 canvas; V03 camera; S20 reset; S21 Object Filters Show None/All; S22 Display Grid; S23/S24 widokowe restore; reopened properties/object count | V02/V03/S21/S22/S23/S24 `safe-repeatable`; S20 `partial-live`; reopened properties zalezy od mutowanego obiektu | Brak jednego standardu dowodowego dla calego workflow; reset widoku nie jest pewnym rollbackiem; brak zapisanej matrycy screenshot names dla before/after/restored. | Dla nastepnej mutacji wymagac pakietu: before screenshot, after screenshot, object count albo reopened properties, rollback/restored screenshot; reset traktowac jako osobny eksperyment, nie jako pewny cleanup. |
| Zapis, reopen, build/test modulu | V01 session/recovery; Module Properties; Build/Test menu; runtime preview | V01 `safe-repeatable`; Module Properties `opened-live`; Build/Test menu atlas `opened-live`; runtime preview `reference-only`; save/reopen workflow `gap` | Nie ma atomu bezpiecznego `Save`/`Save As`/`Build Module` na testowej kopii; nie ma end-to-end dowodu, ze mala lokacja zostaje po reopenie albo dziala w runtime. | Przed prawdziwym budowaniem ustalic testowa kopie/backup i zgode na zapis; pierwszy live ticket tylko mapuje prompts Save/Build/Test bez zatwierdzania szerokich operacji. |

## Top 10 atomow dla samodzielnego budowania lokacji

| Rank | Atom | Status teraz | Dlaczego najbardziej przybliza |
| --- | --- | --- | --- |
| 1 | V01 uruchom Toolset, modul i area | `safe-repeatable` | Bez stabilnego startu i recovery nie ma wiarygodnych dowodow z zadnego kolejnego atomu. |
| 2 | S19 area tree context -> View Area | `opened-live` | Daje realny render area, a samo zaznaczenie w drzewie nie wystarcza. |
| 3 | V02 wybierz poprawny viewport/canvas | `safe-repeatable` | Chroni przed klikaniem ramki zamiast miejsca, gdzie faktycznie powstaja/mutuja sie obiekty. |
| 4 | V03 kamera - pan, rotate, zoom | `safe-repeatable` | Pozwala ogarnac kadr, robic porownywalne screenshoty i odzyskac widok roboczy. |
| 5 | V04 select placeable + Object Properties | `safe-repeatable` | To glowna brama do edycji istniejacych obiektow w lokacji. |
| 6 | V09 dodaj nowy placeable | `verified-after-reopen` | Najszybszy sprawdzony sposob budowania czytelnej scenografii. |
| 7 | V10 nazwij nowy placeable | `verified-after-reopen` | Daje kontrolowalnosc i pozniejsza walidacje obiektow po tagu/nazwie. |
| 8 | V11 przesun zaznaczony placeable | `safe-repeatable` | Pozwala komponowac uklad lokacji, nawet zanim mamy dokladne wspolrzedne. |
| 9 | S08 pojedynczy terrain paint + Undo | `mutated-live` dla jednego tile, rodzina `partial-live` | To jedyny live krok zmieniajacy geometrie/tile, ale wymaga konserwatywnego rollbacku i nie jest jeszcze safe-repeatable. |
| 10 | S22 Environment - Display Grid | `safe-repeatable` | Daje siatke i granice tile, czyli praktyczna kontrole przy malowaniu i ustawianiu obiektow. |

## Najwieksze dziury statusowe

1. Geometria lokacji jest nadal krucha: mamy single-tile paint z rollbackiem,
   ale nie mamy `Tile Properties`, pewnego group paint, ani reopen/save
   verification po zmianie terrain.
2. Interakcje lokacji nie sa domkniete: placeable inventory, tag-search przez
   `Find Instance`, `Setup Area Transition`, nowe trigger volume i bindingi
   sa nadal `gap` albo tylko obserwacyjne.
3. Brakuje end-to-end persistence/runtime lane: dokumentacja nie ma jeszcze
   bezpiecznej sciezki testowa kopia -> kontrolowana mutacja -> save -> reopen
   -> screenshot/runtime validation. Bez tego "mala lokacja" moze byc tylko
   sesyjnym dowodem, a nie utrwalonym rezultatem.

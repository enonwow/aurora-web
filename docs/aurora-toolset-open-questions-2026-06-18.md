# Aurora Toolset: open questions for Last City area building

Data: 2026-06-18

Rola: 4/6 rotation, open-questions analyst.

Zakres: lista brakow, ktore nadal wymagaja screenow z Aurory/Toolsetu przed
awansowaniem workflow budowania obszarow Last City. To nie jest raport live i
nie dodaje nowych dowodow. Zrodla przeczytane:

- `docs/aurora-toolset-last-city-area-build-playbook-2026-06-18.md`
- `docs/aurora-toolset-next-atoms-2026-06-18.md`

Zasada: pytanie jest zamkniete dopiero wtedy, gdy mamy czytelny screenshot
Toolsetu z nazwa modulu/area/obiektu oraz wymagany final bez modali. Parser,
hash, opis pilota albo zielony preview bez after-screena nie zamyka pytania.

## P0 - blokuje bezpieczne rozpoczecie budowania

### 1. Czy mamy czysty baseline modulu i konkretnej area Last City?

- Brak do potwierdzenia: clean frame `the_last_city - codex.mod`, bez popupu
  `Error`, z widoczna docelowa albo testowa area.
- Wplyw: bez tego kazdy kolejny atom moze pracowac na zlym oknie, zlym module
  albo z modalem zaslaniajacym scene.
- Screeny potrzebne: full-frame Toolset, tytul modulu, drzewo `Areas`, aktywny
  viewer/tab area, final no-modal.
- Powiazane atomy: `LC-001`, `NXA-WH-001`, `NXA-LC-006`.

### 2. Czy znamy realny canvas/HWND dla targetowanej area?

- Brak do potwierdzenia: jednoznaczny inner canvas pod `TfrmViewerArea`, a nie
  sama ramka viewera ani puste okno Toolsetu.
- Wplyw: targetowane `PostMessage`/`WM_COMMAND` i canvas click-message sa
  jedyna dozwolona sciezka bez globalnej myszy; zly target moze dac falszywy
  sukces albo przypadkowa mutacje.
- Screeny potrzebne: viewer area, dump child controls/rectow, kadr samego
  canvasu, final bez aktywnego modala.
- Powiazane atomy: `NXA-WH-002`.

### 3. Czy siatka i widok startowy nadaja sie do stawiania tile?

- Brak do potwierdzenia: `Display Grid` ma widoczny albo przynajmniej
  jednoznaczny stan na tej area, a restore wraca do stanu startowego.
- Wplyw: bez widocznej siatki trudno dowodzic wyboru kratki, footprintu,
  rollbacku i zgodnosci before/after.
- Screeny potrzebne: before, grid changed albo grid-on state, restored/final.
- Powiazane atomy: `NXA-WH-003`, `NXA-LC-007`.

### 4. Czy single-tile paint jest kontrolowany na tej area i wraca po Undo?

- Brak do potwierdzenia: Last-City-kompatybilny tile, zielony preview w
  konkretnej kratce, jeden paint, after-screen, `Undo`, finalny restore.
- Wplyw: pojedynczy tile jest podstawowym atomem geometrii; bez niego build
  musi zostac przy obserwacji, a nie budowaniu.
- Screeny potrzebne: palette/template, before grid, preview, after paint, after
  undo, final `Select Objects`/czytelny canvas.
- Powiazane atomy: `LC-003`, `NXA-LC-008`, `NXA-LC-009`.
- Nadal otwarte po rollbacku: czy ten sam tile ma pozniej bezpieczny
  `verified-after-reopen` po jawnej zgodzie na zapis/testowy modul.

### 5. Czy jeden placeable-clutter da sie dodac z pewnym count + cleanup?

- Brak do potwierdzenia: wybor bezpiecznego template typu crate/barrel/brazier,
  count before, dodanie dokladnie jednej instancji, count after, opcjonalny
  sprawdzony `Undo` albo jawny status `left-mutated-unsaved`.
- Wplyw: clutter jest pierwszym widocznym sygnalem Last City po geometrii; brak
  count proof grozi pomyleniem dodania, selekcji i przypadkowego duplikatu.
- Screeny potrzebne: paleta/template, before z count, after z nowym obiektem,
  tree/count after, final no-modal.
- Powiazane atomy: `LC-004`, `NXA-LC-011`.

### 6. Czy mozemy przesunac ten sam placeable bez zmiany object count?

- Brak do potwierdzenia: zaznaczony obiekt, maly move, after-screen, count
  przed/po bez zmiany, rollback albo jawny status unsaved.
- Wplyw: bez move/pozycjonowania nie da sie skladac wiarygodnego malego
  obszaru; samo dodanie w losowym miejscu nie wystarcza.
- Screeny potrzebne: before selected object, after moved object, count
  before/after, restored albo left-mutated-unsaved.
- Powiazane atomy: `LC-005`, `NXA-LC-012`.

## P1 - wysoki wplyw na wyglad i identyfikowalnosc lokacji

### 7. Czy Name/Tag placeable zapisuje sie i pokazuje po reopen?

- Brak do potwierdzenia: properties dla wlasciwego obiektu, edycja Name/Tag,
  `OK`, reopen tego samego obiektu i screen wartosci.
- Wplyw: bez stabilnych nazw/tagow trudno debugowac, przenosic i walidowac
  obiekty Last City.
- Screeny potrzebne: Basic tab before, pole po zmianie, reopened Basic tab,
  final canvas.
- Powiazane atomy: `NXA-LC-013`.

### 8. Czy `Adjust Location` albo inna precyzyjna edycja pozycji jest stabilna?

- Brak do potwierdzenia: otwarcie wlasciwego dialogu, odczyt X/Y/Z/orientacji,
  kontrolowana zmiana albo Cancel-only rozpoznanie.
- Wplyw: dla ciasnych miejskich obszarow Last City samo reczne przesuniecie
  moze nie wystarczyc do powtarzalnego ustawienia propsow.
- Screeny potrzebne: dialog z wartosciami before, ewentualny after/reopen,
  final no-modal.
- Powiazane atomy: brak domknietego atomu w next-atoms; wymaga osobnego
  ticketu po placeable move.

### 9. Czy group footprint jest czytelny i nie mutuje area przez przypadek?

- Brak do potwierdzenia: wybor malej grupy zgodnej z tilesetem, zielony/czerwony
  footprint, origin/rozmiar, wyjscie z preview bez paintu.
- Wplyw: grupy moga przyspieszyc budowe bryl, ale obecnie sa bardziej ryzykowne
  niz single tile.
- Screeny potrzebne: paleta group, footprint preview, final bez footprintu.
- Powiazane atomy: `NXA-LC-010`.
- Nadal otwarte: `Group paint` pozostaje gapem do osobnego testu tylko na test
  area.

### 10. Czy fog i `Use Area Lighting` sa bezpieczne na docelowej area?

- Brak do potwierdzenia: before/after/restored dla jednego toggle naraz na
  aktualnej area, z czytelnym finalem.
- Wplyw: klimat Last City zalezy od mgly i swiatla, ale zly toggle moze
  zostawic scene zbyt ciemna do dalszej pracy.
- Screeny potrzebne: before, after ambient, restored/final; osobno dla `Fog` i
  osobno dla `Use Area Lighting`.
- Powiazane atomy: `NXA-WH-004`, `NXA-WH-005`, `NXA-LC-014`.

### 11. Czy mutacje fog/lighting w `Area Properties` sa potwierdzone reopenem?

- Brak do potwierdzenia: nie tylko view toggle, ale realna edycja wartosci w
  properties, `OK`, reopen i odczyt wartosci.
- Wplyw: widokowy toggle pomaga w QA, ale nie buduje trwalego klimatu lokacji.
- Screeny potrzebne: Environment Options before, pole po zmianie, reopened
  properties, final canvas.
- Powiazane atomy: brak bezpiecznego atomu mutacji; obecnie tylko observation.

## P2 - potrzebne do pelniejszych interakcji Last City

### 12. Czy door transition da sie skonfigurowac bez ryzyka zlego targetu?

- Brak do potwierdzenia: `Setup Area Transition`, wybor destination, powrot do
  `Door Properties`, reopen z tym samym targetem.
- Wplyw: przejscia sa krytyczne dla grywalnej lokacji, ale bledny target moze
  popsuc nawigacje.
- Screeny potrzebne: Door Properties Basic, Area Transition before, picker/setup
  state, reopened Area Transition, final no-modal.
- Powiazane atomy: `NXA-LC-015` tylko observation; mutacja wymaga osobnego
  testowego obiektu.

### 13. Czy trigger volume i script binding sa kontrolowane po reopen?

- Brak do potwierdzenia: tworzenie nowego trigger volume, przypisanie skryptu
  w slotach, `OK`, reopen i widoczny trigger na canvasie.
- Wplyw: trigger scripts robia lokacje interaktywna, ale obecny dowod obejmuje
  glownie otwarcie properties istniejacego triggera.
- Screeny potrzebne: canvas before, trigger volume after, Scripts tab before,
  picker/editor/cancel albo OK, reopened Scripts tab.
- Powiazane atomy: `NXA-LC-015` tylko observation.

### 14. Czy sound marker da sie dodac albo stabilnie zmienic po reopen?

- Brak do potwierdzenia: dodanie nowego sound markera albo kontrolowana zmiana
  radius/cutoff/volume/loop/random na istniejacym markerze, z reopenem.
- Wplyw: ambient Last City wymaga dzwieku, ale screenshot sam w sobie nie
  potwierdzi slyszalnosci.
- Screeny potrzebne: Sound Properties before, Positioning/Advanced after,
  reopened values, final canvas bez modala.
- Dodatkowy brak: potrzebny osobny sposob zapisu dowodu slyszalnosci albo
  uczciwa klasyfikacja jako UI-only proof.

### 15. Czy final evidence pack po atomie jest kompletny i nie zawyza statusu?

- Brak do potwierdzenia: dla kazdego atomu istnieje komplet before/action/after
  /rollback/final, a status jest co najwyzej taki, jaki wspieraja screeny.
- Wplyw: bez tej bramki latwo awansowac preview-only albo observed-only do
  realnego budowania.
- Screeny potrzebne: lista sciezek, rozne hashe/rozmiary, czytelny Toolset,
  final no-modal i restored tool state.
- Powiazane atomy: `NXA-QA-016`, `NXA-QA-017`, `NXA-QA-018`, `NXA-QA-019`.

## Top 5 pytan do dowodu jako nastepne

1. Czy `the_last_city - codex.mod` ma czysty full-frame baseline z wlasciwa
   area, bez popupu i bez `responding=false`?
2. Czy znamy realny inner canvas/HWND tej area, a screenshot pokazuje dokladnie
   ten target?
3. Czy `Display Grid` i stan widoku da sie pokazac oraz przywrocic na tej area?
4. Czy single-tile preview -> paint -> Undo daje komplet screenow i finalny
   restore?
5. Czy jeden placeable-clutter da sie dodac z count before/after oraz
   bezpiecznym cleanupem albo jawnie oznaczonym `left-mutated-unsaved`?

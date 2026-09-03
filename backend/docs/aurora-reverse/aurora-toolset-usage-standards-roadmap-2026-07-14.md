# Mapa wdrażania standardów używania Aurora Toolset

Data utworzenia: 2026-07-14  
Zakres: natywny BioWare Aurora Neverwinter Nights Toolset oraz dowody zapisane
w repozytorium `aurora-web`.

## Cel dokumentu

Ten dokument jest nadrzędną, etapową listą funkcji, dla których ustanawiamy
powtarzalne standardy pracy w prawdziwym Aurora Toolset. Nie jest listą samych
możliwości Toolsetu ani deklaracją ukończenia na podstawie kodu, testu offline
lub opisu w dokumentacji.

Standard funkcji jest wykonany dopiero wtedy, gdy istnieją łącznie:

1. opis bezpiecznej procedury;
2. pełny przebieg w jednej żywej sesji Aurora Toolset;
3. zapis wyniku w roboczej kopii modułu, jeżeli funkcja mutuje moduł;
4. niezależny readback zapisanych danych albo runtime proof;
5. screenshoty przed i po operacji;
6. końcowy werdykt walidatora bez blockerów;
7. czyste zamknięcie sesji, jeżeli przebieg obejmuje zamknięcie Toolsetu.

## Znaczenie kolumny „Czy wykonano”

- **TAK** — istnieje sformalizowany standard oraz zaakceptowany live proof.
- **CZĘŚCIOWO** — istnieje live proof albo procedura, ale brakuje formalnego
  standardu, pełnego readbacku, rollbacku lub uniwersalnego walidatora.
- **NIE** — brak kompletnego live proofu. Dokument, test offline albo samo
  otwarcie okna nie podnosi tego statusu.
- **DO AUDYTU** — w repozytorium mogą istnieć starsze artefakty, ale przed
  uznaniem statusu trzeba sprawdzić ich kompletność według obecnego standardu.

## Stan początkowy mapy

| Etap | Zakres | Liczba funkcji | `TAK` | `CZĘŚCIOWO` | `NIE` | `DO AUDYTU` |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 0 | Zasady nadrzędne i proof | 8 | 1 | 7 | 0 | 0 |
| 1 | Dodawanie obiektów z palety | 10 | 10 | 0 | 0 | 0 |
| 2 | Zaznaczanie i transformacje | 10 | 7 | 0 | 3 | 0 |
| 3 | NPC i stworzenia | 9 | 9 | 0 | 0 | 0 |
| 4 | Przedmioty i placeable | 8 | 0 | 0 | 7 | 1 |
| 5 | Budowanie i konfiguracja Area | 11 | 0 | 2 | 9 | 0 |
| 6 | Obiekty logiczne | 7 | 0 | 1 | 6 | 0 |
| 7 | Moduł, skrypty i runtime | 6 | 0 | 1 | 5 | 0 |
| 8 | Walidacja i utrzymanie | 6 | 0 | 3 | 3 | 0 |
| **Razem** |  | **75** | **27** | **14** | **33** | **1** |

Licznik dotyczy standardów funkcji, a nie liczby wykonanych eksperymentów,
plików, testów lub screenshotów. Aktualizacja dowolnego wiersza wymaga również
aktualizacji tego podsumowania.

## Etap 0 — zasady nadrzędne i proof

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S00-01 | Jedna sesja Toolsetu | Otworzyć albo odzyskać jeden proces, wykonać całą sekwencję i zamknąć go jeden raz. | Drugi proces, ponowne `Open Module`, stare HWND, restart żywej sesji. | **CZĘŚCIOWO** — potwierdzone w kilku przebiegach, potrzebny jeden uniwersalny validator sesji. |
| AUR-S00-02 | PID-first recovery | Po błędzie najpierw sprawdzić PID, responsywność, okna i modale; restartować tylko martwy proces albo na polecenie użytkownika. | Utrata focusu mylona z zatrzymaniem Aurory, ukryte okno, Access Violation. | **CZĘŚCIOWO** |
| AUR-S00-03 | Brak globalnego inputu | Sterować wyłącznie zwalidowanymi kontrolkami Toolsetu, bez przejmowania kursora i klawiatury użytkownika. | `SendKeys`, `SetCursorPos`, kliknięcie aktywnego okna użytkownika, zły monitor. | **TAK** dla zaakceptowanych przebiegów; zasada opisana w standardzie operacyjnym. |
| AUR-S00-04 | Właściwy moduł i Area | Przed mutacją potwierdzić ścieżkę i hash modułu, tytuł okna, Area resref oraz właściwy viewer/canvas. | MRU otwiera zły moduł, zaznaczenie Area bez `View Area`, pomylenie źródła z kopią roboczą. | **CZĘŚCIOWO** |
| AUR-S00-05 | Uniwersalna paczka proof | Ujednolicić `before`, wybór funkcji, `after`, `after-save`, crop, manifesty, rekordy, summary i wynik zamknięcia. | Screenshot bez efektu strukturalnego, brak baseline, niespójne nazwy, brak hashy. | **CZĘŚCIOWO** — kompletna dla placeable, nie jest jeszcze wspólna dla wszystkich rodzin. |
| AUR-S00-06 | Uniwersalny walidator wyniku | Walidować status, wymagane artefakty, oczekiwaną deltę, brak zmian innych rodzin i brak blockerów. | Validator dopasowany do jednej rodziny, fałszywe `verified`, brak kontroli cross-kind. | **CZĘŚCIOWO** — istnieje validator placeable. |
| AUR-S00-07 | Bezpieczny Save | Zapisać wyłącznie kopię roboczą rozpoznaną komendą, bez zgadywania `WM_COMMAND`. | Zapis źródła, błędny command ID, gwiazdka pozostaje, modal przy zamykaniu. | **CZĘŚCIOWO** |
| AUR-S00-08 | Czyste zamknięcie | Zamknąć zweryfikowane okno i potwierdzić zero procesów oraz modali. | Zamknięcie złego okna, niepotwierdzony save, orphaned process. | **CZĘŚCIOWO** — potwierdzone live, do włączenia w każdy standard. |

## Etap 1 — wspólne dodawanie obiektów z palety

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S01-01 | Placeable placement | Wybrać tekstowo liść `Placeables`, postawić dokładnie jeden obiekt, zapisać i potwierdzić rekord GIT. | Zielony preview bez rekordu, podwójny placement, kliknięcie ramki zamiast `TScrollBox`. | **TAK** — [standard](aurora-toolset-placeable-placement-standard.md) i [live proof](evidence/placeable-live-standard-2026-07-14/README.md). |
| AUR-S01-02 | Creature/NPC placement | Postawić dokładnie jednego NPC z palety, zapisać oraz potwierdzić resref, tag, pozycję i deltę liczników. | Zła gałąź palety, drugi NPC, brak wyjścia z placement mode, pomylenie creature z encounter. | **TAK** — [standard](aurora-toolset-creature-npc-placement-standard.md) i [poprawiony live proof](evidence/palette-placement-corrected-live-2026-07-14/README.md) z natywnym Objects checked-state. |
| AUR-S01-03 | Item ground placement | Postawić dokładnie jeden przedmiot na ziemi, zapisać i potwierdzić rekord item w Area GIT. | Item niewidoczny w kadrze, placement w inventory zamiast Area, mały model utrudniający proof wizualny. | **TAK** — [standard](aurora-toolset-item-ground-placement-standard.md) i [poprawiony live proof](evidence/palette-placement-corrected-live-2026-07-14/README.md) z natywnym Objects checked-state. |
| AUR-S01-04 | Door placement | Dodać jedne drzwi bez konfigurowania przejścia i potwierdzić ich rekord oraz orientację. | Drzwi wymagają właściwego tile/hook point, zła orientacja, duplikat. | **TAK** — [standard](aurora-toolset-door-placement-standard.md), `Barn Door`, `doors 0→1`, exact hook `(35, 25.76, 0)` i [accepted live proof](evidence/door-hook-live-standard-2026-07-14/README.md). |
| AUR-S01-05 | Encounter placement | Wybrać template i narysować poprawną geometrię encountera. | Niedomknięty polygon, przypadkowy double-click, brak spawn pointów. | **TAK** — [standard](aurora-toolset-encounter-placement-standard.md), `Gnoll Encounter`, cztery punkty GIT i `encounters 0→1` w [live proofie](evidence/polygon-placement-live-standard-2026-07-14/README.md). |
| AUR-S01-06 | Merchant placement | Dodać jeden store/merchant i potwierdzić rekord oraz template. | Pomylenie NPC kupca ze store, brak inventory sklepu, obiekt niewidoczny. | **TAK** — [standard](aurora-toolset-merchant-placement-standard.md), `Dye Store`, `stores 0→1` w [live proofie](evidence/palette-placement-corrected-live-2026-07-14/README.md). |
| AUR-S01-07 | Sound placement | Postawić marker dźwięku i potwierdzić jego pozycję oraz properties. | Screenshot nie dowodzi słyszalności, niewidoczny radius, błędny dźwięk. | **TAK** — [standard](aurora-toolset-sound-placement-standard.md), `Animal Cries Day`, `sounds 0→1` w [live proofie](evidence/palette-placement-corrected-live-2026-07-14/README.md). |
| AUR-S01-08 | Trigger placement | Narysować jeden zamknięty trigger volume i potwierdzić geometrię w GIT. | Niedomknięty polygon, overlay zasłania scenę, przypadkowy dodatkowy vertex. | **TAK** — [standard](aurora-toolset-trigger-placement-standard.md), `New Generic`, cztery punkty GIT i `triggers 0→1` w [live proofie](evidence/polygon-placement-live-standard-2026-07-14/README.md). |
| AUR-S01-09 | Waypoint placement | Dodać waypoint, ustawić tag i potwierdzić pozycję. | Marker niewidoczny przy filtrach, zduplikowany tag, pomylenie start location z waypointem. | **TAK** — [standard](aurora-toolset-waypoint-placement-standard.md), [placement proof](evidence/palette-placement-corrected-live-2026-07-14/README.md) oraz [tag mutation proof](evidence/waypoint-tag-live-standard-2026-07-14/README.md). |
| AUR-S01-10 | Uniwersalny standard palety | Wspólny mechanizm rozpoznania rodziny, drzewa, ścieżki kategorii, liścia i powrotu do `Select Objects`. | Historyczna kolejność ikon, stale HWND, scroll zmienia pozycję liścia, retry tworzy duplikat. | **TAK** — [wspólny standard](aurora-toolset-palette-placement-standard.md), accepted proofy wszystkich dziewięciu rodzin oraz [aggregate validator 10/10](evidence/stage1-palette-standards-2026-07-14/README.md). |

## Etap 2 — zaznaczanie i transformacje obiektów

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S02-01 | Zaznaczenie obiektu | Przejść do `Select Objects`, wskazać jeden obiekt i potwierdzić jego tożsamość przez properties/readback. | Pozostawiony placement mode, overlap, zaznaczenie tile'a albo innego obiektu. | **TAK** — [standard](aurora-toolset-object-selection-standard.md), [live proof](evidence/object-selection-adjust-location-live-standard-2026-07-14/README.md), validator `ok=true`. |
| AUR-S02-02 | Przesunięcie myszą | Przesunąć jeden obiekt w Area i potwierdzić zmianę X/Y/Z po zapisie. | Drag obraca kamerę, snap przenosi obiekt inaczej niż oczekiwano, zmienia się Z. | **TAK** — targetowany drag `AnimalCriesDay`, Save dał `x 37.7566→41.8832`; native Undo `56` + Save przywróciły dokładne `objects.csv`. [packet](evidence/stage2-completion-live-2026-07-14/README.md). |
| AUR-S02-03 | Adjust Location X/Y/Z | Ustawić dokładne współrzędne i wykazać zgodność UI, zapisanego GIT oraz rollbacku. | Lokalny kontra world coordinate, separator dziesiętny, clamp albo utrata precyzji. | **TAK** — [standard](aurora-toolset-adjust-location-standard.md), exact GIT mutation i native Undo do byte-identical baseline w [live proofie](evidence/object-selection-adjust-location-live-standard-2026-07-14/README.md). |
| AUR-S02-04 | Bearing i obrót | Ustawić dokładny bearing/rotation, zapisać, odczytać i przywrócić baseline. | Stopnie kontra radiany, wrap 0/360, odwrócona oś. | **TAK** — [standard](aurora-toolset-bearing-rotation-standard.md), UI `45°`, GIT `270→225`, exact Undo i [accepted live proof](evidence/bearing-undo-redo-live-standard-2026-07-14/README.md). |
| AUR-S02-05 | Scale/rotation/translation placeable | Przejść przez cały zestaw transformacji placeable’a z readbackiem i rollbackiem. | Sprzężone osie, wartości nieutrwalane, wizualna zmiana bez poprawnego pola GFF. | **TAK** — 11 pól UI, native Save, parserowy `VisualTransform=1`, następnie zapisany rollback do dokładnego baseline. [packet](evidence/stage2-completion-live-2026-07-14/README.md). |
| AUR-S02-06 | Copy/Paste | Skopiować dokładnie jeden obiekt i potwierdzić jeden nowy rekord. | Dwa obiekty po retry, skopiowane tagi, offset poza obszar. | **TAK — placeable**: `Water Trough` przez native Copy `59` → Paste `61` → commit preview → Save dał `placeables 3→4`, `total 18→19`; Undo `56` + Save zwróciło byte-identyczne parserowe `objects.csv` oraz clean close. [live proof](evidence/copy-paste-placeable-live-2026-07-14/README.md). Pełny `.mod` został zrepackowany, co jest jawnie zapisane w proofie. |
| AUR-S02-07 | Duplicate | Zduplikować obiekt natywną funkcją i zweryfikować deltę oraz właściwości kopii. | Brak rozróżnienia oryginału i kopii, konflikt tagów/resref. | **TAK — workflow semantyczny**: Toolset nie ma pojedynczej komendy Duplicate, więc natywną duplikacją jest zwalidowane `Copy 59 → Paste 61 → commit → Save`; proof daje `placeables 3→4`, a Undo `56` + Save zwraca dokładny parserowy baseline. [standard](aurora-toolset-duplicate-standard.md), [packet](evidence/stage2-completion-live-2026-07-14/README.md). |
| AUR-S02-08 | Delete | Usunąć dokładnie jeden wskazany obiekt i potwierdzić `-1` wyłącznie właściwej rodziny. | Usunięcie złego obiektu, kaskadowe referencje, brak zapisu. | **TAK** — [standard](aurora-toolset-object-delete-standard.md), targeted `VK_DELETE`, `doors 1→0`, `total 2→1` i [accepted live proof](evidence/door-hook-live-standard-2026-07-14/README.md). |
| AUR-S02-09 | Undo/Redo | Potwierdzić dokładną mutację, Undo do baseline i Redo do mutacji. | Stos Undo zawiera wcześniejsze akcje, zmiany properties grupują się inaczej. | **TAK** — [standard](aurora-toolset-undo-redo-standard.md), exact `baseline→mutated→Undo→Redo→final Undo` i [accepted live proof](evidence/bearing-undo-redo-live-standard-2026-07-14/README.md); starszy [negative proof](evidence/redo-live-standard-2026-07-14/README.md) pozostaje testem regresji. |
| AUR-S02-10 | Rozstrzyganie overlapu | Powtarzalnie wybrać właściwy obiekt spośród nakładających się instancji. | Z-order, filtry obiektów, obiekt niewidoczny lub bardzo mały. | **TAK — scope: deterministic topmost selection**: [standard](aurora-toolset-overlap-topmost-selection-standard.md), mixed-kind overlap `Water Trough` + `Dwarf Mercenary` pod tym samym viewportem i współrzędnymi GIT; dwa native kliknięcia zwróciły ten sam TreeView caret `Water Trough` / ten sam HWND. Save `18→20`, dwa native Undo i Save zwróciły byte-identyczne parserowe `objects.csv`, sesja została czysto zamknięta. [live proof](evidence/overlap-topmost-selection-live-2026-07-14/README.md). Nie zalicza cycling ani wyboru zasłoniętego obiektu. |

## Etap 3 — właściwości NPC i stworzeń

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S03-01 | Name, tag i resref NPC | Zmienić identyfikatory, zapisać, ponownie otworzyć properties i odczytać rekord UTC/GIT. | Resref może być template-only, konflikt tagów, stare pole tekstowe. | **TAK** — validator identity, native Save/readback i rollback. |
| AUR-S03-02 | Frakcja | Ustawić frakcję NPC i zweryfikować zapis oraz zachowanie w runtime. | UI pokazuje wybór bez zapisu, reputacja zależy od modułu. | **TAK** — zapis frakcji, runtime `S03_FACTION_ENEMY` i rollback do `factionId: 1`. |
| AUR-S03-03 | Conversation binding | Przypisać conversation, zapisać i uruchomić rozmowę w grze. | Brak zasobu DLG, zły resref, dialog nie startuje mimo zapisanego pola. | **TAK** — `nw_hen_bod` w GIT, uruchomiony DLG i końcowy brak bindingu. |
| AUR-S03-04 | Script event bindings | Przypisać skrypty zdarzeń, skompilować i potwierdzić binding/readback/runtime. | Skrypt nie istnieje, compile error, binding do złego eventu. | **TAK** — jedno `void main()`, native compile `0 Errors`, heartbeat/runtime/readback/rollback. |
| AUR-S03-05 | Inventory NPC | Dodać przedmiot do inventory, zapisać, odczytać UTC i potwierdzić runtime. | Item trafia do złego slotu, duplikat, zasób tylko w template. | **TAK** — natywne D&D `0→1→0`, GIT i runtime `S03_INVENTORY_OK`. |
| AUR-S03-06 | Equipment NPC | Założyć przedmiot w konkretnym slocie i potwierdzić wygląd oraz dane. | Konflikt slotów, appearance nie odświeża się, item niewłaściwego typu. | **TAK** — natywne D&D `2→3→2`, amulet `slotMask: 512`, widok i GIT. |
| AUR-S03-07 | Statystyki, klasy i poziomy | Zmienić kontrolowany zestaw statystyk, zapisać i odczytać wynik. | Automatyczna rekalkulacja, zależności feat/skill/level, utrata ręcznych wartości. | **TAK** — Strength `15→17→15`, Fighter `1→2→1`, UI/GIT/rollback. |
| AUR-S03-08 | Appearance | Zmienić appearance NPC i potwierdzić properties, zapis oraz render. | Model niewidoczny, brak zasobu, różnica między portrait i appearance. | **TAK** — widoczny render, native after-save readback i rollback validatora. |
| AUR-S03-09 | Waypoint/spawn behavior | Powiązać NPC z waypointem albo logiką spawn i wykazać działanie w runtime. | Zły tag waypointu, heartbeat/OnSpawn nadpisuje zachowanie. | **TAK** — tag `baseline→proof→baseline`, zachowana geometria i runtime `S03_WAYPOINT_OK`. |

## Etap 4 — przedmioty i placeable

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S04-01 | Właściwości itemu | Zmienić nazwę/tag/resref i kontrolowane właściwości, zapisać oraz odczytać UTI/GIT. | Różnica między template i instancją, pola lokalizowane, właściwości zależne od base item. | **TAK** — UI, Save/GIT, izolowana delta i rollback. |
| AUR-S04-02 | Stack/plot/cursed/identified/droppable | Zweryfikować każdą flagę osobno oraz jej utrwalenie i efekt runtime. | Flagi zależne od rodzaju itemu, UI może pokazywać stan instancji lub template. | **TAK** — osobne próby, odczyt ograniczeń typu bazowego i rollback. |
| AUR-S04-03 | Item do inventory NPC | Przenieść jeden item do inventory NPC, potwierdzić usunięcie z ziemi i obecność w UTC. | Powstaje kopia zamiast przeniesienia, zły właściciel, dwa rekordy. | **TAK** — natywne D&D bez globalnego kursora, ziemia `3→2`, UTC `0→1`, pełny rollback. |
| AUR-S04-04 | Inventory placeable | `Has Inventory` → `Inventory Contents` → dodanie itemu → save/readback → rollback. | Niestabilny wybór placeable, item nie zapisuje się, duplikat, brak pełnego rollbacku. | **TAK** — `hasInventory/itemList 0→1→0`, widoczny proof i GIT. |
| AUR-S04-05 | Skrypty placeable | Bind/create/edit/compile/readback/rollback jako jeden przebieg. | Compile error, binding starego resref, edycja źródła zamiast kopii. | **TAK** — jedno `void main()`, compile, binding/runtime/readback i rollback. |
| AUR-S04-06 | Static/useable/locked | Zmieniać flagi pojedynczo, potwierdzać zapis i zachowanie runtime. | Sprzeczne flagi, obiekt znika z interakcji, lock wymaga dodatkowych pól. | **TAK** — trzy izolowane delty i wspólny końcowy baseline. |
| AUR-S04-07 | Appearance placeable | Zmienić appearance/model i potwierdzić rekord oraz widoczny rezultat. | Model nie pasuje do footprintu, brak zasobu, cached render. | **TAK** — UI/render/GIT i rollback. |
| AUR-S04-08 | Animacje placeable | Ustawić/testować dostępne animation states i wykazać rezultat w runtime. | Animacja nie istnieje dla modelu, stan nie jest persistent, potrzebny skrypt. | **TAK** — UI/render/runtime/GIT i rollback. |

## Etap 5 — budowanie i konfiguracja Area

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S05-01 | Pojedynczy tile paint | Zmienić dokładnie jeden tile, zapisać, odczytać layout i potwierdzić po reopen. | Malowanie sąsiednich tile’i, stale projection, zła orientacja, brak persistence. | **TAK** — live `area001`: Feature `Ground with grass patch`, dokładnie `index 35 / row 4 / col 3`, `Tile_ID 183→34`, `64/64` identyczne po reopen i `64/64` po rollback; validator 8/8. [packet](evidence/stage5-live-2026-07-16/s05-01-single-tile/README.md). |
| AUR-S05-02 | Malowanie grupy terenu | Postawić kontrolowany większy fragment i zweryfikować wszystkie zmienione tile’e. | Automatyczne dopasowanie sąsiadów, nieprzewidywalna liczba zmian. | **TAK** — `Water` na `area001`, kontrolowany footprint `2×2`, indeksy `27,28,35,36`, wszystkie delty źródłowe zweryfikowane i pełny rollback. [packet](evidence/stage5-live-2026-07-16/s05-02-group-terrain/README.md). |
| AUR-S05-03 | Features i Groups | Wybrać i postawić prefab/feature oraz zweryfikować jego footprint. | Brak miejsca, automatyczna rotacja, zmiana wielu tile’i. | **TAK** — Feature `Ground with grass patch` ma dokładnie 1 tile; Group `Small square (2x2)` ma źródłowo zwarty footprint `4×4` (rdzeń + border przejściowy), wszystkie 16 delt zweryfikowane, `64/64` po rollback. [packet](evidence/stage5-live-2026-07-16/s05-03-features-groups/README.md). |
| AUR-S05-04 | Tile Properties | Otworzyć właściwy tile, zmienić jedną właściwość, zapisać i odczytać wynik. | Zaznaczony inny tile, indeksacja 0/1, properties nie dotyczą source tile. | **TAK** — `area001`, tile `38`, dokładnie `mainLight1 1→2`, brak zmian obiektów, atomowy GUI-thread bridge bez globalnego inputu i bajtowo dokładny rollback. [packet](evidence/stage5-live-2026-07-16/s05-04-tile-properties/README.md). |
| AUR-S05-05 | Kreator nowego Area | Utworzyć testowe Area z kontrolowanym tilesetem, rozmiarem i resref. | Nieodwracalny wpis w module, konflikt resref, błędny tileset. | **TAK** — `MicroSet`/`Tiny`, packed ARE/GIT/GIC + IFO readback, atomowe dwa potwierdzenia Delete i dokładny rollback do trzech resrefów; `stage5-live-2026-07-16/s05-05-new-area`. |
| AUR-S05-06 | Zmiana rozmiaru Area | Zmienić wymiary testowego Area i zweryfikować zachowanie istniejącej zawartości. | Ucięcie obiektów/tile’i, przesunięcie origin, kosztowna operacja. | **TAK — ZWERYFIKOWANY NEGATYWNY**: native `2×2→4×4` zachowuje tylko 4 rekordy tile i tworzy 12 pustych `tile cells`; fill/Undo dają dokładne AV. Produkcyjny expand odrzucony, wymagany `Tile_List.length == Width*Height`, większy Area tworzyć od razu w Wizardzie; `stage5-live-2026-07-16/s05-06-area-resize`. |
| AUR-S05-07 | Fog i lighting | Zmienić jedną wartość środowiska, zapisać, odczytać GFF i porównać obraz. | Efekt zależny od pory dnia, screenshot exposure, pomylone preview toggle. | **NIE** |
| AUR-S05-08 | Day/night i weather | Ustawić cykl, pogodę i parametry, następnie potwierdzić w runtime. | Toolset preview różni się od gry, losowość, potrzebny dłuższy proof. | **NIE** |
| AUR-S05-09 | Music i ambient | Ustawić zasoby muzyki/ambientu i potwierdzić readback oraz słyszalność. | Screenshot nie dowodzi audio, brak zasobu, głośność systemowa. | **NIE** |
| AUR-S05-10 | Reset/recenter kamery | Odtworzyć kontrolowany widok Area po pan/rotate/zoom. | Brak natywnego absolutnego readbacku dla każdego kontekstu, reset zmienia focus. | **CZĘŚCIOWO** — istnieje zweryfikowany absolutny przebieg kamery, ale nie uniwersalny reset każdej Area. |
| AUR-S05-11 | Save/reopen Area | Po mutacji zamknąć i ponownie otworzyć Area/moduł oraz wykazać identyczny zapisany stan. | Cache sesji, otwarcie złej kopii, niezapisany subresource. | **NIE** jako uniwersalny standard. |

## Etap 6 — drzwi, triggery, dźwięki i obiekty logiczne

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S06-01 | Door properties | Zmienić kontrolowaną właściwość drzwi i zweryfikować zapis/readback. | Lock/trap/transition są sprzężone, instancja kontra template. | **CZĘŚCIOWO** — properties były otwierane live, brak zaakceptowanej mutacji. |
| AUR-S06-02 | Area transition end-to-end | Door lub Trigger → destination Area/door/waypoint → zapis → przejście w runtime. | Zły target tag, pętla przejść, brak docelowego Area, utrata pozycji. | **NIE** |
| AUR-S06-03 | Trigger scripts | Przypisać event script do nowego triggera, skompilować i uruchomić go w runtime. | Zła geometria, compile error, event nie odpala. | **NIE** |
| AUR-S06-04 | Sound radius/loop/random | Skonfigurować marker, zapisać pola i zebrać proof obrazu oraz dźwięku. | Brak słyszalności mimo poprawnego GFF, losowy playback, promień poza Area. | **NIE** |
| AUR-S06-05 | Encounter spawn | Skonfigurować creature list, difficulty/spawn i potwierdzić encounter w runtime. | Warunki aktywacji, faction, spawn poza geometrią, jednorazowość. | **NIE** |
| AUR-S06-06 | Merchant inventory/runtime | Uzupełnić sklep, zapisać i otworzyć interfejs handlu w grze. | Store bez właściciela, ceny zależne od ustawień, itemy nie zapisują się. | **NIE** |
| AUR-S06-07 | Waypoint jako cel | Użyć waypointu w przejściu, skrypcie albo zachowaniu NPC i wykazać efekt. | Literówka w tagu, duplikat tagu, niewłaściwe Area. | **NIE** |

## Etap 7 — moduł, skrypty i runtime

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S07-01 | Save kontra Save As | Rozróżnić i zwalidować obie operacje na kopii roboczej bez zgadywania command ID. | Nadpisanie źródła, modal ścieżki, format/nazwa pliku. | **CZĘŚCIOWO** — Save użyty skutecznie; brak osobnego pełnego standardu Save As. |
| AUR-S07-02 | Build Module | Zbudować testową kopię modułu i zachować log oraz wynik. | Długi build, brak zasobów, modal, zmiana wielu plików. | **NIE** |
| AUR-S07-03 | Compile scripts | Skompilować wskazane skrypty, zapisać log i zweryfikować NCS/binding. | Include path, stale NCS, warning traktowany jak sukces. | **NIE** jako pełny standard. |
| AUR-S07-04 | Test Module | Uruchomić właściwą kopię modułu w grze i potwierdzić Area/start location. | Gra otwiera inny moduł, zły start, przejęcie focusu, zawieszony proces. | **CZĘŚCIOWO** — centralny atom `aur-s07-runtime-execution.mjs` uzbraja user-owned Test Module action i read-only weryfikuje pojedynczy `nwmain` + MOD/Area/start handoff; brak jeszcze świeżego live proof. |
| AUR-S07-05 | Runtime proof funkcji | Dla funkcji behawioralnych zebrać dowód działania w grze, nie tylko zapis GFF. | Screenshot nie dowodzi audio/logiki, potrzebne wideo/log lub stan przed/po. | **CZĘŚCIOWO** — centralny validator wymaga immutable profile, native geometry gate, runtime capture, engine/load log i visible-model state; brak jeszcze live proof. |
| AUR-S07-06 | Persistence po ponownym uruchomieniu | Zamknąć Toolset, ponownie otworzyć kopię i potwierdzić te same dane oraz obraz. | MRU, cache, zła kopia, brak stabilnego kadru porównawczego. | **NIE** jako wspólny standard. |

## Etap 8 — pełna walidacja i utrzymanie standardów

| ID | Funkcja | Opis | Potencjalne problemy | Czy wykonano |
| --- | --- | --- | --- | --- |
| AUR-S08-01 | Macierz funkcja → proof | Dla każdego ID wskazać standard, accepted run, summary, screenshoty, readback i validator. | Martwe linki, artefakty w `.codex-tmp`, proof z innej wersji Toolsetu. | **NIE** |
| AUR-S08-02 | Reprodukcja na drugim obiekcie | Powtórzyć każdy standard na innym template/Area, aby wykluczyć fixture-specific success. | Procedura działa tylko dla jednej pozycji palety lub jednego modułu. | **NIE** |
| AUR-S08-03 | Test negatywny | Zachować kontrolowany failed proof dla braku delty, duplikatu lub złego rodzaju. | Przypadkowa trwała mutacja, validator nie rozpoznaje błędu. | **CZĘŚCIOWO** — istnieje dla części systemu kamery, Door placement poza hookiem oraz błędnego helpera Copy/Paste; nadal nie obejmuje całej matrycy. |
| AUR-S08-04 | Wersjonowanie standardu | Zapisywać wersję kontraktu w summary i unieważniać przestarzałe proofy po zmianie wymagań. | Stary proof wygląda jak aktualny, schema drift. | **CZĘŚCIOWO** — placeable używa wersji `v1`. |
| AUR-S08-05 | Rejestr blockerów | Każdy brak nazwać kodem, dowodem, etapem recovery i warunkiem wznowienia. | Ogólnik „Aurora nie działa”, restart bez diagnozy, utrata sesji. | **CZĘŚCIOWO** |
| AUR-S08-06 | Audit zamknięcia etapu | Etap zamknąć dopiero, gdy wszystkie funkcje mają `TAK` albo jawnie zaakceptowany blocker. | Zamknięcie etapu na podstawie liczby dokumentów/testów. | **NIE** |

## Kolejność realizacji

1. **Etap 1 zamknięty:** wszystkie dziewięć rodzin palety ma standard i accepted
   live proof; Door ma dodatkowy kontrakt natywnego hooku.
2. **Wykonać Etap 2:** zaznaczenie, dokładna lokalizacja, obrót, kopiowanie,
   usuwanie oraz pełny rollback.
3. **Wykonać Etapy 3–4:** properties, inventory, equipment i skrypty dla NPC,
   itemów i placeables jako pełne, niepodzielne workflow.
4. **Wykonać Etap 5:** terrain, Area Properties oraz save/reopen.
5. **Wykonać Etap 6:** Door/Trigger/Sound/Encounter/Merchant/Waypoint.
6. **Wykonać Etap 7:** Build, compile, Test Module i runtime proof.
7. **Zamknąć Etap 8:** druga reprodukcja, testy negatywne i kompletna macierz
   accepted proofów.

## Najbliższy pakiet pracy

| Kolejność | ID | Rezultat wymagany do zmiany statusu na `TAK` |
| ---: | --- | --- |
| 1 | AUR-S02-06 | Copy/Paste dokładnie jednego obiektu i izolowana delta `+1`. |
| 2 | AUR-S02-07 | Duplicate jednego obiektu i rozróżnienie oryginału od kopii. |
| 3 | AUR-S02-10 | Powtarzalne rozstrzygnięcie overlapu dla dwóch instancji. |
| 4 | AUR-S04-04 | `Has Inventory` → item → save/readback → rollback na placeable. |
| 5 | AUR-S06-01 | Jedna kontrolowana mutacja Door Properties z readbackiem i rollbackiem. |
| 6 | AUR-S05-11 | Save/reopen Area z identycznym readbackiem po ponownym otwarciu. |

## Dokumenty powiązane

- [Ogólny standard operacyjny Aurora Toolset](aurora-toolset-operating-standard.md)
- [Zweryfikowany standard dodawania placeable](aurora-toolset-placeable-placement-standard.md)
- [Wspólny standard placementu z palety](aurora-toolset-palette-placement-standard.md)
- [Zweryfikowany standard dodawania NPC](aurora-toolset-creature-npc-placement-standard.md)
- [Zweryfikowany standard dodawania itemu na ziemię](aurora-toolset-item-ground-placement-standard.md)
- [Zweryfikowany standard Door](aurora-toolset-door-placement-standard.md)
- [Zweryfikowany standard Delete](aurora-toolset-object-delete-standard.md)
- [Zweryfikowany standard bearing](aurora-toolset-bearing-rotation-standard.md)
- [Zweryfikowany standard Undo/Redo](aurora-toolset-undo-redo-standard.md)
- [Częściowy standard Copy/Paste z jawnym blockerem](aurora-toolset-copy-paste-standard.md)
- [Standard sterowania kamerą](aurora-toolset-camera-standard-2026-07-11.md)
- [Standard celu viewportu](aurora-toolset-viewport-target-standard.md)
- [Zaakceptowany live run standardu sesji i kamery](aurora-toolset-standard-live-run-2026-07-13.md)
- [Audyt wykorzystania PoC i przyczyn spowolnienia](AURORA_TOOLSET_POC_REUSE_AND_SPEED_AUDIT_2026-07-14.md)
- [Egzekwowalne manifesty funkcji Toolsetu](function-manifests/index.json)
- [Historyczny readiness board budowania lokacji](../../../docs/aurora-toolset-location-building-readiness-board-2026-06-18.md)

## Reguła aktualizacji

Zmiana `NIE`, `DO AUDYTU` lub `CZĘŚCIOWO` na `TAK` wymaga dodania w tym samym
commicie albo pakiecie pracy linku do standardu, katalogu live evidence oraz
wyniku walidatora. Bez tych trzech odnośników status pozostaje nieukończony.

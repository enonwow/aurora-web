# Aurora Toolset — standard NPC / creature (Etap 3)

Data: 2026-07-14  
Status: **ukończony i zweryfikowany live — AUR-S03-01..09 = `TAK`**.

## Kontrakt sesji

1. Pracuj w jednym, już potwierdzonym procesie `nwtoolset`; po błędzie najpierw odczytaj PID, okna i modale.
2. Nie zamykaj ani nie restartuj Toolsetu w trakcie sekwencji. Nie zmieniaj `nwtoolset.ini` ani MRU.
3. Używaj wyłącznie odczytanych HWND, kontrolek i pozycji w `TTreeView`; bez `SendKeys` i bez globalnego kursora/myszy/klawiatury. Natywne VCL D&D inventory/equipment wykonuje [bridge handlera na wątku GUI](aurora-toolset-inventory-equipment-dnd-standard.md); fizyczne D&D i patchowanie IAT są zabronione.
4. Przed zapisem wykonaj screenshot `before`, po zmianie `after`, po Save — parser GIT/UTC, a po rollbacku — drugi parser.
5. Funkcja zachowania (frakcja, conversation, skrypt, inventory, equipment, waypoint) wymaga dodatkowo dowodu w grze. Compile albo GIT nie zastępuje runtime.
6. Przed wywołaniem `Properties` sprawdź top-level okna procesu. Nie otwieraj drugiego `Creature Properties`, `Script Editor` ani `Select Resource`; selektor zasobów może być tylko krótkim oknem potomnym aktywnego dialogu i musi zostać zamknięty przed następną akcją. Helper `inspect-invoke-aurora-toolset-visible-context-menu-no-global-input.mjs` wymusza tę zasadę dla `&Properties` przez `properties_blocked_by_open_toolset_dialog`.
7. Po zamknięciu i ponownym otwarciu dialogu zawsze pobierz świeże HWND kontrolek. Nie używaj uchwytów z poprzedniej instancji okna: mogą wskazywać nieistniejącą kontrolkę albo inny obiekt. Zmianę wykonuj wyłącznie przez aktualnie odczytane kontrolki, a przed `Save` potwierdź gwiazdkę modyfikacji w tytule modułu.
8. Ukierunkowane komunikaty do dokładnego HWND zakładki/dialogu waliduj przez aktywny `TTabSheet`. Dla D&D wymagaj tożsamości obiektów VCL i wersjonowanego adresu handlera; `WindowFromPoint` nie jest substytutem tej walidacji.
9. Edytor skryptu jest singletonem. Przed otwarciem kolejnego zasobu zamknij poprzednie okno edytora, a źródło NWScript musi zawierać dokładnie jedno `void main()`.

## Zweryfikowane uruchomienie Test Module

- W tym wydaniu Toolsetu `Build` / pozycja `2` ma zweryfikowany identyfikator `121` i uruchamia `miTestModule`.
- Przed wywołaniem helper odczytuje menu, potwierdza pozycję, ID i stan `enabled`; dopiero potem wysyła ukierunkowane `WM_COMMAND` do ramki Toolsetu.
- Minimalny proof to nowy proces `nwmain`, responsywny tytuł okna i pasywny `PrintWindow` jego rzeczywistego renderu. Nie jest to proof konkretnej funkcji NPC.
- Nie należy zgadywać pozostałych ID: `Build` / pozycja `4` w tej samej sesji otwiera `Resources Used`, a `Tools` / pozycja `2` otwiera `Script Editor`.

## Odtworzona procedura

### Wybór instancji

- W Area tree wybierz konkretny węzeł i otwórz `Properties` przez zweryfikowane menu kontekstowe.
- Rozróżnij duplikaty po rekordzie GIT, nie po samym widocznym imieniu. W przebiegu referencyjnym celem był `nw_dwarfmerc001` przy `x=60.9686`, `y=54.5207`.

### Name, tag, resref — AUR-S03-01

- Zmieniaj `First Name` i `Tag` przez docelowy input znakowy, zatwierdź `OK`, wykonaj Save i ponownie otwórz Properties.
- Potwierdź `firstName` i `tag` w GIT. `Blueprint ResRef` pozostaje tylko do odczytu dla instancji; nie wolno uznawać jego niezmienności za błąd ani udawać zmiany resrefu.

### Frakcja — AUR-S03-02

- Na `Advanced` otwórz rzeczywistą listę rozwijaną `Faction` (`CB_SHOWDROPDOWN`) i wybierz pozycję przez ukierunkowany komunikat do widocznej listy `ComboLBox`. To uruchamia natywne zdarzenie VCL; samo `CB_SETCURSEL` oraz syntetyczny `WM_COMMAND/CBN_SELCHANGE` może zmienić obraz bez oznaczenia modułu jako zmienionego.
- Dowodem zapisu jest gwiazdka modyfikacji przed Save oraz odpowiednia zmiana `factionId` w GIT. W przebiegu referencyjnym `Merchant` zapisał `factionId: 3`, a rollback `Hostile` przywrócił `factionId: 1`.
- Następnie wymagany jest runtime, który pokazuje oczekiwaną reakcję/reputację.

### Conversation — AUR-S03-03

- Na `Basic` wybierz resource DLG przez `...`. Jeżeli `Module Resources Only` pokazuje `0 resource(s)`, przełącz widoczny selektor na `All Resources`, wybierz konkretny DLG i zachowaj widok wybranego resrefu. W przebiegu referencyjnym `nw_hen_bod` zapisał pole `conversation` w GIT.
- Po teście wyczyść ComboBox (`CB_SETCURSEL = -1` plus właściwe powiadomienie dialogu), zapisz i potwierdź, że wybrany resref nie występuje w GIT.
- Dopiero rozmowa uruchomiona w grze może zaliczyć funkcję.

### Binding skryptu — AUR-S03-04

- W `Scripts` przypisz resref do konkretnego eventu (w przebiegu: `OnSpawn`, a dla obserwowalnego proof także `OnHeartbeat`). Zapisz screenshot eventu oraz GIT `script.scriptspawn` / `script.scriptheartbeat`.
- NWScript ma dokładnie jeden punkt wejścia: jedno `void main()`. Po zmianie źródła trzeba ponownie zaimportować resource i zapisać moduł, aby nowy `NCS` trafił do ERF — sama kompilacja w katalogu tymczasowym nie zmienia binarnego zasobu modułu.
- Dowód runtime z tego przebiegu: [przypięcie heartbeat](evidence/npc-stage3-live-2026-07-14/s03-heartbeat-bound-unsaved.png), [pasujący chat Test Module](evidence/npc-stage3-live-2026-07-14/s03-runtime-heartbeat-verified.png) i [rollback UI](evidence/npc-stage3-live-2026-07-14/s03-script-final-rollback-unsaved.png). Końcowy GIT [s03-final-rollback.raw.git.summary.json](evidence/npc-stage3-live-2026-07-14/s03-final-rollback.raw.git.summary.json) przywraca `script.scriptheartbeat = nw_c2_default1` oraz brak `script.scriptspawn` dla Dwarfa z `x=60.9686`, `y=54.5207`.
- Pusty `OnSpawn` jest poprawnym baseline; rollback musi czyścić ComboBox i potwierdzać brak pola w GIT.

### Inventory i equipment — AUR-S03-05 / AUR-S03-06

- `Inventory...` oraz `New` tworzą blueprint, ale nie dodają go automatycznie do stworzenia. W tym dialogu dodanie do `Contents`, wyposażenie slotu i usunięcie na kosz są natywnymi operacjami D&D; click/double-click nie zastępują przeciągnięcia.
- Przy ostrzeżeniu o wymaganych feat/level kliknij `OK`, ale nie zaznaczaj `Never warn again`. Komunikat dotyczy zakładki `Feats` lub poziomu postaci, nie zakładki `Skills`. Neutralny amulet z niskim poziomem jest bezpiecznym fixture dla inventory/equipment.
- Blueprint niestandardowy musi trafić do liścia kategorii, np. `Miscellaneous / Jewelry / Amulets`; sam korzeń kategorii nie kończy kreatora poprawnie. Po utworzeniu przełącz natywną kartę `Custom Items` i wybierz dokładnie jeden wiersz po nazwie.
- D&D do `Contents` wymaga źródła będącego dokładnym wierszem `TTreeView` i celu w `TDrawGrid`. D&D do slotu amuletu wymaga geometrycznie rozpoznanego panelu szyi; nie wolno używać zapamiętanego HWND. Rollback wykonuje się D&D z `Contents` albo slotu na dokładny dolny-lewy kosz. Samo zaznaczenie i klik kosza nie jest wystarczające w tej kontrolce.
- Przy usuwaniu pierwszego elementu z `Contents` źródłem jest środek pierwszego wiersza siatki (`grid.Left + 110`, środek wysokości wiersza), nie lewa krawędź komórki. Ten punkt przeszedł `WindowFromPoint` i rzeczywiście usunął element w rollbacku.
- Po Save wymagaj `inventoryItemListEntries` albo `equipItemListEntries` w GIT i widocznego przedmiotu w docelowym slocie/modelu. Parser musi obsługiwać osadzone `TemplateResRef`, nie tylko referencyjne `InventoryRes` / `EquippedRes`. Brak obu dowodów oznacza niezaliczenie.
- Ten sam resref pokazany równocześnie w inventory i equipment może zostać znormalizowany przez Toolset. Dwie funkcje dowodź osobnymi przejściami albo różnymi fixture'ami, nigdy jednym niejednoznacznym stanem.
- Przebieg 2026-07-15 potwierdził `s03proofamuletr2`: inventory `0 → 1 → 0`, equipment `2 → 3 → 2`, a slot szyi zapisał `slotMask: 512`. Procedura i bramki są rozwinięte w [standardzie D&D](aurora-toolset-inventory-equipment-dnd-standard.md).

### Statystyki, klasy, appearance — AUR-S03-07 / AUR-S03-08

- Dla statystyki użyj spinnera, sprawdź natychmiastową rekalkulację i GIT po Save. Następnie wykonaj Save + readback rollbacku.
- Pola statystyk są owner-painted przez stare VCL: `GetWindowText` może pozostać nieaktualne mimo prawidłowej zmiany. Autorytatywną bramką jest widoczny wynik `Score/Total` oraz GIT po Save, zawsze z rollbackiem.
- `Levelup Wizard` jest workflow autolevelu i jego walidacji nie wolno obchodzić. Dla umieszczonego fixture `Dwarf Mercenary` próba dodania poziomu Fighter została prawidłowo odrzucona przez kreator komunikatem o niemożności dodania poziomu; ten branch nie stanowi dowodu zmiany.
- Zakładka `Classes` ma osobny natywny `TUpDown` ręcznej edycji poziomu klasy. Gdy autolevel nie ma zastosowania, wolno użyć tej kontrolki bez wpisywania tekstu, pod warunkiem: dokładny aktywny `TTabSheet=Classes`, odczyt `UDM_GETPOS` przed/po, widoczny proof, Save, GIT i rollback. Nie należy przedstawiać tej operacji jako przejścia kreatora autolevelu.
- Przebieg 2026-07-15 potwierdził na tym samym obiekcie Strength `15 -> 17 -> 15` i Fighter `1 -> 2 -> 1`; walidator musi potwierdzić obie sekwencje oraz cztery PNG.
- Appearance można zaliczyć tylko po dostępnej zmianie `appearanceId` i widocznym renderze. Nieuaktywnione pola instancji są stanem ograniczenia szablonu, nie sukcesem.

### Waypoint / spawn — AUR-S03-09

- Wybierz konkretny waypoint z Area tree i przeprowadź mutację tagu, Save i GIT readback przy niezmienionych współrzędnych.
- Jeśli skrypt odwołuje się do tagu waypointu, zachowaj oba dowody, ale zaliczenie wymaga runtime NPC/spawnu. Przywróć poprzedni tag po eksperymencie.
- Runtime probe musi pokazać dokładny marker funkcji. Jeśli wrogi fixture ginie przed wykonaniem opóźnionej komendy, ustaw tymczasowo `Immortal`, zapisz, wykonaj proof, a następnie obowiązkowo cofnij również tę flagę i potwierdź `isImmortal: false` w końcowym GIT.

## Bramka `TAK`

Każdy wpis AUR-S03 może dostać `TAK` wyłącznie z: bezpieczną procedurą, screenshotami before/after, Save, native readback, izolowaną deltą, rollbackiem, trwałym manifestem/walidatorem oraz — gdy wskazano wyżej — runtime proof. Brak któregokolwiek elementu pozostawia `NIE` albo `CZĘŚCIOWO`.

## Przebieg referencyjny i wynik

Końcowy przebieg jest opisany w [audycie ukończenia Etapu 3](aurora-toolset-stage3-completion-audit-2026-07-15.md). Zalicza 9/9 funkcji: natywne mutacje, Save, readback GIT, widoczne proofy, runtime dla zachowań oraz pełny rollback. Najmocniejszy wspólny runtime frame pokazuje `S03_WAYPOINT_OK` i `S03_INVENTORY_OK`; końcowy readback przywraca conversation, heartbeat, inventory, equipment, statystyki, klasę, frakcję, appearance, tag waypointu i `Immortal` do baseline.

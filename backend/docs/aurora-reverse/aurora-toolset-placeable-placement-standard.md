# Standard dodawania placeable w Aurora Toolset

Status: obowiązujący i zweryfikowany live w Aurora Toolset od 2026-07-14.

Referencyjny przebieg dodał `Water Trough` do Area `demo`, zapisał moduł,
potwierdził `placeables 2 -> 3` oraz `total 8 -> 9`, zachował pozostałe liczniki
i przeszedł walidator z `ok=true`, `failureCount=0`. Pakiet:
[`evidence/placeable-live-standard-2026-07-14/README.md`](evidence/placeable-live-standard-2026-07-14/README.md).

Ten standard dotyczy dodania dokładnie jednego placeable do istniejącego Area
w natywnym Aurora Toolset i utrwalenia wyniku w roboczej kopii modułu. Samo
wysłanie komunikatu, zmiana licznika w UI, zielony preview, test offline albo
dokumentacja nie są dowodem ukończenia.

Standard dziedziczy ogólne reguły z
[`aurora-toolset-operating-standard.md`](aurora-toolset-operating-standard.md),
ale dla placementu placeable poniższe bramki są obowiązkowe i rozstrzygające.

## 1. Dozwolone statusy

Każdy przebieg kończy się dokładnie jednym statusem:

- `verified` — wszystkie bramki tego dokumentu przeszły;
- `failed` — akcja została wykonana, lecz efekt jest błędny, wielokrotny,
  niezapisany albo sprzeczny z proofem;
- `missing` — nie wykonano wymaganej akcji lub brakuje artefaktu;
- `blocked` — zewnętrzny stan Toolsetu uniemożliwia bezpieczne wykonanie,
  a blocker ma nazwany kod i dowód.

Nie wolno używać `done`, `success`, `partial` ani `verified-live` jako zamiennika
`verified`.

## 2. Niezmienne zasady bezpieczeństwa

1. Używamy jednej sesji i jednego PID `nwtoolset.exe` dla całej sekwencji.
2. Nie wysyłamy drugiego `Open Module`, gdy istnieje żywy proces lub okno
   właściwego modułu.
3. Po niepowodzeniu najpierw sprawdzamy PID, responsywność, okna i modale.
   Restart jest dozwolony dopiero, gdy proces nie żyje albo użytkownik wydał
   taką decyzję.
4. Globalny kursor, globalna klawiatura, `SendKeys`, `SetCursorPos` i globalne
   kliknięcia są zakazane. Używamy wyłącznie komunikatów do zwalidowanych
   kontrolek Toolsetu.
5. HWND z poprzedniej sesji jest zawsze nieważny. Wszystkie kontrolki wykrywamy
   ponownie po aktualnym PID, klasie, relacji parent/owner i widocznym stanie.
6. Nie zgadujemy numerycznego `WM_COMMAND`. W szczególności nie wolno próbować
   kolejnych identyfikatorów Save/Close. Komenda musi pochodzić z aktualnie
   zwalidowanej mapy menu albo zostać wykonana przez jednoznacznie rozpoznaną
   kontrolkę.
7. Źródłowego modułu nie modyfikujemy. Pracujemy na jawnej kopii roboczej o
   innej nazwie i zapisujemy oba hashe.
8. Nie zmieniamy `nwtoolset.ini`, MRU, ustawień okna ani konfiguracji
   użytkownika.

## 3. Kontrakt wejściowy

Przed startem zapisujemy:

- `sourceModulePath` — istniejący, tylko-do-odczytu moduł źródłowy;
- `sourceModuleSha256`;
- `workingModulePath` — osobna kopia przeznaczona do zapisu;
- `workingModuleInitialSha256` — przed uruchomieniem Toolsetu;
- `areaResref` i oczekiwaną nazwę Area;
- `palettePath` — pełną ścieżkę kategorii i liścia, np.
  `Standard / Containers & Switches / Barrel`;
- `expectedTemplateResRef`, jeżeli jest znany przed próbą;
- katalog pakietu dowodowego;
- fizyczny monitor proof zgodny z ogólnym standardem Toolsetu.

Brak któregokolwiek pola oznacza `missing`, zanim nastąpi mutacja.

## 4. Baseline przed uruchomieniem

Kopia robocza musi być strukturalnie odczytana przed placementem:

```powershell
node backend/scripts/build-area-source-proof-pack.mjs `
  --area <areaResref> `
  --modulePath <workingModulePath> `
  --outDir <proofDir>/baseline `
  --name baseline
```

Pakiet baseline musi zawierać co najmniej:

- `manifest.json` z liczbą `placeables`, liczbą wszystkich obiektów i liczbami
  pozostałych rodzin;
- `objects.csv` z istniejącymi rekordami;
- hash początkowy kopii roboczej;
- pełny screenshot poprawnego modułu i Area przed mutacją.

Baseline oparty wyłącznie na liczniku drzewa Toolsetu jest niedopuszczalny.

## 5. Związanie jednej sesji

Przed mutacją trzeba potwierdzić jednocześnie:

- dokładnie jeden PID `nwtoolset.exe`;
- responsywne `TfrmFrame` z oczekiwanym tytułem modułu;
- właściwy `TfrmViewerArea` dla `areaResref`;
- wewnętrzny canvas klasy `TScrollBox` należący do tego viewera;
- prawą paletę i jej aktualny `TTreeView`;
- brak Access Violation, recovery, loading modal i błędu indeksu listy;
- położenie na fizycznym monitorze proof.

`MainWindowHandle` procesu nie jest wystarczającym wyborem. Wybieramy widoczne
okno modułu po PID, klasie i tytule.

## 6. Wybór placeable z palety

1. Przełącz prawą paletę na rodzinę `Placeables`.
2. Odczytaj tekst aktualnego `TTreeView`; nie zakładaj historycznej kolejności
   ikon ani uchwytów.
3. Potwierdź widoczną gałąź oczekiwanej kategorii.
4. Rozwiń pełną ścieżkę kategorii.
5. Wybierz dokładny liść przez odczyt jego tekstu, nie przez samą pozycję Y.
6. Zrób screenshot palety z widoczną kategorią i zaznaczonym liściem.

Jeżeli tekst liścia nie został odczytany lub zaznaczenie jest niejednoznaczne,
wynik to `palette_leaf_missing`; nie wolno klikać canvasu.

## 7. Dokładnie jeden placement

1. Ponownie zwaliduj aktualny `TScrollBox` i jego relację z właściwym
   `TfrmViewerArea`.
2. Wybierz punkt wewnątrz renderowanego obszaru, z dala od krawędzi, toolbarów
   i istniejących modali.
3. Wyślij dokładnie jedną parę `WM_LBUTTONDOWN` / `WM_LBUTTONUP` do
   `TScrollBox`.
4. Natychmiast przełącz Toolset do zwalidowanego trybu `Select Objects`, aby
   drugi klik nie stworzył duplikatu.
5. Nie wysyłaj retry placementu bez strukturalnego sprawdzenia pierwszej próby.
6. Zapisz screenshot sceny po placementcie.

Kliknięcie `TfrmViewerArea`, jego ramki albo losowego child window nie jest
placementem. Zielony outline bez rekordu obiektu nie jest placementem.

## 8. Dowody pomocnicze w żywej sesji

Poniższe sygnały są wymagane, ale same nie zaliczają operacji:

- tytuł modułu z `*` po mutacji;
- licznik placeables w lewym drzewie zmieniony o `+1`, jeżeli jest dostępny;
- brak drugiego niezamierzonego obiektu;
- zaznaczony nowy placeable albo otwarte jego `Placeable Object Properties`;
- przy zmianie nazwy: aktualny widoczny `TEdit`, `EM_SETSEL`, `EM_REPLACESEL`,
  screenshot wartości oraz ponowne otwarcie properties w tej samej sesji.

Stary HWND pola tekstowego albo samo `SetWindowText` nie jest dowodem zmiany.

## 9. Zapis kopii roboczej

1. Zapisz tylko `workingModulePath`.
2. Użyj jednoznacznie zwalidowanej komendy Save; zabronione jest zgadywanie
   command ID.
3. Czekaj na wszystkie trzy sygnały:
   - tytuł modułu nie zawiera `*`;
   - status Toolsetu potwierdza zapis Area/modułu;
   - plik roboczy ma nowy rozmiar lub czas modyfikacji.
4. Zrób fizyczny pełny screenshot po zapisie z tytułem, Area, sceną i statusem.

Jeżeli pojawi się pytanie o zapis podczas próby zamknięcia, oznacza to, że
zapis nie został jednoznacznie potwierdzony. Należy anulować modal i wrócić do
walidacji tej samej sesji, a nie otwierać moduł ponownie.

## 10. Strukturalny readback zapisanego modułu

Po zapisie uruchom ten sam parser dla kopii roboczej:

```powershell
node backend/scripts/build-area-source-proof-pack.mjs `
  --area <areaResref> `
  --modulePath <workingModulePath> `
  --outDir <proofDir>/after-save `
  --name after-save
```

Wymagany diff:

- `placeables.after = placeables.before + 1`;
- `total.after = total.before + 1`;
- liczby `creatures`, `items`, `doors`, `encounters`, `sounds`, `stores`,
  `triggers` i `waypoints` pozostają bez zmian;
- różnica `objects.csv` zawiera dokładnie jeden nowy rekord;
- nowy rekord ma `kind=placeable`;
- `templateResRef` odpowiada wybranemu template albo zostaje jawnie odczytany
  i opisany, jeżeli przed próbą nie był znany;
- `x`, `y`, `z` są skończone i mieszczą się w docelowym Area;
- opcjonalna nazwa/tag z properties zgadza się z rekordem, jeżeli była częścią
  celu.

`+0` oznacza `placement_no_structural_delta`. `+2` lub więcej oznacza
`placement_duplicate_delta`. Zmiana innej rodziny oznacza
`cross_kind_mutation`. Żadnego z tych wyników nie wolno promować do
`verified`.

## 11. Zamknięcie i hash

Po zebraniu screena i readbacku:

1. Zamknij tę jedną sesję przez ukierunkowany `WM_CLOSE`, np. istniejącym
   `backend/scripts/close-aurora-toolset-window-no-global-input.mjs`.
2. Potwierdź brak procesów i okien Toolsetu.
3. Oblicz końcowy SHA-256 kopii roboczej.
4. Ponownie oblicz SHA-256 modułu źródłowego i potwierdź, że się nie zmienił.
5. Końcowy hash kopii roboczej musi różnić się od jej hasha początkowego.

Nie zabijamy procesu siłowo tylko po to, aby zwolnić plik do hashowania.

## 12. Obowiązkowy pakiet proof

Katalog zaakceptowanego przebiegu zawiera co najmniej:

```text
README.md
summary.json
01-before-full.png
02-palette-selection.png
03-after-placement-full.png
04-after-save-full.png
05-placeable-crop.png
baseline/manifest.json
baseline/objects.csv
after-save/manifest.json
after-save/objects.csv
close-result.json
```

`summary.json` musi przejść schemat
[`aurora-toolset-placeable-placement-proof.schema.json`](aurora-toolset-placeable-placement-proof.schema.json).
Semantyczną bramkę pakietu uruchamia:

```powershell
node backend/scripts/validate-aurora-toolset-placeable-placement-proof.mjs `
  <proofDir>/summary.json
```

Kod wyjścia `0` i `ok=true` są wymagane do werdyktu `verified`. Walidator nie
zastępuje oględzin PNG; potwierdza spójność liczb, hashy i plików pakietu.

PNG musi być fizycznym screenshotem Toolsetu. PrintWindow z czarnym albo pustym
buforem OpenGL jest artefaktem diagnostycznym, nie dowodem wizualnym sceny.

## 13. Bramka `verified`

Werdykt `verified` jest dozwolony wyłącznie, gdy jednocześnie:

- użyto jednej sesji i jednego PID;
- nie użyto globalnego inputu ani konfiguracji użytkownika;
- screenshot pokazuje właściwy zapisany moduł, Area i nowy obiekt;
- po zapisie nie ma `*` w tytule;
- parser potwierdza dokładnie `placeables +1` i `total +1`;
- diff zawiera dokładnie jeden nowy rekord `kind=placeable`;
- pozostałe rodziny obiektów nie zmieniły liczników;
- źródłowy hash jest niezmieniony;
- hash kopii roboczej zmienił się;
- Toolset zamknął się czysto;
- wszystkie wymagane artefakty istnieją i są niepuste;
- lista blockerów jest pusta.
- walidator pakietu zwraca `ok=true` i kod wyjścia `0`.

## 14. Standardowe kody blockerów

- `unexpected_toolset_process`
- `unexpected_module_window_loaded`
- `area_viewer_missing`
- `stale_control_handle`
- `wrong_proof_monitor`
- `toolset_modal_or_av`
- `palette_tree_missing`
- `palette_leaf_missing`
- `placement_target_invalid`
- `placement_no_structural_delta`
- `placement_duplicate_delta`
- `cross_kind_mutation`
- `save_not_confirmed`
- `visual_proof_missing`
- `source_module_hash_changed`
- `working_module_hash_unchanged`
- `toolset_close_pending`

Każdy blocker zapisuje obserwowany PID, okno, etap, artefakt i najbliższy
bezpieczny krok. Blocker nie daje prawa do restartu ani obejścia standardu.

## 15. Klasyfikacja historycznego eksperymentu `Barrel`

Próba opisana w `docs/aurora-toolset-placeable-add-new-2026-06-17.md`
dostarczyła użytecznej wiedzy wykonawczej:

- prawidłowa rodzina i ścieżka palety;
- placement do wewnętrznego `TScrollBox`;
- licznik `2265 -> 2266`;
- nazwa `test - codex` potwierdzona po ponownym otwarciu properties.

Nie przechodzi jednak obecnego standardu, ponieważ moduł nie został zapisany,
nie ma strukturalnego diffu zapisanego `.mod`, a wskazane historyczne PNG nie
istnieją już w repo. Klasyfikacja: `missing`, użyteczne dane treningowe, brak
aktualnego proofu.

# Audyt CUD tile i renderu tilesetów — 2026-07-18

## Werdykt

**Nie zamykać CUD tile ani renderu tilesetów.** Istnieje prawdziwy dowód zmian stanu dla utworzenia i usunięcia grupy tile'i na lokalnym obszarze `tni01`, ale nie istnieje jeszcze dowód akceptacyjny dla Update, poprawności obrazu ani generowania innych rodzin tilesetów.

Ten dokument rozdziela trzy rzeczy, których nie można zastąpić jedną drugą:

1. poprawną zmianę stanu edytora i Undo/Redo;
2. gotowość kontraktów modeli/materialów;
3. zgodność widocznego renderu z Toolsetem.

Obecnie (1) jest częściowo udowodnione, (2) jest udowodnione tylko dla `tni01`, a (3) nie jest udowodnione dla żadnego tilesetu.

## Dowody, które są ważne

| Przypadek | Co zostało potwierdzone | Czego to nie potwierdza | Artefakt |
| --- | --- | --- | --- |
| Create / wstawienie grupy | `group-placement-local`: zmienione 2 komórki, grupa ma 1 element, Undo i Redo przywróciły stan dokładnie | obraz po zmianie ma parytet z Toolsetem; test jest lokalny, nie retailowy | `C:\Projects\.codex-tmp\area-goal-20260717\cud-tni-create3\cud-tni-create3.png` |
| Delete / gumka | `eraser-local`: liczba grup `1 -> 0`, Undo i Redo przywróciły stan dokładnie | usunięcie każdego rodzaju tile'a w prawdziwym ARE | `C:\Projects\.codex-tmp\area-goal-20260717\cud-tni-delete\cud-tni-delete.png` |
| Gotowość modeli | `tni01`, 4x4: `16/16` kontraktów i modeli załadowanych, `0` nieudanych, `0` bridge; materiały `16/16` zastosowane | że widoczna geometria zakrywa cały tile i odpowiada Toolsetowi | pliki `*.summary.json` przy powyższych artefaktach |
| Update / Replace Tile ID | brak dowodu akceptacyjnego | Update nie może być oznaczony jako zakończony | `cud-tni-update2.failure.frame.json` |
| Inny tileset: `tcn01` | katalog rozpoznał tileset i jego tile'e | nie dotarto do obszaru ani nie wykonano requestu tile'a; blokada autoryzacji CDP | `tileset-audit-tcn01.failure.frame.json` |

W obu udanych przebiegach kamera jest deterministyczna (`top_down_oracle`), ale to tylko poprawia porównywalność screenshotów. Nie jest dowodem zgodności z Toolsetem.

## P0 — blokery przed uznaniem funkcji za gotową

### 1. Render ma widoczne dziury i nie jest jeszcze renderem referencyjnym

Dowód `tni01` pokazuje prawdziwe tekstury i GLB, ale również granatowe pola, czarne płaszczyzny i niespójne pokrycie tile'i. Granat to kolor tła renderera (`BACKGROUND_COLOR = 0x0c1420`), widoczny tam, gdzie geometria lub warstwa gruntu nie pokrywa obrazu. Brąz pochodzi z autentycznych materiałów modelu. Część czarnych płaszczyzn to węzły lub materiały samych modeli (`tni01_black`, `tno01_black01`), które wymagają poprawnej semantyki warstw, a nie tylko załadowania tekstury.

Aktualny runtime jawnie raportuje:

- `renderStatus = source_backed_tile_model_bridge`;
- `imageMapStatus = disabled_source_backed_glb_first`;
- `geometryStatus = local-source-backed-tile-bridge-not-retail-model-geometry`.

To wyjaśnia, czemu licznik `16/16 loaded` nie jest sygnałem `complete` dla obszaru. Sygnał gotowości musi dodatkowo wymagać pełnego pokrycia obszaru, braku nieoczekiwanego tła lub voidów, poprawnych warstw maskujących oraz porównania z referencją.

**Kryterium zamknięcia:** na co najmniej jednym reprezentatywnym tile'u z każdej rodziny testowej nie ma nieoczekiwanego tła między elementami, czarne maski są zgodne z referencją, a identyczny kadr Toolset/Aurora przejdzie ręczną kontrolę.

### 2. Update nie ma wiarygodnego proof

Przypadek `tile-replace-local` jest w harnessie, lecz finalny przebieg nie dotarł do sceny. Frame dla `tcn01` skończył się kodem `frontend_auth_seed_route_guard_blocked`; nie było screenshotu, requestu tile'a ani danych runtime. Wcześniejsza próba Update również była zablokowana i nie nadaje się do akceptacji wizualnej.

**Kryterium zamknięcia:** na zdrowym runtime wykonać Replace Tile ID dla niepustego tile'a, zapisać before/commit/undo/redo, potwierdzić dokładną zmianę `tileId` i orientacji oraz pokazać świeży canvas po ustabilizowaniu kontraktów.

### 3. Nie ma przekrojowego testu innych tilesetów

Tylko `tni01` dostał rzeczywisty, niepusty render CUD. Do audytu wybrane są co najmniej:

| Rodzina | Tileset | Domyślny teren | Stan |
| --- | --- | --- | --- |
| wnętrza | `tni01` | `wall` | częściowy proof, obraz niezaakceptowany |
| miasto/kamień | `tcn01` | `cobble` | brak renderu — blokada auth harnessu |
| teren zewnętrzny | `tno01` | `grass` | nieuruchomiony |
| custom/HAK | `sic11` | `wall` | nieuruchomiony poprawnie; `sic11_a00_00` jest celowo niewidoczną, złą próbką |

**Kryterium zamknięcia:** dla każdej z czterech rodzin utworzyć 2x2 obszar, wybrać co najmniej jeden niepusty tile oraz wykonać Create/Replace, a następnie zapisać screenshot i liczniki kontraktów. `sic11_a00_00` nie może być próbką akceptacyjną.

## P1 — konieczne przed rzetelnym domknięciem

### 4. Naprawić harness logowania, zanim będzie służył jako proof

Blokada `frontend_auth_seed_route_guard_blocked` oznacza, że zapisany token `builder.user` nie dotarł do app route; aplikacja przeszła na `/settings/runtime`. Nie jest to błąd `tcn01`, ponieważ nie zarejestrowano nawet jednego requestu tile'a. Harness powinien:

1. rozpoznać maintenance i rolę zanim uzna seed za skuteczny;
2. logować się prawdziwym formularzem jako fallback;
3. oznaczać taki przebieg jako `capture infrastructure blocked`, nie jako wynik renderu;
4. po akcji wymagać świeżego canvasa, w przeciwnym razie fail.

### 5. Ustabilizować runtime settings i maintenance recovery

Aktualna konfiguracja ścieżek została zaktualizowana do rzeczywistych mountów `/host/nwn-user`, `/host/nwn-game` i `/host/aurora-reference` (rewizja 10). Jej pełne sprawdzenie po zimnym starcie i indeksowaniu **nie zostało wykonane**.

W trakcie próby przebudowy cache backend zakończył się OOM, a maintenance pozostało w stanie `failed`. Standardowy rollback nie mógł zadziałać, gdyż preflight nie zapisał `candidate_settings_json` ani `previous_settings_json`. Stan maintenance został ręcznie przywrócony do `idle`, aby odblokować runtime. To jest luka odzyskiwania, a nie dowód, że przebudowa jest bezpieczna.

**Kryterium zamknięcia:** dodać bezpieczny fallback po przerwanym preflight, limitować lub przyrostowo wykonywać rebuild i wykazać po restarcie: health `ok`, logowanie buildera, katalog tilesetów oraz jeden request process tile bez 500.

### 6. Zdefiniować wydajnościowy baseline

`TILE_PROCESS_CONTRACT_BATCH_SIZE = 1`, więc zimne ładowanie przetwarza tile'e sekwencyjnie. To tłumaczy długie przebiegi, ale nie jest uzasadnieniem dla sygnału complete przed zakończeniem całego obszaru.

Najpierw zmierzyć czasy dla 2x2 i 4x4 po naprawie renderu; dopiero potem ustalić bezpieczny rozmiar batcha/cache. Zwiększenie współbieżności bez limitu pamięci może powtórzyć OOM.

## P2 — jak zmienić sygnał `complete`, żeby nie kłamał

Obecne liczniki oznaczają tylko gotowość kontraktów modeli i materiałów. Stan `complete` dla obszaru lub operacji CUD powinien być osiągalny dopiero, gdy:

1. `loadedTileCount === tileCount`, `failedTileCount === 0`, `bridgeTileCount === 0`;
2. post-mutation settlement zakończył się dla aktualnego `sceneKey`;
3. materiały i tekstury mają zero `pending` i zero `failed`;
4. test pokrycia geometrii lub warstwy gruntu nie wykrywa nieoczekiwanego tła;
5. screenshot jest świeży i pochodzi z aktualnego canvasa;
6. dla trybu referencyjnego istnieje porównanie z Toolsetem.

Do czasu spełnienia punktów 4–6 UI powinno mówić `assets ready / visual review pending`, nie `complete`.

## Kolejność dalszej implementacji

1. Naprawić i osobno przetestować auth/maintenance recovery — bez tego proofy innych rodzin są niewiarygodne.
2. Naprawić pokrycie gruntu i maski w rendererze; nie zmieniać kamery jako substytutu poprawy geometrii.
3. Wykonać Update (Replace Tile ID) na `tni01` z nowym proofem.
4. Powtórzyć ten sam minimalny zestaw na `tcn01`, `tno01` i prawidłowo dobranym, niepustym tile `sic11`.
5. Gdy Toolset będzie dostępny, wykonać parę identycznych kadrów dla każdej rodziny i dopiero wtedy uznać wizualną zgodność.

## Narzędzie do iteracyjnego proofu

`$playwright-interactive` jest zainstalowany jako pomoc do utrzymania jednej sesji przeglądarki między poprawkami renderera. Skraca drogę do świeżego proofu, ale nie jest kryterium akceptacji: nadal obowiązują kontrakty, wizualne bramki i zapisany artefakt runtime.

## Stan zmian w worktree

W istotnych plikach jest obecnie 2104 dodanych i 246 usuniętych linii. Część frontendowego renderera oraz layoutu była już brudna, dlatego audyt nie przypisuje całości tych zmian jednej poprawce ani nie zaleca ich zbiorczego commitowania. Przed zamknięciem trzeba rozdzielić zmiany CUD/render od niezależnych zmian w worktree i zweryfikować je na czystym, odtwarzalnym runtime.

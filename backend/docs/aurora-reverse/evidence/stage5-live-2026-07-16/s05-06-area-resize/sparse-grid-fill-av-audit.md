# S05-06 — audit próby wypełnienia sparse grid

Data: 2026-07-16

## Stan wejściowy

Natywny resize świeżego `area007` (`Rural`, `ttr01`) zmienił live Area z
`2 x 2` na `4 x 4`. Zapisany ARE miał nadal cztery tile. Zrzut ramki
`area007-sparse-4x4-frame.png` potwierdza zachowanie czterech starych tile
w lewym dolnym rogu oraz 12 szarych, niezainicjalizowanych pól.

Disassembly `005A3CF0..005A3D0D` potwierdza, że natywna funkcja ekspansji
zeruje nowe wpisy tablicy wskaźników. Sam resize nie tworzy kompletnych
struktur tile dla nowych pól.

## Odrzucona próba fill

Po zweryfikowaniu palety `Rural` wybrano dokładny liść grupy
`Field 1 2x2` i wysłano lokalne, PID-scoped wejście wyłącznie do palety
oraz viewera. Operacja nie zakończyła się w limicie 60 sekund. Preflight
wykazał wyłączoną ramkę i jeden modal należący do PID Toolsetu:

`Access violation at address 0066C289 in module 'nwtoolset.exe'. Read of address 00000020.`

Modal został natychmiast zamknięty jego jedynym dokładnym przyciskiem
`OK` (`hwnd 3150126`). Kolejny preflight potwierdził odpowiadający proces,
włączoną ramkę na `DISPLAY1` oraz zero pozostałych modali.

## Reguła fail-close

Nie wolno nakładać grupy/feature na częściowo pustą siatkę utworzoną przez
resize. Ta trasa jest odrzucona i nie może być ponawiana. Po sparse resize
należy zamknąć komunikat awarii i zakończyć pracę na tym nośniku. Ani
`Undo`, ani kolejny resize/fill nie są dozwoloną metodą naprawy. Sparse ARE
nie jest produkcyjnym zapisem; powrót wykonuje się poza aktywnym viewerem z
wcześniej zapisanej, sprawdzonej kopii zasobów.

## Korekta po powtórnej awarii

Po pierwszym AV komunikat został zamknięty, a następnie na aktywnym sparse
viewerze wywołano natywne `Undo` (command id `56`). Była to błędna decyzja:
mechanizm undo próbował przejść przez stan zawierający puste wskaźniki tile.
Późniejszy pasywny preflight ujawnił jeden opóźniony modal:

`Access violation at address 00683333 in module 'nwtoolset.exe'. Read of address 0000003C.`

Modal miał dokładnie jeden widoczny przycisk `OK`. Asynchroniczne
`PostMessage(BM_CLICK)` nie zostało przetworzone w limicie, dlatego nie było
ponawiane. Jeden synchroniczny `SendMessageTimeout(BM_CLICK)`, ograniczony do
2 sekund i dokładnie zweryfikowanych HWND, klasy, tytułu i tekstu przycisku,
zamknął modal. Następny read-only preflight potwierdził PID `39552`, włączoną
ramkę `985648`, `DISPLAY1`, responsywny proces i zero modali.

### Obowiązujący zakaz

- po AV nie wykonuj `Undo`, resize, fill, zapisu ani reopen na sparse viewerze;
- nie próbuj ponownie transportu, który nie potwierdził zamknięcia modala;
- modal AV obsługuj tylko po dokładnym odczycie treści oraz jednoznacznym
  związaniu jednego okna i jednego przycisku;
- odzyskanie danych wykonuj z ostatniego dodatnio zweryfikowanego packa ARE/GIT,
  bez dalszej mutacji wadliwego viewera.

## Ustalenie końcowe: wyjątek jest niewznawialny

Kolejne obserwacje doprecyzowały mechanizm. Szare kwadraty widoczne w
viewerze to komórki siatki Area (`tile cells`), ale nie rekordy tile. ARE
`area007` deklaruje `Width=4`, `Height=4`, natomiast `Tile_List` ma tylko
cztery elementy. Pozostałe 12 komórek to puste sloty/wskaźniki.

Po dokładnym związaniu modala `0066C289 / Read 00000020` ukryto wyłącznie
aktywny child viewer `area007` przez `ShowWindow(SW_HIDE)`; moduł nie został
zmieniony. Mimo braku jakiegokolwiek widocznego `TfrmViewerArea` ten sam HWND
modala pozostał po `BM_CLICK` i po `WM_COMMAND(IDOK)`. To odrzuca hipotezę,
że sam bieżący repaint jest wystarczającą przyczyną powtórki. Aktywna operacja
fill nadal znajduje się na stosie wywołań i po zamknięciu handlera wraca do
tej samej dereferencji pustego slotu pod offsetem `0x20`.

Takiego stanu nie wolno odzyskiwać przez kolejne `OK`, `Undo`, przełączenie
Area, ukrywanie okna ani inne komunikaty UI. Właściwy fail-close to:

1. nie wysyłać dalszych wiadomości do PID;
2. zakończyć dokładną scratch sesję Toolsetu;
3. objąć sparse moduł kwarantanną i nie otwierać go ponownie;
4. uruchomić nową sesję z czystego modułu, w którym każde Area spełnia
   `Tile_List.length == Width * Height`;
5. traktować resize rozszerzający Area w tym buildzie jako trasę odrzuconą,
   nie jako operację produkcyjną.

## Wykonanie fail-close

Scratch Toolset `PID 39552` został zakończony po dokładnym sprawdzeniu nazwy
procesu i ścieżki binarnej. Końcowy odczyt wykazał `0` procesów `nwtoolset`.
Proces gry ani moduł produkcyjny nie zostały dotknięte.

Wadliwy moduł przeniesiono poza katalog aktywnych modułów do:

`C:\Users\enonw\Documents\Neverwinter Nights\modules\_codex_quarantine\s05t0716_sparse_av_20260717_004742.mod`

- SHA-256: `9C134B2D58BF360788F3A3CF2FF0604758D2DEBB9AFB838AA931E5A0FCB45305`
- rozmiar: `215077` B
- pierwotna ścieżka `modules\s05t0716.mod`: nie istnieje po kwarantannie.

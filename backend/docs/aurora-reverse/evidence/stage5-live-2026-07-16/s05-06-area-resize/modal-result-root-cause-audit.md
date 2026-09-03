# S05-06 — audit wyniku modalnego Area Resize

Data: 2026-07-16

## Wynik zawężenia

Odczyt tylko do odczytu z obiektu ramki Toolsetu potwierdził, że pole
`TfrmFrame + 0x7BC` zawiera `0x4BD3080`, czyli dokładnie obiekt aktywnego
viewera `area005`. Komenda `actAreaResizeExecute` nie jest więc kierowana
do innego dziecka MDI.

Po natywnym wyborze presetu `Small` kontrolki formularza zmieniają się z
`2 x 2` na `4 x 4`, a wymiary live Area pozostają `2 x 2` do chwili
zatwierdzenia. Po dotychczasowym `OK / BM_CLICK` formularz znika i moduł
staje się dirty, lecz zapis zawiera `Width = 4`, `Height = 4` oraz tylko
4 wpisy `Tile_List`. Wykonana została zmiana metadanych formularza, ale
nie pętle dodawania wierszy i kolumn z `actAreaResizeExecute`.

Disassembly pokazuje, że pętle są wykonywane wyłącznie, gdy `ShowModal`
zwróci `1`. Początkową hipotezą był transport zatwierdzenia zamykający
formularz bez ustawienia Delphi `ModalResult = 1`.

## Korekta po odczycie binarnego DFM

Pełny parser binarnego zasobu `TFRMAREARESIZE` (`TPF0`, 7656/7656
bajtów) potwierdził deklarację:

- `bOk`: `Default = True`, `ModalResult = 1`, `TabOrder = 0`;
- `bCancel`: `Cancel = True`, `ModalResult = 2`, `TabOrder = 1`.

Hipoteza o braku `ModalResult` w definicji formularza została odrzucona.
Pozostaje sprawdzić, czy skrót `BM_CLICK` uruchamia w tej wersji VCL tę
samą sekwencję co lokalne `WM_LBUTTONDOWN/WM_LBUTTONUP`, a następnie
zweryfikować wynik po zapisie przez kontrakt kafli.

## Reguła fail-close

Do czasu potwierdzenia identyfikatora domyślnej komendy oraz dodatniego
readbacku `Tile_List.length = Width * Height`, `BM_CLICK` nie jest
dozwolonym transportem pozytywnego resize. Diagnostyka może otworzyć
formularz wyłącznie atomowo i musi zamknąć go przez `Cancel`, bez
globalnego kursora, klawiatury lub przejmowania fokusu.

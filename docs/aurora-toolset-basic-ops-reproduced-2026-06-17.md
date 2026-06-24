# Aurora Toolset: podstawowe uruchomienie i operacje kamery

Data reprodukcji: 2026-06-17

Ten dokument opisuje tylko to, co zostalo odtworzone w swiezej sesji Aurora
Toolset: uruchomienie Toolsetu, zaladowanie modulu, otwarcie obszaru `_ikea`
oraz podstawowe operacje kamery: zoom, przesuniecie i obrot sceny.

Nie zastapilem istniejacych dokumentow. To jest osobny zapis przebiegu.

## Zakres odtworzony

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`
- Plik wykonywalny:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`
- Modul:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city [U+2014 em dash] codex.mod`
- Obszar:
  `_ikea`

## 1. Uruchomienie Aurora Toolset

Toolset byl juz uruchomiony jako proces `nwtoolset.exe`.

Widoczne glowne okno:

- klasa: `TfrmFrame`
- tytul startowy: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`
- uchwyt okna w tej sesji: `24644026`
- ekran: drugi monitor, bounds `left=-1920 top=0 width=1920 height=1080`

Screenshot stanu pustego Toolsetu:

- `C:\Projects\aurora-web\.codex-tmp\toolset-replay-20260617\state-now-212304.png`

## 2. Zaladowanie modulu

Polecenie `File > Open` w Toolsecie odpowiadalo w tej sesji komendzie:

```text
WM_COMMAND 44
```

Po jej wyslaniu otworzyl sie dialog:

- klasa: `TdlgModuleSelect`
- tytul: `Open`
- uchwyt dialogu w tej sesji: `2496142`

Dialog zawieral liste modulow `TListBox`. W tej sesji modul
`the_last_city [U+2014 em dash] codex` byl juz zaznaczony:

- `TListBox` count: `39`
- zaznaczony indeks: `28`
- tekst: `the_last_city [U+2014 em dash] codex`

Klikniecie przycisku `Open` zaladowalo modul. Tytul glownego okna po zaladowaniu:

```text
BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - the_last_city [U+2014 em dash] codex.mod
```

Screenshot po zaladowaniu modulu:

- `C:\Projects\aurora-web\.codex-tmp\toolset-replay-20260617\module-loaded-212659.png`

## 3. Wybor obszaru `_ikea`

Po zaladowaniu modulu po lewej stronie pojawilo sie drzewo zasobow:

- klasa: `TTreeView`
- uchwyt w tej sesji: `28381388`
- liczba elementow: `1121`

W drzewie znaleziono:

```text
Areas
  _ikea
```

Szczegoly `_ikea` w tej sesji:

- depth: `1`
- handle elementu TreeView: `0x64FB3F8`
- rodzic: `Areas`

Operacja otwarcia:

1. `TVM_SELECTITEM` na elemencie `_ikea`.
2. `TVM_ENSUREVISIBLE` na elemencie `_ikea`.
3. Podwojne klikniecie w prostokat tekstu elementu TreeView:
   - rect client: `[41, 16, 71, 32]`
   - click client: `[56, 24]`

Po chwili zostala otwarta zakladka i viewer:

- `TTabSheet`, title `_ikea`, handle `13900070`
- `TfrmViewerArea`, title ` - _ikea`, handle `10226328`
- viewport `TScrollBox`, handle `4918588`, bounds
  `left=-1616 top=107 width=1275 height=839`

Screenshot po pelnym narysowaniu `_ikea`:

- `C:\Projects\aurora-web\.codex-tmp\toolset-replay-20260617\ikea-after-wait-213042.png`

## 4. Przesuniecie sceny

Przesuniecie kamery odtworzono przyciskiem z dolnego toolbara.

Uzyta operacja:

- przycisk: `Move camera right`
- klasa: `TBitBtn`
- uchwyt w tej sesji: `4134542`
- bounds: `left=-1582 top=956 width=25 height=25`
- wykonanie: 6 klikniec lewym przyciskiem myszy na srodku kontrolki

Dowod:

- przed: `op-base-ikea-213143.png`
- po: `op-move-right-213147.png`
- porownanie probek viewportu: `86.23%` zmienionych probek

## 5. Obrot sceny

Obrot sceny odtworzono przyciskiem kamery w dolnym toolbarze.

Uzyta operacja:

- przycisk: `Rotate camera clockwise`
- klasa: `TBitBtn`
- uchwyt w tej sesji: `3609370`
- bounds: `left=-1498 top=956 width=25 height=25`
- wykonanie: `WM_LBUTTONDOWN`, hold ok. `1600 ms`, `WM_LBUTTONUP`

Dowod:

- przed: `op-move-right-213147.png`
- po: `op-rotate-clockwise-213149.png`
- porownanie probek viewportu: `84.22%` zmienionych probek

## 6. Zoom sceny

Zoom przez `WM_MOUSEWHEEL` wyslany do viewportu nie dal widocznej zmiany w tej
swiezej sesji. Potwierdzony sposob reprodukcji zoomu to przyciski lupy w dolnym
toolbarze.

Zoom in:

- przycisk: pierwsza lupa
- klasa: `TBitBtn`
- uchwyt w tej sesji: `7606362`
- bounds: `left=-1378 top=956 width=25 height=25`
- wykonanie: 8 klikniec
- screenshot: `op-zoom-button-1-213334.png`
- porownanie wzgledem obrotu: `87.90%` zmienionych probek

Zoom out:

- przycisk: druga lupa
- klasa: `TBitBtn`
- uchwyt w tej sesji: `595934`
- bounds: `left=-1354 top=956 width=25 height=25`
- wykonanie: 8 klikniec
- screenshot: `op-zoom-button-2-213337.png`
- porownanie wzgledem zoom-in: `88.48%` zmienionych probek

## Minimalna sciezka operatora

1. Uruchom `nwtoolset.exe`.
2. Wybierz `File > Open`.
3. W dialogu `Open` wybierz `the_last_city [U+2014 em dash] codex`.
4. Kliknij `Open`.
5. W lewym drzewie rozwin `Areas`.
6. Otworz `_ikea` podwojnym kliknieciem.
7. Poczekaj, az pojawi sie `TfrmViewerArea` i scena zostanie narysowana.
8. Uzyj dolnego toolbara:
   - strzalki: przesuniecie kamery,
   - czerwone okragle strzalki: obrot kamery,
   - lupy: zoom in / zoom out.

## Uwaga o powtarzalnosci

Uchwyty okien i kontrolek sa sesyjne. Nazwy klas, tytuly, kolejnosc workflow i
pozycje dolnego toolbara byly zgodne z ta reprodukcja. Przy kolejnym
uruchomieniu nalezy odszukac kontrolki po klasie, tytule i polozeniu, a nie po
samym uchwycie.

# Aurora Toolset: placeable selection/properties findings

Data: 2026-06-17

To jest osobny dokument roboczy dla zadania:

1. zaznaczyc dowolny placeable,
2. otworzyc jego properties.

Nie nadpisuje wczesniejszej dokumentacji podstawowych operacji Toolsetu.

## Potwierdzone fakty

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul roboczy: `the_last_city — codex.mod`.
- Plik modulu:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city — codex.mod`.
- Bezposredni odczyt pliku `.mod` potwierdzil, ze area `_ikea` ma:
  - `width=16`,
  - `height=16`,
  - `tileList=256`,
  - `placeableList=1136`,
  - `doorList=0`,
  - `creatureList=0`.
- Pierwsze placeable w `_ikea` z GIT:
  - tag: `nwic_desertplant_7`,
  - template: `nwic095`,
  - appearance: `7460`,
  - pozycja: `x=61.2882`, `y=37.5437`, `z=5`.

## Odtworzona sekwencja

1. Uruchomic Toolset i zaladowac modul `the_last_city — codex`.
2. W lewym drzewku rozwinac `Areas`.
3. Otworzyc area `_ikea`; poprawny efekt to karta `_ikea`, kontrolka
   `TfrmViewerArea - _ikea` i widoczny render area, nie tylko zaznaczony wpis
   w drzewku.
4. W drzewku area `_ikea` rozwinac galaz `Placeables`.
5. Zaznaczyc pierwszy wpis pod `Placeables`. W aktualnym module wpisy sa
   wyswietlane bez czytelnych nazw, ale lista instancji istnieje i selection
   przenosi viewport do miejsca z obiektami.
6. Po zaznaczeniu placeable uzyc `Edit -> Object Properties`.
   Zweryfikowany command id Toolsetu: `70`.
7. Poprawny wynik: widoczne okno:
   - class: `TdlgPlaceableEdit`,
   - title: `Placeable Object Properties`.

## Dowody z tej proby

- Area `_ikea` otwarta i renderujaca:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\current-virtual-224816.png`
- Galaz `Placeables` rozwinieta:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\after-expand-placeables-224950.png`
- Placeable properties otwarte:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\after-command-70-object-properties-225314.png`

## Wnioski operacyjne

- Gdy viewport `_ikea` pokazuje pusty fragment gridu, nie oznacza to jeszcze,
  ze modul albo area sa puste. Area ma ponad tysiac placeables, a kamera moze
  stac w pustym miejscu.
- Samo zaznaczenie `_ikea` w drzewku nie wystarcza. Trzeba potwierdzic, ze
  powstala karta area i widac `TfrmViewerArea`.
- Dwuklik na pierwszym wpisie `Placeables` pomaga wybrac obiekt/przeniesc
  widok, ale w tej probie widoczne okno properties pojawilo sie dopiero po
  komendzie `Object Properties` (`WM_COMMAND 70`).
- `Find Instance` jest sciezka pomocnicza, ale nie byla potrzebna do finalnego
  odtworzenia tego zadania.
- Po `Access violation` w `COMCTL32.DLL` nalezy zamknac Toolset i odtworzyc
  kroki od nowa.

## Czego nie powtarzac

- Nie uzywac remote-memory `TreeView` reads/writes przeciw kontrolkom Toolsetu.
  Ta sciezka wywolala kaskade `Access violation` w `COMCTL32.DLL`.
- Nie przejmowac globalnego kursora uzytkownika. Dopuszczalne sa tylko:
  - pasywne screenshoty,
  - komunikaty do konkretnych uchwytow okien/kontrolek,
  - odczyt okien i kontrolek bez globalnego ruchu myszy.

## Stan na koniec proby

- Modul jest zaladowany.
- Area `_ikea` jest faktycznie otwarta i renderuje teren/obiekty.
- Galaz `Placeables` jest rozwinieta.
- Dowolny placeable zostal zaznaczony.
- `Placeable Object Properties` zostalo otwarte dla zaznaczonego placeable.

# Ghidra Top Imports Hunt (R74)

## Agent C11: Top Imports Hunt
Cel: szybkie namierzenie logiki `resource loading/parsing` przez importy WinAPI i przejscie od importu do faktycznego parsera danych.

## Top importy WinAPI (priorytet P0/P1)

### P0: rdzen ladowania resource z PE
| Import | Dlaczego jest krytyczny | Co sledzic w dekompilacji |
|---|---|---|
| `FindResourceExW` / `FindResourceExA` | Najmocniejszy sygnal wejscia w PE `.rsrc` (type/name/lang). | Skad pochodza `lpType`, `lpName`, `wLanguage`; czy sa stale, enumy, czy input runtime. |
| `FindResourceW` / `FindResourceA` | Jak wyzej, bez language. | Czy wrapper buduje dynamiczne ID zasobu i czy ma fallbacki. |
| `LoadResource` | Przejscie z metadanych zasobu do uchwytu danych. | Kontrola bledow (`NULL`), kolejnosc wywolan, reuse uchwytu. |
| `LockResource` | Zwraca pointer do surowych bajtow zasobu. | Dokad idzie wskaznik: kopiowanie, rzutowanie na struktury, parser binarny. |
| `SizeofResource` | Rozmiar bufora zasobu, kluczowy dla granic parsera. | Czy rozmiar jest walidowany przed parsem/copy/decompress. |
| `EnumResourceTypesW` / `EnumResourceTypesA` | Enumeracja klas zasobow. | Callback i dispatcher: ktore typy ida do jakich parserow. |
| `EnumResourceNamesW` / `EnumResourceNamesA` | Enumeracja nazw/ID zasobow. | Mapowanie `name/id -> parser` oraz filtry/allowlisty. |
| `EnumResourceLanguagesW` / `EnumResourceLanguagesA` | Enumeracja wariantow jezykowych. | Czy branch jezykowy zmienia format danych lub sciezke parse. |
| `LoadStringW` / `LoadStringA` | Ladowanie string table z zasobow. | Czy string jest dalej parsowany (tokenizer, split, config). |

### P0: ladowanie modulu jako kontenera danych
| Import | Dlaczego jest krytyczny | Co sledzic w dekompilacji |
|---|---|---|
| `LoadLibraryExW` / `LoadLibraryExA` | Czesto `LOAD_LIBRARY_AS_DATAFILE` i potem `FindResource*`. | Flagi ladowania, zrodlo sciezki DLL, relacja z `FindResource*`. |
| `FreeLibrary` | Domkniecie cyklu danych ladowanych jako modul. | Czy cleanup jest poprawny po bledach parsera. |
| `GetModuleHandleW` / `GetModuleHandleA` | Zrodlo `HMODULE` dla `FindResource*` bez jawnego load. | Ktory modul jest przeszukiwany (`NULL` vs nazwa). |

### P0: resource z pliku (poza `.rsrc`)
| Import | Dlaczego jest krytyczny | Co sledzic w dekompilacji |
|---|---|---|
| `CreateFileW` / `CreateFileA` | Wejscie do custom assetow (`.2da`, `.gff`, `.tlk`, pakiety). | Flagi dostepu, sharing, zrodlo sciezki, canonicalization. |
| `ReadFile` | Surowy odczyt blobu do parsera. | Petle odczytu, partial read, walidacja rozmiaru. |
| `GetFileSizeEx` / `GetFileSize` | Rozmiar pliku przed alokacja/parsingiem. | Overflow, casty, brak limitow maksymalnych. |
| `SetFilePointerEx` / `SetFilePointer` | Skoki po sekcjach/recordach pliku. | Offsets liczone z inputu, granice i seek poza EOF. |
| `CloseHandle` | Koniec lifecycle uchwytu pliku/mapy. | Czy cleanup dzieje sie na wszystkich sciezkach bledu. |

### P0: memory-mapped parsing
| Import | Dlaczego jest krytyczny | Co sledzic w dekompilacji |
|---|---|---|
| `CreateFileMappingW` / `CreateFileMappingA` | Budowa widoku pliku pod parser struktur. | Ochrona mapy, rozmiary, dziedziczenie uchwytow. |
| `MapViewOfFile` / `MapViewOfFileEx` | Pointer na caly blob lub fragment. | Offset + length, rzutowania na struktury, pointer arithmetic. |
| `UnmapViewOfFile` | Cleanup mapy. | Czy wyjscia bledu nie zostawiaja mapy. |

### P1: alokacja/transformacje przed parserem
| Import | Dlaczego jest przydatny | Co sledzic w dekompilacji |
|---|---|---|
| `HeapAlloc` / `HeapReAlloc` / `HeapFree` | Bufory parsera i tabele indeksow. | Rozmiar alokacji vs rozmiar inputu; realloc i utrata pointera. |
| `VirtualAlloc` / `VirtualProtect` | Duze bufory, staging, czasem unpack/decrypt. | Strony RWX, kopie blobow, etap przed parsem. |
| `GlobalAlloc` / `LocalAlloc` | Starsze sciezki loadera. | Konwersja handli na wskazniki i kontrola rozmiaru. |
| `MultiByteToWideChar` | Konwersja text resource do UTF-16. | Dlugosci, kodowanie, handling niepoprawnych bajtow. |
| `WideCharToMultiByte` | Konwersja w druga strone. | Czy wynik trafia do parsera tokenow/formatu tekstowego. |

### P1: dekompresja i dekodowanie
| Import | Dlaczego jest przydatny | Co sledzic w dekompilacji |
|---|---|---|
| `RtlDecompressBuffer` / `RtlDecompressBufferEx` | Czesty etap `resource blob -> decompressed payload`. | Algorytm, expected size, fallback gdy rozmiar nieznany. |
| `RtlGetCompressionWorkSpaceSize` | Przygotowanie workspace do dekompresji. | Czy workspace/liczby sa sprawdzane. |
| `CreateDecompressor` / `Decompress` / `CloseDecompressor` | Nowszy pipeline dekompresji (Cabinet API). | Typ algorytmu i walidacja `FinalUncompressedSize`. |
| `CryptStringToBinaryA` / `CryptStringToBinaryW` | Decode base64/hex zanim ruszy parser. | Czy wejscie jest trusted i czy limity sa egzekwowane. |

### P1: introspekcja i patching zasobow
| Import | Dlaczego jest przydatny | Co sledzic w dekompilacji |
|---|---|---|
| `GetFileVersionInfoSizeW` / `GetFileVersionInfoW` | Czytanie `VERSIONINFO` z PE. | Jak wynik jest mapowany na logike feature-flag. |
| `VerQueryValueW` | Parse poddrzew `VS_VERSION_INFO`. | Rzutowania, indexing i walidacja dlugosci. |
| `BeginUpdateResourceW` | Start modyfikacji `.rsrc` (patcher/updater). | Zrodlo danych do update i warunki wykonania. |
| `UpdateResourceW` | Wlasciwy zapis nowych zasobow. | Type/name/lang oraz rozmiar bufora. |
| `EndUpdateResourceW` | Commit/rollback zmian w zasobach. | Flaga discard przy bledzie i atomowosc przeplywu. |

## Nawigacja po importach w Ghidrze (praktyczny workflow)

### 1. Start od importow, nie od Functions
1. Otworz `Symbol Tree -> Imports`.
2. Filtruj najpierw po rodzinach: `FindResource`, `LoadResource`, `MapViewOfFile`, `ReadFile`, `RtlDecompress`.
3. Dla kazdego importu: `Show References To` i od razu taguj callsite (`RES-CALLSITE`).

### 2. Buduj lancuch "od uchwytu do parsera"
Dla klasycznego PE resource szukaj stalego wzorca:
1. `FindResource*`
2. `SizeofResource`
3. `LoadResource`
4. `LockResource`
5. `memcpy/parser/decompress`

Jesli widzisz 1-4 w jednej funkcji lub 2 sasiednich funkcjach, to zwykle jest hot path.

### 3. Przechodz przez wrappery warstwowo
1. Wejdz do callsite importu.
2. `Show References To` dla funkcji-wrapppera (kto jej uzywa).
3. Idz poziom wyzej, az trafisz na dispatcher/entrypoint (`Load*`, `Parse*`, `CreateFrom*`).

Praktyka: zwykle 2-4 hop'y od importu masz realna logike domenowa.

### 4. Oznaczaj role funkcji
Stosuj szybkie etykiety przy renamingu:
- `res_open_*` dla `Find/Load/Lock`
- `res_read_*` dla `ReadFile/MapView`
- `res_unpack_*` dla `RtlDecompress/Decompress`
- `res_parse_*` dla funkcji, ktore rutuja pointer na struktury

To mocno porzadkuje callgraph i przyspiesza kolejne sesje.

### 5. Pilnuj argumentow, nie tylko nazw
Najwiecej sygnalu daje analiza argumentow:
- Czy `type/name/lang` sa stale czy z inputu?
- Czy `size` przechodzi walidacje zanim trafi do copy/parse?
- Czy offsety sa sprawdzane przed `MapViewOfFile` lub pointer arithmetic?

### 6. Rozdziel trzy glowne sciezki loadera
1. `PE resource path`: `FindResource* -> LockResource -> parser`.
2. `Disk blob path`: `CreateFile* -> ReadFile/MapViewOfFile -> parser`.
3. `Compressed path`: `Read/Lock -> Decompress* -> parser`.

W praktyce parser domenowy jest wspolny; roznia sie tylko adaptery wejscia.

## Szybkie pivoty (co klikac najpierw)
1. `FindResourceExW` (najwyzszy sygnal `.rsrc`).
2. `LoadLibraryExW` (czy zasoby sa ladowane z obcego modulu/pliku).
3. `MapViewOfFile` (duze parsery binarne na pointerach).
4. `RtlDecompressBufferEx` lub `Decompress` (ukryty payload przed parserem).
5. `MultiByteToWideChar` (gdy parser tekstowy/konfig oparty o resource stringi).

## Red flags podczas huntu
- Brak walidacji `SizeofResource`/`GetFileSizeEx` przed kopiowaniem.
- `MapViewOfFile` + duzo pointer arithmetic bez checkow granic.
- Dekompresja do bufora o rozmiarze z inputu bez twardego limitu.
- Dynamiczne `type/name` do `FindResource*` bez allowlisty.
- `UpdateResourceW` w runtime bez integrality check.

## Minimalny output z sesji C11
Po jednym przebiegu import-hunt warto miec:
1. Liste 20-40 funkcji z tagami `res_open/res_read/res_unpack/res_parse`.
2. 3-5 potwierdzonych lancuchow E2E od importu do parsera.
3. Notatke, ktore importy sa tylko wrapper-thunkami, a ktore prowadza do logiki domenowej.

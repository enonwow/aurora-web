# Aurora Toolset: Trigger Properties findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live: `d_und`.
- Obiekt testowy: istniejacy trigger `d_und_t_left_2`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Area `d_und` zostala wybrana po szybkim pasywnym skanie pliku modulu: jej GIT
ma niepusty `TriggerList` z duza liczba wpisow. To byl tylko skrot szukania;
atom zostal zaliczony dopiero po live screenach Toolsetu.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-044-current-readable-check.png` | Toolset widoczny i czytelny na drugim ekranie przed atomem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-045-d-und-open-attempt.png` | `d_und` otwarte jako karta area. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-046-d-und-triggers-expanded.png` | `d_und -> Triggers` rozwiniete, widoczna lista triggerow. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-050-trigger-doubleclick-attempt.png` | Podwojny klik triggera nie otworzyl properties, tylko sfokusowal obiekt na scenie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-051-trigger-properties-wmchar-attempt.png` | `Trigger Properties`, karta `Basic`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-052-trigger-properties-scripts.png` | `Trigger Properties`, karta `Scripts`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-053-trigger-properties-advanced.png` | `Trigger Properties`, karta `Advanced`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-054-trigger-properties-comments.png` | `Trigger Properties`, karta `Comments`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-055-after-trigger-properties-cancel.png` | Dialog zamkniety przez `Cancel`, widok nadal czytelny. |

## Sekwencja odtworzenia

1. Potwierdzic, ze `nwtoolset.exe` dziala i realny screenshot pokazuje Toolset
   na drugim ekranie.
2. W drzewie `Areas` otworzyc area `d_und`.
3. Rozwinac `d_und -> Triggers`.
4. Zaznaczyc istniejacy trigger, np. `d_und_t_left_2`.
5. Otworzyc context menu triggera.
6. Z menu wybrac `Properties`.
7. Przejsc po kartach `Basic`, `Scripts`, `Advanced`, `Comments`.
8. Zamknac przez `Cancel`.

## Skuteczna metoda menu

Menu triggera zostalo odczytane jako:

| Pos | Id | Text |
| --- | --- | --- |
| 0 | 2 | `Focus on Object` |
| 1 | 3 | `Adjust Location` |
| 3 | 9 | `Cut` |
| 4 | 10 | `Copy` |
| 5 | 12 | `Remove` |
| 7 | 15 | `Add To Palette` |
| 9 | 18 | `Variables` |
| 10 | 19 | `Properties` |

W tej klasie menu samo `WM_KEYDOWN P`, `WM_COMMAND 19` do ramki i celowany
klik w okno menu nie byly niezawodne. Skuteczna sciezka:

1. Otworzyc popup menu przez celowany prawy klik na triggerze w `TTreeView`.
2. Odczytac aktywne menu `#32768`.
3. Wyslac `WM_CHAR` z wartoscia `p` do okna popup menu.

To otworzylo `Trigger Properties` bez uzycia globalnego `SendKeys` i bez
przejmowania kursora.

## Zakladki i pola

### Basic

- `Name`: `d_und_t_left_2`
- `Tag`: `d_und_t_left_2`
- `Trigger Type`: `Generic`

### Scripts

- Sloty: `OnClick`, `OnEnter`, `OnExit`, `OnHeartbeat`, `OnUserDefined`.
- Dla probki `d_und_t_left_2` widoczne bylo `OnEnter = d_und_t_enter`.
- Kazdy slot ma przycisk `...` oraz `Edit`.
- Dostepne przyciski: `Load Script Set`, `Save Script Set`.

### Advanced

- `Auto-Remove Key`
- `Key Tag`
- `Faction`: `Hostile`
- `Highlight Height`: `0,0`
- `Blueprint ResRef`: `newgeneric`
- `Cursor`: `Unclickable (No Cursor)`
- `Portrait`
- `Variables`

### Comments

- Karta jest widoczna i w tej probce pusta.

## Dodatkowe obserwacje

- Podwojny klik triggera w drzewie nie otworzyl properties. Zamiast tego
  sfokusowal trigger na scenie i przesunal kadr do obiektu.
- Po sfokusowaniu triggera scene pokrywaja czerwone grid lines, niebieskie
  prostokaty triggerow i zolte znaczniki kierunku/obiektu. Screen nadal jest
  czytelny, ale taki overlay moze pogorszyc wartosc kolejnych dowodow.
- W enumeracji kontrolek dialogu widoczna byla ukryta karta `Trap`, ale
  normalnie dostepne karty UI to `Basic`, `Scripts`, `Advanced`, `Comments`.
- Nie nalezy tworzyc nowego triggera w tym samym atomie co samo otwarcie
  properties. Rysowanie trigger volume jest osobna mutacja geometryczna.

## Refresh HB-S49

W pozniejszym heartbeatcie atom zostal odtworzony ponownie:

- Startowy obszar `hx_tygiel_under` mial widoczna galaz `Triggers`, ale w tej
  probie nie pokazala ona dzieci; do triggerow wrocono wiec na `d_und`.
- `d_und` otwarto z drzewa przez context menu `View Area`.
- Otworzono properties pierwszego widocznego triggera `d_und_t_left`.
- Przejrzano karty `Basic`, `Scripts`, `Advanced`, `Comments`.
- Dialog zamknieto przez `Cancel`.

Szczegoly i screeny:
[Trigger Properties refresh](aurora-toolset-trigger-properties-refresh-2026-06-18.md).

Najwazniejsza korekta techniczna: nie szukac dialogu po samym tytule
`Trigger Properties`, bo w procesie moze istniec ukryty `TfrmPreview` z tym
samym tytulem. Prawdziwy dialog edycji ma klase `TdlgTriggerEdit`.

## Bezpieczenstwo

- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie uzyto remote-memory TreeView reads/writes.
- Dialog zamknieto przez `Cancel`.
- Modul nie zostal zapisany.

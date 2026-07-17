# Aurora Toolset: Trigger Properties refresh

Data: 2026-06-18

Ten dokument dopisuje refresh heartbeatowy dla atomu `Trigger Properties`.
Celem bylo odtworzyc otwarcie istniejacego triggera w live Toolsecie, zrobic
screeny zakladek i zamknac dialog przez `Cancel`, bez mutacji.

## Kontekst

- Modul: `the_last_city - codex.mod`.
- Aktywna area po korekcie: `d_und`.
- Obiekt: pierwszy widoczny trigger z listy `d_und -> Triggers`,
  `d_und_t_left`.
- Mutacje: brak.
- Zapis modulu: brak.
- Sterowanie: celowane komunikaty do `TTreeView`, popupu `#32768` i
  prawdziwego dialogu `TdlgTriggerEdit`; bez globalnego kursora i bez
  globalnego `SendKeys`.

## Sekwencja, ktora zadzialala

1. Z aktualnego stanu `hx_tygiel_under` zrobiono screenshot bramki
   czytelnosci.
2. Sprawdzono `hx_tygiel_under -> Triggers`; galaz nie pokazala dzieci, wiec
   nie zostala uzyta do atomu.
3. Przewinieto lewy `TTreeView` celowanym `WM_MOUSEWHEEL`, az `d_und` bylo
   widoczne.
4. Na `d_und` otwarto context menu i wybrano `View Area` akceleratorem `v`
   wyslanym do popupu `#32768`.
5. Po zaladowaniu canvasu `d_und` rozwinieto `d_und -> Triggers`.
6. Na pierwszym widocznym triggerze `d_und_t_left` otwarto context menu i
   wybrano `Properties` przez `WM_CHAR p` do popupu.
7. Prawdziwy dialog rozpoznano po klasie `TdlgTriggerEdit`, nie po samym
   tytule `Trigger Properties`.
8. Na `TdlgTriggerEdit` przejrzano karty `Basic`, `Scripts`, `Advanced` i
   `Comments`.
9. Dialog zamknieto przez prawdziwy przycisk `Cancel`.

## Zakladki i rozpoznane pola

### Basic

- `Name`: `d_und_t_left`.
- `Tag`: `d_und_t_left`.
- `Trigger Type`: `Generic`.

### Scripts

- Sloty: `OnClick`, `OnEnter`, `OnExit`, `OnHeartbeat`, `OnUserDefined`.
- `OnEnter`: `d_und_t_enter`.
- Kazdy slot ma przyciski `...` i `Edit`.
- Widoczne przyciski `Load Script Set` i `Save Script Set`.

### Advanced

- `Auto-Remove Key`: unchecked.
- `Key Tag`: puste.
- `Faction`: `Hostile`.
- `Highlight Height`: `0,0`.
- `Blueprint ResRef`: `newgeneric001`.
- `Cursor`: `Unclickable (No Cursor)`.
- Widoczne sekcje `Portrait` i `Variables`.

### Comments

- Karta otwarta; pole komentarzy jest puste.

## Dowody

- Start w `hx_tygiel_under`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-518-s49-trigger-current-state.png`
- Nieudana proba z `hx_tygiel_under`: klik za nisko rozwinal `Waypoints`,
  nie `Triggers`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-519-s49-after-expand-hx-triggers-attempt.png`
- Korekta pokazuje, ze `hx_tygiel_under -> Triggers` nie ma widocznych dzieci:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-520-s49-after-expand-hx-triggers-corrected.png`
- Scroll do `d_und`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-521-s49-scroll-toward-d-und.png`
- Context menu `d_und` z `View Area`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-522-s49-d-und-context-menu.png`
- `d_und` po zaladowaniu:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-524-s49-after-d-und-loaded.png`
- `d_und -> Triggers` rozwiniete:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-526-s49-d-und-triggers-expanded.png`
- Context menu triggera:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-533-s49-trigger-context-menu-recapture.png`
- `Basic`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-534-s49-trigger-basic-recapture.png`
- `Scripts`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-535-s49-trigger-scripts-recapture.png`
- `Advanced`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-536-s49-trigger-advanced-recapture.png`
- `Comments`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-537-s49-trigger-comments-recapture.png`
- Stan po `Cancel`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-538-s49-after-trigger-recapture-cancel.png`

## Pulapki

- W `hx_tygiel_under` widoczna jest galaz `Triggers`, ale w tej probie nie
  pokazala dzieci. Do nauki triggerow lepsze jest `d_und`.
- Klik w okolicy `hx_tygiel_under -> Triggers` za nisko rozwinal `Waypoints`.
- W procesie Toolsetu istnieje ukryte top-level okno `TfrmPreview` z tytulem
  `Trigger Properties`. Nie wolno wyszukiwac dialogu tylko po tytule, bo
  mozna trafic w preview i klikac niewlasciwy `TPageControl`.
- Prawdziwy dialog edycji triggera to `TdlgTriggerEdit`.
- Po otwarciu properties canvas moze zostac pokryty czerwonym gridem i
  markerami triggerow; screenshoty sa uzyteczne, ale trzeba pilnowac
  czytelnosci.
- Rysowanie nowego trigger volume jest osobna mutacja i nie bylo wykonywane.

## Status

- Istniejacy trigger -> `Trigger Properties`: `safe-repeatable` dla
  otwarcia/przejscia kart/zamkniecia `Cancel`.
- Tworzenie albo rysowanie nowego trigger volume: `gap`.
- Mutacje: brak.
- Zapis modulu: brak.

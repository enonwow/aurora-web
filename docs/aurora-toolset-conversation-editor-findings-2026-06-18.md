# Aurora Toolset: Conversation Editor findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live w tle: `d_und`.
- Edytor live: `Conversation Editor - untitled000`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

To jest atom orientacji po Conversation Editorze. Nie oznacza jeszcze
utworzenia rozmowy, przypiecia jej do NPC ani edycji istniejacego pliku dialogu.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-087-s10-readability-gate.png` | Bramka czytelnosci: Toolset widoczny na drugim ekranie przed atomem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-092-s10-tools-command-125-attempt.png` | `Conversation Editor - untitled000` otwarty przez komende `Tools` ID `125`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-093-s10-conversation-editor-overview-data-textappears.png` | Overview: diagram rozmowy, `Data`, prawy panel `Text Appears When ...`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-094-s10-conversation-editor-actions-taken.png` | Prawy panel `Actions Taken`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-095-s10-conversation-editor-other-actions.png` | Prawy panel `Other Actions`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-096-s10-conversation-editor-comments-right-tab.png` | Prawy panel `Comments`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-097-s10-conversation-editor-bookmarks-tab.png` | Dolna zakladka `Bookmarks`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-098-s10-conversation-editor-search-tab.png` | Dolna zakladka `Search`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-099-s10-conversation-editor-data-restored.png` | Powrot do dolnej zakladki `Data`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-100-s10-after-conversation-done.png` | Conversation Editor zamkniety przez `Done`; w tle zostal jeszcze modal `Creature Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-101-s10-after-all-dialogs-closed.png` | Po zamknieciu `Creature Properties` przez `Cancel`, zostal tylko glowny Toolset. |

## Sekwencja odtworzenia

1. Potwierdzic, ze `nwtoolset.exe` dziala i realny screenshot pokazuje Toolset
   na drugim ekranie.
2. Otworzyc Conversation Editor przez komende `Tools` ID `125`.
3. Zrobic overview calego edytora.
4. Przejsc po prawych zakladkach: `Text Appears When ...`, `Actions Taken`,
   `Other Actions`, `Comments`.
5. Przejsc po dolnych zakladkach: `Data`, `Bookmarks`, `Search`.
6. Zamknac edytor przez `Done`.
7. Sprawdzic, czy nie zostaly modale w tle; jesli tak, zamknac bez zapisu albo
   przez `Cancel`.

## Skuteczna metoda otwarcia

Glowny pasek menu Toolsetu jest w duzej czesci owner-draw. Win32 zwraca nazwy
glownych menu (`File`, `Edit`, `View`, `Environment`, `Build`, `Tools`,
`Wizards`, `Help`), ale pozycje submenu mialy puste teksty i same ID.

W tym przebiegu:

- `Tools` submenu zawieralo ID `125-130`.
- Celowane `WM_COMMAND 125` do `TfrmFrame` otworzylo
  `TdlgConversationEditor` z tytulem `Conversation Editor - untitled000`.
- Edytor zostal zamkniety przez przycisk `Done`.

## Panele i funkcje

### Gorny diagram rozmowy

- Edytor ma glowny canvas drzewa rozmowy.
- Nowo otwarty edytor zawiera zakladke `untitled000`.
- W drzewie widoczny jest korzen `Root`.
- Po lewej stronie jest pionowy pasek narzedzi do operacji na wezle/strukturze.
- Na gorze jest pasek narzedzi z ikonami pliku, zapisu, struktur drzewa i
  operacji na wezle.

### Dolna zakladka `Data`

- Widoczne pola:
  - `Speaker Tag`;
  - przycisk `Add`;
  - duze pole `Text`;
  - licznik `Line Letter Count`, `Line Word Count`, `File Word Count`,
    `Module Word Count`.
- W pustym `untitled000` czesc pol jest nieaktywna, dopoki nie ma edytowalnego
  wezla/tekstu.

### Dolna zakladka `Bookmarks`

- Pokazuje duzy pusty panel listy/obszaru bookmarkow.
- W pustej rozmowie nie ma wpisow.

### Dolna zakladka `Search`

- Pokazuje duzy pusty panel wyszukiwania/wynikow.
- W pustej rozmowie nie ma wynikow.

### Prawy panel `Text Appears When ...`

- Widoczny slot `Script`, przyciski `...` i `Edit`.
- Widoczna tabela `Name` / `Value`.
- Widoczny `Script Preview`.
- To wyglada na warunek pokazywania linii.

### Prawy panel `Actions Taken`

- Zakladka jest widoczna. W pustym `untitled000` jej uklad byl bardzo podobny
  do panelu warunkow: slot skryptu, tabela wartosci i `Script Preview`.

### Prawy panel `Other Actions`

- Widoczne sekcje:
  - `Play Animation`;
  - `Play Sound`;
  - `Journal` z przyciskiem `Edit`;
  - przycisk `Play` dla dzwieku.
- W pustej rozmowie pola sa wyszarzone.

### Prawy panel `Comments`

- Widoczny duzy pusty obszar komentarzy.
- Brak wpisow w pustym `untitled000`.

## Dodatkowe obserwacje

- Samo otwarcie Conversation Editora przez `Tools` ID `125` tworzy/otwiera
  pusty edytor `untitled000`. Dopoki nie klikamy save/commit i zamykamy przez
  `Done`, nie zapisano modulu.
- Po kilku wczesniejszych probach na creature, modal `Creature Properties`
  pojawil sie w tle dopiero podczas S10. Zostal zamkniety przez `Cancel`.
  Dlatego po kazdym atomie trzeba enumerowac top-level okna i upewnic sie, ze
  nie zostal ukryty modal.
- Dla rozmow i propertiesow pojedynczy screenshot jest za slaby. Minimalny
  standard dowodowy to overview plus kazda widoczna zakladka albo wiekszy panel
  funkcjonalny.

## Bezpieczenstwo

- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie wpisywano tekstu w edytorze.
- Nie klikano ikon zapisu.
- Edytor zamknieto przez `Done`.
- Pozostaly modal `Creature Properties` zamknieto przez `Cancel`.
- Modul nie zostal zapisany.

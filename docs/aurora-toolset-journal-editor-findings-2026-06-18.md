# Aurora Toolset: Journal Editor findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live w tle: `d_und`.
- Edytor live: `Journal Editor`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Ten atom dotyczy orientacji po Journal Editorze. Nie dodawano kategorii,
nie edytowano wpisow dziennika, nie klikano `Apply` ani `OK`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-119-s13-readability-gate.png` | Bramka czytelnosci: glowny Toolset widoczny na drugim ekranie przed atomem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-121-s13-after-command-timeout-inspection.png` | `Journal Editor` otwarty po `Tools` ID `128`; okno `TdlgJournalEditor` widoczne live. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-122-s13-journal-editor-overview.png` | Pelny screenshot Journal Editora na tle Toolsetu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-123-s13-journal-editor-window-crop.png` | Zblizenie calego okna: drzewo `Root`, dolny panel i przyciski. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-124-s13-journal-editor-tree-toolbar-crop.png` | Zblizenie glownego drzewa i pionowego toolbara. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-125-s13-journal-editor-category-comments-crop.png` | Zblizenie dolnych paneli `Category` i `Comments`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-126-s13-journal-editor-buttons-crop.png` | Zblizenie przyciskow `Apply`, `OK`, `Cancel`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-127-s13-after-journal-cancel.png` | Journal Editor zamkniety przez `Cancel`; zostal tylko glowny Toolset. |

## Sekwencja odtworzenia

1. Potwierdzic realnym screenshotem, ze Toolset jest widoczny na drugim ekranie.
2. Wywolac `Tools` ID `128` do glownego `TfrmFrame`.
3. Zweryfikowac top-level okno `TdlgJournalEditor` z tytulem `Journal Editor`.
4. Zrobic overview calego okna.
5. Udokumentowac glowne funkcje/panele:
   - drzewo journal entries z korzeniem `Root`;
   - pionowy toolbar po lewej;
   - dolny panel `Category`;
   - dolny panel `Comments`;
   - przyciski `Apply`, `OK`, `Cancel`.
6. Zamknac przez `Cancel`.
7. Zrobic screenshot po zamknieciu, potwierdzajacy brak modalnego okna.

## Skuteczna metoda otwarcia

W tym przebiegu:

- `Tools` ID `125` = Conversation Editor.
- `Tools` ID `126` = Faction Editor.
- `Tools` ID `127` = Script Editor.
- `Tools` ID `128` = Journal Editor.

Uwaga techniczna: synchroniczne `SendMessage(WM_COMMAND, 128)` otworzylo
Journal Editor, ale wywolanie nie wrocilo przed timeoutem procesu PowerShell.
Praktyczna lekcja: dla modalnych edytorow bezpieczniej uzyc `PostMessage` albo
po wyslaniu komendy szybko przejsc na pasywna enumeracje okien i screenshot.

## Panele i funkcje

### Drzewo i toolbar

- Glowny panel to `TTreeView` z korzeniem `Root`.
- Po lewej stronie jest pionowy toolbar z ikonami operacji na strukturze
  dziennika.
- W pustym/stanie startowym nie klikano ikon, bo moga dodawac albo usuwac
  kategorie i wpisy.

### Category

- Dolny panel `Category` pokazuje pola:
  - `Name` z przyciskiem `...`;
  - `Tag`;
  - `Priority`;
  - `XP`.
- Przy zaznaczonym `Root` pola byly wyszarzone albo puste, z `XP` widocznym jako
  `0`.

### Comments

- Po prawej stronie dolnego panelu jest duze pole `Comments`.
- W tym przebiegu bylo puste.

### Przyciski

- `Apply` i `OK` sa potencjalnie mutujace.
- `Cancel` zamyka edytor bez zapisu zmian i byl jedynym uzytym przyciskiem.

## Pulapki

- `Apply`, `OK`, ikony toolbara i przycisk `...` przy `Name` moga prowadzic do
  mutacji albo wyboru zasobu. W atomie orientacyjnym ich nie klikac.
- Journal Editor jest edytorem globalnego zasobu modulu, wiec zmiany moga miec
  szeroki zasieg fabularny.
- Nie promowac tego atomu do `mutated-live`, dopoki nie ma osobnej zgody na
  kontrolowana testowa kategorie/wpis i rollback.

## Bezpieczenstwo

- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie wpisywano tekstu.
- Nie klikano `Apply` ani `OK`.
- Nie klikano ikon toolbara.
- Edytor zamknieto przez `Cancel`.
- Modul nie zostal zapisany.

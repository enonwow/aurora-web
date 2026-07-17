# Aurora Toolset: Script Editor findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live w tle: `d_und`.
- Edytor live: `Script Editor`.
- Nowy zasob roboczy w edytorze: `untitled000`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Ten atom dotyczy orientacji po Script Editorze i bezpiecznego otwarcia/zamkniecia
edytora. Nie wpisywano kodu, nie kompilowano, nie klikano zapisu i nie tworzono
pliku skryptu.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-106-s12-readability-gate.png` | Bramka czytelnosci: glowny Toolset i area `d_und` widoczne na drugim ekranie przed atomem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-107-s12-tools-command-127-attempt.png` | `Script Editor` otwarty po celowanym `WM_COMMAND 127` do `TfrmFrame`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-108-s12-script-editor-overview-functions-help.png` | Overview edytora: `untitled000`, domyslny szkielet `void main()`, prawy panel biblioteki funkcji. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-109-s12-script-editor-variables-tab.png` | Prawa zakladka `Variables`, pusta dla nowego skryptu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-110-s12-script-editor-constants-tab.png` | Prawa zakladka `Constants`, lista stalych `ABILITY_*`, `AC_*`, `ACTION_*`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-111-s12-script-editor-templates-tab.png` | Prawa zakladka `Templates`, pusta w tym przebiegu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-112-s12-script-editor-functions-restored.png` | Powrot do prawej zakladki `Functions`, lista funkcji `AbortRunningScript`, `abs`, `acos`, `ActionAttack`, itd. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-113-s12-script-editor-compiler-tab.png` | Dolna zakladka `Compiler`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-114-s12-script-editor-help-tab.png` | Dolna zakladka `Help`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-115-s12-script-editor-bookmarks-tab.png` | Dolna zakladka `Bookmarks`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-116-s12-script-editor-search-results-tab.png` | Dolna zakladka `Search Results`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-117-s12-after-script-editor-exit.png` | Proba `BM_CLICK` na `Exit` tylko sfokusowala przycisk; edytor nadal byl otwarty. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-118-s12-after-direct-exit-click.png` | Zamkniecie po bezposrednim `WM_LBUTTONDOWN/UP` do kontrolki `Exit`; zostal tylko glowny Toolset. |

## Sekwencja odtworzenia

1. Potwierdzic realnym screenshotem, ze `nwtoolset.exe` jest widoczny na drugim
   ekranie i nie ma modalnych okien z poprzednich prob.
2. Wywolac `Tools` ID `127` jako celowane `WM_COMMAND` do glownego `TfrmFrame`.
3. Zweryfikowac top-level okno `TdlgScriptEditor` z tytulem `Script Editor`.
4. Zrobic overview calego edytora.
5. Przejsc po prawych zakladkach biblioteki: `Functions`, `Variables`,
   `Constants`, `Templates`.
6. Przejsc po dolnych zakladkach: `Compiler`, `Help`, `Bookmarks`,
   `Search Results`.
7. Zamknac edytor przez przycisk `Exit`, bez zapisu i bez kompilacji.
8. Zrobic screenshot po zamknieciu, z glownym Toolsetem jako jedynym widocznym
   oknem Aurory.

## Skuteczna metoda otwarcia

Glowny pasek menu Toolsetu jest owner-draw i pozycje submenu zwracaja puste
teksty, ale ID mozna rozpoznawac przez Win32.

W tym przebiegu:

- `Tools` ID `125` bylo wczesniej rozpoznane jako Conversation Editor.
- `Tools` ID `126` bylo wczesniej rozpoznane jako Faction Editor.
- `Tools` ID `127` otworzylo `TdlgScriptEditor` z tytulem `Script Editor`.

Uwaga techniczna: pierwszy filtr detekcji nie rozpoznal okna jako celu, ale
screenshot i enumeracja top-level potwierdzily `TdlgScriptEditor`. Przy
podobnych atomach nie wystarczy polegac na jednym filtrze tekstowym; trzeba
sprawdzic screenshot i liste top-level okien.

## Panele i funkcje

### Edytor kodu

- Glowny obszar zawiera zakladke `untitled000`.
- Domyslny szkielet nowego skryptu:

```c
void main()
{
}
```

- Po lewej widoczne sa numery linii.
- Na gorze jest pasek ikon dla operacji edytora, w tym ikony zwiazane z plikiem,
  kompilacja, wyszukiwaniem i nawigacja. W tym atomie nie klikano ikon zapisu
  ani kompilacji.

### Prawa biblioteka

- Nad zakladkami jest pole `Filter`.
- `Functions` pokazuje liste funkcji NWScript, m.in. `AbortRunningScript`,
  `abs`, `acos`, `ActionAttack`.
- `Variables` bylo puste dla nowego `untitled000`.
- `Constants` pokazuje liste stalych, m.in. `ABILITY_CHARISMA`,
  `ABILITY_CONSTITUTION`, `AC_*`, `ACTION_*`.
- `Templates` bylo puste w tym przebiegu.

### Dolny panel

- Widoczne zakladki: `Compiler`, `Help`, `Bookmarks`, `Search Results`.
- Przy pustym skrypcie bez kompilacji panele byly zasadniczo puste.
- To nadal jest istotny dowod orientacyjny, bo pokazuje gdzie pojawia sie wynik
  kompilacji, pomoc, bookmarki i wyniki wyszukiwania.

## Zamkniecie

- `BM_CLICK` wyslany do przycisku `Exit` nie zamknal edytora; tylko sfokusowal
  przycisk.
- Skuteczne bylo bezposrednie wyslanie `WM_LBUTTONDOWN` i `WM_LBUTTONUP` do
  kontrolki `Exit`.
- Po zamknieciu nie pojawil sie prompt zapisu, bo nie wykonano zmian w kodzie.

## Pulapki

- Ikony zapisu/kompilacji moga tworzyc lub modyfikowac zasoby. W atomie
  orientacyjnym ich nie klikac.
- Samo otwarcie Script Editora tworzy roboczy `untitled000`, ale nie oznacza
  zapisu zasobu w module.
- Nie awansowac tego atomu do `mutated-live`, dopoki nie ma osobnej zgody na
  kontrolowana edycje testowego skryptu i rollback.
- Przy zamykaniu warto zawsze zrobic screenshot po akcji, bo `BM_CLICK` moze
  tylko ustawic fokus na przycisku.

## Bezpieczenstwo

- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie wpisywano tekstu w edytorze.
- Nie klikano ikon zapisu.
- Nie klikano kompilacji.
- Edytor zamknieto przez kontrolke `Exit`.
- Modul nie zostal zapisany.

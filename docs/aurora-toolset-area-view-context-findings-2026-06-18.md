# Aurora Toolset: Area context View Area findings

Data: 2026-06-18

Ten dokument opisuje live atom otwarcia renderu area z drzewa `Areas` przez
menu kontekstowe `View Area`. To jest wazny wynik, bo wyjasnia stan, w ktorym
samo zaznaczenie area albo poprzednie proby otwieraly `Area Properties`, ale
nie pokazywaly canvasu.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul: `the_last_city - codex.mod` / wariant pliku z em-dash.
- Area: `enon_bakery`.
- Stan startowy: Toolset widoczny na drugim ekranie, drzewo `Areas`
  rozwiniete, `enon_bakery` zaznaczone, brak modalnych okien.
- Uwaga: tytul Toolsetu mial `*` juz przed tym atomem po wczesniejszym `OK` w
  `Area Properties`. W tym atomie nie wykonano zadnej mutacji i nie zapisano
  modulu.

## Sekwencja, ktora zadzialala

1. Zaznaczone bylo `enon_bakery` w drzewie `Areas`.
2. Otworzyc menu kontekstowe na zaznaczonym wpisie area.
3. Menu pokazalo:
   - `View Area`;
   - `Create Copy`;
   - `Remove`;
   - `Export Area`;
   - `Properties`.
4. Wybrac `View Area`.
5. Toolset otworzyl render area w glownym obszarze roboczym.

## Wynik live

Po `View Area` widoczny jest:

- tab area `enon_bakery`;
- render lokacji z wnetrzem bakery;
- prawa paleta `Terrain`/standardowa paleta;
- dolny toolbar kamery;
- czerwone linie/selekcje wewnatrz area oraz zielony outline po wczesniejszym
  probnym wyborze terrain/floor.

Enumeracja okien potwierdzila:

- `TfrmViewerArea - enon_bakery`;
- `TTabSheet enon_bakery`;
- glowny `TScrollBox` renderu;
- dodatkowy dolny `TScrollBox` toolbaru kamery;
- prawa paleta `TfraMainPalette`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-275-s26-area-tree-context-before.png` | Stan przed menu kontekstowym area. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-276-s26-area-tree-context-menu.png` | Menu kontekstowe area z widocznym `View Area`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-277-s26-after-view-area-command.png` | `enon_bakery` otwarte jako render/canvas po `View Area`. |

## Wniosek operacyjny

- Jezeli area w drzewie jest tylko zaznaczona albo `Enter`/inna sciezka otwiera
  `Area Properties`, nie oznacza to jeszcze zlego zaladowania modulu.
- Dla area w drzewie bezpieczna sciezka do canvasu to menu kontekstowe
  `View Area`.
- `Properties` w tym samym menu jest osobna sciezka do `Area Properties` i nie
  powinna byc mylona z otwarciem renderu.

## Pulapki

- `Create Copy`, `Remove` i potencjalnie `Export Area` sa szerokimi operacjami;
  nie wybierac ich w atomie otwierania renderu.
- `Properties` otwiera dialog ustawien area, a nie canvas.
- Po otwarciu renderu sprawdzic, czy na scenie nie zostal stary preview/outline
  z poprzedniego trybu palety; moze obnizac czytelnosc kolejnych screenshotow.
- Nadal nie zapisywac modulu bez zgody, szczegolnie gdy tytul ma `*` ze
  starszej zmiany.

## Status

- `Area context View Area`: `opened-live`.
- Mutacje: brak.
- Zapis modulu: brak.
- Nastepny eksperyment: przy aktywnym canvasie ponownie sprawdzic
  `Environment`, `Selection Mode` i `Object Filters`, bo pozycje wyszarzone bez
  renderu moga byc teraz dostepne.

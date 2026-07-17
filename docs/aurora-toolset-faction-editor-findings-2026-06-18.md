# Aurora Toolset: Faction Editor findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live w tle: `d_und`.
- Edytor live: `Faction Editor`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Ten atom dotyczy orientacji po edytorze fakcji. Nie wykonano zmiany relacji,
nie dodano fakcji i nie zapisano modulu.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-102-s11-readability-gate.png` | Bramka czytelnosci: Toolset widoczny i bez modalnych okien przed atomem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-103-s11-tools-command-126-attempt.png` | `Faction Editor`, karta `Basic`, otwarty przez `Tools` ID `126`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-104-s11-faction-editor-advanced.png` | `Faction Editor`, karta `Advanced`, macierz relacji. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-105-s11-after-faction-cancel.png` | Dialog zamkniety przez `Cancel`; zostal tylko glowny Toolset. |

## Sekwencja odtworzenia

1. Potwierdzic, ze `nwtoolset.exe` dziala i realny screenshot pokazuje Toolset
   na drugim ekranie.
2. Upewnic sie, ze nie ma modalnych okien z poprzednich prob.
3. Wywolac `Tools` ID `126` jako celowane `WM_COMMAND` do `TfrmFrame`.
4. Zrobic screenshot karty `Basic`.
5. Przelaczyc `TPageControl` na `Advanced` i zrobic screenshot.
6. Zamknac dialog przez `Cancel`.
7. Ponownie sprawdzic top-level okna, czy nie zostal modal.

## Skuteczna metoda otwarcia

Glowny pasek menu Toolsetu jest owner-draw i submenu zwraca puste teksty, ale
ID sa stabilnie widoczne przez Win32. W tym przebiegu:

- `Tools` ID `125` bylo wczesniej rozpoznane jako Conversation Editor.
- `Tools` ID `126` otworzylo `TdlgFactionEditor` z tytulem `Faction Editor`.

## Zakladki i pola

### Basic

- Lewa czesc to panel OpenGL z wykresem relacji.
- Po prawej stronie lista `Factions`.
- Widoczne fakcje:
  - `PC`;
  - `Hostile`;
  - `Commoner`;
  - `Merchant`;
  - `Defender`.
- Przyciski: `Add Faction`, `Remove Faction`.
- Checkboxy: `Full Detail`, `Global Effect`.
- Dolne przyciski dialogu: `OK`, `Cancel`.

### Advanced

- Widoczna macierz relacji fakcji.
- Kolumny i wiersze obejmuja m.in. `PC`, `Hostile`, `Commoner`, `Merchant`,
  `Defender`.
- Kolory komorek pokazują relacje, np. czerwone `0`, szare `50`, niebieskie
  `100`.
- Po prawej stronie widoczna lista fakcji.
- W `Advanced` przycisk `Remove Faction` byl wyszarzony przy zaznaczeniu wielu
  wpisow.
- `Global Effect` byl widoczny jako checkbox w sekcji `Properties`.

## Pulapki

- `OK`, `Add Faction`, `Remove Faction`, klik komorek macierzy i checkbox
  `Global Effect` sa potencjalnie mutujace. W atomie orientacyjnym ich nie
  klikac.
- Faction Editor jest systemowym edytorem modulu, nie properties pojedynczego
  creature. Zmiany tutaj moga miec szeroki zasieg.
- Nie promowac tego atomu do `mutated-live`, dopoki nie ma osobnej zgody na
  kontrolowana zmiane testowej fakcji i rollback.

## Bezpieczenstwo

- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie klikano `OK`.
- Nie klikano `Add Faction` ani `Remove Faction`.
- Nie edytowano macierzy relacji.
- Dialog zamknieto przez `Cancel`.
- Modul nie zostal zapisany.

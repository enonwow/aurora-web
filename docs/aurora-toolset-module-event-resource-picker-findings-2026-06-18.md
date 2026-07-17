# Aurora Toolset: Module event resource picker findings

Data: 2026-06-18

Ten dokument opisuje live atom `Module Properties -> Events -> ...` dla
globalnego slotu skryptu modulu. Zakres: otwarcie selektora zasobu skryptu,
sprawdzenie filtrow zasobow i zamkniecie przez `Cancel`, bez wyboru innego
skryptu, bez `Open`, bez `OK` w `Module Properties` i bez zapisu modulu.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul: `the_last_city - codex.mod` / wariant pliku z em-dash.
- Stan startowy: Toolset widoczny na drugim ekranie, drzewo `Areas`
  rozwiniete, zaznaczone `enon_bakery`.
- Uwaga: tytul Toolsetu mial `*` juz przed tym atomem po wczesniejszym `OK` w
  `Area Properties`. W tym atomie nie wykonano nowej mutacji i nie zapisano
  modulu.

## Sekwencja, ktora zadzialala

1. Otworzyc `Module Properties` przez `Edit -> Module Properties`.
2. Przejsc na karte `Events`.
3. Przy pierwszym slocie `OnAcquireItem = _main_on_acqu` kliknac przycisk
   `...`.
4. Otworzyl sie dialog `Select Resource` (`TdlgResOpen`).
5. Udokumentowano stan domyslny `Module Resources Only`.
6. Przelaczono filtr na `All Resources` i zrobiono screenshot.
7. Przelaczono filtr na `Hak Pak Resources Only` i zrobiono screenshot.
8. Przywrocono `Module Resources Only`.
9. Zamknieto `Select Resource` przez `Cancel`.
10. Zamknieto `Module Properties` przez `Cancel`.

## Rozpoznane elementy dialogu

- Tytul: `Select Resource`.
- Lista: `List of Game Resources`.
- Licznik zasobow w prawym gornym rogu listy.
- Grupa `Resources to Show`:
  - `All Resources`;
  - `Module Resources Only`;
  - `Hak Pak Resources Only`.
- `Resource Name` z aktualna wartoscia `_main_on_acqu`.
- `Resources of Type = NWScript Source`.
- `Name Filter`.
- Przyciski `Open` i `Cancel`.

## Obserwacje filtrow

- `Module Resources Only` pokazal liste wielu skryptow modulu i licznik
  `775 resource(s)`.
- `All Resources` w tej konfiguracji pokazal pojedynczy wynik
  `_main_on_acqu`.
- `Hak Pak Resources Only` pokazal `0 resource(s)`.
- Po obserwacji przywrocono `Module Resources Only` i zamknieto okno przez
  `Cancel`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-259-s23-state-before-event-ellipsis-second.png` | Stan startowy na drugim ekranie przed atomem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-260-s23-module-events-before-ellipsis-second.png` | `Module Properties -> Events`, przed kliknieciem `...`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-262-s23-timeout-state-second.png` | `Select Resource` otwarty po `...`; modal byl widoczny mimo timeoutu skryptu diagnostycznego. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-263-s23-select-resource-module-only.png` | Stan `Module Resources Only`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-264-s23-select-resource-all-resources.png` | Stan `All Resources`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-265-s23-select-resource-hak-resources.png` | Stan `Hak Pak Resources Only`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-266-s23-select-resource-module-only-restored.png` | Przywrocone `Module Resources Only`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-267-s23-after-select-resource-cancel.png` | Po `Cancel` w `Select Resource`; widoczne `Module Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-268-s23-after-module-properties-cancel.png` | Po `Cancel` w `Module Properties`; powrot do glownego okna Toolsetu. |

## Pulapki

- `Open` moze przepiac wybrany skrypt do globalnego event slotu. Nie uzywac go
  w atomie obserwacyjnym.
- `OK` w `Module Properties` moze zatwierdzic globalne zmiany modulu. Po
  `Cancel` w selektorze zamykac `Module Properties` tez przez `Cancel`.
- `BM_CLICK`/`SendMessage` na przycisku `...` moze zablokowac skrypt sterujacy
  do czasu zamkniecia modala. To nie musi oznaczac zawieszenia Toolsetu; po
  timeoutcie trzeba pasywnie sprawdzic screenshot i `Responding`.
- Filtry listy sa bezpieczne obserwacyjnie, ale nie wybierac zasobu i nie
  klikac `Open` bez osobnej zgody.

## Status

- `Module event resource picker`: `opened-live`.
- Mutacje: brak.
- Przepiecie skryptu: brak.
- Zapis modulu: brak.
- Nastepny eksperyment: dopiero po zgodzie sprawdzic kontrolowane przepiecie
  testowego event slotu na testowym module/backupie; dla `the_last_city` na
  razie tylko obserwacja.

# Aurora Toolset: Module Properties findings

Data: 2026-06-18

Ten dokument opisuje live atom `Module Properties` dla modulu
`the_last_city - codex.mod`. Zakres przebiegu: tylko otwarcie i dokumentacja
zakladek, bez edycji, bez `OK`, bez zapisu modulu.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul: `the_last_city - codex.mod` / wariant pliku z em-dash.
- Stan startowy: Toolset widoczny na drugim ekranie, drzewo `Areas`
  rozwiniete, zaznaczone `enon_bakery`.
- Uwaga: tytul Toolsetu mial `*` juz przed tym atomem, po wczesniejszym
  `OK` w `Area Properties`; w tym atomie nie wykonano nowej mutacji i nie
  zapisano modulu.

## Sekwencja, ktora zadzialala

1. Otworzyc menu `Edit` celowanym `Alt+E` do glownej ramki `TfrmFrame`.
2. Do popup menu `#32768` wyslac `WM_CHAR m`.
3. Otworzyl sie dialog `Module Properties`.
4. Przejsc zakladki:
   - `Basic`;
   - `Events`;
   - `Advanced`;
   - `Description`;
   - `Custom Content`.
5. Po dokumentacji zamknac dialog przez `Cancel`.

## Rozpoznane zakladki i pola

`Basic`:

- `Name = the_last_city`;
- `Tag = the_last_city`;
- `Start Area = test_start_ship`;
- `Starting X = 6`;
- `Starting Y = 4`;
- `Starting Z = 0`.

`Events`:

- widoczne sloty skryptow m.in. `OnAcquireItem`, `OnActivateItem`,
  `OnClientEnter`, `OnClientLeave`, `OnHeartbeat`, `OnModuleLoad`,
  `OnPlayerChat`, `OnPlayerDeath`, `OnPlayerDying`, `OnPlayerEquipItem`,
  `OnPlayerGuiEvent`, `OnPlayerLevelUp`, `OnPlayerRespawn`, `OnPlayerRest`,
  `OnPlayerTarget`, `OnPlayerTileAction`, `OnPlayerUnequipItem`,
  `OnUnAcquireItem`, `OnUserDefined`;
- obok slotow sa przyciski `...` oraz `Edit`.

`Advanced`:

- `Minutes/Hour = 2`;
- `Dawn Start Hour = 6`;
- `Dusk Start Hour = 18`;
- `Starting Month = 1`;
- `Starting Day = 1`;
- `Starting Hour = 6`;
- `Starting Year = 1`;
- `XP Scale = 0`;
- `Starting Movie`;
- `Variables`.

`Description`:

- duze pole tekstowe opisu;
- przycisk `...` pod polem.

`Custom Content`:

- lista HAK Pakow, m.in. `lc_2da`, `lc_vfx`, `lc_system_icons`,
  `lc_icons`, `lc_hd_plcbls`, `lc_hd_animals`, `lc_placeable`,
  `lc_placeable_cust`, `lc_slms_city`, `lc_ccc`, `lc_colors`,
  `lc_heads`, `lc_crafting`, `lc_character`, `lc_appearance`,
  `bdhd_pheno_other`, `bdhd_pheno_chest`, `bdhd_items`, `biocity`;
- przyciski `Move Up`, `Move Down`, `Remove`, `Add`;
- `Check for Conflicts...`;
- `Custom Tlk File = tlc`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-241-s21-edit-menu-before-module-properties.png` | Menu `Edit` z widocznym `Module Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-242-s21-module-properties-open-attempt.png` | `Module Properties` otwarte na karcie `Basic`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-243-s21-module-properties-tab-basic-crop.png` | Karta `Basic`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-243-s21-module-properties-tab-events-crop.png` | Karta `Events`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-243-s21-module-properties-tab-advanced-crop.png` | Karta `Advanced`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-243-s21-module-properties-tab-description-crop.png` | Karta `Description`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-243-s21-module-properties-tab-custom-content-crop.png` | Karta `Custom Content`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-244-s21-after-module-properties-cancel.png` | Dialog zamkniety przez `Cancel`; powrot do drzewa modulu. |

## Pulapki

- `OK` zatwierdza globalne ustawienia modulu; w atomie obserwacyjnym uzywac
  `Cancel`.
- Karta `Custom Content` kontroluje HAK/TLK i kolejnosc pakow; `Move Up`,
  `Move Down`, `Remove`, `Add` to szerokie mutacje. Nie klikac bez osobnego
  planu.
- Sloty `Events` moga otwierac Script Editor albo przypisywac globalne hooki
  modulu. Pierwszy atom tylko dokumentuje.
- `Start Area` i `Starting X/Y/Z` sa kluczowe dla startu modulu; nie zmieniac
  ich bez osobnej zgody.
- Jezeli modul ma `*` w tytule przed atomem, odnotowac to jako stan zastany,
  a nie wynik samego `Module Properties`.

## Powiazany atom: Events -> Edit

Po tym rozpoznaniu wykonano osobny atom dla pierwszego slotu `Events`:
`OnAcquireItem = _main_on_acqu`. Skuteczna sciezka otwarcia Script Editora to
`BM_CLICK` do konkretnego przycisku `Edit` przy tym wierszu. Edytor otwarto,
udokumentowano panele i zamknieto bez zmian.

Szczegoly i screenshoty:
[aurora-toolset-module-event-script-binding-findings-2026-06-18.md](aurora-toolset-module-event-script-binding-findings-2026-06-18.md).

## Status

- `Module Properties`: `opened-live`.
- Mutacje: brak w tym atomie.
- Zapis modulu: brak.
- Nastepny eksperyment: osobno rozpoznac `...` przy slocie `Events` albo
  `Check for Conflicts...` tylko po zgodzie, bo oba kroki moga miec szersze
  skutki.

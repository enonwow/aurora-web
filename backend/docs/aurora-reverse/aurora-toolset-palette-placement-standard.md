# Wspólny standard dodawania obiektów z palety Aurora Toolset

Status: `verified` dla pełnej matrycy dziewięciu rodzin.

Ten standard opisuje wspólną transakcję dodania dokładnie jednego obiektu z
prawej palety do istniejącego Area. Standard nie uznaje kliknięcia, zielonego
preview, zmiany licznika w UI ani testu offline za wykonany placement.

## Zweryfikowane rodziny

| Rodzina palety | `kind` w GIT | Klucz licznika | Referencyjny proof | Status |
| --- | --- | --- | --- | --- |
| Placeables | `placeable` | `placeables` | [Water Trough](evidence/placeable-live-standard-2026-07-14/README.md) | `verified` |
| Creatures | `creature` | `creatures` | [Dwarf Mercenary](evidence/palette-placement-corrected-live-2026-07-14/README.md) | `verified` |
| Items | `item` | `items` | [Commoner's Outfit](evidence/palette-placement-corrected-live-2026-07-14/README.md) | `verified` |
| Doors | `door` | `doors` | [Barn Door w zweryfikowanym hooku](evidence/door-hook-live-standard-2026-07-14/README.md) | `verified` |
| Encounters | `encounter` | `encounters` | [Gnoll Encounter](evidence/polygon-placement-live-standard-2026-07-14/README.md) | `verified` |
| Merchants | `store` | `stores` | [Dye Store](evidence/palette-placement-corrected-live-2026-07-14/README.md) | `verified` |
| Sounds | `sound` | `sounds` | [Animal Cries Day](evidence/palette-placement-corrected-live-2026-07-14/README.md) | `verified` |
| Triggers | `trigger` | `triggers` | [New Generic](evidence/polygon-placement-live-standard-2026-07-14/README.md) | `verified` |
| Waypoints | `waypoint` | `waypoints` | [Waypoint](evidence/palette-placement-corrected-live-2026-07-14/README.md) | `verified` |

## Transakcja obowiązkowa

1. Potwierdź zero starych procesów albo odzyskaj jedyną istniejącą sesję przez
   PID-first recovery.
2. Zapisz ścieżkę i SHA-256 źródła oraz roboczej kopii modułu.
3. Zbuduj parserowy baseline Area przed mutacją.
4. Potwierdź jeden PID, właściwy `TfrmFrame`, `TfrmViewerArea`, duży
   `TScrollBox`, fizyczny monitor proof i brak niebezpiecznego modala.
5. Wybierz ikonę rodziny na aktualnym `TToolBar`.
6. Odczytaj teksty bieżącego `TTreeView`; historyczny indeks, pozycja Y i stare
   HWND nie są tożsamością template.
7. Wybierz liść po dokładnym tekście i potwierdź pełną ścieżkę kategorii.
8. Wyślij dokładnie jedną parę `WM_LBUTTONDOWN/UP` do zwalidowanego viewportu.
9. W tej samej transakcji przełącz natywny pasek `Selection Mode` na przycisk
   indeks `1`, command `1`, a następnie odczytaj oba `TBBUTTON`. Tylko stan
   `objects.checked=true` i `terrain.checked=false` dowodzi `Select Objects`.
   Historyczne `WM_COMMAND 74` do Area viewera nie jest dowodem rollbacku trybu.
10. Zrób screenshot palety i sceny bez aktywowania okna ani przejmowania
    kursora użytkownika.
11. Zapisz wyłącznie kopię roboczą przez rozpoznany widoczny przycisk Save;
    nie zgaduj `WM_COMMAND`.
12. Poczekaj na brak `*`, zmianę pliku i komunikat zapisu.
13. Natychmiast zbuduj parserowy readback po tym kroku, zanim rozpocznie się
    kolejna mutacja tej samej sesji.
14. Po całej sekwencji zamknij Toolset targeted `WM_CLOSE`, potwierdź zero
    procesów i oblicz końcowe hashe.

## Warunek strukturalny

Dla docelowego klucza `K`:

- `after[K] = before[K] + 1`;
- `after.total = before.total + 1`;
- każdy inny licznik pozostaje bez zmian;
- różnica `objects.csv` zawiera dokładnie jeden rekord;
- `addedObject.kind` odpowiada rodzinie palety;
- resref oraz X/Y/Z są obecne i poprawne liczbowo.

`+0` to `placement_no_structural_delta`, `+2` to
`placement_duplicate_delta`, a zmiana innej rodziny to `cross_kind_mutation`.

## Sekwencja wielu funkcji w jednej sesji

Wolno wykonywać kilka standardów w jednym PID, ale każdy krok musi mieć osobny
baseline i readback natychmiast po swoim zapisie. Hash końcowy może obejmować
całą sekwencję tylko wtedy, gdy summary jawnie podaje `hashScope=session_sequence`
oraz numer kroku. Izolację funkcji rozstrzyga wtedy jej własny diff parsera.

## Kontrakt proof

- Schema: [aurora-toolset-palette-placement-proof.schema.json](aurora-toolset-palette-placement-proof.schema.json)
- Validator: `backend/scripts/validate-aurora-toolset-palette-placement-proof.mjs`
- Aggregate Stage 1 validator:
  `backend/scripts/validate-aurora-toolset-stage1-palette-standards.mjs`
- Statusy: `verified`, `failed`, `missing`, `blocked`.
- `verified` wymaga pustej listy blockerów i wszystkich artefaktów wskazanych w
  summary.

`AUR-S01-10 = TAK`: accepted run istnieje dla wszystkich dziewięciu rodzin.
Door wymaga dodatkowo rozpoznanego hooku; kontrolowane kliknięcie poza hookiem
pozostaje obowiązkowym negatywnym przypadkiem, a nie placementem.

Agregat accepted proofów: [Stage 1 validator](evidence/stage1-palette-standards-2026-07-14/README.md).

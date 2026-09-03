# Aurora Area/Tile audit — 2026-07-17

Pełny skan objął 99 tilesetów i 53 700 rekordów SET. Znalazł 34 modele
zadeklarowane w SET, ale nieobecne w aktywnym łańcuchu HAK/vanilla. To jest
wynik rozdzielony od poprawności edycji i renderu: legalny Tile_ID nadal
pozostaje dostępny w Aurora, a brak modelu musi być pokazany użytkownikowi.

| Tileset | Przypadek | Wynik | Proof |
| --- | --- | --- | --- |
| `zdc01` | `GROUP84`, Cave Entrance 2x1 | 16/16 modeli, brak blokad. Duże ściany są geometrią źródłowych MDL, nie utratą transformacji. | `.codex-tmp/proofs/zdc01-group84-recheck/zdc01-group84-recheck.canvas.png` |
| `twl01` | `GROUP20`, Lighthouse 2x2 | Brakuje `twl01_g04_21_01…04`; 12/16 modeli gotowych. | `.codex-tmp/proofs/twl01-lighthouse-blocker-final/twl01-lighthouse-blocker-final.blocked-after-mutation.canvas.png` |
| `tcr10` | `TILE1200`, bezpośredni wybór | Brakuje `mrv01_b01_01`; proof wykonany przez rendered selector `Replace Tile_ID` i `Apply Tile_ID`. | `.codex-tmp/proofs/tcr10-tile1200/tcr10-tile1200.blocked-after-mutation.canvas.png` |
| `atj02` | reprezentatywna grupa | 16/16 modeli w poprzednim przebiegu. Nieobecne w SET modele: `atj01_e17_01`, `atj01_e18_01`, `atj02_s08_01`. | `.codex-tmp/proofs/atj02-viewport-audit/atj02-viewport-audit.png` |

Pozostałe nieobecne modele: `pld01` (2), `sdg01` (1), `tcm02` (1),
`tmd19a` (3), `trs02` (1), `twl02` (5), `tcr10` (13).

## Reguła audytu

1. Odczytać SET i aktywną kolejność źródeł HAK/vanilla.
2. Jeśli model jest nieobecny, zachować Tile_ID/Group w edytorze, lecz wskazać
   resref modelu i nie powtarzać kosztownego skanu do zmiany rewizji ustawień.
3. Udowodnić realny przepływ UI: dodanie lub `Apply Tile_ID`, następnie Undo/Redo
   i screenshot canvasu.
4. Jeśli model jest obecny, porównać orientację ARE i pozycję tile'a z
   dekompilacją Aurora, zanim uzna się widok za regresję renderera.

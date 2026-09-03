# Audyt ukończenia Etapu 4 Aurora Toolset

Data: 2026-07-16  
Werdykt: **Etap 4 ukończony — 8/8 funkcji `TAK`**.

## Wynik

| Funkcja | Wynik | Najważniejszy dowód |
| --- | --- | --- |
| AUR-S04-01 | TAK | name/tag/resref po Save i dokładny rollback |
| AUR-S04-02 | TAK | osobne odczyty flag, ograniczenia base item i rollback |
| AUR-S04-03 | TAK | transfer `nw_cloth022`: ziemia `3→2`, UTC `0→1`, rollback `2→3` i `1→0` |
| AUR-S04-04 | TAK | inventory placeable `0→1→0` |
| AUR-S04-05 | TAK | jedno `void main()`, compile, binding/readback/runtime i rollback |
| AUR-S04-06 | TAK | izolowane delty `locked`, `useable`, `static` i wspólny baseline |
| AUR-S04-07 | TAK | appearance UI/render/GIT i rollback |
| AUR-S04-08 | TAK | animation UI/render/runtime/GIT i rollback |

## AUR-S04-03 — domknięcie luki D&D

Stary PoC prawidłowo wskazywał, że Aurora wymaga semantyki D&D, ale fizyczna ścieżka przejmowała kursor. W przebiegu końcowym odtworzono bezpieczniejszą warstwę: dokładne natywne handlery `dgBackpackDragDrop` i `imTrashDragDrop` wykonują się synchronicznie na wątku GUI przez krótkotrwały bridge, który jest odtwarzany przed zwolnieniem pamięci. Nie użyto globalnego kursora, myszy ani klawiatury i nie patchowano IAT.

Pozytywny GIT zawiera dwa itemy na ziemi i dokładnie jeden wpis `nw_cloth022` w UTC NPC przy `(60.9686, 54.5207)`. Rollback zawiera trzy pierwotne itemy i puste inventory. Validator potwierdza również, że poza transferowanym rekordem delta jest izolowana.

## Artefakty autorytatywne

- [bramka 8/8](evidence/stage4-live-2026-07-16/stage4-completion-validation.json)
- [validator AUR-S04-03](evidence/stage4-live-2026-07-16/s04-03-item-npc-inventory/manifest.json)
- [validator AUR-S04-04](evidence/stage4-live-2026-07-16/s04-04-inventory-placeable/manifest.json)
- [validator pozostałych funkcji](evidence/stage4-live-2026-07-16/stage4-core-validation.json)
- [standard Etapu 4](aurora-toolset-stage4-standard.md)
- [standard D&D](aurora-toolset-inventory-equipment-dnd-standard.md)

W chwili końcowej walidacji działał dokładnie jeden responsywny `nwtoolset` (PID `39552`) z modułem `codex_npc_item_live_20260713.mod` na ekranie niegłównym; `nwmain` był zamknięty. Toolset pozostawiono otwarty zgodnie z kontraktem sesji.


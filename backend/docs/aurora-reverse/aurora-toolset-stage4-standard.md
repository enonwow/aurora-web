# Aurora Toolset — standard przedmiotów i placeable (Etap 4)

Data: 2026-07-16  
Status: **ukończony i zweryfikowany live — AUR-S04-01..08 = `TAK`**.

## Wspólny kontrakt

1. Jedna ciągła sesja `nwtoolset`, dokładnie jeden proces i jeden moduł roboczy. Nie zamykaj Toolsetu bez wyraźnej instrukcji użytkownika.
2. Zero globalnego wejścia: bez przejmowania kursora, `SendKeys`, `SendInput`, `mouse_event` i `keybd_event`. Operacje wykonuj przez zweryfikowane HWND, natywne komendy albo wersjonowane handlery VCL.
3. Każda funkcja wymaga widocznego proofu, Save, odczytu z zapisanego `.mod`, izolowanej delty, rollbacku i automatycznego validatora.
4. Po ponownym otwarciu dialogu pobierz świeże HWND i obiekty VCL. Nie używaj uchwytów z poprzedniej instancji.
5. NWScript ma dokładnie jedno `void main()`. Kompilacja, binding i odczyt po Save są osobnymi bramkami.
6. Ograniczenie silnika lub typu bazowego dokumentuj jako wynik odczytu; nie fałszuj zmiany, której Toolset nie serializuje.

## Funkcje

### AUR-S04-01 — właściwości itemu

- Zmień kontrolowaną nazwę, tag i resref instancji.
- Po Save odczytaj `templateResRef`, `tag` i nazwę lokalizowaną w GIT.
- Rollback musi przywrócić identyczny obiekt i liczniki Area.

### AUR-S04-02 — stack i flagi

- Testuj każdą flagę osobno.
- `Stack Size` dla `baseItem: 16` jest normalizowany do `1`; to prawidłowe ograniczenie typu bazowego.
- `Plot` ma pełną deltę `false→true→false`.
- `Identified`, `Cursed` i `Droppable` zaliczaj według rzeczywiście serializowanych pól, z trwałym manifestem ograniczeń.

### AUR-S04-03 — transfer itemu do NPC

- Wybierz dokładną instancję itemu na ziemi i dokładnego NPC.
- Dodaj ten sam resref do `Inventory Contents` natywnym `TdlgInventory.dgBackpackDragDrop` przez krótkotrwały bridge na wątku GUI.
- Usuń dokładnie jedną instancję z Area (`items 3→2`, `total 18→17`), a w UTC wymagaj jednego wpisu `nw_cloth022`.
- Rollback: natywny Undo dla obiektu na ziemi i `TdlgInventory.imTrashDragDrop` dla inventory. Końcowe obiekty i liczniki muszą być równe baseline niezależnie od kolejności list GIT.
- Zabronione są fizyczny kursor i process-local pointer/IAT patching.

### AUR-S04-04 — inventory placeable

- `Has Inventory` → `Inventory Contents` → dokładnie jeden item → Save/readback.
- Rollback ma przywrócić `hasInventory: false`, pustą listę i stabilną tożsamość placeable.

### AUR-S04-05 — skrypt placeable

- Jedno źródło z dokładnie jednym `void main()`, natywna kompilacja, binding eventu, Save/readback i runtime marker.
- Rollback przywraca poprzedni resref eventu; sama obecność pliku NSS nie zalicza funkcji.

### AUR-S04-06 — static/useable/locked

- Każdą flagę zmieniaj osobno, wykonując Save/readback i rollback przed następną.
- Końcowy baseline musi jednocześnie potwierdzić flagi, appearance, animation, inventory i binding skryptu.

### AUR-S04-07 — appearance placeable

- Wymagane są: UI właściwości, widoczny render, `appearanceId` po Save i dokładny rollback.

### AUR-S04-08 — animation state

- Wymagane są: UI, render Toolsetu, persistent `animationState`, semantyczny runtime proof i rollback.

## Bramka ukończenia

Uruchom kolejno:

```text
node backend/scripts/validate-aurora-toolset-stage4-core.mjs
node backend/scripts/validate-aurora-toolset-stage4-npc-inventory-transfer.mjs
node backend/scripts/validate-aurora-toolset-stage4-placeable-inventory.mjs
node backend/scripts/validate-aurora-toolset-stage4-completion.mjs
```

Etap jest ukończony tylko wtedy, gdy ostatni validator zwraca dokładnie osiem identyfikatorów `AUR-S04-01..08`, potwierdza jedną responsywną Aurorę na ekranie niegłównym i brak `nwmain`.


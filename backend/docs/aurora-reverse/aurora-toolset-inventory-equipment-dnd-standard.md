# Aurora Toolset — standard D&D inventory i equipment

Data: 2026-07-16  
Zakres: Etapy 3–4, `AUR-S03-05`, `AUR-S03-06`, `AUR-S04-03` i `AUR-S04-04`.

## Zasada główna

W natywnym dialogu `Inventory Contents` dodanie blueprintu do `Contents`, wyposażenie slotu oraz rollback na kosz są operacjami drag-and-drop. Utworzenie itemu przez `New`, zaznaczenie w palecie, click lub double-click nie dowodzą dodania do stworzenia.

## Bezpieczny kontrakt D&D

1. Pracuj w dokładnie jednym procesie `nwtoolset`, jednym `TdlgCreatureEdit` i jednym `TdlgInventory`; odczytaj świeże HWND po każdym ponownym otwarciu.
2. Dialog ma być na ekranie niegłównym. Operacja nie może zmieniać globalnego kursora ani wysyłać globalnego wejścia myszy lub klawiatury.
3. Źródło z palety musi być dokładnie jednym węzłem `TTreeView`, odczytanym z pamięci procesu i sprawdzonym po pełnej nazwie. Cel musi być dokładną kontrolką `TDrawGrid`, rozpoznanym panelem slotu albo dolnym-lewym panelem kosza.
4. Wywołuj dokładny natywny handler VCL (`dgBackpackDragDrop`, właściwy handler slotu albo `imTrashDragDrop`) na wątku GUI przez krótkotrwały, wersjonowany bridge. Bridge musi zostać odtworzony przed zwolnieniem pamięci; patchowanie IAT jest zabronione.
5. Po operacji sprawdź PID, `Responding`, odtworzenie bridge'a i brak użycia globalnego kursora/myszy/klawiatury. Historyczne ścieżki fizycznego kursora oraz process-local pointer/IAT są wycofane.
6. Screenshot po geście jest obowiązkowy, ale nie wystarcza: po `OK` i `Save` wymagany jest native GIT readback oraz osobny readback po rollbacku.

## Add do inventory

- Fixture: neutralny, niemagiczny amulet niskiego poziomu.
- Kreator: liść `Miscellaneous / Jewelry / Amulets`, następnie karta `Custom Items`.
- Gest: dokładny wiersz blueprintu → `TDrawGrid Contents`.
- Oczekiwany readback: `inventoryItemListCount` rośnie o jeden i `inventoryItemListEntries` zawiera dokładny resref.
- Rollback: wpis `Contents` → dolny-lewy kosz przez D&D; ponowny Save ma przywrócić licznik i usunąć resref.

## Equip

- Gest: dokładny wiersz blueprintu → rozpoznany panel slotu. Slot amuletu jest panelem `32×64` bezpośrednio na lewo od panelu butów `64×64` o tej samej współrzędnej `top`.
- Oczekiwany readback dla szyi: `equipItemListEntries` zawiera resref z `slotMask: 512`; bazowe wpisy pozostają identyczne.
- Rollback: panel amuletu → dolny-lewy kosz przez D&D; readback wraca do dokładnej listy bazowej.

## Ostrzeżenie feat / level

Przy komunikacie o braku odpowiednich featów lub poziomu kliknij `OK` i pozostaw `Never warn again` niezaznaczone. To nie jest wymaganie zakładki `Skills`: dla broni lub pancerza dodaj właściwy wpis w `Feats` albo podnieś poziom zgodnie z regułami przedmiotu. Do neutralnego testu inventory/equipment preferuj amulet bez takich wymagań.

Przycisk otwierający modal należy aktywować nieblokującym `PostMessage(BM_CLICK)`, nie synchronicznym `SendMessage`, ponieważ wątek wywołujący będzie czekał na zamknięcie modala. Po `OK` poczekaj na pojawienie się dokładnego `TdlgInventory` i dopiero wtedy kontynuuj.

## Proof 2026-07-15

- inventory after-save: `s03proofamuletr2`, licznik `1`;
- inventory rollback: licznik `0`, brak wpisu;
- equipment after-save: bazowe `2` wpisy plus `s03proofamuletr2`, `slotMask: 512`;
- equipment rollback: dokładnie dwa niezmienione wpisy bazowe;
- sesja Toolsetu pozostała żywa podczas całej sekwencji.

Walidator: `backend/scripts/validate-aurora-toolset-inventory-equipment-proof.mjs`.

## Proof transferu 2026-07-16

- helper: `backend/scripts/invoke-aurora-toolset-native-inventory-drop-no-global-input.mjs`;
- dodanie: natywny `TdlgInventory.dgBackpackDragDrop`, `Commoner's Outfit` (`nw_cloth022`) w inventory NPC;
- usunięcie z ziemi: dokładnie jedna instancja `nw_cloth022`, liczniki Area `items 3→2`, `total 18→17`;
- rollback: natywny Undo przywrócił ziemię, `TdlgInventory.imTrashDragDrop` przywrócił inventory `1→0`;
- końcowy readback jest równy baseline niezależnie od kolejności rekordów GIT;
- walidator: `backend/scripts/validate-aurora-toolset-stage4-npc-inventory-transfer.mjs`.

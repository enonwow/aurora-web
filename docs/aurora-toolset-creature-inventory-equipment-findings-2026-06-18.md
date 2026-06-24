# Aurora Toolset: Creature Inventory / Equipment findings

Data proby: 2026-06-18

Status: `opened-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran, `TfrmFrame` na wspolrzednych ujemnych X.
- Area live: `d_und`.
- Obiekt testowy: istniejacy creature `Inzynier`.
- Tag obiektu: `d_und_engineer`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Celem bylo otwarcie inventory/equipment dla istniejacego creature i
udokumentowanie wszystkich wiekszych paneli bez dodawania itemow, bez
zatwierdzania `OK` i bez zmiany ustawien globalnych.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-142-s16-creature-inventory-readability-gate.png` | Bramka czytelnosci: realny Toolset na drugim ekranie, area `d_und`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-143-s16-object-properties-command70-attempt.png` | Proba `WM_COMMAND 70` do main frame; nie otworzyla creature properties w tym stanie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-144-s16-left-tree-command19-attempt.png` | `WM_COMMAND 19` do lewego `TTreeView` otworzyl `Creature Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-145-s16-creature-inventory-opened.png` | Klik `Inventory ...` pokazal modal `Warning`, jeszcze nie inventory. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-146-s16-creature-inventory-warning.png` | Czytelny screenshot ostrzezenia przed inventory. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-147-s16-after-warning-ok.png` | Stan po `OK` w ostrzezeniu; `Creature Properties` nadal widoczne. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-148-s16-creature-inventory-contents-overview.png` | `Inventory Contents` otwarte live. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-149-s16-inventory-window-crop.png` | Crop calego okna `Inventory Contents`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-150-s16-inventory-standard-equipment-crop.png` | Zakladka/panel `Standard Equipment`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-151-s16-inventory-contents-grid-crop.png` | Panel `Contents`, pusty grid zawartosci. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-152-s16-inventory-standard-items-palette-crop.png` | Prawa paleta `Standard Items`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-153-s16-inventory-options-crop.png` | Panel `Options` z `Dropable` i `Pickpocketable`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-155-s16-inventory-custom-items-palette-active-crop.png` | Zweryfikowana zakladka `Custom Items`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-156-s16-inventory-natural-equipment-crop.png` | Zakladka/panel `Natural Equipment`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-157-s16-inventory-before-cancel-full.png` | Pelny screen inventory przed zamknieciem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-158-s16-after-inventory-cancel-creature-properties.png` | Inventory zamkniete przez `Cancel`; powrot do `Creature Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-170-s16-creature-properties-verified-basic.png` | Zweryfikowana karta `Basic` po enumeracji aktywnego `TTabSheet`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-171-s16-creature-properties-verified-statistics.png` | Zweryfikowana karta `Statistics`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-172-s16-creature-properties-verified-appearance.png` | Zweryfikowana karta `Appearance`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-173-s16-creature-properties-verified-classes.png` | Zweryfikowana karta `Classes`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-174-s16-creature-properties-verified-skills.png` | Zweryfikowana karta `Skills`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-175-s16-creature-properties-verified-scripts.png` | Zweryfikowana karta `Scripts`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-176-s16-creature-properties-verified-advanced.png` | Zweryfikowana karta `Advanced`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-177-s16-creature-properties-verified-feats.png` | Zweryfikowana karta `Feats`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-178-s16-creature-properties-verified-spells.png` | Zweryfikowana karta `Spells`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-179-s16-creature-properties-verified-special-abilities.png` | Zweryfikowana karta `Special Abilities`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-180-s16-creature-properties-verified-comments.png` | Zweryfikowana karta `Comments`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-181-s16-after-creature-properties-cancel.png` | `Creature Properties` zamkniete przez `Cancel`; powrot do Toolsetu. |

Pliki `hb-159`-`hb-169` sa materialem roboczym z pierwszego przejscia po
zakladkach. Wielorzedowy `TPageControl` przestawia rzed kart zaleznie od
aktywnej zakladki, wiec jako dowod nazwany uzywac serii zweryfikowanej
`hb-170`-`hb-180`.

## Sekwencja odtworzenia

1. Potwierdzic realny screenshot Toolsetu na drugim ekranie.
2. Upewnic sie, ze area `d_und` jest otwarta i w lewym drzewie widac
   `d_und -> Creatures`.
3. Zaznaczyc creature `Inzynier`.
4. Wyslac `WM_COMMAND 19` do lewego `TTreeView`, nie do glownego frame.
5. Poczekac na top-level dialog `Creature Properties` (`TdlgCreatureEdit`).
6. Na karcie `Basic` kliknac przycisk `Inventory ...`.
7. Jesli pojawi sie `Warning`, zrobic screenshot i kliknac tylko `OK`.
   Nie zaznaczac `Never warn again`, bo to zmienia preferencje Toolsetu.
8. Po otwarciu `Inventory Contents` zrobic screenshot overview i osobne cropy
   paneli.
9. Przejsc `Standard Equipment`, `Natural Equipment`, `Standard Items`,
   `Custom Items`, `Contents` i `Options`.
10. Zamknac `Inventory Contents` przez `Cancel`.
11. Dla `Creature Properties` zrobic zweryfikowana serie wszystkich zakladek.
12. Zamknac `Creature Properties` przez `Cancel`.

## Uklad `Inventory Contents`

- Top-level dialog: `TdlgInventory`, tytul `Inventory Contents`.
- Lewa gora: `Standard Equipment` oraz `Natural Equipment`.
- Lewy dol: `Contents`, grid zawartosci creature.
- Prawa gora: paleta itemow z kartami `Standard Items` i `Custom Items`.
- Prawy dol: `Options`, `Selected Item`, checkboxy `Dropable` i
  `Pickpocketable`.
- Dol dialogu: przyciski `OK`, `Cancel` oraz ikona kosza.
- Przycisk `New` znajduje sie pod paleta itemow.

## Ostrzezenie przed inventory

Klik `Inventory ...` najpierw otwiera `Warning`. Sens komunikatu: Toolset moze
zdjac itemy z creature, jezeli nie spelnia wymaganych featow albo poziomu; ma
to dotyczyc `Standard Equipment`.

Zasada operacyjna:

1. Zrobic screenshot warningu.
2. Nie zaznaczac `Never warn again`.
3. Kliknac `OK`, jezeli celem jest tylko otwarcie inventory.
4. Nie klikac `OK` w samym inventory, jesli nie bylo mutacji planowanej przez
   uzytkownika.

## Zakladki `Creature Properties`

W tym przebiegu ponownie wykonano pelna serie `Creature Properties`, bo okno
pozostawalo otwarte po zamknieciu inventory. Aktywna karta byla weryfikowana
przez enumeracje widocznego `TTabSheet`, a dopiero potem zapisywano screenshot.

Zweryfikowane karty:

- `Basic`
- `Statistics`
- `Appearance`
- `Classes`
- `Skills`
- `Scripts`
- `Advanced`
- `Feats`
- `Spells`
- `Special Abilities`
- `Comments`

## Status atomu

Ten atom awansuje do `opened-live` dla creature inventory/equipment, poniewaz:

- otwarto live `Inventory Contents`;
- zrobiono serie screenshotow wszystkich widocznych paneli;
- zamknieto przez `Cancel`;
- nie wykonano mutacji modulu;
- nie zapisano modulu.

Nie awansuje jeszcze do `mutated-live`, `verified-after-reopen` ani
`safe-repeatable` dla dodawania itemow. Dodawanie itemu, ustawianie
`Dropable`/`Pickpocketable`, usuwanie itemu i zatwierdzanie `OK` wymagaja
osobnych, kontrolowanych atomow na obiekcie testowym.

## Pulapki

- `WM_COMMAND 70` do glownego frame nie otworzyl creature properties w tym
  stanie; skuteczny byl `WM_COMMAND 19` do lewego `TTreeView`.
- Po `Inventory ...` pierwszym modalem moze byc `Warning`, a nie inventory.
- `Never warn again` jest zmiana preferencji globalnych, nie klikac w atomie
  obserwacyjnym.
- `OK` w `Inventory Contents` moze zatwierdzic zmiany; przy obserwacji uzywac
  `Cancel`.
- Wielorzedowy `TPageControl` w `Creature Properties` przestawia rzed kart, wiec
  nazwy screenow zakladek trzeba weryfikowac aktywnym `TTabSheet`, nie sama
  kolejnoscia klikniec.

## Bezpieczenstwo

- Nie przejeto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Klikniecia byly celowane w konkretne HWND/kontrolki.
- Nie klikano w canvas.
- Inventory i properties zamknieto przez `Cancel`.
- Modul nie zostal zapisany.

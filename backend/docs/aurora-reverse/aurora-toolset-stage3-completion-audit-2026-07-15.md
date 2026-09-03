# Audyt ukończenia Etapu 3 — NPC i stworzenia

Data: 2026-07-15  
Werdykt: **UKOŃCZONY — 9/9 `TAK`, zero blockerów**.

## Zakres i środowisko

- Moduł roboczy: `codex_npc_item_live_20260713.mod`.
- Jedna ciągła sesja Toolsetu: PID `50108`, ekran `\\.\DISPLAY1`, bez restartu i bez modyfikacji `nwtoolset.ini`/MRU.
- Obiekt końcowego proofu: `NW_DWARFMERC001`, `x=53.23`, `y=52.46`.
- `nwmain` służył wyłącznie do runtime proofu; po teście został zamknięty. Toolset pozostał otwarty zgodnie z poleceniem użytkownika.

## Macierz akceptacji

| ID | Wynik | Dowód rozstrzygający |
| --- | --- | --- |
| AUR-S03-01 | TAK | `s03-identity-validator.json`: native name/tag Save/readback, template resref read-only, rollback. |
| AUR-S03-02 | TAK | Frakcja `Hostile→Defender→Hostile`, native GIT readback, runtime frame `S03_FACTION_ENEMY`, rollback do `factionId: 1`. |
| AUR-S03-03 | TAK | `conversation=nw_hen_bod` po Save, rzeczywiście uruchomiony dialog DLG, końcowy brak bindingu. |
| AUR-S03-04 | TAK | `s03_rtprobe.nss` ma dokładnie jedno `void main()`, native compile pokazuje `0 Errors`, heartbeat po Save i runtime marker, rollback do `nw_c2_default1`. |
| AUR-S03-05 | TAK | Natywne D&D inventory `0→1→0`, GIT i runtime `S03_INVENTORY_OK`. |
| AUR-S03-06 | TAK | Natywne D&D equipment `2→3→2`, amulet w slocie szyi `slotMask: 512`, UI/GIT/rollback. |
| AUR-S03-07 | TAK | Strength `15→17→15` i Fighter `1→2→1`, cztery kadry UI, Save/GIT/rollback. |
| AUR-S03-08 | TAK | Widoczny render Elemental Air, native `appearanceId` after-save i rollback do Dwarfa. |
| AUR-S03-09 | TAK | Waypoint `CODEX_WAYPOINT_REDO2→CODEX_STAGE3_WP_PROOF→baseline`, zachowana geometria i runtime `S03_WAYPOINT_OK`. |

## Końcowy proof runtime

Zaakceptowany kadr: [frame-06.png](evidence/npc-stage3-live-2026-07-15/final-runtime-immortal-frames/frame-06.png). Widoczne są dokładne markery `S03_WAYPOINT_OK` oraz `S03_INVENTORY_OK`. Dla wrogiego Dwarfa użyto tymczasowo `Immortal`, ponieważ bez tej flagi NPC ginął przed wykonaniem opóźnionych komend.

Katalog `final-runtime-frames/` jest dowodem odrzuconym: pokazuje śmierć wrogiego fixture'a przed markerami i nie zalicza żadnej funkcji. Nie jest używany przez walidator.

## Native after-save i rollback

Pozytywny readback: [raw.git.summary.json](evidence/npc-stage3-live-2026-07-15/s03-final-runtime-immortal-after-save/demo-source-pack-2026-07-15T150655143Z/raw.git.summary.json):

- `conversation=nw_hen_bod`;
- `script.scriptheartbeat=s03_rtprobe`;
- inventory zawiera dokładnie `s03proofamuletr2`;
- `isImmortal=true`;
- baseline equipment pozostaje 2.

Końcowy rollback: [raw.git.summary.json](evidence/npc-stage3-live-2026-07-15/s03-stage3-final-clean-rollback/demo-source-pack-2026-07-15T150919024Z/raw.git.summary.json):

- conversation puste;
- heartbeat `nw_c2_default1`;
- inventory `0`, testowy amulet nie występuje;
- equipment dokładnie baseline `2`;
- `isImmortal=false`;
- Strength `15`, Fighter `1`, `factionId=1`, `appearanceId=249`;
- waypoint `CODEX_WAYPOINT_REDO2`.

Hashe GIT różnią stan pozytywny od rollbacku: `24a5347f...` → `2725e5b4...`; oba pochodzą z parsera zapakowanego modułu ERF po Save.

## Walidacja

Agregat: [stage3-completion/manifest.json](evidence/npc-stage3-live-2026-07-15/stage3-completion/manifest.json). Walidator wymaga wszystkich dziewięciu funkcji, dokładnie jednego `main`, właściwych kadrów runtime, istniejących validatorów rodzin oraz pełnego końcowego rollbacku. Roadmapowy validator Etapu 3 dodatkowo wymaga 9/9 statusów rozpoczynających się od `TAK`.

## Ryzyka i zasady przeniesione do normy

- `WindowFromPoint` jest bramką bezpieczeństwa fizycznego D&D, a nie ukierunkowanego `PostMessage` do dokładnego HWND.
- Ostrzeżenie feat/level zatwierdza się `OK`; nie zaznacza się `Never warn again`, a wymagania naprawia się w `Feats`/poziomie, nie w `Skills`.
- Resource DLG może wymagać `All Resources`, gdy `Module Resources Only` ma zero wpisów.
- Ten sam resref użyty jednocześnie w inventory i equipment może dać niejednoznaczną normalizację; funkcje należy dowodzić osobnymi przejściami.
- Edytor skryptu pozostaje singletonem, a NWScript ma dokładnie jeden `void main()`.
- Tymczasowe `Immortal` jest dozwolone tylko jako jawny fixture runtime i zawsze wchodzi do końcowego rollbacku.

## Ominięcia

Brak. Nie zaakceptowano samych testów offline, samych opisów ani nieudanych kadrów jako proofu funkcji.

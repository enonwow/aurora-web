# AUR-S05-06 — zmiana rozmiaru Area

Status: **zweryfikowany wynik negatywny; rozszerzający resize jest odrzucony
dla produkcji w Toolsecie v89.8193.37-17**.

## Co zostało udowodnione

- świeże `area007` utworzono jako `Rural` / `Tiny`, live `2×2`, cztery tile;
- natywne `Edit > Resize Area` (command `63`) i preset `Small` zmieniły live
  wymiary na `4×4` bez globalnego kursora, myszy, klawiatury i bez bezpośrednich
  zapisów pamięci wymiarów;
- packed ARE ma `Width=4`, `Height=4`, ale `Tile_List.length=4`;
- zrzut `area007-sparse-4x4-frame.png` pokazuje cztery zachowane tile i 12
  szarych komórek siatki bez tile;
- próba użycia grupy `Field 1 2x2` na pustych slotach zakończyła się dokładnym
  AV `0066C289 / Read 00000020`; późniejsze `Undo` wywołało drugi AV
  `00683333 / Read 0000003C`;
- handler pierwszego AV wraca do tej samej dereferencji po `OK`. Ukrycie
  viewera nie rozwiązuje aktywnej operacji fill, więc sesja jest niewznawialna.

## Nazewnictwo i inwariant

Kwadraty siatki to **komórki siatki Area** (`tile cells`). Komórka staje się
kafelkiem (`tile`) dopiero, gdy ma odpowiadający rekord w `Tile_List`.
Obowiązkowy warunek przed zapisem, reopen lub dalszą edycją brzmi:

`Tile_List.length == Width * Height`

Dla dowodu negatywnego: `4 != 4 * 4`, czyli 12 pustych slotów.

## Standard fail-close

1. Nie zapisuj i nie otwieraj ponownie Area, jeśli inwariant nie jest spełniony.
2. Nie używaj fill, D&D, feature/group, `Undo` ani kolejnego resize na sparse
   viewerze.
3. Po AV nie próbuj kontynuować tej samej sesji. Zakończ dokładny scratch PID,
   obejmij moduł kwarantanną i zacznij z czystego modułu.
4. Jeśli wymagany jest większy Area, utwórz go od początku w Area Wizard z
   docelowym rozmiarem. Nie rozszerzaj istniejącego Area tym buildem.

## Dowody

- `fresh-area007-rural-create.json`
- `area007-rural-positive-resize-small.json`
- `area007-sparse-packed-readback.json`
- `area007-sparse-source-pack/raw.are.summary.json`
- `area007-sparse-4x4-frame.png`
- `sparse-grid-fill-av-audit.md`
- `modal-result-root-cause-audit.md`
- `runtime-source-divergence-audit.md`
- `validation.json`

Fail-close został wykonany: PID `39552` zakończono, a moduł o SHA-256
`9C134B2D58BF360788F3A3CF2FF0604758D2DEBB9AFB838AA931E5A0FCB45305`
przeniesiono do `modules\_codex_quarantine`.

Walidator:

`node backend/scripts/validate-aurora-toolset-stage5-area-resize.mjs --evidenceDir backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-06-area-resize`

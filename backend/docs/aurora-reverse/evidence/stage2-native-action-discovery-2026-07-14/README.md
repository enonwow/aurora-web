# AUR-S02 — discovery natywnych akcji, 2026-07-14

Status: `blocked`, nie `verified`.

Ten pakiet rozstrzyga dwie konkretne ścieżki natywne w jednej sesji Aurora
Toolsetu na Area `demo`; nie twierdzi, że Copy/Paste ani pełna transformacja
placeable'a zostały wykonane.

## Potwierdzone live

- Zasób `RT_RCDATA/TFRMFRAME` tego samego `nwtoolset.exe` mapuje pozycje menu
  `Edit`: `Copy` = `59`, `Cut` = `60`, `Paste` = `61`.
- Po zaznaczeniu obiektu natywne `Copy` (`WM_COMMAND 59`) wykonało się bez
  dirty title, lecz późniejszy live readback nadal pokazał `Paste` (`61`) jako
  disabled. Nie wysłano `Paste`.
- `Floor Lever` został widocznie zaznaczony w drzewie Area. Jego menu ma
  aktywne `Adjust Location` (`ID 3`), ale po dokładnym wywołaniu nie pojawił
  się żaden modal `TdlgLocation`.
- Alternatywne aktywne `Properties` (`ID 19`) dla tego samego `Floor Lever`
  także zamknęło popup bez modalu. Ten wynik jest w `properties-route/`.
- Sesja została zamknięta targeted `WM_CLOSE`; nie użyto globalnego kursora,
  klawiatury ani myszy. Hash modułu pozostał identyczny: `E422...C20D0`.

## Blockery i następny cykl

1. `paste_disabled_after_exact_native_copy` — trzeba poznać stan/route,
   który aktywuje Paste, bez retry i bez zgadywania ID.
2. `placeable_adjust_location_no_dialog_after_exact_context_command` — trzeba
   ustalić, czy pełna transformacja placeable'a prowadzi przez properties,
   toolbar lub inną natywną akcję.

Artefakty JSON są readbackami live; PNG pokazują stan drzewa i Area. Pełna
maszyna stanu i hash clean-close są w `session-state.json`.

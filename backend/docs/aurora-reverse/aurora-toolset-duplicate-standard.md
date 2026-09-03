# Standard AUR-S02-07 — Duplicate

## Stan

**ZWERYFIKOWANE jako workflow semantyczny.** Aurora Toolset nie ma pojedynczej
komendy `Duplicate`. Obowiązująca natywna ścieżka duplikacji to zwalidowane
`Edit/Copy (59) -> Edit/Paste (61) -> commit preview -> Save`; identyfikatory
i stan menu są odczytywane przed akcją.

## Dowód

[Packet Copy/Paste](evidence/copy-paste-placeable-live-2026-07-14/README.md)
udowadnia jedną nową instancję `Water Trough` po Save (`placeables 3 -> 4`),
a potem Undo `56`, Save i byte-identyczny parserowy rollback. Discovery nadal
wyjaśnia, dlaczego standard nie obiecuje nieistniejącej komendy one-click.

## Kontrakt

Każda duplikacja wymaga: baseline parsera, native `Copy -> Paste -> commit`,
PNG przed/po, after-save delta `+1`, native Undo `56`, Save, dokładnego
parserowego rollbacku i niezależnego walidatora. Aurora pozostaje otwarta,
dopóki użytkownik nie zleci jej zamknięcia.

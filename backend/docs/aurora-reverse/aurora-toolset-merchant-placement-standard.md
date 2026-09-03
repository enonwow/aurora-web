# Standard dodawania merchant/store w Aurora Toolset

Status: obowiązujący, `verified`. Roadmap ID: `AUR-S01-06`.

Standard dziedziczy wspólną transakcję ze
[standardu palety](aurora-toolset-palette-placement-standard.md).

## Funkcja

Wybrać dokładny liść w rodzinie `Merchants`, umieścić jeden niewidoczny marker
store w Area, zapisać moduł i potwierdzić jeden nowy rekord `store` w GIT.

## Kontrakt proof

- `stores +1` i `total +1`; wszystkie inne liczniki bez zmian;
- readback zawiera `templateResRef`, `tag`, X/Y/Z i bearing;
- NPC sprzedawcy nie zastępuje rekordu `store`;
- brak widocznego modelu w scenie nie jest błędem, ale wymusza dowód parserowy;
- po placement natywny `Selection Mode` musi mieć Objects command `1` checked.

## Referencyjny accepted run

`Dye Store` utworzył `x2_merc_dye` w `(42.9145, 50.394, 0)`.
`stores 0→1`, `total 13→14`, pozostałe rodziny bez zmian.

Proof: [palette placement corrected live](evidence/palette-placement-corrected-live-2026-07-14/README.md).

## Potencjalne problemy

- pomylenie palety Merchant z creature pełniącym rolę sprzedawcy;
- marker jest niewidoczny, więc screenshot bez GIT delta daje fałszywy sukces;
- inventory sklepu i powiązanie z NPC są osobnymi funkcjami, nie częścią placementu.

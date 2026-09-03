# Standard dodawania Sound w Aurora Toolset

Status: obowiązujący, `verified`. Roadmap ID: `AUR-S01-07`.

## Funkcja

Wybrać dokładny liść w rodzinie `Sounds`, umieścić jeden marker w Area, zapisać
i potwierdzić nowy rekord `sound` wraz z parametrami pozycjonowania.

## Kontrakt proof

- `sounds +1` i `total +1`; inne liczniki bez zmian;
- readback zawiera template, tag, X/Y/Z oraz `soundPositioning`;
- screenshot pokazuje operację w Toolsecie, ale nie dowodzi słyszalności;
- słyszalność i radius wymagają osobnego runtime/audio proof;
- po placement Objects command `1` jest checked, Terrain command `0` unchecked.

## Referencyjny accepted run

`Animal Cries Day` utworzył `animalcriesday`, tag `AnimalCriesDay`, pozycję
`(37.7566, 49.3605, 1.51)`. `sounds 0→1`, `total 14→15`.

Proof: [palette placement corrected live](evidence/palette-placement-corrected-live-2026-07-14/README.md).

## Potencjalne problemy

- niewidoczny marker lub radius;
- zapisany rekord bez poprawnego pliku dźwiękowego;
- mylenie strukturalnego placementu z proofem audio.

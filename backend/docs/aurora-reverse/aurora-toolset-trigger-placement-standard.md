# Standard dodawania Trigger w Aurora Toolset

Status: `verified`. Roadmap ID: `AUR-S01-08`.

## Funkcja

Wybrać dokładny template Trigger, narysować co najmniej trzy wierzchołki i
zakończyć ostatni double-clickiem. Zapisany GIT musi zawierać jeden nowy rekord
`trigger` oraz niezerową geometrię.

## Kontrakt proof

- `triggers +1` i `total +1`; inne rodziny bez zmian;
- template, tag, centroid i `geometry[]` są obecne;
- minimum 3 punkty, skończone X/Y/Z, niezerowe pole polygonu;
- implicit closure jest akceptowane — pierwszy i ostatni punkt nie muszą być
  identyczne w GIT;
- po placement wymagany jest native Objects checked-state.

Accepted run: `New Generic`, `newgeneric`, cztery punkty, `triggers 0→1`.
Proof: [polygon placement live standard](evidence/polygon-placement-live-standard-2026-07-14/README.md).

Potencjalne problemy: niedomknięcie, dodatkowy vertex po retry, błędna wysokość
punktu na nierównej powierzchni, trigger bez skonfigurowanych event scripts.

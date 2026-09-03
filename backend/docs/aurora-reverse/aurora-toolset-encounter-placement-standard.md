# Standard dodawania Encounter w Aurora Toolset

Status: `verified`. Roadmap ID: `AUR-S01-05`.

## Funkcja

Wybrać dokładny template Encounter, wysłać co najmniej trzy zwalidowane punkty
do Area viewportu i zakończyć ostatni wierzchołek double-clickiem. Toolset
domyka polygon implicitnie.

## Kontrakt proof

- `encounters +1` i `total +1`; wszystkie inne liczniki bez zmian;
- nowy rekord ma oczekiwany template/tag;
- zapisane `geometry[]` ma co najmniej 3 punkty, wszystkie wartości są skończone,
  a pole polygonu jest niezerowe;
- po placement Objects mode jest natywnie potwierdzony;
- screenshot jest dowodem wizualnym, lecz GIT geometry jest dowodem
  autorytatywnym.

Accepted run: `Gnoll Encounter`, `x2_gnoll001`, cztery punkty, `encounters 0→1`.
Proof: [polygon placement live standard](evidence/polygon-placement-live-standard-2026-07-14/README.md).

Potencjalne problemy: za mało punktów, niezerowe kliknięcie kończące bez
double-clicku, samoprzecinający polygon, retry tworzący drugi encounter.

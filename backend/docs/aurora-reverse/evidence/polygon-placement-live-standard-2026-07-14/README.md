# Encounter and Trigger polygon placement live proof

Status: `verified`.

W jednej sesji Aurora Toolset PID `33068` wykonano dwa niezależne polygon
placements, z osobnym Save i parserowym readbackiem po każdym kroku.

- `Gnoll Encounter`: `encounters 0→1`, `total 16→17`, template `x2_gnoll001`,
  cztery zapisane punkty geometryczne;
- `New Generic`: `triggers 0→1`, `total 17→18`, template `newgeneric`, cztery
  zapisane punkty geometryczne;
- w obu przypadkach ostatni punkt zakończono double-clickiem, a Toolset
  implicitnie domknął polygon;
- po każdym placement natywny Objects command `1` był checked;
- zamknięcie targeted `WM_CLOSE`, zero procesów po sesji.

Artefakty `baseline`, `after-encounter`, `after-trigger` dowodzą izolowanych
delt liczników. `final-with-geometry` zawiera jawne `geometry[]` odczytane z GIT.

Walidacja:

```powershell
node backend/scripts/validate-aurora-toolset-polygon-placement-proof.mjs
```

# Stage 1 — aggregate palette standards proof

Agregat uruchamia aktualne walidatory live proofów dla dziewięciu rodzin:
Placeable, Creature, Item, Door, Encounter, Merchant, Sound, Trigger i
Waypoint. Dodatkowo sprawdza, że wszystkie dziesięć wierszy `AUR-S01-*` w
roadmapie ma status `TAK`.

Wynik: [validator-result.json](validator-result.json).

Uruchomienie:

```powershell
node backend/scripts/validate-aurora-toolset-stage1-palette-standards.mjs
```

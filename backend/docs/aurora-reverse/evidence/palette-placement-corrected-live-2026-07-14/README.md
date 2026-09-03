# Corrected live proof: Aurora palette placement matrix

Status: `verified_with_one_documented_negative`.

Jedna sesja Aurora Toolset, PID `10844`, frame `855506`, monitor `DISPLAY1`,
moduł otwarty raz i zamknięty targeted `WM_CLOSE`. Po zamknięciu zostało zero
procesów `nwtoolset`. Nie użyto globalnego kursora, klawiatury ani myszy.

## Wyniki funkcji

| Funkcja | Template | Delta GIT | Objects mode | Wynik |
| --- | --- | --- | --- | --- |
| NPC | `Dwarf Mercenary` | `creatures 5→6`, `total 11→12` | command `1` checked | verified |
| Item | `Commoner's Outfit` | `items 2→3`, `total 12→13` | command `1` checked | verified |
| Merchant | `Dye Store` | `stores 0→1`, `total 13→14` | command `1` checked | verified |
| Sound | `Animal Cries Day` | `sounds 0→1`, `total 14→15` | command `1` checked | verified |
| Waypoint | `Waypoint` | `waypoints 0→1`, `total 15→16` | command `1` checked | verified |
| Door | `Area Transition (No Visible Door)` | `doors 1→1`, `total 16→16` | command `1` checked | partial: brak prawidłowego hook target |

Każdy pozytywny krok ma osobny zapis modułu i natychmiastowy parserowy readback.
Próba Door nie zmieniła `objects.csv`: SHA-256 przed i po wynosi
`479BF2CA661EDF8799F7CFFB35957585B299D8E0AC7116202A34EA66DE890BF6`.
Dlatego nie jest raportowana jako wykonany placement.

## Najważniejsze artefakty

- [summary.json](summary.json) — skrócona macierz wyników i hashe modułu;
- [validator-result.json](validator-result.json) — trwały wynik walidatora;
- [session-state.json](session-state.json) — lifecycle jednej sesji i clean close;
- `02/04/06/08/10-*-action.json` — pełne odczyty palety, viewportu i natywnego
  `Selection Mode`;
- `baseline`, `after-npc`, `after-item`, `after-merchant`, `after-sound`,
  `after-waypoint`, `after-door-attempt` — parserowe snapshoty GIT;
- PNG `01`, `03`, `05`, `07`, `09`, `11`, `13` — wizualny przebieg w Aurorze.

Walidacja:

```powershell
node backend/scripts/validate-aurora-toolset-palette-matrix-proof.mjs
```

Oczekiwany wynik: `ok=true`, pięć verified placements i jeden jawny blocker Door.

# F12 - First 5 Function Review Template (R75)

Cel: szybki, ustrukturyzowany przeglad pierwszych 5 funkcji pod katem mapowania do backendu Aurora.

## Instrukcja wypelnienia
- `nazwa`: nazwa funkcji (symbol z Ghidra lub nazwa robocza).
- `rola`: co funkcja robi w analizowanym przeplywie.
- `evidence`: konkretne przeslanki (dekompilat, stale, API, logika warunkow).
- `xrefs`: kluczowe odwolania (callers/callees, adresy, string refs).
- `risk`: poziom ryzyka (Low/Medium/High) i uzasadnienie.
- `backend impact`: potencjalny wplyw na backend (endpointy, walidacja, auth, dane, telemetry).

## Tabela przegladu (pierwsze 5 funkcji)

| # | nazwa | rola | evidence | xrefs | risk | backend impact |
|---|---|---|---|---|---|---|
| 1 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |
| 2 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |
| 3 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |
| 4 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |
| 5 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |

## Sekcja szczegolowa (opcjonalnie, po jednym bloku na funkcje)

### Funkcja 1: `TBD`
- nazwa:
- rola:
- evidence:
- xrefs:
- risk:
- backend impact:

### Funkcja 2: `TBD`
- nazwa:
- rola:
- evidence:
- xrefs:
- risk:
- backend impact:

### Funkcja 3: `TBD`
- nazwa:
- rola:
- evidence:
- xrefs:
- risk:
- backend impact:

### Funkcja 4: `TBD`
- nazwa:
- rola:
- evidence:
- xrefs:
- risk:
- backend impact:

### Funkcja 5: `TBD`
- nazwa:
- rola:
- evidence:
- xrefs:
- risk:
- backend impact:

## Kryteria ryzyka (szybka skala)
- `Low`: brak bezposredniego wplywu na security/integralnosc danych.
- `Medium`: mozliwy wplyw na logike biznesowa, walidacje lub stabilnosc.
- `High`: potencjalny wplyw na auth/authz, poufnosc, integralnosc danych lub RCE.

## Notatki sesji
- Data przegladu:
- Rewersujacy:
- Zakres binarki/modulu:
- Powiazane artefakty:

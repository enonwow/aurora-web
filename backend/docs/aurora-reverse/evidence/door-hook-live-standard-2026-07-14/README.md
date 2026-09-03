# Door hook placement — accepted live proof

Werdykt: `verified` dla `AUR-S01-04`.

Jedna sesja Aurora Toolset (PID `45428`) została otwarta na roboczej kopii
modułu i zamknięta bez force-kill. Nie użyto globalnej myszy, klawiatury ani
kursora.

## Wynik strukturalny

W Area `Demo - home` rozpoznano natywny hook na podstawie istniejącego Door
`nw_door_ttr_04` przy `(35, 25.76, 0)`. Po kontrolowanym przygotowaniu fixture:

| Stan | `doors` | `total` |
| --- | ---: | ---: |
| baseline bez drzwi w hooku | 0 | 1 |
| po `Barn Door` i Save | 1 | 2 |

Dodany rekord: `nw_door_ttr_04`, tag `Barn1Door`, `(35, 25.76, 0)`, bearing
`180`. Pozostałe liczniki nie zmieniły się.

## Dowody

- [Area przed](06-home-area-before.png)
- [baseline po przygotowaniu fixture](deleted-baseline/area-deleted-baseline/raw.git.summary.json)
- [targeted action i readback Selection Mode](13-home-barn-door-hook-action.json)
- [Door dodany, moduł dirty](14-home-barn-door-added-unsaved.png)
- [Door po Save](15-home-barn-door-added-saved.png)
- [parserowy readback po Save](added-after/area-door-added-after/raw.git.summary.json)
- [zamknięcie sesji](session-close.json)
- [wynik walidatora](validator-result.json)

## Powiązany accepted proof Delete

Przygotowanie fixture nie jest ukrytym krokiem: jest osobnym accepted proofem
`AUR-S02-08`. [Original baseline](original-area-baseline/raw.git.summary.json),
[targeted action](delete-action.json), [summary](delete-summary.json) i
[validator](delete-validator-result.json) pokazują `doors 1→0`, `total 2→1`
bez zmiany waypointu.

## Ważny przypadek negatywny

Cztery wcześniejsze kliknięcia w `demo`, `Demo - snow` i seam tile'a w
`Demo - home` nie dały dirty title ani rekordu Door. Standard dlatego zabrania
uznawania dowolnego punktu viewportu za door hook.

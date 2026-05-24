# Reverse Open Questions Burn-down R82 (Agent R12)

Data: 2026-05-24
Zakres: burn-down otwartych pytan reverse na bazie R78-R81.
Cel: rozdzielic pytania na te, ktore mozna zamknac bez kolejnej dekompilacji, oraz te, ktore wymagaja dodatkowego zrzutu/analizy z Ghidry.

Zrodla decyzji:
- `reverse-unknowns-resolution-queue-r80.md`
- `reverse-backend-decision-closure-r81.md`
- `reverse-executive-summary-r81.md`
- `reverse-final-evidence-pack-r81.md`
- `reverse-validation-matrix-r79.md`

## Szybki bilans burn-down

- Wejscie: 14 pytan (`MH-01..08`, `NH-01..06`).
- Zamknac bez kolejnej dekompilacji: 2.
- Wymaga dodatkowego zrzutu/analizy z Ghidry: 12.

## A) Pytania do zamkniecia bez kolejnej dekompilacji

| ID | Priorytet | Decyzja | Uzasadnienie |
|---|---|---|---|
| NH-01 | P1 | `CLOSED (decyzyjnie)` | Nie mapujemy backendu 1:1 do nazw metod `CNWS*`; przyjmujemy kontrakty danych i adresy `FUN_*` jako wystarczajace. To redukuje ryzyko overfit (R81) i nie blokuje implementacji. |
| NH-04 | P1 | `CLOSED (decyzyjnie)` | Podzial rodziny 2DA jest wystarczajaco stabilny na poziomie architektury (staged resolver, potwierdzone funkcje `FUN_004818B0/0052EDE0/00532174/00612A44`). Dalsza mikrosementyka moze byc robiona w hardeningu, bez trzymania pytania jako OPEN. |

## B) Pytania wymagajace dodatkowego zrzutu/analizy z Ghidry

| ID | Priorytet | Status | Co jest brakujacym dowodem |
|---|---|---|---|
| MH-01 | P0 | `OPEN -> GHIDRA REQUIRED` | Kanoniczny parser GIT list i pelny caller-chain dla `Door/Placeable/Creature/AreaProperties`. |
| MH-02 | P0 | `OPEN -> GHIDRA REQUIRED` | Pelny parser ARE poza `DefaultAreaProperties`, w tym `Tile_List` i reguly `Width*Height`. |
| MH-03 | P0 | `OPEN -> GHIDRA REQUIRED` | Twarda polityka alias/duplikat dla `LoadScreenID/LoadScreenId` i `LinkedToFlags` (kolejnosc, parse numeric, branch effect). |
| MH-04 | P0 | `OPEN -> GHIDRA REQUIRED` | Jednoznaczny branch mapping `UTC->creature` i `UTP->placeable` z downstream callees runtime. |
| MH-05 | P0 | `OPEN -> GHIDRA REQUIRED` | Rozstrzygniecie kanonicznej sciezki sposrod wielu lane GIT (`00567DCC` vs `00524FF4` vs `0073E3EC` itd.). |
| MH-06 | P0 | `OPEN -> GHIDRA REQUIRED` | Precedence i tie-break konfliktow zasobow w HAK chain (edge-case behavior). |
| MH-07 | P0 | `OPEN -> GHIDRA REQUIRED` | Twarde branch-e walidacyjne bounds/overflow dla kluczowych pol ARE/GIT i ich skutek (`reject/normalize/warn`). |
| MH-08 | P0 | `OPEN -> GHIDRA REQUIRED` | Adresowe domkniecie E2E: `resource manager -> GFF top-level -> struct iteration -> object lane`. |
| NH-02 | P1 | `OPEN -> GHIDRA REQUIRED` | Potwierdzenie czy `HAK_V1.0` to realny hard gate (a nie tylko clue). |
| NH-03 | P1 | `OPEN -> GHIDRA REQUIRED` | Pelna semantyka fallbackow w `FUN_00ABCFEC` (kolejnosc i warunki przejsc miedzy branchami). |
| NH-05 | P2 | `OPEN -> GHIDRA REQUIRED` | Twarde odseparowanie flow runtime-server vs toolset/editor dla parserow domenowych. |
| NH-06 | P2 | `OPEN -> GHIDRA REQUIRED` | Czy `ResourceInHak` jest tylko diagnostyka czy sygnal decyzyjny zmieniajacy resolve. |

## Kolejnosc dalszego burn-down (operacyjnie)

1. P0: `MH-01`, `MH-02`, `MH-03`, `MH-08`.
2. P0: `MH-05`, `MH-07`, `MH-04`, `MH-06`.
3. P1: `NH-02`, `NH-03`.
4. P2: `NH-05`, `NH-06`.

## Warunek zamkniecia paczki P0

Paczka P0 moze przejsc do `CLOSED` dopiero po jednoczesnym dostarczeniu:
1. jednej tabeli adresowej `ARE/GIT` (`adres -> rola -> dowod branch/iteracja/mapowanie`),
2. potwierdzonej polityki alias/duplikat dla transition keys na probkach binarnych,
3. call-chainu E2E `resource -> parser -> object lane` bez luk krytycznych.

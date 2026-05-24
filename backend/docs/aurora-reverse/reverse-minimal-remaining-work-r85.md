# Reverse Minimal Remaining Work R85 (Agent R21)

Data: 2026-05-24
Cel: wskazac absolutne minimum reverse, ktore realnie zwroci sie jeszcze przed startem implementacji backendu.
Zasada: tylko prace o wysokim expected value przy niskim effort; wszystko inne -> defer do hardeningu po pierwszych PR.

## Werdykt

Backend mozna zaczynac teraz (GO), ale warto domknac 4 male pakiety reverse przed kodowaniem, zeby ograniczyc rework i bledy kontraktowe.

## Minimalny pozostaly zakres (MRM)

| ID | Minimalny zakres reverse (przed implementacja) | Estimate effort | Expected value |
|---|---|---|---|
| R85-01 | Domkniecie jednego kanonicznego call-chain `resource -> GFF top-level -> ARE/GIT object lane` dla lane uzywanych przez pierwszy slice backendu (MH-01/MH-02/MH-08 w wersji "minimum"). | 6-8h | Wysokie: redukcja ryzyka blednego kontraktu parsera i blednej architektury portow na starcie. |
| R85-02 | Twarda polityka alias/duplikat dla `LoadScreenID|LoadScreenId` i `LinkedToFlags` + 1 strona decyzji `accept/reject/normalize` oparta o branch evidence (MH-03 + czesc MH-07). | 4-6h | Wysokie: usuwa najbardziej kosztowna klase regresji kompatybilnosci danych i sporow implementacyjnych w review. |
| R85-03 | Mini-paczka walidacyjna bounds/overflow tylko dla pol krytycznych pierwszego slice (nie pelny parser): wypis `field -> expected behavior` dla `reject/normalize/warn`. | 4-6h | Srednio-wysokie: spina reverse z testami negatywnymi i ogranicza ryzyko luk bezpieczenstwa/walidacji. |
| R85-04 | Zestaw 8-12 "golden fixtures" + expected outcomes (kody bledow i kluczowe pola odpowiedzi) dla differential/contract tests od pierwszego PR. | 6-10h | Wysokie: szybkie wykrywanie behavioral drift (R84-03) i niezgodnosci API (R84-08) zanim koszt reworku urośnie. |

## Suma effort i ROI

- Laczny effort: 20-30h (ok. 2.5-4 dni robocze).
- Oczekiwany zwrot: wysoki, bo redukuje 4 najdrozsze ryzyka startowe: zly kontrakt parsera, spory alias/duplikat, luki walidacyjne, drift zachowania.

## Czego nie robic przed startem implementacji (DEFER)

1. Pelne domkniecie wszystkich `MH/NH` z R82.
2. Pelna semantyka wszystkich alternatywnych lane GIT i fallbackow toolset/runtime.
3. Szerokie reverse "na zapas" bez bezposredniego przelozenia na pierwszy slice API/testow.

## Definition of Done dla MRM

1. Jeden skonsolidowany artefakt `adres -> rola -> dowod` dla zakresu z R85-01.
2. Jednoznaczna decyzja alias/duplikat z przykladami we/wy dla R85-02.
3. Krotka tabela `field -> reject/normalize/warn` dla R85-03.
4. Fixture pack + expected outcomes gotowe do natychmiastowego podpiecia w testach kontraktowych dla R85-04.

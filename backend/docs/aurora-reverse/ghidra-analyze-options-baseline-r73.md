# Ghidra Analyze Options Baseline (R73) dla `nwtoolset.exe`

## Cel profilu (pierwszy przebieg)
- Szybko zbudowac stabilny baseline: funkcje, xrefy, stack i sensowny pseudokod.
- Ograniczyc szum i koszt czasowy na starcie.
- Zostawic ciezsze/ryzykowniejsze analyzery na drugi przebieg (targetowany).

## Rekomendowany baseline ON/OFF

| Analyzer (Analyze Options) | Ustawienie (1st pass) | Krotkie uzasadnienie |
|---|---|---|
| Disassemble Entry Points | ON | Niezbedne do pewnego startu disassembly od punktow wejsciowych. |
| Function Start Search | ON | Podnosi pokrycie wykrytych funkcji bez recznego seedowania. |
| Disassemble (language-specific) | ON | Buduje ciagly listing kodu, baza pod wszystkie kolejne analyzery. |
| Reference | ON | Tworzy podstawowe referencje code/data potrzebne do nawigacji. |
| Data Reference | ON | Lepsze mapowanie dostepow do danych i stalych. |
| Scalar Operand References | ON | Pomaga laczyc stale/adresy z obiektami danych i API. |
| Subroutine References | ON | Stabilizuje call edges i relacje caller/callee. |
| External Entry References | ON | Ulatwia triage przez poprawne podpiecie importow/externali. |
| Stack | ON | Poprawia ramki stosu i czytelnosc dekompilacji. |
| Non-Returning Functions - Discovered | ON | Lepsza kontrola CFG tam, gdzie funkcje nie wracaja. |
| Shared Return Calls | ON | Porzadkuje przeplyw sterowania przy wspolnych epilogach. |
| Demangler Microsoft | ON | Krytyczne dla `nwtoolset.exe` (MSVC): czytelniejsze nazwy C++ od razu. |
| Decompiler Parameter ID | ON | Poprawia sygnatury i nazwy parametrow na starcie. |
| Decompiler Switch Analysis | ON | Lepsze rozpoznanie `switch` i pelniejszy CFG. |
| Function ID | ON | Szybkie odfiltrowanie czesci kodu bibliotecznego/standardowego. |
| Create Address Tables | ON | Pomaga rozpoznac tablice wskaznikow i jump tables. |
| PDB Universal | OFF | Wlaczyc tylko gdy masz zgodny PDB; inaczej czesto puste/halas. |
| Aggressive Instruction Finder | OFF | Czesciej dokleja falszywy kod przy binarkach PE/C++; lepszy na 2. przebieg punktowy. |
| Embedded Media | OFF | Nie wnosi wartosci do flow RE kodu, tylko wydluza analize. |
| Apply Data Archives | OFF | Moze narzucic nietrafione typy na starcie; bezpieczniej po rekonesansie P0/P1. |

## Kiedy zrobic drugi przebieg
- Gdy baseline sie ustabilizuje (masz P0/P1 shortlist i pierwsze eksporty).
- Wtedy rozwaz punktowo: `Aggressive Instruction Finder` (zakresowo), `PDB Universal` (jesli PDB istnieje), oraz selektywne typowanie przez Data Type Manager.

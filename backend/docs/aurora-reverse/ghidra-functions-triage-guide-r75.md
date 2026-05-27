# Agent A12: Functions Tree Triage (R75)

## Kolejność działań (po 1. analizie)
1. Posortuj `Functions` po rozmiarze i najpierw otwórz największe + te z wieloma referencjami (`XREF`).
2. Oznacz od razu punkty wejścia: `entry`, inicjalizacja, dispatchery, funkcje wołane z wielu miejsc.
3. Grupuj po API i stringach (I/O, crypto, net, auth, file, process) i nadaj robocze nazwy.
4. Ztriaguj szybko „leaf” funkcje (małe helpery), żeby odsiać szum.
5. Priorytetyzuj funkcje łączące dane zewnętrzne z logiką krytyczną (parser -> decyzja -> akcja).

## Czerwone flagi
- Duża funkcja z wieloma branchami + nieczytelne warunki (często główna logika).
- Pośrednie wywołania (`call [reg]`, vtable, jump table), szczególnie bez typów.
- Operacje na buforach: `memcpy/strcpy/sprintf`-like, nietypowe długości, brak walidacji.
- Ręczne crypto/obfuskacja: XOR pętle, custom hash, runtime decode stringów.
- Parsowanie wejścia bez ograniczeń (sieć/plik/IPC) przed sprawdzeniem długości/formatu.
- Funkcje z wysokim fan-in/fan-out (wiele wejść i wyjść) bez jasnej odpowiedzialności.

# Reverse Unknowns Resolution Queue R80 (Agent R8)

Data: 2026-05-24
Cel: uporzadkowana kolejka otwartych pytan reverse na bazie findings R78-R80, z konkretnym sposobem domkniecia kazdego punktu w Ghidrze.
Statusy: `OPEN` -> `IN_PROGRESS` -> `CLOSED`.

## Must-have (blokuje strict implementation / release gate)

### MH-01 (P0) - Gdzie jest kanoniczny parser GIT list (`Door/Placeable/Creature/AreaProperties`) i jaki jest jego pelny call-chain?
- Powiazane findings: R79 `G2`, `G4`, `G7`; R78 sekcja 3.1; R79 Binary Clues sekcja 5.
- Dlaczego must-have: bez tego nie da sie bezpiecznie odblokowac strict `POST /processing/area`.
- Domkniecie w Ghidrze:
  1. Otworz `Program Text` i wyszukaj kolejno stringi: `Door List`, `Placeable List`, `Creature List`, `AreaProperties`.
  2. Dla kazdego stringa: `Xrefs To` -> zapisz wszystkie funkcje `FUN_*` i odfiltruj wpisy bez petli po strukturach (noise).
  3. Dla kandydatow: otworz dekompilator i potwierdz wzorzec listy GFF (iteracja index/list + odczyt elementow).
  4. Zrob `Show Call Graph` (2 poziomy callers + 1 poziom callees) i zaznacz punkt wejscia orchestratora.
  5. Oznacz funkcje tagami: `aurora.git.parser`, `aurora.git.serializer`, `aurora.git.helper`.
  6. Wyeksportuj mini-pakiet dowodow: adres, string-xref, 1 warunek, 1 petla, 1 mapowanie pola.
- Kryterium `CLOSED`: jedna tabela `string -> FUN_* -> rola -> caller-chain` pokrywa wszystkie 4 listy i wskazuje kanoniczny path dla backendu.

### MH-02 (P0) - Jaki jest pelny parser ARE (poza `DefaultAreaProperties`) i gdzie sa reguly `Tile_List`, `Width*Height`?
- Powiazane findings: R79 `G5`; R78 sekcja 3.1; Readiness R79 (`AreParserService` hold).
- Dlaczego must-have: bez tego brak twardej walidacji payloadu area i brak bezpiecznych bounds.
- Domkniecie w Ghidrze:
  1. Start od `FUN_0072691c` (`0x0072691C`) i wykonaj `Xrefs To` (callers) do wyzszego loadera.
  2. W callerach szukaj stringow/odwolan zwiazanych z `Tile_List`, rozmiarami area i inicjalizacja siatki.
  3. W dekompilatorze potwierdz: obliczenie wymiarow, petle po tiles, warunki odrzucenia/normalizacji.
  4. Dla kazdego brancha walidacyjnego zapisz: warunek, typ reakcji (fail/warn/clamp), miejsce zwrotu bledu.
  5. Oznacz funkcje tagami: `aurora.are.loader`, `aurora.are.validation`.
- Kryterium `CLOSED`: udokumentowany adresowy lancuch `ARE entry -> tile parse -> bounds validation` z co najmniej 2 twardymi branchami walidacyjnymi.

### MH-03 (P0) - Jaka jest faktyczna polityka aliasow/duplikatow dla `LoadScreenID|LoadScreenId` i `LinkedToFlags` w binarnym parserze?
- Powiazane findings: R79 `G2`; R78 sekcja 3.1; Readiness R79 (`TransitionAliasParserService` hold).
- Dlaczego must-have: to bezposrednio decyduje o canonicalizacji i round-trip transitions.
- Domkniecie w Ghidrze:
  1. Wyszukaj stringi: `LoadScreenID`, `LoadScreenId`, `LinkedToFlags`.
  2. `Xrefs To` -> wylistuj funkcje read i write; porownaj czy ten sam parser obsluguje oba aliasy.
  3. W dekompilatorze odtworz kolejnosc nadpisan (first-wins vs last-wins) na duplicate key path.
  4. Zweryfikuj parse typu: signed/unsigned, zakres, reakcja na wartosci ujemne i overflow.
  5. Potwierdz case-sensitivity i zachowanie przy near-miss key.
- Kryterium `CLOSED`: jednoznaczna macierz `wejscie -> wynik` dla aliasu, duplikatu i typu liczbowego, oparta o branch evidence z konkretnych `FUN_*`.

### MH-04 (P0) - Czy branch `UTC` i branch `UTP` sa jednoznacznie mapowane na lane `creature` vs `placeable`?
- Powiazane findings: R79 `H1`, `C13`; R78 sekcja 3.2; Readiness R79 (`Creature/Placeable strict` hold).
- Dlaczego must-have: bez tego strict enrichment moze falszywie klasyfikowac obiekty.
- Domkniecie w Ghidrze:
  1. Otworz `FUN_007338C4` i `FUN_007342E8`; potwierdz ich xrefy do `*.UTC` i `*.UTP`.
  2. Dla obu funkcji wykonaj `Xrefs To` i `Xrefs From`; zidentyfikuj wspolny dispatcher (np. `FUN_004A3714`).
  3. W branchach dekompilatora oznacz warunki, ktore wybieraja lane (type flag/ext check/vtable path).
  4. Potwierdz koncowe callees odpowiadajace tworzeniu obiektu runtime (nie tylko helpery).
  5. Odfiltruj noise (OpenGL/debug) przez brak petli parsera i brak mapowania pol domenowych.
- Kryterium `CLOSED`: twardy dowod branch-condition + downstream callees dla obu lane, z confidence >= 0.9.

### MH-05 (P0) - Ktora z wielu sciezek list GIT jest kanoniczna dla runtime celu backendu?
- Powiazane findings: R79 `G7`, `H2`, `C8`, `C9`, `C10`.
- Dlaczego must-have: trzeba wiedziec, co jest primary path, a co legacy/alternate.
- Domkniecie w Ghidrze:
  1. Przeanalizuj rodziny: `FUN_00567DCC/005685FC/005697E4/0056998C/00569E8C` vs `FUN_00524FF4` vs `FUN_0073E3EC`.
  2. Dla kazdej rodziny sprawdz caller-context (runtime flow, editor flow, import/export flow).
  3. Oznacz cechy: parse-only, serialize-only, dual-mode, legacy wrapper.
  4. Porownaj strukture mapowanych pol i list: czy semantyka jest identyczna czy rozna.
- Kryterium `CLOSED`: decyzja `primary + compatible alternates` z dowodami caller-context i roznic semantycznych.

### MH-06 (P0) - Jak dokladnie dziala precedence i konflikt zasobu w HAK chain (edge cases)?
- Powiazane findings: R79 `G6`, `H4`; R78 Resource Pipeline sekcja 4.
- Dlaczego must-have: bez tego nie da sie wiarygodnie zamknac `resolved haks` i konfliktow.
- Domkniecie w Ghidrze:
  1. Start od `FUN_005B5BC4` (odczyt `Mod_HakList`) i `FUN_005CE044` (`ResourceInHak`).
  2. W callgraphu znajdz funkcje, ktore iteruja po liscie HAK i decyduja o pierwszenstwie.
  3. W dekompilatorze wypisz regule: kolejnosc iteracji, warunek trafienia, tie-break.
  4. Potwierdz czy conflict path jest tylko diagnostyczny czy zmienia wynik resolve.
- Kryterium `CLOSED`: jawna regula precedence (order + tie-break + conflict behavior) udokumentowana adresowo.

### MH-07 (P0) - Czy sa twarde branch-e walidacyjne numeric bounds/overflow dla kluczowych pol ARE/GIT?
- Powiazane findings: R79 `G5`; Readiness R79 (strict area hold).
- Dlaczego must-have: bez tego nie mozna ustawic bezpiecznej polityki hard-fail vs warn.
- Domkniecie w Ghidrze:
  1. W kandydat parserow ARE/GIT wyszukaj porownania graniczne (`<`, `>`, clamp patterns, saturating writes).
  2. Namierz branch-e powiazane z `LinkedToFlags` (byte), `LoadScreenID` (word), wymiarami area i licznikami list.
  3. Potwierdz skutki brancha: reject, normalize, ignore, telemetry/log path.
  4. Zmapuj kazdy branch do backend rule (`error`, `warning`, `preserve-only`).
- Kryterium `CLOSED`: lista min. 8 branchy walidacyjnych z przypisaniem do konkretnej reguly kontraktu backendu.

### MH-08 (P0) - Czy lancuch `resource manager -> GFF top-level -> struct iteration` jest domkniety adresowo?
- Powiazane findings: R79 `G4`, `H5`; R78 sekcja 3.2.
- Dlaczego must-have: to fundament warstwowego parsera niezaleznego od nazw klas.
- Domkniecie w Ghidrze:
  1. Zacznij od helperow `FUN_00AE*` wskazanych przy list parse/write.
  2. Idz wstecz po callerach do punktu pobrania zasobu (res manager).
  3. Idz wprzod po callees do iteracji top-level i struct-by-index.
  4. Oznacz role kazdego odcinka: acquire, top-level, iterate, map-field, instantiate.
- Kryterium `CLOSED`: jeden ciag adresowy E2E z nazwanymi etapami i bez luki P0.

## Nice-to-have (zwieksza pewnosc, nie blokuje startu obecnego planu)

### NH-01 (P1) - Twarde mapowanie `FUN_*` do nazwanych metod klas (`CNWSArea::*`, `CNWSCreature::*`, `CNWSPlaceable::*`)
- Powiazane findings: R79 `G1`.
- Domkniecie w Ghidrze:
  1. Szukaj RTTI/vtable/typeinfo i cross-reference do kandydatow parsera.
  2. Porownaj sygnatury wywolan i layout argumentow z rodzinami `CNWS*`.
  3. Oznacz mapowania tylko gdy sa >=2 niezalezne dowody (nie sam naming heuristic).
- Kryterium `CLOSED`: mapa `FUN_* -> nazwana metoda` z confidence per rekord.

### NH-02 (P1) - Potwierdzenie realnego gate formatu `HAK_V1.0`
- Powiazane findings: R79 Binary Clues (`FUN_004AF534`, `FUN_00541CD4`), Readiness R79 (`HakFormatGateService` hold).
- Domkniecie w Ghidrze:
  1. Otworz obie funkcje i potwierdz porownanie magic/version.
  2. Namierz branch na mismatch i sprawdz czy jest hard fail czy fallback.
  3. Sprawdz call-site: import/runtime/editor.
- Kryterium `CLOSED`: decyzja czy backend moze stosowac hard gate, soft gate, czy preserve-only.

### NH-03 (P1) - Pelna semantyka fallbackow instalacyjnych w `FUN_00ABCFEC` (obecnie posrednia)
- Powiazane findings: R79 `H3`; R80 Dossier 04.
- Domkniecie w Ghidrze:
  1. Ustabilizuj dekompilacje funkcji (split na mniejsze bloki, rename locals, retype kluczowych zmiennych).
  2. Odtworz kolejnosc fallbackow (`TLKINSTALL`, `TLKLOCINSTALL`, `data\\tlk`, itp.).
  3. Potwierdz warunki przejscia miedzy branchami i warunek konca.
- Kryterium `CLOSED`: deterministyczna tabela fallback order + warunek przejscia.

### NH-04 (P1) - Podzial odpowiedzialnosci w rodzinie 2DA (`FUN_004818B0/0052EDE0/00532174/00612A44`)
- Powiazane findings: R79 `C7`; R80 Dossiers 06-08.
- Domkniecie w Ghidrze:
  1. Dla kazdej funkcji zapisz wejscie/wyjscie i krytyczne callees.
  2. Oznacz role: open table, row lookup, column resolve, specialization (`Equip2DA`).
  3. Sprawdz czy jakas funkcja robi walidacje/canonicalizacje nazw tabel.
- Kryterium `CLOSED`: podzial roli 2DA family + punkt, gdzie najlepiej osadzic telemetry/provenance w backendzie.

### NH-05 (P2) - Rozdzielenie flow runtime-server vs toolset/editor dla parserow domenowych
- Powiazane findings: R79 `G3`.
- Domkniecie w Ghidrze:
  1. Dla glownych kandydatow parsera sprawdz top callers i ich modul/UI kontekst.
  2. Oznacz funkcje jako `runtime`, `toolset`, `shared`.
  3. Zweryfikuj, czy roznice flow zmieniaja semantyke parsera, czy tylko otoczke UI.
- Kryterium `CLOSED`: klasyfikacja flow + lista miejsc, gdzie backend musi zachowac feature-flag defensywny.

### NH-06 (P2) - Semantyka diagnostyki `ResourceInHak` (czy tylko log, czy aktywny sygnal konfliktu)
- Powiazane findings: R79 `C6`; R78 Resource Pipeline sekcja 4.
- Domkniecie w Ghidrze:
  1. Otworz `FUN_005CE044` i sprawdz wartosc zwracana oraz jej konsumentow.
  2. Przesledz branch-e po callerach: czy wynik zmienia resolve, czy tylko telemetrie/log.
  3. Oznacz poziom wplywu na decyzje precedence.
- Kryterium `CLOSED`: jednoznaczne `diagnostic-only` albo `decision-affecting` z adresem brancha.

## Kolejnosc realizacji (operacyjna)
1. MH-01
2. MH-02
3. MH-03
4. MH-04
5. MH-05
6. MH-06
7. MH-07
8. MH-08
9. NH-01
10. NH-02
11. NH-03
12. NH-04
13. NH-05
14. NH-06

## Minimalny pakiet artefaktow dowodowych dla kazdego punktu
1. `address-list` (wszystkie `FUN_*` dotkniete w domknieciu)
2. 2-3 zrzuty dekompilatora z branch/iteracja/mapowaniem pola
3. mini-callgraph (`caller -> function -> callee`)
4. decyzja `CLOSED` wraz z confidence i wpływem na kontrakt backendu

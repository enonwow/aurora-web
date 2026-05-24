# Ghidra: Imports → funkcje domenowe (resource parsing) przez xrefs (R75)

## Cel
Szybko przejść od listy importów (API/CRT) do realnych funkcji domenowych, które parsują zasoby (`.2da`, `.are`, `.git`, `.ifo`, itp.).

## Krótki walkthrough
1. Otwórz **Imports** i wybierz importy sygnalizujące I/O lub parsowanie, np. `fopen`, `fread`, `ReadFile`, `strtok`, `sscanf`, `memcpy`.
2. Dla każdego importu użyj **Show References To** (`xrefs`) i przejdź do thunków/call site'ów.
3. Z listy xrefów odfiltruj szum:
   - pomiń wrappery ogólne (logowanie, allocatory, init),
   - priorytetyzuj funkcje wołane z pipeline’u ładowania zasobów.
4. Wejdź w pierwszego sensownego callera i idź „w górę” call graphu:
   - caller importu → orchestrator ładowania → funkcja domenowa parsera.
5. W dekompilatorze sprawdź sygnały parsera:
   - pętle po buforze/liniach,
   - tokenizacja, mapowanie pól, konwersje typów,
   - walidacja nagłówka/wersji/kolumn.
6. Potwierdź semantykę przez dodatkowe xrefy:
   - xrefy do stringów formatów (`"2DA V2.0"`, nazwy kolumn, rozszerzenia plików),
   - xrefy do struktur docelowych (np. area metadata, placeables, doors).
7. Nazwij funkcję roboczo po domenie (`parse_2da_rows`, `parse_are_header`) i oznacz tagiem.
8. Zapisz 3 dowody w notatce: import startowy, łańcuch xref/call graph, artefakt domenowy (string/struct/output).

## Reguła praktyczna
Jeśli ścieżka z importu kończy się tylko na helperach technicznych, wróć do Imports i weź inny „kotwiczny” import. Dobre kotwice to te, które mają argumenty związane z buforem pliku, linią tekstu albo deskryptorem zasobu.

## Minimalny output po 15-20 min
- 2-3 nazwane funkcje parserów domenowych.
- Dla każdej: punkt wejścia (import), łańcuch xrefów i krótki opis co parsuje.

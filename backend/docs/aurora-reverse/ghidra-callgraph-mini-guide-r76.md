# Ghidra Callgraph Mini Guide (r76)

## Cel
Szybko przejść od funkcji pomocniczych (helperów) do funkcji domenowej, która realizuje logikę biznesową.

## Kiedy używać
- Masz helper typu `sub_xxx`, `mem*`, parser, walidator, konwerter.
- Wiesz, że to nie jest jeszcze "core domain", ale chcesz dojść do miejsca decyzji.

## Workflow 7 kroków
1. Otwórz helper i potwierdź jego rolę:
   - `Listing` + `Decompiler`.
   - Zostaw krótki komentarz: "helper I/O", "helper parse", "helper string".
2. Wejdź w `Function Call Graph`:
   - PPM na funkcji helpera -> `Graph` -> `Function Call Graph`.
3. Przełącz perspektywę na callerów:
   - Szukasz kto woła helper (`incoming`), nie kogo helper woła.
4. Odfiltruj szum:
   - Odrzuć wrappery CRT, init, logging, alloc/free.
   - Priorytet dla funkcji z wieloma branchami, switchami, porównaniami flag.
5. Skocz do pierwszego "kandydata domenowego":
   - Otwórz funkcję z grafu.
   - Sprawdź czy łączy kilka helperów i podejmuje decyzje (if/switch na stanie/typie).
6. Powtórz 2-3 poziomy w górę:
   - Jeśli kandydat nadal tylko deleguje, idź do jego callerów.
   - Zatrzymaj się, gdy funkcja:
     - wybiera ścieżkę działania,
     - mapuje typy/statusy,
     - zwraca wynik domenowy lub buduje obiekt domenowy.
7. Oznacz i zabezpiecz wynik:
   - Rename funkcji (safe rename),
   - Dodaj tag np. `DOMAIN_CANDIDATE`,
   - Zapisz 1-2 zdania "dlaczego to domena".

## Heurystyka: helper vs domena
- Helper:
  - 1 odpowiedzialność techniczna,
  - mało warunków,
  - często używany w wielu miejscach.
- Funkcja domenowa:
  - orkiestruje kilka helperów,
  - ma decyzje oparte o stan/flagę/typ,
  - jej wynik wpływa na zachowanie systemu.

## Szybkie skróty w Ghidrze
- `X` na symbolu/funkcji: references (kto używa).
- `Decompiler`: najszybsza walidacja semantyki.
- `Function Call Graph`: orientacja "gdzie jestem w drzewie".
- Bookmark/Tag: żeby nie zgubić ścieżki podczas skoków.

## Minimalny log sesji (polecane)
- Start helper: `sub_...` (adres)
- Caller #1: `sub_...` -> wynik: "wrapper / candidate"
- Caller #2: `sub_...` -> wynik: "domain candidate"
- Dowód: 2-3 cechy decyzji domenowej

## Najczęstsze pułapki
- Mylenie "dużej funkcji" z domenową (duża może być tylko dispatcherem technicznym).
- Skakanie po callees zamiast callers (oddala od domeny).
- Brak notatek i tagów (utrata kontekstu po 20-30 minutach).

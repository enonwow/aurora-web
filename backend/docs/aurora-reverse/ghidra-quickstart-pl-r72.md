# Ghidra Quickstart PL (R72) dla `nwtoolset.exe`

## Cel tej pierwszej sesji (30-45 min)
- Zrobic pierwszy, powtarzalny przebieg analizy `nwtoolset.exe` w Ghidrze.
- Ustawic sesje tak, zeby kolejne eksporty byly stabilne i latwe do ingestu.
- Wyjsc z 3 rzeczami:
  - dzialajacy projekt Ghidry z zakonczonym Auto Analysis,
  - lista funkcji P0 do dalszej dekompilacji,
  - minimalny zestaw artefaktow do dalszej pracy (inventory + callgraph + strings + probka decomp).

## Co przygotowac (2-3 min)
- Plik binarny: `nwtoolset.exe` (wlasciwa wersja do analizy).
- Folder roboczy na eksport (poza repo lub w kontrolowanym miejscu).
- Notatka z identyfikatorem runu, np. `run_20260524T120000Z_r72a01`.

## Plan sesji 30-45 min

### 1) Import i projekt (5 min)
1. Otworz Ghidre i utworz nowy projekt (Non-Shared).
2. Nazwij projekt stabilnie, np. `nwn-ee`.
3. Zaimportuj `nwtoolset.exe`.
4. Sprawdz rozpoznanie formatu (PE), architektury i image base.

Rezultat:
- Program jest widoczny w Project Window i gotowy do analizy.

### 2) Auto Analysis (8-12 min)
1. Otworz program i uruchom `Analyze`.
2. Zostaw ustawienia domyslne na pierwsza sesje.
3. Dopilnuj, zeby analiza doszla do konca (bez przerywania).

Wskazowka:
- Na starcie nie "tuninguj" agresywnie analyzerow; najpierw zlap baseline.

Rezultat:
- Masz pierwsze symbole/funkcje/xref, na ktorych da sie pracowac.

### 3) Szybki rekonesans pod potrzeby projektu (8-10 min)
Skup sie na rodzinach P0:
- `CExoResMan::*`
- `CRes::*`
- `CResGFF::*`
- `CNWSArea::Load*`
- `CNWSPlaceable::Load*` / `CreateFromGff`
- `CNWSCreature::Load*` / `CreateFromGff`
- `CNWSDoor::Load*` / `CreateFromGff`

Kroki:
1. W Symbol Tree / Functions wyszukaj powyzsze nazwy (takze fragmenty, np. `ResGFF`, `LoadArea`).
2. Otworz po 2-3 funkcje z kazdej rodziny i sprawdz:
  - czy dekompilacja jest czytelna,
  - czy xref prowadza do sensownego flow ladowania zasobow.
3. Dodaj bookmarki/tagi dla kandydatow "do eksportu najpierw".

Rezultat:
- Wstepna lista funkcji P0, ktore realnie niosa logike loadera.

### 4) Ograniczanie szumu (5 min)
Na pierwszej sesji stosuj tylko bezpieczne filtry:
- Oznacz jako niski priorytet oczywiste thunki i drobne wrappery.
- Nie usuwaj nic na stale; oznaczaj do `review_required`, jesli nie masz pewnosci.

Heurystyka szybka:
- <= 8 instrukcji + pojedynczy jump/call + natychmiastowy `ret` = zwykle szum.

Rezultat:
- Mniej czasu straconego na funkcje o niskiej wartosci poznawczej.

### 5) Minimalny eksport "Session-1" (7-10 min)
Na koniec wyeksportuj minimalny pakiet roboczy:
1. Function inventory (adres, nazwa, flagi, namespace).
2. Call edges (caller/callee).
3. Strings (z refs).
4. Probka decomp: 10-20 funkcji P0/P1 o najwyzszym sygnale.

Nazewnictwo (R72, zgodne ze standardem projektu):
- lowercase ASCII,
- stabilny `project_slug`, `binary_slug`, `run_id`,
- adresy hex lowercase z `0x`.

Przyklad runu:
- `run_20260524T120000Z_r72a01`

## Checklista "Done" po 45 min
- [ ] `nwtoolset.exe` zaimportowany i przeanalizowany (Auto Analysis complete).
- [ ] Masz liste funkcji P0 (minimum 15-30 kandydatow).
- [ ] Oznaczone podstawowe zrodla szumu (thunki/wrappers) bez agresywnego ukrywania.
- [ ] Wyeksportowany pakiet minimalny: inventory + callgraph + strings + probka decomp.
- [ ] Zanotowany `run_id`, wersja Ghidry i hash binarki do porownan miedzy runami.

## Najczestsze bledy na starcie
- Mieszanie wersji binarki bez nowego `run_id`.
- Eksport bez manifestu/metadanych (pozniej trudny ingest i diff).
- Rczne "naprawianie" setek funkcji przed pierwszym baseline.
- Agresywne ukrywanie funkcji zanim zobaczysz flow P0 end-to-end.

## Co robic zaraz po tej sesji (next step)
1. Zrob drugi przebieg tylko dla hot-path (P0) i podnies jakosc typow sygnatur.
2. Dociagnij decomp dla funkcji krytycznych: `CExoResMan`, `CResGFF`, `CNWSArea::Load*`.
3. Przygotuj paczke pod walidacje kontraktow backendu (deterministyczny ingest i dedup).

# Ghidra Export -> Backend Ticket Template (r73)

## How to use
1. Skopiuj ten szablon do nowego ticketu implementacyjnego.
2. Uzupełnij wszystkie pola oznaczone `<...>`.
3. Nie przenoś hipotez bez dowodów do sekcji `Facts`.
4. Każde kryterium akceptacji musi być testowalne.

---

## Ticket Header
- `Ticket ID`: `<BE-XXXX>`
- `Title`: `<krótki tytuł zmiany backendowej>`
- `Priority`: `<P0|P1|P2|P3>`
- `Owner`: `<zespół/osoba>`
- `Source`: `Ghidra reverse analysis`
- `Related docs`: `<linki do ADR/speców w repo>`
- `Revision`: `r73`

---

## 1) Context

### 1.1 Problem statement
`<1-3 zdania: co obecnie nie działa / czego brakuje po stronie backendu i jaki ma to wpływ>`

### 1.2 Scope
- `In scope`:
  - `<co dokładnie implementujemy>`
  - `<jakie endpointy/serwisy/domeny obejmuje>`
- `Out of scope`:
  - `<czego nie robimy w tym tickecie>`

### 1.3 Business/operational impact
- `<wpływ na użytkownika/system/ops>`
- `<ryzyko jeśli nie wdrożymy>`

### 1.4 Current state in backend
- `Current behavior`: `<jak działa teraz>`
- `Gap vs expected`: `<różnica do zachowania odkrytego przez reverse>`
- `Target behavior`: `<jak ma działać po wdrożeniu>`

### 1.5 Constraints
- `<wydajność, bezpieczeństwo, kompatybilność, migracje, feature flags>`

---

## 2) Evidence

### 2.1 Fact table (reverse -> backend implication)
| ID | Reverse finding (fact) | Source artifact | Confidence | Backend implication |
|---|---|---|---|---|
| F1 | `<bezpośredni fakt z Ghidry>` | `<plik eksportu + funkcja + offset/adres>` | `<High/Medium/Low>` | `<co backend musi zrobić>` |
| F2 | `<...>` | `<...>` | `<...>` | `<...>` |

### 2.2 Evidence details
Dla każdego `F#` podaj:
- `Binary/module`: `<np. nwn2main.exe / plugin dll>`
- `Function(s)`: `<nazwa / symbol / guessed name>`
- `Address range`: `<0x...-0x...>`
- `Decompiler excerpt summary`: `<parafraza logiki, bez kopiowania dużych dumpów>`
- `Control/data flow note`: `<kluczowy warunek, branch, transformacja danych>`
- `Why this is a fact`: `<dlaczego to obserwacja, a nie interpretacja>`

### 2.3 Assumptions and unknowns
- `Assumptions`:
  - A1: `<założenie wymagane do implementacji>`
  - A2: `<...>`
- `Unknowns / open questions`:
  - Q1: `<co wymaga potwierdzenia>`
  - Q2: `<...>`
- `Validation plan for unknowns`:
  - `<jak i gdzie potwierdzimy>`

### 2.4 Traceability links
- `Ghidra export package`: `<ścieżka/artefakt>`
- `Raw scripts output`: `<ścieżka/artefakt>`
- `Crosswalk doc`: `<np. ghidra-backend-crosswalk-r71.md>`
- `Related implementation docs`: `<lista>`

---

## 3) Proposed Backend Change

### 3.1 Design summary
`<krótki opis rozwiązania backendowego>`

### 3.2 Affected components
- `<moduł A>`: `<zmiana>`
- `<moduł B>`: `<zmiana>`
- `<API/DTO/schema>`: `<zmiana kontraktu>`

### 3.3 Data and compatibility
- `Schema changes`: `<tak/nie + szczegóły migracji>`
- `Backward compatibility`: `<jak zapewniamy / co łamiemy>`
- `Feature flag`: `<nazwa i strategia rolloutu lub N/A>`

### 3.4 Security and reliability
- `<walidacje wejścia>`
- `<autoryzacja / boundary checks>`
- `<observability: logi, metryki, alerty>`

---

## 4) Acceptance

### 4.1 Functional acceptance criteria
- [ ] `AC1`: `<warunek funkcjonalny, mierzalny>`
- [ ] `AC2`: `<warunek funkcjonalny, mierzalny>`
- [ ] `AC3`: `<obsługa błędów/edge case>`

### 4.2 Evidence-to-acceptance mapping
| Fact ID | Acceptance criterion | Verification method |
|---|---|---|
| F1 | `<AC#>` | `<test jednostkowy/integracyjny/e2e + nazwa>` |
| F2 | `<AC#>` | `<...>` |

### 4.3 Non-functional acceptance criteria
- [ ] `NFR1 Performance`: `<np. p95 <= X ms przy Y danych>`
- [ ] `NFR2 Security`: `<np. brak path traversal, poprawne authz>`
- [ ] `NFR3 Observability`: `<metryka/log/trace dostępne i opisane>`

### 4.4 Test plan (must pass)
- [ ] `Unit tests`: `<lista przypadków>`
- [ ] `Integration tests`: `<lista przypadków>`
- [ ] `Regression tests`: `<co zabezpieczamy przed regresją>`
- [ ] `Negative tests`: `<błędne inputy i oczekiwane kody>`

### 4.5 Definition of done
- [ ] Implementacja zmergowana
- [ ] Testy zielone w CI
- [ ] Dokumentacja zaktualizowana
- [ ] Link do evidence dodany w PR
- [ ] Brak otwartych `High` unknowns blokujących release

---

## 5) Implementation Checklist (for assignee)
- [ ] Potwierdź, że każdy `Fact` ma źródło (adres/funkcja/artefakt)
- [ ] Oznacz każde twierdzenie jako `Fact` albo `Assumption`
- [ ] Zamień każde `Assumption` krytyczne na zadanie walidacyjne
- [ ] Dodaj testy mapujące `Fact -> AC`
- [ ] Dodaj notkę o ryzykach i rollback plan

---

## 6) Risks and rollback
- `Top risks`:
  - R1: `<ryzyko>`
  - R2: `<ryzyko>`
- `Mitigations`:
  - M1: `<mitigacja>`
- `Rollback strategy`:
  - `<jak wyłączyć/wycofać zmianę>`

---

## 7) Ticket Ready Check
- [ ] Sekcja `Context` kompletna i jednoznaczna
- [ ] Sekcja `Evidence` oparta na artefaktach, nie opinii
- [ ] Sekcja `Acceptance` w pełni testowalna
- [ ] Zidentyfikowane zależności między zespołami
- [ ] Priorytet i owner potwierdzeni

---

## Short Example (mini)

### Context (mini)
`Parser backendu nie respektuje warunku granicznego X, przez co rekordy typu Y są odrzucane. Reverse wskazuje, że logika referencyjna dopuszcza Y przy fladze Z.`

### Evidence (mini)
- `F1`: Funkcja `<sub_...>` w `<module>` na `<0x...>` wykonuje `<warunek>` przed `<akcja>`.
- `Implication`: Backend powinien dopuścić Y, gdy Z=true.

### Acceptance (mini)
- [ ] Dla wejścia `Y` + `Z=true` endpoint zwraca `200` i zapisuje rekord.
- [ ] Dla `Y` + `Z=false` endpoint zwraca `422` z kodem błędu `<ERR_...>`.
- [ ] Testy integracyjne pokrywają oba branche.

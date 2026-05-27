# Agent C13: XREF Drill Exercises (R76)

Cel: 8 krotkich cwiczen dla poczatkujacego w formule: znajdz XREF -> wyjasnij role funkcji.

## Zasada odpowiedzi (dla kazdego cwiczenia)
- Podaj: `funkcja`, `1-2 kluczowe XREF`, `rola funkcji (max 2 zdania)`, `poziom pewnosci (Low/Med/High)`.

## Cwiczenia

1. `Find string -> XREF`: Wyszukaj string `LinkedToFlags`, przejdz do funkcji referujacej ten string i opisz, czy funkcja bardziej czyta flage, waliduje ja, czy zapisuje.
2. `Find string -> XREF`: Wyszukaj `LoadScreenID` (oraz wariant `LoadScreenId`), otworz XREF i wyjasnij role funkcji wzgledem ladowania metadanych obszaru.
3. `Find import -> XREF`: Znajdz import `GetTopLevelStruct`, przejdz po XREF do callerow i opisz, czy funkcja jest parserem glownych struktur danych.
4. `Find import -> XREF`: Znajdz `GetStructByIndex`, sprawdz co jest robione z indeksem po wywolaniu i wyjasnij, czy rola funkcji to iteracja po rekordach.
5. `Find import -> XREF`: Znajdz `GetResObject`, sprawdz XREF i opisz, czy funkcja odpowiada za pobranie zasobu, czy dalsze przetwarzanie juz pobranych danych.
6. `Find import -> XREF`: Znajdz `Exists`, przejdz do 2-3 miejsc wywolan i wyjasnij, czy funkcja pelni role checka warunkowego przed operacja krytyczna.
7. `Find string -> XREF`: Wyszukaj `Mod_CustomTlk`, sprawdz XREF i opisz, czy funkcja dotyczy konfiguracji modulu, czy samego runtime-ladowania.
8. `Find string -> XREF`: Wyszukaj `TransitionDestination` (i skrocony wariant `TransitionDestin`), przejdz po XREF i wyjasnij role funkcji w logice przejsc drzwi/triggerow.

## Mini-checklista dla poczatkujacego
- Czy wybrany XREF to odczyt, zapis, czy tylko przekazanie dalej?
- Czy funkcja ma wielu callerow (fan-in), czy jest waskim helperem?
- Czy rola wynika z jednego dowodu, czy z co najmniej dwoch (np. string + API call)?

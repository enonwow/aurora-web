# aurora-web — błędy w implementacji obszarów (area)

**Data:** 2026-06-26
**Zakres:** moduł `areas` (backend parser GFF + repozytorium + frontend scene mapper)
**Metoda:** przegląd kodu linia-po-linii, weryfikacja względem testów jednostkowych modułu

Każdy wpis: lokalizacja → opis → skutek → severity. Severity oznacza realny wpływ, nie pewność (pewność opisana w treści).

---

## Błędy potwierdzone

### 1. DWORD czytany jako liczba ze znakiem (`| 0` zamiast `>>> 0`)
`aurora-gff-area-parser.ts:281-283`

```ts
if (field.typeId === FIELD_TYPE.DWORD || field.typeId === FIELD_TYPE.INT) {
  return field.dataOrOffset | 0;   // <-- DWORD jest bez znaku
}
```

`| 0` reinterpretuje 32-bitową wartość jako `int32`. Każde pole **DWORD** z ustawionym bitem 31 (≥ 2 147 483 648) staje się ujemne. Dalej `clampNonNegative` / `normalizeListNumber(Math.max(0,…))` zeruje je → **cicha utrata danych**.

**Potwierdzenie:** buildery w testach zapisują DWORD jako `value >>> 0` (unsigned) — `aurora-gff-area-parser.internals.spec.ts:177`, a parser odczytuje jako signed. Asymetria zapis/odczyt. Testy przechodzą tylko dlatego, że używają małych wartości.

**Fix:** DWORD → `field.dataOrOffset >>> 0`; INT zostaw `| 0`. Rozdziel oba przypadki.
**Severity: średni.**

---

### 2. Lista znanych zaklęć Maga (Wizard) pomijana
`aurora-gff-area-parser.ts:858`

```ts
const shouldReadKnownSpells = classId === 1 || classId === 9;
```

Magiczne ID klas bez odwołania do `classes.2da`: 1 = Bard, 9 = Sorcerer. **Brakuje 10 = Wizard**, który również ma księgę zaklęć zapisaną jako `KnownList0..9`. Dla stworzeń osadzonych w `.git` księga maga przepada (zaklęcia zapamiętane `memorizedList` są czytane dla wszystkich klas, więc znika tylko „known").

**Fix:** dodać `classId === 10`, a najlepiej sterować tym z danych klasy (`SpellKnownTable`/typ rzucania), nie hardkodem.
**Severity: średni** (jeśli gating jest celowy tylko dla spontanicznych — i tak gubi spellbook maga).

---

### 3. Niespójne i błędne granice wymiarów obszaru
`module-snapshot-area.repository.ts:687-688` vs `:694-697` vs `areas.schemas.ts:23-24`

```ts
width:  clamp(parsedWidth, 1, 256),   // ścieżka z parsowanych wymiarów
height: clamp(parsedHeight, 1, 256),
...
const base = clamp(Math.round(Math.sqrt(tileCount)), 8, 64);   // ścieżka fallback
height: clamp(Math.ceil(tileCount / base), 8, 64),
```

Trzy różne zakresy w jednym module: **1–256**, **8–64**, oraz **16–128** (schemat HTTP). Żaden nie odpowiada realnemu limitowi NWN (**1–32 kafle**). Skutki:
- uszkodzony/wrogi `.are` z ogromnym `width` (np. po błędzie #1) jest akceptowany aż do 256 i steruje rozmiarem siatki oraz atlasu tekstur;
- fallback wymusza min. 8 — maleńki obszar (kilka kafli) dostaje sztucznie 8×8.

**Fix:** jeden wspólny limit zgodny z NWN (1–32) przy granicy parsowania; ujednolicić ze schematem.
**Severity: średni.**

---

### 4. Łańcuchy CExoString/CExoLocString dekodowane jako UTF-8
`aurora-gff-area-parser.ts:1447` i `:1494`

```ts
return sanitizeUtf8(bytes.subarray(...).toString("utf-8"));
```

Klasyczny GFF NWN (1.69) koduje `CExoString` w **CP-1252** (jednobajtowo). Dekodowanie tych bajtów jako UTF-8 **psuje znaki ≥ 0x80** (akcenty, `™`, znaki diakrytyczne w nazwach/komentarzach). Testy zakładają UTF-8 (`internals.spec.ts:42` „Zażółć" zapisane `Buffer.from(..., "utf-8")`), więc treści klasyczne zawiodą po cichu.

**Fix:** dekodować wg deklarowanej strony kodowej (CP-1252 dla treści 1.69; UTF-8 tylko gdy źródło EE jest UTF-8). Wykryć/skonfigurować kodowanie wejścia.
**Severity: średni — warunkowy** (zależny od kodowania źródłowych modułów). `ResRef` używa ASCII i jest bezpieczny.

---

## Błędy lżejsze / utrata wierności danych

### 5. `normalizeAuroraSpellFlags` wymusza bit runtime
`aurora-gff-area-parser.ts:1046` — `return source | AURORA_SPELL_FLAGS_RUNTIME_BIT;` (zawsze ustawia bit 0). Wstrzykuje flagę, której nie było w źródle → uniemożliwia wierny round-trip i porównanie. **Niski.**

### 6. Ciche docinanie wartości dźwięku
`:1119-1122` (`maxVolumeDistance` ≤ `cutoffDistance`) oraz `:1138-1141` (`intervalVariationMs` ≤ `intervalMs`). Gdy źródło ma min > max, wartość jest po cichu nadpisywana — utrata oryginału bez ostrzeżenia. **Niski.**

### 7. Siatka kafli liczona tylko z `width`, bez `height`
`:417-428` — `row = floor(index/width)`, `col = index%width`. Gdy `width` brak/0 → `gridWidth=0` → wszystkie kafle trafiają do `row 0`, `col = index`. Brak kontroli `tileCount == width*height`. **Niski/edge.**

### 8. CExoLocString: ignorowane ID języka + nierozwiązany strRef
`:1482-1505` — pętla pomija 4-bajtowe ID języka (`cursor += 4`) i bierze pierwszy niepusty wpis jako `.text`. Dla wielojęzycznych pól może wybrać zły język. Nazwy odwołujące się do TLK (`strRef`, bez podłańcuchów) zwracają `""` → nazwa znika. **Niski.**

### 9. Dwa źródła prawdy dla row/col
Parser liczy `tile.row/col` z **surowego** `width` (`:424`), a repozytorium liczy wyświetlane `width/height` z **dociętych** wymiarów (`:687`). Przy nietypowym `width` współrzędne kafli i deklarowany rozmiar siatki mogą się rozjechać. **Niski.**

---

## Uwaga: to NIE są błędy (sprawdzone)

- **Slot ekwipunku z `struct.typeId`** (`:1014`) — poprawne; w `EquipItemList` NWN ID struktury koduje slot.
- **`normalizeLabel` usuwa spacje** — celowe i poprawne; rozwiązuje niespójne etykiety `"Door List"` vs `"SoundList"`.
- **Odczyt FLOAT przez bufor inline** (`:284-287`) — poprawny.
- **`resolveStructFieldIndices` dla `fieldCount === 1`** (`:1414`) — zgodne ze specyfikacją GFF.

---

## Priorytet napraw

1. **#1 (DWORD signed)** — najprostszy fix, realna cicha korupcja liczb.
2. **#3 (granice wymiarów)** — ujednolicić do 1–32; chroni przed #1 i wejściem wrogim.
3. **#4 (kodowanie)** — zależnie od tego, czy w pipeline są treści klasyczne (1.69).
4. **#2 (spellbook maga)** — jeśli stworzenia z `.git` mają mieć pełne dane klas.
5. Reszta (#5–#9) — porządki wierności danych przy okazji dodawania zapisu/round-tripu.

---

*Lokalizacje wskazują plik:linia w stanie repo z 2026-06-26. Severity = wpływ; poziom pewności opisany w treści każdego punktu.*

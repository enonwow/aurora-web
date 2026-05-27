# Ghidra Function Tagging Convention (R73, Agent C10)

Data: 2026-05-24
Status: Draft
Zakres: konwencja tagowania i komentowania funkcji w Ghidrze dla workflow Aurora Reverse, kompatybilna z backend mapping (R71/R72).

## 1. Cel

Konwencja definiuje:
- prefixy nazw roboczych funkcji,
- skale confidence,
- domain labels zgodne z backend mapping,
- szablon komentarza funkcji do deterministycznego ingestu notatek.

Cel operacyjny: kazda recznie oznaczona funkcja ma miec jednoznaczny routing do domen backendu i powtarzalny poziom pewnosci.

## 2. Domain Labels (kanoniczne)

Kanoniczne etykiety domenowe (SSOT) sa zgodne z `ghidra-backend-crosswalk-r71.md`:
- `runtime-settings`
- `source-resolver`
- `processing-jobs`
- `security`

Dodatkowa etykieta pomocnicza (lane analityczny) zgodna z `ghidra-export-to-backend-actions-r72.md`:
- `benchmark`

Reguly:
1. Kazda funkcja MUST miec `primary_domain`.
2. Funkcja MAY miec `secondary_domains` (0..2 zalecane, max 3).
3. Jesli funkcja dotyka ACL/sekretow/integrity/audytu, `security` MUST byc `primary_domain`.
4. `benchmark` NIE zastepuje `primary_domain`; wystepuje tylko jako dodatkowy `lane_label`.

## 3. Prefixy nazw roboczych funkcji

Prefix jest dodawany do nazwy roboczej funkcji w Ghidrze po recznej klasyfikacji.

Format:
`<dpfx>_<hint>__<entryva>`

Gdzie:
- `<dpfx>`: prefix domeny (tabela ponizej),
- `<hint>`: krotki slug roli funkcji (`load_area`, `verify_acl`, `stage_manifest`),
- `<entryva>`: adres wejscia hex lowercase bez `0x`.

Przyklad:
`sr_load_area__1403fa120`

Tabela prefixow:
- `rs` -> `runtime-settings`
- `sr` -> `source-resolver`
- `pj` -> `processing-jobs`
- `sec` -> `security`
- `bm` -> `benchmark` (tylko gdy funkcja jest glownie metryczna/telemetryczna)

Reguly dodatkowe:
1. Jesli confidence < C2, NIE zmieniaj nazwy funkcji; dodaj tylko tag/komentarz.
2. Jesli funkcja ma charakter cross-domain, prefix wyznacza zawsze `primary_domain`.
3. Nazwy robocze MUST byc lowercase ASCII i uzywac `_` jako separatora.

## 4. Confidence Scale

Skala kanoniczna:
- `C0` (Unknown): brak danych; tylko sygnal heurystyczny.
- `C1` (Low): slaby dowod (np. pojedynczy string/import, bez potwierdzonego dataflow).
- `C2` (Medium): umiarkowany dowod (>=2 niezalezne sygnaly: xref + decomp, albo import + callgraph).
- `C3` (High): mocny dowod (source-path-sink lub jednoznaczna semantyka runtime potwierdzona w ASM + decomp).
- `C4` (Verified): potwierdzenie reczne + zgodnosc z mappingiem backendowym i brak krytycznych watpliwosci.

Mapowanie pomocnicze (dla starszych notatek):
- `Low` -> `C1`
- `Medium` -> `C2`
- `High` -> `C3`
- `Verified` -> `C4`

Gate operacyjny:
1. Rename z prefixem: od `C2` wzwyz.
2. Tag `P0-VERIFIED`: tylko przy `C3` lub `C4`.
3. Routing automatyczny do zadan implementacyjnych backendu: preferowane `C3+`.

## 5. Tag Set (Function Tags w Ghidrze)

Kazda funkcja oznaczona przez C10 powinna miec minimalny zestaw tagow:
- `aurora.domain.<primary>`
- `aurora.confidence.Cx`
- `aurora.priority.P0|P1|P2` (jesli dotyczy)

Tagi opcjonalne:
- `aurora.domain2.<secondary>` (powtarzalne)
- `aurora.lane.benchmark`
- `aurora.state.candidate|verified|needs-dataflow|noise-review`
- `aurora.risk.rce|auth|integrity|secrets|dos` (dla security-driven hunts)

Przyklad kompletu tagow:
- `aurora.domain.source-resolver`
- `aurora.domain2.processing-jobs`
- `aurora.confidence.C3`
- `aurora.priority.P0`
- `aurora.state.verified`

## 6. Szablon komentarza funkcji (plate)

Komentarz funkcji (Function Comment) MUST byc w formacie klucz=wartosc, 1 pole na linie:

```text
aurora.tagging_version=r73
aurora.fn.entry_va=0x1403fa120
aurora.fn.name=sr_load_area__1403fa120
aurora.domain.primary=source-resolver
aurora.domain.secondary=processing-jobs
aurora.lane=resolver
aurora.confidence=C3
aurora.priority=P0
aurora.state=verified
aurora.evidence.imports=CResGFF::GetTopLevelStruct
aurora.evidence.strings=area|git|load
aurora.evidence.xrefs=12
aurora.backend.action=resolver.upsertFunctionCatalog
aurora.notes=Centralny orchestrator ladowania area.
```

Reguly wypelniania:
1. `aurora.domain.secondary` pomijaj, jesli puste.
2. `aurora.lane` mapuj do: `resolver|settings|jobs|security|benchmark`.
3. `aurora.backend.action` SHOULD wskazywac najbardziej pasujaca akcje z R72.
4. `aurora.notes` krotko (1 zdanie), bez danych wrazliwych.

## 7. Mapowanie domain -> backend lane

Mapowanie domyslne:
- `runtime-settings` -> `settings`
- `source-resolver` -> `resolver`
- `processing-jobs` -> `jobs`
- `security` -> `security`

Wyjatek:
- Funkcja telemetryczna/monitoringowa moze dodac `lane=benchmark` (bez zmiany `primary_domain`).

## 8. Reguly decyzyjne dla `primary_domain`

1. `security` wygrywa, gdy funkcja implementuje authz/authn, integrity checks, ACL, maskowanie, audyt lub handling sekretow.
2. `processing-jobs` wygrywa, gdy funkcja steruje lifecycle joba (`queued/running/completed/failed`), retry, leasing, stage transitions.
3. `source-resolver` wygrywa, gdy funkcja mapuje symbole, typy, xrefs, decomp, import/export, grafy zaleznosci.
4. `runtime-settings` wygrywa, gdy funkcja parsuje/waliduje/aplikuje konfiguracje runtime i profile analyzera.

## 9. Workflow C10 (krotki)

1. Nadaj `primary_domain` + ewentualne `secondary_domains`.
2. Ocen confidence `C0..C4`.
3. Dodaj minimalny tag set.
4. Jesli `C2+`, wykonaj rename z prefixem domenowym.
5. Wypelnij komentarz plate (`aurora.*`).
6. Jesli `C3+` i `P0/P1`, dopnij `aurora.backend.action` pod mapping R72.

## 10. Anti-noise i jakosc

1. Dla funkcji oznaczonych `noise_*` (R71) stosuj max `C1`, dopoki nie ma kontr-dowodu.
2. Nie podbijaj confidence na podstawie samej nazwy symbolu.
3. Kazde `C3+` SHOULD miec co najmniej dwa rodzaje dowodu (`imports/strings/xrefs/decomp/asm`).
4. Dla sporow klasyfikacyjnych preferuj `secondary_domains` zamiast nadpisywania `primary_domain` bez dowodu.

## 11. Minimalny DoD wpisu funkcji

Wpis uznaje sie za gotowy, gdy funkcja ma:
1. co najmniej 3 tagi minimalne (`domain`, `confidence`, `state` lub `priority`),
2. komentarz `aurora.*` z `entry_va`, `domain.primary`, `confidence`,
3. rename z prefixem, jesli confidence `C2+`.

## 12. Przyklad end-to-end

Funkcja: dawniej `FUN_1403fa120`

Po klasyfikacji:
- Nazwa: `sr_load_area__1403fa120`
- Tagi:
  - `aurora.domain.source-resolver`
  - `aurora.domain2.processing-jobs`
  - `aurora.confidence.C3`
  - `aurora.priority.P0`
  - `aurora.state.verified`
- Komentarz: wg szablonu z sekcji 6.

Efekt backendowy: jednoznaczny routing do lane `resolver`, z czytelnym kontekstem zaleznosci `jobs`.

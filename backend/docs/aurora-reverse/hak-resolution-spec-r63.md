# HAK Resolution Spec r63 (Agent J1)

Data: 2026-05-24
Zakres: strategia rozwiazywania zasobow przy wielu katalogach HAK, oparta o reverse z `C:\Projects\nwn-last-city\Aurora\reverse`.

## 1. Cel

Zdefiniowac deterministyczna i audytowalna strategie:
- kolejnosci (priority/precedence),
- obslugi kolizji nazw,
- obslugi brakujacych zasobow,
- telemetryki dla diagnostyki konfliktow modul/HAK/base.

## 2. Dowody reverse (hard anchors)

- Globalna inicjalizacja zasobow NWN i priorytety: `xoreos/src/engines/nwn/nwn.cpp:215-268`.
- Ladowanie modulu i module HAK: `xoreos/src/engines/nwn/module.cpp:157,169,178,597-605`.
- Walidacja wymaganych HAK: `xoreos/src/engines/nwn/module.cpp:214-215`.
- Budowa listy HAK z IFO (`Mod_HakList` + `Mod_Hak`): `xoreos/src/aurora/ifofile.cpp:144-154`.
- Zasada priorytetu i winner selection: `xoreos/src/aurora/resman.cpp:105,985,1020,1023`.
- Ostrzezenie o hash collision: `xoreos/src/aurora/resman.cpp:917`.
- Optional archive/dir skip (brak wyjatku): `xoreos/src/engines/aurora/resources.cpp:75,139`.
- Audytowy gap telemetryczny first-match-wins i pojedynczego source_set:
  `docs/Areas3D-Audits/AREAS3D_RE_TILE_TILESET_AUDYT_2026-05-18.md` (sekcja 2, P2).

## 3. Strategia kolejnosci (precedence)

### 3.1 Globalny indeks runtime

Resolver pracuje na liczbowym `priority` (wieksza wartosc = wyzszy priorytet).

Warstwy bazowe NWN (wg reverse):
1. `registerDataBase(...)` -> baza na priorytecie `1`.
2. Dodatkowe katalogi (`data`, `nwm`, `modules`, `hak`, `texturepacks`) -> `2..6`.
3. KEY i patche (`chitin.key`, `patch.key`, `xp*.key`) -> `10..17`.
4. GUI archiwa -> `50..52`.
5. Media/dodatki runtime -> `100+`.
6. `override` -> `500`.

### 3.2 Warstwa modulowa (najwazniejsza dla HAK)

Podczas ladowania modulu:
1. Plik modulu (`.mod/.nwm`) indeksowany z priorytetem `1000`.
2. Premium main HAK (jesli dotyczy) ladowany z `1001`.
3. HAK-i z IFO ladowane jako `1002 + i`.

Wniosek: module HAK zawsze przebijaja `override (500)` i base KEY/BIF.

### 3.3 Kolejnosc HAK wewnatrz IFO

IFO parser buduje `_haks` przez `insert(begin, ...)` dla `Mod_HakList` i fallback `Mod_Hak`.
Efekt:
- `Mod_HakList` jest odwracane podczas odczytu,
- potem `loadHAKs()` nadaje rosnace priorytety `1002 + i`,
- finalnie najwyzszy priorytet dostaje wpis logicznie najwczesniejszy z `Mod_HakList`.

To zachowuje semantyke "pierwszy na liscie HAK jest najsilniejszy".

## 4. Kolizje nazw

### 4.1 Kolizja nazwy archiwum HAK miedzy katalogami

`findArchive(...)` przechodzi `KnownArchives` sekwencyjnie i bierze pierwszy `endsWith(file)` match
(`xoreos/src/aurora/resman.cpp:277-283`).

Skutek:
- jesli ten sam plik, np. `foo.hak`, istnieje w wielu katalogach HAK,
- wygra pierwszy zaindeksowany archive path (niekoniecznie ten "nowszy"),
- jest to precedencja po kolejnosci indeksowania katalogow archiwow.

Wymaganie r63:
- utrzymac deterministyczna kolejnosc katalogow HAK (konfig jawna, bez autodetekcji losowej),
- logowac sytuacje `same_archive_name_multiple_paths`.

### 4.2 Kolizja zasobu (ten sam resref+type)

Wszystkie kandydaty trafiaja do listy pod tym samym hashem; lista jest sortowana po `priority`
(`operator<` + `sort()`).
Resolver zwraca `back()` (najwyzszy priorytet) i ignoruje wpisy o `priority=0`.

Wymaganie r63:
- winner = najwyzszy `priority`,
- przy remisie priorytetu winner = ostatnio zaindeksowany (stabilny porzadek po indeksacji),
- blacklist ustawia `priority=0` i calkowicie wycina kandydat z wyniku.

### 4.3 Hash collision (rozne nazwy, ten sam hash)

Runtime emituje warning `Found hash collision` (resman.cpp:917), ale nadal trzyma wpisy
w tym samym bucket.

Wymaganie r63:
- traktowac to jako zdarzenie telemetryczne o wysokim priorytecie,
- dodac licznik i probe nazw kolidujacych.

## 5. Brakujace zasoby

### 5.1 Brakujace HAK wymagane przez modul

`checkHAKs()` rzuca wyjatek `Required hak "%s" does not exist`.
To jest blad krytyczny i powinien zatrzymac ladowanie modulu.

### 5.2 Brakujace optional archive/dir

`indexOptionalArchive` i `indexOptionalDirectory` zwracaja `false` bez wyjatku, jesli zrodla nie ma.
To jest degradacja kontrolowana.

### 5.3 Brakujacy pojedynczy zasob podczas read

`getResource(...)` zwraca `0` dla miss (null stream), a decyzja co dalej nalezy do call-site.

Wymaganie r63:
- utrzymac podzial na `hard-fail` (required) vs `soft-miss` (optional/read),
- zawsze publikowac telemetrycznie typ missa i kontekst (`module`, `hak`, `resref`, `type`).

## 6. Telemetryka r63 (wymagana)

### 6.1 Eventy

1. `hak_archive_discovered`
- pola: `archive_name`, `archive_path`, `source_dir`, `priority_band`.

2. `hak_archive_name_collision`
- pola: `archive_name`, `all_paths[]`, `selected_path`, `selection_reason`.

3. `resource_resolve_hit`
- pola: `request_resref`, `request_type`, `winner_path_or_archive`, `winner_priority`, `winner_layer`.

4. `resource_resolve_miss`
- pola: `request_resref`, `request_type`, `required(bool)`, `stage(global|module|runtime_read)`.

5. `resource_resolve_candidates` (debug/on-demand)
- pola: `request_resref`, `request_type`, `candidates[]` (path, priority, layer, blacklisted).

6. `resource_hash_collision`
- pola: `hash`, `name_a`, `name_b`.

7. `module_required_hak_missing`
- pola: `module_name`, `hak_name`.

### 6.2 Metryki agregowane

- `hak_collision_count`
- `resource_miss_count`
- `required_hak_missing_count`
- `hash_collision_count`
- `resolve_from_layer_count{module,module_hak,override,key_bif,other}`

### 6.3 Powod telemetryki

Audyty reverse wskazaly, ze first-match-wins bez listy kandydatow utrudnia diagnoze konfliktow
(module/hak/vanilla). r63 zamyka ten gap przez event `resource_resolve_candidates`.

## 7. Kontrakt implementacyjny (backend)

1. Resolver MUSI byc deterministyczny: ten sam input -> ten sam winner.
2. Kolejnosc warstw MUSI respektowac priorytet liczbowy zgodny z reverse.
3. Module HAK MUSZA miec precedence nad `override` i base KEY/BIF.
4. Kolizje nazwy archiwum miedzy katalogami HAK MUSZA byc wykrywane i raportowane.
5. Brak required HAK MUSI konczyc ladowanie modulu bledem krytycznym.
6. Miss optional/read NIE powinien crashowac procesu, ale MUSI zostawic slady telemetryczne.
7. API debug resolvera POWINNO udostepniac pelna liste kandydatow (nie tylko winner).

## 8. Pseudokod

```text
resolve(resref, type, required):
  candidates = lookup_all_candidates(resref, type)
  candidates = filter(priority > 0)
  sort(candidates, by=priority_asc, stable=true)

  if empty(candidates):
    emit resource_resolve_miss(...)
    if required: fail
    return null

  winner = last(candidates)
  emit resource_resolve_hit(... winner ...)
  if debug: emit resource_resolve_candidates(...)
  return winner
```

To jest strategia referencyjna r63 dla J1.

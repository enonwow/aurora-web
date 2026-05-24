# Ghidra Strings Search Set (r74)

Data: 2026-05-24
Rola: Agent D11 (Strings Search Set)
Zakres: finalny zestaw fraz do `Search -> Strings` dla Aurory, z priorytetami `P0/P1` i interpretacja trafien.

## 1. Zasady uzycia w Ghidrze

1. Najpierw uruchom `Search -> For Strings...` i filtruj po frazach z listy `P0`.
2. Dla kazdego trafienia wykonaj `Show References To` i oceniaj tylko miejsca z realnymi `xrefs` do kodu.
3. Trafienia bez `xrefs` albo tylko w zasobach statycznych traktuj jako niski sygnal.
4. Po zamknieciu `P0` uruchom liste `P1` dla domkniecia semantyki i kompatybilnosci.

## 2. Lista P0 (must-check first)

Frazy ponizej sa posortowane od najwyzszego sygnalu Aurora-domain do sygnalu diagnostycznego.

```text
LinkedToFlags
LinkedTo
LoadScreenID
LoadScreenId
TransitionDestin
TransitionDestination
LinkedToModule
getFirstObjectByTag
Mod_HakList
Mod_Hak
Mod_CustomTlk
CExoResMan
GetResObject
Demand
Release
Exists
CResGFF
GetTopLevelStruct
GetStructByIndex
appearance.2da
placeables.2da
ambientsound.2da
dialog
dialogf
SOURCE_LAYER_BLOCKED
SOURCE_RESOLVE_MISS
SOURCE_TIEBREAK_APPLIED
SOURCE_POLICY_VIOLATION
P0_MISSING_SOURCE
P0_ROW_MISSING
```

## 3. Lista P1 (follow-up / completeness)

```text
gender.2da
racialtypes.2da
phenotype.2da
portraits.2da
placeableobjsnds.2da
tiles.2da
metatiles.2da
loadscreens.2da
AmbientSndDayVol
AmbientSndNitVol
AmbientSndNightVol
custom
customf
SOURCE_RESTYPE_ALIAS_NORMALIZED
SOURCE_CASE_ALIAS_IGNORED
SOURCE_HASH_COLLISION_WARNING
SOURCE_DUPLICATE_BASENAME
P1_UNRESOLVED_REFERENCE
P1_TLK_UNRESOLVED
```

## 4. Interpretacja trafien (operacyjna)

## 4.1 Szybkie reguly decyzji

1. Fraza ma `xrefs` do parsera/loadera + wystepuje obok odczytu GFF/2DA/TLK:
- interpretacja: realna logika runtime lub ingest,
- akcja: oznacz `P0-CANDIDATE`, przejdz do callgraph i dataflow.

2. Fraza wystepuje tylko w komunikatach logowania/diagnostyki (format string, logger, assert):
- interpretacja: sygnal pomocniczy, nie dowod sciezki wykonania,
- akcja: oznacz `P1` lub `review_required`, szukaj powiazanych callerow.

3. Fraza bez `xrefs` albo tylko w tabeli statycznej:
- interpretacja: mozliwy martwy string lub artifact builda,
- akcja: nie eskaluj bez dodatkowego dowodu.

4. Ta sama funkcja referuje pary aliasowe (`LoadScreenID` + `LoadScreenId`, `TransitionDestin` + `TransitionDestination`):
- interpretacja: prawdopodobna normalizacja aliasow (`last-wins` / canonicalization),
- akcja: potwierdz kolejnosc przypisan i branch konfliktu.

## 4.2 Interpretacja klastrami P0

1. Klastr `LinkedTo*`, `Transition*`, `LoadScreen*`:
- sygnal: parser i walidacja danych przejsc drzwi/trigger,
- priorytet: bardzo wysoki (Aurora transition contract),
- czego szukac w kodzie: parse int/string, zakresy domen (`byte/word`), brak/obecnosc bindu runtime.

2. Klastr `Mod_HakList`, `Mod_Hak`, `Mod_CustomTlk`, `dialog/dialogf`:
- sygnal: fallback chain i precedence resolvera zrodel,
- priorytet: bardzo wysoki,
- czego szukac: kolejnosc warstw (`module -> hak -> vanilla`), tie-break, provenance.

3. Klastr `CExoResMan`, `GetResObject`, `Demand`, `CResGFF*`:
- sygnal: rdzen resource loading i wejscie do parsera obiektow,
- priorytet: bardzo wysoki,
- czego szukac: lifecycle zasobu (acquire/release), handoff do GFF, error path.

4. Klastr `SOURCE_*`, `P0_*`:
- sygnal: mapowanie na kontrakty diagnostyczne backendu,
- priorytet: wysoki dla crosswalk RE -> backend,
- czego szukac: miejsce emisji kodu bledu i warunki jego zaplonu.

## 4.3 Interpretacja klastrami P1

1. Klastr `*.2da` (`gender/racialtypes/phenotype/portraits/tiles/metatiles/placeableobjsnds`):
- sygnal: enrichment i pelnia semantyki obiektow,
- akcja: domykac po stabilizacji P0 (soft-fail pathways).

2. Klastr `AmbientSnd*`:
- sygnal: alias policy cross-profile (`NitVol` vs `NightVol`),
- akcja: sprawdzic branch rozjazdu kluczy i jawne warningi alias mismatch.

3. Klastr `P1_*` i alias/collision diagnostics:
- sygnal: jakosc resolvera i determinism,
- akcja: korelowac z edge-case pathami, nie traktowac jako krytyczny sink bez dodatkowego source-path-sink.

## 5. Kryterium eskalacji trafienia do P0-VERIFIED

Trafienie eskaluj do `P0-VERIFIED` tylko gdy jednoczesnie masz:
1. source: kontrolowalne wejscie (plik/modul/hak/input parsera),
2. path: potwierdzony przeplyw przez funkcje z trafieniem,
3. sink/impact: efekt krytyczny (resolve winner, parse transition, runtime bind, hard-fail policy).

Bez kompletnego lancucha source-path-sink zostaw tag `NEEDS-DATAFLOW`.

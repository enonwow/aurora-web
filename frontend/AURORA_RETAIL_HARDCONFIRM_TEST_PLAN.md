# Aurora Retail Hard-Confirm Test Plan

Date snapshot: 2026-05-24  
Scope: 15 scenariuszy A/B do potwierdzenia semantyk retail przed zamykaniem `RetailConfirm`.

## Global Test Notes
1. Kazdy scenariusz musi wygenerowac artifacty wskazane w sekcji `Artifacts`.
2. `Pass/Fail` jest binarny: brak pelnego kompletu artifactow = `Fail`.
3. Wariant `A` i `B` musza byc wykonane na tej samej wersji buildu i na tym samym zestawie fixture.

---

## RHC-01 Bearing Dial Wrap / Snap
- Preconditions:
  - Build z aktywnym `Adjust Location`.
  - Fixture z co najmniej 1 placeable.
- Steps A:
  - Ustaw `Bearing=359`, wykonaj rotacje dialem o maly dodatni delta.
- Expected A:
  - Wrap do zakresu retail (bez skoku nielogicznego).
- Steps B:
  - Ustaw `Bearing=1`, wykonaj rotacje dialem o maly ujemny delta.
- Expected B:
  - Symetryczny wrap po drugiej stronie zakresu.
- Artifacts:
  - Nagranie ekranu A/B.
  - Zrzut payload przed/po.
  - Log obliczonego bearing po commit.
- Pass/Fail:
  - `Pass` gdy A i B sa symetryczne i zgodne z retail; inaczej `Fail`.

## RHC-02 Bearing Full-Turn Input Policy
- Preconditions:
  - Ten sam fixture co RHC-01.
- Steps A:
  - Wpisz `360` w `Bearing`, zatwierdz `OK`.
- Expected A:
  - Retail-zgodna normalizacja wartosci przy zachowaniu oczekiwanego UI.
- Steps B:
  - Wpisz `0` i porownaj runtime efekt z A.
- Expected B:
  - A i B daja ten sam efekt orientacji runtime.
- Artifacts:
  - Screenshot pola input po wpisaniu.
  - Dump runtime bearing po zapisie.
- Pass/Fail:
  - `Pass` gdy A i B sa retail-rownowazne.

## RHC-03 Adjust Location Numeric Clamp Matrix
- Preconditions:
  - Fixture z obiektami przy granicach mapy.
- Steps A:
  - Wpisz wartosci ponizej min (`X/Y/Z`, `Scale`, rotacje/translacje).
- Expected A:
  - Clamp zgodny z retail.
- Steps B:
  - Wpisz wartosci powyzej max.
- Expected B:
  - Clamp zgodny z retail.
- Artifacts:
  - Tabela input->output A/B.
  - Zrzuty formularza i payload.
- Pass/Fail:
  - `Pass` gdy wszystkie pola pokrywaja retail clamp matrix.

## RHC-04 Static Placeable Move Semantics
- Preconditions:
  - Dwa placeable: `isStatic=true` i `isStatic=false`.
- Steps A:
  - Sprobuj ruch generic gizmo + keyboard dla `isStatic=true`.
- Expected A:
  - Zachowanie zgodne z retail policy dla static.
- Steps B:
  - Powtorz dla `isStatic=false`.
- Expected B:
  - Dynamic zachowuje retail-dozwolony ruch.
- Artifacts:
  - Video A/B.
  - Draft diff po probie ruchu.
- Pass/Fail:
  - `Pass` gdy rozroznienie static/dynamic jest retail-zgodne.

## RHC-05 Static Visual Transform Render Gate
- Preconditions:
  - Placeable z niezerowym visual transform.
- Steps A:
  - `isStatic=true`, zapisz transform.
- Expected A:
  - Wartosci sa zapisane, renderer retail-zgodnie ignoruje.
- Steps B:
  - `isStatic=false` na tym samym obiekcie.
- Expected B:
  - Renderer retail-zgodnie stosuje zapisany transform.
- Artifacts:
  - Screenshot viewport A/B.
  - Dump obiektu po kazdym kroku.
- Pass/Fail:
  - `Pass` gdy storage i render gate matchuja retail.

## RHC-06 Multi-Selection Adjust Commit Semantics
- Preconditions:
  - Co najmniej 3 obiekty movable, bez door.
- Steps A:
  - Multi-select, `Apply` w `Adjust Location`.
- Expected A:
  - Jeden commit kroku historii dla calej grupy.
- Steps B:
  - Multi-select, `OK`.
- Expected B:
  - Ten sam model commit + zamkniecie dialogu.
- Artifacts:
  - History trace A/B.
  - Diff obiektow po commit.
- Pass/Fail:
  - `Pass` gdy semantyka commit jest retail-zgodna.

## RHC-07 Cancel Snapshot Restore Semantics
- Preconditions:
  - Multi-selection z rozna pozycja i bearing.
- Steps A:
  - Otworz dialog, wykonaj zmiany, kliknij `Cancel`.
- Expected A:
  - Pelny powrot do snapshotu open-time.
- Steps B:
  - Powtorz po przynajmniej jednym `Apply` przed `Cancel`.
- Expected B:
  - Zachowanie zgodne z retail (dokladnie okreslic po pomiarze).
- Artifacts:
  - Przed/po snapshot JSON.
  - History stack dump.
- Pass/Fail:
  - `Pass` gdy restore odpowiada retail w obu wariantach.

## RHC-08 Placeable Preserve-Only Keys Roundtrip
- Preconditions:
  - Fixture z wypelnionymi polami preserve-only (`Plot/Useable/HasInventory` itd.).
- Steps A:
  - Wczytaj i zapisz bez modyfikacji.
- Expected A:
  - Brak utraty kluczy i wartosci.
- Steps B:
  - Zmien tylko aktywne pola (`name/tag/resRef/static`) i zapisz.
- Expected B:
  - Preserve-only klucze pozostaja nienaruszone.
- Artifacts:
  - Roundtrip diff A/B.
  - Klucz po kluczu checklista.
- Pass/Fail:
  - `Pass` gdy brak destrukcyjnych zmian preserve-only.

## RHC-09 Script Slot Canonical Key Mapping
- Preconditions:
  - Fixture z pelnym zestawem slotow script.
- Steps A:
  - Odczyt + zapis bez zmian.
- Expected A:
  - Klucze pozostaja canonical (bez alias drift).
- Steps B:
  - Modyfikacja wybranych slotow i zapis.
- Expected B:
  - Zmieniaja sie tylko docelowe klucze canonical.
- Artifacts:
  - Mapowanie slot->key A/B.
  - Diff payload.
- Pass/Fail:
  - `Pass` gdy mapowanie jest zgodne z retail naming.

## RHC-10 Sound Mode Gating (Everywhere vs Specific)
- Preconditions:
  - Obiekt sound z pelnym payload.
- Steps A:
  - Ustaw mode `everywhere`.
- Expected A:
  - Kontrolki pozycjonowania retail-zgodnie zablokowane.
- Steps B:
  - Ustaw mode `specific`.
- Expected B:
  - Kontrolki random-range zablokowane, anchor aktywny.
- Artifacts:
  - Screenshot UI A/B.
  - Dump payload mode + enabled flags.
- Pass/Fail:
  - `Pass` gdy gating odpowiada retail.

## RHC-11 Sound Mode Gating (Random Each Play)
- Preconditions:
  - Ten sam sound fixture co RHC-10.
- Steps A:
  - Ustaw mode `random each play`, ustaw random range.
- Expected A:
  - Range aktywne i serializowane.
- Steps B:
  - Przelacz z `random` na `specific` i zapisz.
- Expected B:
  - Retail-zgodna polityka retention/reset random fields.
- Artifacts:
  - Payload diff A/B.
  - UI state capture.
- Pass/Fail:
  - `Pass` gdy retention/reset matchuje retail.

## RHC-12 Door Transition Alias Compatibility
- Preconditions:
  - Fixture z aliasami destination (`TransitionDestination`/`TransitionDestin`).
- Steps A:
  - Import i export payload z pierwszym aliasem.
- Expected A:
  - Brak utraty danych i retail-zgodna kompatybilnosc.
- Steps B:
  - Import i export payload z drugim aliasem.
- Expected B:
  - Taka sama kompatybilnosc jak w A.
- Artifacts:
  - Parse/write log A/B.
  - Roundtrip json diff.
- Pass/Fail:
  - `Pass` gdy oba aliasy dzialaja bez destrukcji.

## RHC-13 Door Transition Semantic Fields
- Preconditions:
  - Fixture z `LinkedToFlags`, `LoadScreenID`, `LinkedToModule`.
- Steps A:
  - Save bez zmian.
- Expected A:
  - Preserve-only 1:1.
- Steps B:
  - Controlled edit pojedynczego pola i save.
- Expected B:
  - Zmienia sie tylko to pole, bez ubocznych mutacji.
- Artifacts:
  - Pole-by-pole diff A/B.
  - Export porownawczy.
- Pass/Fail:
  - `Pass` gdy semantyka zapisu matchuje retail.

## RHC-14 Tileset Master Cell / Neighborhood Precedence
- Preconditions:
  - Fixture z przypadkami konfliktow sasiedztwa i 2x2.
- Steps A:
  - Render scenariusza bazowego z retail fixture set 1.
- Expected A:
  - Wynik zgodny z retail screenshot/reference.
- Steps B:
  - Render fixture set 2 (inne sasiedztwo, te same tile ids).
- Expected B:
  - Deterministyczna precedence zgodna z retail.
- Artifacts:
  - Parity screenshots A/B.
  - Resolver trace.
- Pass/Fail:
  - `Pass` gdy oba sety pokrywaja retail precedence.

## RHC-15 World Origin / Axis Sign / Walkmesh Direction
- Preconditions:
  - Fixture z punktami kontrolnymi pozycji/orientacji i prostym path query.
- Steps A:
  - Test pozycji i bearing wzgledem origin w scenariuszu referencyjnym.
- Expected A:
  - Znaki osi i origin mapuja sie retail-zgodnie.
- Steps B:
  - Test przejscia/pathing w przeciwnym kierunku na tych samych punktach.
- Expected B:
  - Symetria kierunkowa zgodna z retail.
- Artifacts:
  - Tabela world->editor coordinates A/B.
  - Path trace logs.
- Pass/Fail:
  - `Pass` gdy mapping osi i direction parity sa zgodne z retail.

---

## Completion Rule
1. Plan jest zamkniety dopiero gdy wszystkie 15 scenariuszy maja status `Pass` i artifacty sa podlinkowane w raportach `AFEB-19`/`AFEB-20`.

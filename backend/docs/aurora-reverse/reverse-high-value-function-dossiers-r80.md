# Reverse High-Value Function Dossiers (R80)

Zakres: 12 najwazniejszych funkcji wyprowadzonych z dotychczasowych findings i eksportow.
Zrodla bazowe: `xrefs_domain_mapped.tsv`, `reverse-findings-resource-pipeline-r78.md`, `reverse-findings-area-object-contracts-r78.md`, `reverse-findings-binary-format-clues-r79.md`.

## Dossier 01: FUN_005BB574
- Adres: `0x005BB574`
- Rola: serializer `Module.IFO` (round-trip write dla metadanych modulu).
- Evidence:
  - `xrefs_domain_mapped.tsv`: xrefy do `Mod_CustomTlk`, `Mod_HakList`, `Mod_Entry_*`, `Mod_Expan_List` (np. `005bba61`, `005bc5db`, `005bbaa6`, `005bbb46`).
  - `reverse-findings-resource-pipeline-r78.md`: wskazany write-path i call-site zapisu.
  - `reverse-findings-binary-format-clues-r79.md`: klasyfikacja jako serializer, confidence 0.97.
- Zaleznosc domenowa: `module-ifo`, `hak`, `tlk`, `entry/expansion metadata`.
- Ryzyko blednej interpretacji: niskie; duza liczba spojnych xrefow i symetria read/write z `FUN_005B5BC4`.
- Wplyw na backend: krytyczny dla kontraktow zapisu modulu, testow round-trip i zgodnosci migracji danych.

## Dossier 02: FUN_005B5BC4
- Adres: `0x005B5BC4`
- Rola: deserializer `Module.IFO` (read-path custom TLK i lista HAK).
- Evidence:
  - `xrefs_domain_mapped.tsv`: xrefy `Mod_CustomTlk` (`005b6aaa`) i `Mod_HakList` (`005b784a`) oraz `Mod_Hak_*`.
  - `reverse-findings-resource-pipeline-r78.md`: odczyt pol `Mod_CustomTlk` i `Mod_HakList` z sekwencja wywolania.
  - `reverse-findings-binary-format-clues-r79.md`: klasyfikacja jako deserializer, confidence 0.96.
- Zaleznosc domenowa: `module-ifo`, `hak-chain`, `custom-tlk`.
- Ryzyko blednej interpretacji: niskie; mocne kotwice string-xref i spojnosc z write-path.
- Wplyw na backend: krytyczny dla parsera importu modulu, walidacji wejscia i zgodnosci z polityka zrodel zasobow.

## Dossier 03: FUN_0057F8B8
- Adres: `0x0057F8B8`
- Rola: globalny bootstrap sciezek zasobow (`\\hak`, `\\tlk`) i konfiguracji aliasowej.
- Evidence:
  - `xrefs_domain_mapped.tsv`: wielokrotne xrefy `\\hak` (`0058105a..00581131`) i `\\tlk` (`00584de0..00584eb7`).
  - `reverse-findings-resource-pipeline-r78.md`: funkcja wskazana jako centralny inicjalizator sciezek.
  - `reverse-findings-binary-format-clues-r79.md`: klasyfikacja resource bootstrap, confidence 0.93.
- Zaleznosc domenowa: `resource-path-bootstrap`, `hak`, `tlk`.
- Ryzyko blednej interpretacji: niskie-srednie; brak pelnej semantycznej nazwy, ale sygnal xref jest silny.
- Wplyw na backend: wysoki; determinuje model source resolution i kolejnosc przeszukiwania zasobow.

## Dossier 04: FUN_00ABCFEC
- Adres: `0x00ABCFEC`
- Rola: resolver sciezek instalacyjnych/fallback dla `TLK/HAK`.
- Evidence:
  - `xrefs_domain_mapped.tsv`: xrefy `HAKINSTALL`, `TLKINSTALL`, `TLKLOCINSTALL`, `data\\tlk`, `\\data\\tlk`.
  - `reverse-findings-resource-pipeline-r78.md`: mapowanie na resolve install/fallback TLK/HAK.
  - `reverse-findings-binary-format-clues-r79.md`: klasyfikacja resource resolver, confidence 0.89.
- Zaleznosc domenowa: `install-layout`, `tlk-fallback`, `hak-install-paths`.
- Ryzyko blednej interpretacji: srednie; wskazane posrednie evidence (w tym status "unable to decompile" w R78).
- Wplyw na backend: wysoki; kluczowe dla poprawnego odwzorowania precedence i fallback policy.

## Dossier 05: FUN_005888F0
- Adres: `0x005888F0`
- Rola: TLK open/load gate (otwarcie `dialog.tlk` i obsluga bledu).
- Evidence:
  - `xrefs_domain_mapped.tsv`: xref do komunikatu `Error: could not open dialog.tlk` (`0058a781`).
  - `reverse-findings-resource-pipeline-r78.md`: jawne osadzenie funkcji w kroku TLK resolution.
  - `reverse-findings-binary-format-clues-r79.md`: klasyfikacja TLK loader/open, confidence 0.90.
- Zaleznosc domenowa: `tlk-runtime-availability`, `localization-bootstrap`.
- Ryzyko blednej interpretacji: niskie-srednie; silny sygnal bledu, ale bez pelnej dekompilacji zachowania fallback branchy.
- Wplyw na backend: wysoki; przeklada sie na kontrakt bledow i kontrolki gotowosci danych jezykowych.

## Dossier 06: FUN_004818B0
- Adres: `0x004818B0`
- Rola: 2DA resolver/lookup (rodzina `2DAName`).
- Evidence:
  - `xrefs_domain_mapped.tsv`: seria odwolan do `s_2DAName_*` (`00482d63..00482de6`).
  - `reverse-findings-resource-pipeline-r78.md`: wskazana jako jeden z kluczowych lookupow 2DA.
  - `reverse-findings-binary-format-clues-r79.md`: klasyfikacja 2DA resolver/loader, confidence 0.82.
- Zaleznosc domenowa: `2da-resolution`, `rules-data`.
- Ryzyko blednej interpretacji: srednie; rodzina funkcji 2DA moze dzielic odpowiedzialnosc etapowo.
- Wplyw na backend: wysoki; wplywa na odtwarzanie slownikow/systemowych tabel danych.

## Dossier 07: FUN_0052EDE0
- Adres: `0x0052EDE0`
- Rola: 2DA resolver/lookup (kolejny etap rodziny `2DAName`).
- Evidence:
  - `xrefs_domain_mapped.tsv`: wielokrotne odwolania `s_2DAName_*` (`0052fcdc..0052fd7b`).
  - `reverse-findings-resource-pipeline-r78.md`: ujeta jako aktywny lookup 2DA po zbudowaniu resource stack.
  - `reverse-findings-binary-format-clues-r79.md`: confidence 0.80.
- Zaleznosc domenowa: `2da-resolution`, `post-bootstrap-data-load`.
- Ryzyko blednej interpretacji: srednie; mozliwa specjalizacja parametrow wzgledem innych loaderow 2DA.
- Wplyw na backend: wysoki; istotna dla spojnosc wynikow parsera konfiguracji i benchmarkow zgodnosci.

## Dossier 08: FUN_00532174
- Adres: `0x00532174`
- Rola: 2DA resolver/lookup (trzeci potwierdzony etap rodziny `2DAName`).
- Evidence:
  - `xrefs_domain_mapped.tsv`: xrefy `s_2DAName_*` (`00533d45..00533e06`).
  - `reverse-findings-resource-pipeline-r78.md`: wskazana wsrod kluczowych funkcji lookup 2DA.
  - `reverse-findings-binary-format-clues-r79.md`: confidence 0.80.
- Zaleznosc domenowa: `2da-resolution`, `runtime-table-selection`.
- Ryzyko blednej interpretacji: srednie; identyfikacja roli oparta glownie o sygnal xref i rodzine funkcji.
- Wplyw na backend: wysoki; krytyczne dla implementacji faithful resolvera 2DA.

## Dossier 09: FUN_004A3714
- Adres: `0x004A3714`
- Rola: wspolny dispatcher parsera dla `*.UTC` i `*.UTP` (wejscie do lane UT*).
- Evidence:
  - `xrefs_domain_mapped.tsv`: jednoczesne xrefy `*.UTC` (`004a3758`) i `*.UTP` (`004a420d`).
  - `reverse-findings-area-object-contracts-r78.md`: kandydat wspolnego dispatcher/resolve dla template resources.
  - `reverse-findings-binary-format-clues-r79.md`: parser dispatcher, confidence 0.84.
- Zaleznosc domenowa: `object-template-load`, `utc/utp-common-entry`.
- Ryzyko blednej interpretacji: srednie; brak pelnego call-chain do finalnej instancjacji obiektu.
- Wplyw na backend: wysoki; centralny punkt do odtworzenia wspolnego API dla lane creature/placeable templates.

## Dossier 10: FUN_007338C4
- Adres: `0x007338C4`
- Rola: branch parsera `UTC-only` (prawdopodobnie creature lane).
- Evidence:
  - `xrefs_domain_mapped.tsv`: bezposredni xref do `*.UTC` (`0073394f`).
  - `reverse-findings-area-object-contracts-r78.md`: kandydat brancha creature-specific.
  - `reverse-findings-binary-format-clues-r79.md`: parser branch `UTC`, confidence 0.79.
- Zaleznosc domenowa: `creature-template`, `utc-branch`.
- Ryzyko blednej interpretacji: srednie-wyzsze; rola brancha wyprowadzona glownie z pojedynczego sygnalu domenowego.
- Wplyw na backend: srednio-wysoki; wazne dla rozdzielenia logiki object lanes i walidacji kontraktu UTC.

## Dossier 11: FUN_007342E8
- Adres: `0x007342E8`
- Rola: branch parsera `UTP-only` (prawdopodobnie placeable lane).
- Evidence:
  - `xrefs_domain_mapped.tsv`: bezposredni xref do `*.UTP` (`00734373`).
  - `reverse-findings-area-object-contracts-r78.md`: kandydat brancha placeable-specific.
  - `reverse-findings-binary-format-clues-r79.md`: parser branch `UTP`, confidence 0.79.
- Zaleznosc domenowa: `placeable-template`, `utp-branch`.
- Ryzyko blednej interpretacji: srednie-wyzsze; analogiczne ograniczenia jak dla brancha UTC.
- Wplyw na backend: srednio-wysoki; kluczowe dla poprawnej semantyki mapowania UTP -> runtime object.

## Dossier 12: FUN_0072691C
- Adres: `0x0072691C`
- Rola: inicjalizacja/hydracja `ARE` przez `DefaultAreaProperties` (obszar area defaults).
- Evidence:
  - `xrefs_domain_mapped.tsv`: xrefy do `DefaultAreaProperties` (`00726ed1`, `00726edb`).
  - `reverse-findings-area-object-contracts-r78.md`: wskazana jako jedyny mocny sygnal ARE-side w aktualnym eksporcie.
  - `reverse-findings-binary-format-clues-r79.md`: area init/hydration, confidence 0.74.
- Zaleznosc domenowa: `are-defaults`, `area-init`.
- Ryzyko blednej interpretacji: wyzsze; brak twardego domkniecia pelnego parsera `ARE/GIT` w dostepnym materiale.
- Wplyw na backend: srednio-wysoki; wazne dla zgodnosci domyslnych wlasciwosci area i przyszlych gate'ow migracyjnych.

## Uwagi koncowe (R80)
- Najsilniejsza para kontraktowa read/write: `FUN_005B5BC4` <-> `FUN_005BB574`.
- Najwieksza luka dowodowa pozostaje w pelnym adresowym domknieciu parsera `GIT` (listy Door/Placeable/Creature) - obecny pakiet daje tylko sygnaly posrednie poza lane UT*.

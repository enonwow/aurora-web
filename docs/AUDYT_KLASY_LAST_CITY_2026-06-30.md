# Audyt klas `the_last_city`

Data: 2026-06-30

Zakres audytu:
- modul: `C:\Users\enonw\Documents\Neverwinter Nights\LC-Decompiled\temp0\module.ifo`
- HAK danych klas: `C:\Users\enonw\Documents\Neverwinter Nights\hak\lc_2da.hak`
- TLK: `C:\Users\enonw\Documents\Neverwinter Nights\tlk\tlc.tlk`
- skrypty runtime: `C:\Users\enonw\Documents\Neverwinter Nights\LC-Decompiled\temp0`
- ekstrakt roboczy: `C:\Projects\aurora-web\.codex-tmp\last-city-class-audit\lc_2da`

Audyt byl read-only wobec zasobow NWN. Do `.codex-tmp` zostaly wyciagniete male pliki `2da` do inspekcji.

## Potwierdzenia

- `module.ifo` potwierdza modul `the_last_city`, `Mod_CustomTlk=tlc`, `Mod_MinGameVer=1.89`.
- `Mod_HakList` ma `lc_2da` jako pierwsza warstwe HAK; to tam siedzi `classes.2da`, `feat.2da`, `spells.2da`, `skills.2da` i custom `cls_*`.
- W `classes.2da` jest 15 aktywnych custom klas LC: `100-103` oraz `110-120`.
- TLK ma komplet nazw/opisow dla custom klas, z wyjatkami opisanymi nizej.
- Referencje `cls_skill_* -> skills.2da` sa kompletne; nie znaleziono brakujacych indeksow skilli.
- Z 143 aktywnych referencji `feat.2da -> spells.2da -> ImpactScript` tylko jedna nie ma skompilowanego `.ncs`.

## Inwentarz klas

| Row | Label | Nazwa TLK | Feats | Save | Skills | Prereq | MaxLevel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | Warrior | Wojownik | CLS_FEAT_WARR | CLS_SAVTHR_WARR | CLS_SKILL_FIGHT | CLS_PRES_WARR | 10 |
| 101 | Tracker | Tropiciel | CLS_FEAT_TRK | CLS_SAVTHR_TRK | CLS_SKILL_RANG | CLS_PRES_TRACK | 10 |
| 102 | Charlatan | Szarlatan | CLS_FEAT_CHR | CLS_SAVTHR_CHR | CLS_SKILL_CHR | CLS_PRES_CHARL | 10 |
| 103 | Scientist | Uczony | CLS_FEAT_SCI | CLS_SAVTHR_SCI | CLS_SKILL_SCI | CLS_PRES_SCIEN | 10 |
| 110 | Shieldmaster | Zbrojny | CLS_FEAT_SHLD | CLS_SAVTHR_WARR | CLS_SKILL_FIGHT | CLS_PRES_SHLD | 0 |
| 111 | Berserker | Berserker | CLS_FEAT_BRSRK | CLS_SAVTHR_WARR | CLS_SKILL_FIGHT | CLS_PRES_BRSRK | 0 |
| 112 | Knight | Rycerz | CLS_FEAT_KNGHT | CLS_SAVTHR_WARR | CLS_SKILL_FIGHT | CLS_PRES_KNGHT | 0 |
| 113 | Alchemist | Alchemik | CLS_FEAT_ALCHEM | CLS_SAVTHR_SCI | CLS_SKILL_SCI | CLS_PRES_ALCHEM | 0 |
| 114 | Medic | Medyk | CLS_FEAT_MEDIC | CLS_SAVTHR_SCI | CLS_SKILL_SCI | CLS_PRES_MEDIC | 0 |
| 115 | Engineer | Inzynier | CLS_FEAT_ENGNR | CLS_SAVTHR_SCI | CLS_SKILL_SCI | CLS_PRES_ENGNR | 0 |
| 116 | Archer | Mysliwy | CLS_FEAT_ARR | CLS_SAVTHR_TRK | CLS_SKILL_RANG | CLS_PRES_ARR | 0 |
| 117 | Hunter | Straznik | CLS_FEAT_HTR | CLS_SAVTHR_TRK | CLS_SKILL_RANG | CLS_PRES_HTR | 0 |
| 118 | Tamer | Treser bestii | CLS_FEAT_TMR | CLS_SAVTHR_TRK | CLS_SKILL_RANG | CLS_PRES_HTR | 0 |
| 119 | Boxer | Piesciarz | CLS_FEAT_BXR | CLS_SAVTHR_CHR | CLS_SKILL_CHR | CLS_PRES_BXR | 0 |
| 120 | Assassin | Skrytobojca | CLS_FEAT_ASN | CLS_SAVTHR_CHR | CLS_SKILL_CHR | CLS_PRES_ASN | 0 |

## Znaleziska

### P0 - martwa zdolnosc Inzyniera

`FEAT_SCI_ENGINEER_6` (`feat.2da` row `1404`, nazwa TLK: `Torba inzyniera`) wskazuje `SPELLID=912`, a `spells.2da` row `912` wskazuje `ImpactScript=f_engnr_sharp`.

Nie znaleziono `f_engnr_sharp.ncs`:
- w dekompilacie `LC-Decompiled\temp0`;
- w 14 sprawdzonych modulach `last_city` / `tlc` / `codex_eng`;
- w HAK-ach LC.

Skutek: po wybraniu/uruchomieniu tej zdolnosci gra nie ma skryptu do wykonania. To jest realny runtime blocker dla jednej zdolnosci Inzyniera.

Rekomendacja: dodac i skompilowac `f_engnr_sharp.nss` albo poprawic `spells.2da` row `912` na wlasciwy istniejacy skrypt, jesli `f_engnr_sharp` jest tylko stara nazwa.

### P1 - `Assassin` wskazuje brakujacy bonus-feat table

`classes.2da` row `120`:

```text
BonusFeatsTable = CLS_BFEAT_ASN
```

Brakuje `cls_bfeat_asn.2da`. Potwierdzone na 58 HAK-ach z `Mod_HakList` - brak trafien.

Skutek: nawet jesli tabela miala byc pusta, referencja prowadzi do nieistniejacego zasobu. To moze psuc level-up, generator postaci albo narzedzia parsujace klasy.

Rekomendacja: dodac zerowa tabele `cls_bfeat_asn.2da` na wzor `cls_bfeat_bxr.2da` albo przestawic `BonusFeatsTable` na istniejaca pusta tabele, jesli to intencjonalny fallback.

### P1 - `Tamer` uzywa prereqow `Hunter`

`classes.2da` row `118`:

```text
PreReqTable = CLS_PRES_HTR
```

Jednoczesnie istnieje osobna tabela `cls_pres_tmr.2da`, ktora wymaga:

```text
FEAT_TRAKER_MAXLVL
CLASSNOT Archer 116
CLASSNOT Hunter 117
```

Obecne `CLS_PRES_HTR` blokuje `Archer`, ale nie blokuje `Hunter`.

Skutek: sciezka `Tamer` moze dziedziczyc logike od `Hunter` i przepuscic kombinacje, ktore przygotowana tabela `CLS_PRES_TMR` miala zablokowac.

Rekomendacja: w `classes.2da` row `118` ustawic `PreReqTable=CLS_PRES_TMR`.

### P1/P2 - `LightngRef` wskazuje `RapidReload`

We wszystkich 15 custom `cls_feat_*` wpis:

```text
LightngRef 411
```

W lokalnym `feat.2da`:
- row `24` = `LightngRef` / `FEAT_LIGHTNING_REFLEXES`;
- row `411` = `RapidReload`.

Skutek: klasy LC oferuja/daja drugi raz `RapidReload` zamiast `Lightning Reflexes`. Dotyczy: `warr`, `trk`, `chr`, `sci`, `shld`, `brsrk`, `knght`, `alchem`, `medic`, `engnr`, `arr`, `htr`, `tmr`, `bxr`, `asn`.

Rekomendacja: zamienic `FeatIndex=411` na `24` dla wiersza `LightngRef` w custom `cls_feat_*`.

### P1/P2 - niespojne `feat.2da` / `spells.2da` dla aktywnych zdolnosci

W 20 aktywnych zdolnosciach `feat.2da -> SPELLID` prowadzi do `spells.2da`, ale `spells.2da` ma niespojny `FeatID`, `Name` albo `SpellDesc`.

Podsumowanie:
- `brsrk`: 5 zdolnosci z blednym `FeatID` i `SpellDesc`;
- `medic`: 5 zdolnosci z blednym `SpellDesc`;
- `bxr`: 5 zdolnosci z blednym `Name` i `SpellDesc`;
- `asn`: 5 zdolnosci z blednym `Name`/`SpellDesc`, w tym 4 z blednym `FeatID`.

Przyklady:
- `FEAT_WAR_BERSERKER_1` row `1340` ma `SPELLID=857`, ale `spells.2da` row `857` ma `FeatID=1308` i `SpellDesc=16817425` zamiast `16817481`.
- `FEAT_CHR_ASSASIN_2` row `1513` ma `SPELLID=1004`, ale `spells.2da` row `1004` ma `FeatID=1514`, `Name=16817918` zamiast `16817910`, `SpellDesc=16817919` zamiast `16817911`.

Skutek: UI/radial/komunikaty moga pokazywac nazwe lub opis innej zdolnosci; logika oparta o `spells.2da.FeatID` moze trafic w zly feat.

Rekomendacja: dla aktywnych custom featow zsynchronizowac:
- `spells.2da.FeatID == feat.2da row`;
- `spells.2da.Name == feat.2da.FEAT`;
- `spells.2da.SpellDesc == feat.2da.DESCRIPTION`, chyba ze projektowo istnieje osobny opis spell/radial.

### P2 - bledne strrefy/tekst Berserkera

`classes.2da` row `111`:

```text
Name        = 16817260 -> Berserker
Plural      = 16817261 -> Berskerkerzy
Lower       = 16817263 -> pelny opis klasy
Description = 16817263 -> pelny opis klasy
```

TLK ma poprawny kandydat dla `Lower`:

```text
16817262 -> berserker
```

Skutek: miejsca UI oczekujace krotkiej nazwy mala litera dostana caly opis klasy. Plural ma literowke `Berskerkerzy`.

Rekomendacja: `Lower=16817262`; poprawic TLK `16817261` na `Berserkerzy`.

### P2/P3 - duplikaty stalej klasy

Duplikaty w kolumnie `Constant`:

```text
CLASS_TYPE_ROGUE    -> row 8 Rogue, row 102 Charlatan
CLASS_TYPE_ASSASSIN -> row 30 Assassin, row 120 Assassin
```

Skutek: runtime oparty o row ID dalej moze dzialac, ale generatory stalych, skrypty pomocnicze i narzedzia parsujace moga mapowac custom klase na vanilla.

Rekomendacja: jesli skrypty/narzedzia korzystaja z `Constant`, nadac unikalne stale, np. `CLASS_TYPE_CHARLATAN` i `CLASS_TYPE_LC_ASSASSIN`.

## Kolejnosc napraw

1. Naprawic `f_engnr_sharp` / `FEAT_SCI_ENGINEER_6`, bo to martwa zdolnosc runtime.
2. Dodac lub poprawic `cls_bfeat_asn.2da`.
3. Przestawic `Tamer` na `CLS_PRES_TMR`.
4. Poprawic `LightngRef` z `411` na `24` we wszystkich custom `cls_feat_*`.
5. Zsynchronizowac `feat.2da` i `spells.2da` dla `brsrk`, `medic`, `bxr`, `asn`.
6. Poprawic TLK/strrefy Berserkera.
7. Zdecydowac, czy duplikaty `Constant` sa tolerowane, czy wymagaja migracji.

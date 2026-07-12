# Audyt: mieszkania / lokale mieszkalne w module the_last_city

Data: 2026-07-02
Zrodlo danych: `C:\Users\enonw\Documents\Neverwinter Nights\LC-Decompiled\temp0`
Kontekst: wszystkie 169 obszarow modulu `the_last_city`, z parsowaniem `.are`, `.git` i kontrolnym odczytem `module.ifo`.

## 0. Definicja uzyta w audycie

Za "mieszkania" uznalem prywatne/domowe wnetrza: domy, klitki, lokale do wynajecia i burglary/loot interiors, ktore sa faktycznie urzadzone jak lokale mieszkalne.

Nie zaliczylem automatycznie:

- magazynow (`warehouse`), nawet jesli maja skrzynie, krzesla lub swiatlo;
- karczm i burdelu, bo sa noclegowo-uslugowe, ale nie mieszkaniami sensu stricto;
- template/test lokacji jako produkcyjnych mieszkan;
- ruin/kamienic jako "mieszkan" bez osobnej flagi, bo sa raczej mieszkalno-ruinowymi lokacjami questowymi.

## 1. Szybki wynik

| Kategoria | Liczba lokacji | Tiles | Placeables | Doors | Total GIT objects |
| --- | ---: | ---: | ---: | ---: | ---: |
| Produkcyjne mieszkania / lokale mieszkalne | 25 | 140 | 5,017 | 37 | 5,067 |
| Lokacje mieszkalno-ruinowe / kamienice | 3 | 332 | 1,037 | 16 | 1,119 |
| Template/test mieszkan | 9 | 308 | 808 | 13 | 836 |
| Podobne, ale wykluczone: karczmy/burdel | 7 | 197 | 2,614 | 30 | 2,677 |

Najbardziej "mieszkaniowe" produkcyjne grupy po nazwach:

- `enon_house_*` - 7 lokacji;
- `mtt_hire_*` - 6 lokacji;
- `njkb_brglr_*` - 8 lokacji;
- `njkb_hire_*` - 2 lokacje;
- pojedyncze: `claude_pr_01`, `mar_house_1`.

## 2. Produkcyjne mieszkania

To jest glowna lista lokacji, ktore traktowalbym jako mieszkania w `the_last_city`.

| Resref | Nazwa ARE | Size | Tileset | Placeables | Doors | Uwagi |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `claude_pr_01` | `Ostatnie Miasto - Slumsy, Klitka Mokrego Kostka` | 2x2 | `tni01` | 62 | 1 | Jawna klitka w Slumsach; mala biedna lokacja. |
| `enon_house_1` | `enon_house_1` | 2x3 | `zin01` | 235 | 1 | Dom/interior z bogatym wyposazeniem. |
| `enon_house_2` | `enon_house_2` | 2x2 | `zin01` | 122 | 1 | Maly dom/interior. |
| `enon_house_3` | `enon_house_3` | 2x2 | `zin01` | 240 | 3 | Dom/interior, kilka drzwi. |
| `enon_house_4` | `enon_house_4` | 3x3 | `zin01` | 180 | 1 | Wiekszy dom/interior. |
| `enon_house_5` | `enon_house_5` | 2x3 | `zin01` | 103 | 1 | Maly dom/interior. |
| `enon_house_6` | `enon_house_6` | 3x5 | `sic11` | 317 | 1 | Najbardziej "zamieszkany" z serii; ma 3 creatures i widoczne lozka w GIT. |
| `enon_house_7` | `enon_house_7` | 2x2 | `bci01` | 148 | 0 | Dom/interior bez drzwi w GIT; wymaga sprawdzenia wejscia/transition. |
| `mar_house_1` | `mar_house_1` | 2x3 | `zin01` | 385 | 1 | Ciezko umeblowany dom/interior. |
| `mtt_hire_md_1` | `mtt_hire_md_1` | 2x2 | `bci01` | 442 | 1 | Lokal "hire"; bardzo duzo wyposazenia. |
| `mtt_hire_md_2` | `mtt_hire_md_2` | 2x2 | `bci01` | 470 | 1 | Lokal "hire"; ciezki interior. |
| `mtt_hire_pr_1` | `mtt_hire_pr_1` | 2x2 | `tni01` | 236 | 1 | Biedniejszy/pr interior; ma 2 waypointy. |
| `mtt_hire_pr_2` | `mtt_hire_pr_2` | 2x2 | `tni01` | 194 | 1 | Biedniejszy/pr interior. |
| `mtt_hire_pr_3` | `mtt_hire_pr_3` | 2x2 | `tni01` | 293 | 1 | Biedniejszy/pr interior. |
| `mtt_hire_rch_1` | `mtt_hire_rch_1` | 3x2 | `sic11` | 539 | 4 | Najciezszy lokal "hire"; wariant bogaty/rich. |
| `njkb_brglr_md_1` | `njkb_brglr_md_1` | 2x2 | `tcc01` | 90 | 3 | Burglary/interior mieszkalny. |
| `njkb_brglr_md_2` | `njkb_brglr_md_2` | 2x2 | `sic11` | 176 | 2 | Burglary/interior mieszkalny. |
| `njkb_brglr_md_3` | `njkb_brglr_md_3` | 2x2 | `sic11` | 160 | 1 | Burglary/interior mieszkalny. |
| `njkb_brglr_pr_1` | `njkb_brglr_pr_1` | 4x4 | `tni01` | 45 | 1 | Biedny burglary interior; malo placeables, ale domowy zestaw. |
| `njkb_brglr_pr_2` | `njkb_brglr_pr_2` | 2x2 | `tni01` | 50 | 1 | Biedny burglary interior. |
| `njkb_brglr_pr_3` | `njkb_brglr_pr_3` | 2x3 | `tni01` | 110 | 1 | Biedny burglary interior; 2 waypointy. |
| `njkb_brglr_pr_4` | `njkb_brglr_pr_4` | 2x2 | `bci01` | 90 | 1 | Biedny burglary interior w innym tilesecie. |
| `njkb_brglr_rch_3` | `njkb_brglr_rch_3` | 2x3 | `sic11` | 231 | 6 | Bogatszy burglary interior; duzo drzwi. |
| `njkb_hire_md_1` | `njkb_hire_md_1` | 2x2 | `tni01` | 62 | 1 | Lokal hire/interior; skromny. |
| `njkb_hire_pr_1` | `njkb_hire_pr_1` | 2x2 | `tni01` | 37 | 1 | Najskromniejszy lokal hire/interior. |

## 3. Lokacje mieszkalno-ruinowe / kamienice

Te lokacje sa zwiazane z budynkami mieszkalnymi albo domowa zabudowa, ale nie traktowalbym ich jako zwykle mieszkania bez dodatkowego oznaczenia.

| Resref | Nazwa ARE | Size | Tileset | Placeables | Doors | Uwagi |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `hx_descent_serw` | `Ostatnie Miasto - Slumsy, Zniszczona Kamienica` | 2x2 | `tni01` | 107 | 2 | Jawnie kamienica; raczej ruin/quest interior niz mieszkanie. |
| `wnd_hyena` | `Ostatnie Miasto - Slumsy, Stara Rudera` | 7x8 | `tni01` | 784 | 11 | Duza rudera z domowym/magazynowym wyposazeniem; nie pojedyncze mieszkanie. |
| `wnd_rene_quarter` | `wnd_rene_quarter` | 17x16 | `tni01` | 146 | 3 | Nazwa sugeruje kwatere/quarter, ale rozmiar i profil bardziej wygladaja na wieksza lokacje. Wymaga oracle/Toolset. |

## 4. Template i testy mieszkan

Te lokacje sa przydatne przy renderze i analizie wzorcow, ale nie powinny byc liczone jako produkcyjne mieszkania gracza/NPC bez potwierdzenia z contentu.

| Resref | Nazwa ARE | Size | Tileset | Placeables | Doors | Status |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `_winds_houses` | `_winds_houses` | 16x16 | `tcm01` | 220 | 0 | Zbiorczy/template/outdoor houses. |
| `_winds_study` | `_winds_study` | 2x2 | `tcm01` | 4 | 0 | Study/test fragment, nie pelne mieszkanie. |
| `enon_test_house` | `njkb_brglr_md_2` | 2x2 | `sic11` | 176 | 2 | Testowa kopia/alias burglary mieszkania. |
| `enon_test_burgla` | `enon_test_burglary` | 5x4 | `tcn01` | 2 | 1 | Test systemu burglary, nie urzadzone mieszkanie. |
| `wnd_tmplt_flat_1` | `wnd_tmplt_flat_1` | 2x3 | `zin01` | 104 | 1 | Template mieszkania. |
| `wnd_tmplt_flat_2` | `wnd_tmplt_flat_2` | 2x2 | `zin01` | 81 | 3 | Template mieszkania. |
| `wnd_tmplt_flat_3` | `wnd_tmplt_flat_3` | 2x2 | `bci01` | 86 | 1 | Template mieszkania. |
| `wnd_tmplt_flat_4` | `wnd_tmplt_flat_4` | 2x2 | `sic11` | 31 | 1 | Template mieszkania. |
| `wnd_tmplt_flat_5` | `wnd_tmplt_flat_5` | 3x2 | `sic11` | 104 | 4 | Template mieszkania. |

## 5. Podobne, ale nie liczone jako mieszkania

Te lokacje moga miec pokoje, lozka, stoly albo prywatny charakter, ale funkcjonalnie sa uslugowe/noclegowe.

| Resref | Nazwa ARE | Powod wykluczenia |
| --- | --- | --- |
| `wnd_port_brothel` | `Ostatnie Miasto - Port, Burdel "Pod Masztem"` | Burdel/usluga, nie mieszkanie. |
| `wnd_port_brthl_u` | `Ostatnie Miasto - Port, Burdel "Pod Masztem", I Pietro` | Pietro burdelu, nie mieszkanie. |
| `mar_tavern_base` | `mar_tavern_base` | Karczma/tavern base. |
| `tavern_2` | `mar_tavern` | Karczma. |
| `pmpn_tygielv2` | `Karczma 'Tygiel'` | Karczma. |
| `wnd_tavern` | `wnd_tavern` | Karczma. |
| `wnd_tavern_base` | `wnd_tavern_base` | Karczma/tavern base. |

Osobno wykluczone: `wnd_warehouse_*`, `mar_shipyard_war` i inne magazyny. Heurystyka "house" lapie `warehouse`, ale dane i nazwy jednoznacznie mowia, ze to magazyny.

## 6. Wnioski dla dalszej pracy nad Area

1. Najlepszy maly proof mieszkania: `claude_pr_01`.
   - 2x2, 62 placeables, 1 door, jawna nazwa "Klitka".
   - Dobre do Toolset-vs-Web porownania, bo ma malo geometrii, ale domowy charakter.

2. Najlepszy sredni proof: `enon_house_6`.
   - 3x5, 317 placeables, 1 door, 3 creatures.
   - Ma najczytelniejsze domowe sygnaly: lozka, krzesla, stoly, storage, swiatlo, dywany/dekoracje.

3. Najlepszy ciezki proof mieszkania: `mtt_hire_rch_1`.
   - 3x2, 539 placeables, 4 doors.
   - Dobre do sprawdzenia bogatego interioru i wielu drzwi.

4. Najlepszy zestaw systemowy: `njkb_brglr_*`.
   - 8 lokacji burglary, razem 1,152 placeables i 16 doors.
   - Dobre do sprawdzenia, czy mieszkania generowane/questowe zachowuja sie spójnie.

5. Nie zaczynac od `wnd_hyena`.
   - To duza rudera: 7x8, 784 placeables, 11 doors, 58 waypointow.
   - Przydatna pozniej, ale jako pierwszy proof mieszkania ukryje zrodlo bledow.

## 7. Minimalny proof packet dla mieszkania

Dla kazdego mieszkania, ktore ma byc uznane za poprawnie wspierane przez Web Area, proof powinien miec:

- `raw.are.summary.json`;
- `raw.git.summary.json`;
- `raw.gic.status.json`;
- `module-ifo-area-entry.json`;
- `objects.csv`;
- `toolset-topdown.png`;
- `web-topdown.png`;
- `web-frame.json`;
- `comparison.json`.

Proponowana kolejnosc:

1. `claude_pr_01`;
2. `enon_house_6`;
3. `mtt_hire_rch_1`;
4. jeden biedny burglary: `njkb_brglr_pr_1`;
5. jeden sredni burglary: `njkb_brglr_md_2`;
6. jeden template: `wnd_tmplt_flat_5`.

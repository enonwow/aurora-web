# Reverse Final Evidence Pack (R81)

Cel: finalny, cytowalny pakiet 20 najwazniejszych dowodow reverse dla dokumentacji architektury backendu.
Zakres: wyprowadzony z `reverse-high-value-function-dossiers-r80.md`, `reverse-validation-matrix-r79.md`, `reverse-findings-resource-pipeline-r78.md`, `reverse-findings-binary-format-clues-r79.md`.

## Top 20 Evidence (ready to cite)

| # | Adres | Funkcja | String / xref (dowod) | Wniosek architektoniczny backendu |
|---|---|---|---|---|
| 1 | `0x005B5BC4` | `FUN_005B5BC4` | `Mod_CustomTlk` (`005b6aaa`), `Mod_HakList` (`005b784a`) | Glowny read-path `Module.IFO`; backend musi czytac TLK/HAK metadata przed dalszym resolve zasobow. |
| 2 | `0x005BB574` | `FUN_005BB574` | `Mod_CustomTlk` (`005bba61`), `Mod_HakList` (`005bc5db`), `Mod_Entry_*`, `Mod_Expan_List` | Glowny write-path `Module.IFO`; wymagany round-trip zgodny z read-path i kluczami `Mod_*`. |
| 3 | `0x0057F8B8` | `FUN_0057F8B8` | `\\hak` (`0058105a..00581131`), `\\tlk` (`00584de0..00584eb7`) | Bootstrap search-path/aliasow zasobow jest faza startowa i musi poprzedzac parsowanie domenowe. |
| 4 | `0x00ABCFEC` | `FUN_00ABCFEC` | `HAKINSTALL`, `TLKINSTALL`, `TLKLOCINSTALL`, `data\\tlk` (`00ac44b8..00ac7314`) | Resolver install/fallback dla TLK/HAK; backend powinien zachowac polityke fallback sciezek. |
| 5 | `0x005888F0` | `FUN_005888F0` | `Error: could not open dialog.tlk` (`0058a781`) | Istnieje twardy gate otwarcia TLK; backend powinien miec jawny error-path dla braku `dialog.tlk`. |
| 6 | `0x005CE044` | `FUN_005CE044` | `ResourceInHak` (`005ce620`) | HAK conflict/provenance jest osobna warstwa; backend powinien utrzymac diagnostyke konfliktow zasobow. |
| 7 | `0x004818B0` | `FUN_004818B0` | `s_2DAName_*` (`00482d63..00482de6`) | 2DA lookup to dedykowany etap pipeline; nie nalezy mieszac go z bootstrapem sciezek. |
| 8 | `0x0052EDE0` | `FUN_0052EDE0` | `s_2DAName_*` (`0052fcdc..0052fd7b`) | Druga warstwa lookup 2DA potwierdza staged resolver; backend powinien wspierac wieloetapowy resolve. |
| 9 | `0x00532174` | `FUN_00532174` | `s_2DAName_*` (`00533d45..00533e06`) | Kolejny etap rodziny 2DA wskazuje na pipeline z kilkoma punktami wejscia/normalizacji. |
| 10 | `0x00612A44` | `FUN_00612A44` | `Equip2DA` (`00612b81..00612c04`) | Istnieja lookupi 2DA specjalizowane domenowo; backend powinien dopuszczac profile per-2DA. |
| 11 | `0x00567DCC` | `FUN_00567DCC` (+ helper `FUN_00AEEB7C`) | `Creature List`, `Door List`, `Placeable List` (`decompiled_all.c:221380/221390/221420`) | Potwierdzony read parser list GIT; backend musi modelowac listy obiektowe jako kontrakt pierwszej klasy. |
| 12 | `0x005685FC` | `FUN_005685FC` (+ helper `FUN_00AEFB18`) | `Creature List`, `Door List`, `Placeable List` (`decompiled_all.c:221756/221764/221820`) | Potwierdzony write parser list GIT; wymagany round-trip list obiektowych, nie tylko read-only parse. |
| 13 | `0x005697E4` | `FUN_005697E4` | `Creature List` (`decompiled_all.c:221999`) | Istnieje alternatywny wariant/lane parsowania Creature; implementacja backendu nie moze zakladac jednej sciezki. |
| 14 | `0x0056998C` | `FUN_0056998C` | `Door List` (`decompiled_all.c:222080`) | Door lane jest obslugiwany osobno; parser backendu powinien zachowac odrebny kontrakt dla door records. |
| 15 | `0x00569E8C` | `FUN_00569E8C` | `Placeable List` (`decompiled_all.c:222329`) | Placeable lane jest obslugiwany osobno; parser backendu powinien miec dedykowany mapping placeable entries. |
| 16 | `0x0056716C` | `FUN_0056716C` (+ helper `FUN_00AEECF8`) | `AreaProperties` (`decompiled_all.c:220662`) | `AreaProperties` ma dedykowany read-contract niezalezny od list obiektowych GIT. |
| 17 | `0x0056A6C8` | `FUN_0056A6C8` (+ helper `FUN_00AEFCAC`) | `AreaProperties` (`decompiled_all.c:222710`) | `AreaProperties` ma tez write-contract; backend powinien utrzymac pelny round-trip area metadata. |
| 18 | `0x0055ABA0` | `FUN_0055ABA0` (+ `FUN_00AEED68`, `FUN_00AEEDC4`) | `LinkedToFlags`, `LoadScreenID` (`decompiled_all.c:213671/213674/213699/213700`) | Transition fields sa realnie parsowane; backend musi zachowac zgodnosc typow numerycznych i aliasy kluczy. |
| 19 | `0x0055ADD4` | `FUN_0055ADD4` (+ `FUN_00AEFD1C`, `FUN_00AEFD88`) | `LinkedToFlags`, `LoadScreenID` (`decompiled_all.c:346036/346039/346125/346126`) | Transition fields sa tez serializowane; backend powinien zapewnic round-trip bez utraty semantyki. |
| 20 | `0x004A3714` | `FUN_004A3714` | `*.UTC` (`004a3758`), `*.UTP` (`004a420d`) | Wspolny dispatcher UT* potwierdza wspolny rdzen + branchowanie dla lanes object templates. |

## Szybki wniosek architektoniczny

1. Najmocniejszy kontrakt end-to-end to `Module.IFO` read/write (`FUN_005B5BC4` <-> `FUN_005BB574`) wraz z TLK/HAK.
2. `Resource bootstrap -> resolver -> TLK gate -> 2DA lookup` jest potwierdzonym szkieletem pipeline.
3. Dla `GIT` i `AreaProperties` istnieja twarde read/write punkty adresowe, co uzasadnia pelny round-trip model danych w backendzie.
4. Pola transition (`LinkedToFlags`, `LoadScreenID`) sa twardym kontraktem parse+serialize i powinny miec dedykowane testy zgodnosci.

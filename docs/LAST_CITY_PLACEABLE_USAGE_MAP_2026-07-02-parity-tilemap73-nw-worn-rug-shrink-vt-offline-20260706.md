# Last City placeable usage map

Generated: 2026-07-06T16:54:11.240Z

Module: `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap73_nw_worn_rug_shrink_vt_lab.mod`

This is a first-pass map of placeables actually used by Area GIT instances. It is meant as a durable seed for future location building: apartment richness, poor interiors, port storage, shops, taverns, ruins, and other buckets.

Important: categories are partly manual seeds from the housing audit and partly naming heuristics. Treat them as an editable map, not final lore.

## Summary

- Areas with ARE+GIT parsed: 170
- Placeable instances: 53907
- Unique placeable templates: 3571

## Category map

| Category | Areas | Placeables | Unique templates | Top roles | Example areas |
| --- | --- | --- | --- | --- | --- |
| dense_other | 18 | 15167 | 2642 | misc:7782, overlays_grime_floor:1610, storage_containers:1520, plants_vases:837, maps_books_papers:574, structural_windows_walls:509, tables_seating:498, food_drink_kitchen:480, lighting_fire:446, tools_port_work:418 | enon_gang_2, enon_tunnels, hx_bank, hx_gang_slave_ma, hx_library, hx_tygiel_under, koszary_new, mar_pracownia_al |
| underground_dungeon | 11 | 10769 | 304 | misc:6780, storage_containers:2636, overlays_grime_floor:436, structural_windows_walls:313, lighting_fire:267, food_drink_kitchen:103, tables_seating:90, decor_status:45, tools_port_work:40, maps_books_papers:24 | d_sewers001, enon_catacombs_2, enon_necropolis, wnd_catacombs, wnd_necropolis_2, wnd_sewers_cente, wnd_sewers_egate, wnd_sewers_ewall |
| port_storage | 18 | 8924 | 816 | storage_containers:3354, misc:2834, overlays_grime_floor:922, structural_windows_walls:416, lighting_fire:370, food_drink_kitchen:293, tables_seating:262, tools_port_work:188, maps_books_papers:113, plants_vases:83 | enon_start_port, hx_guild_merch, hx_guild_ship, mar_shipyard_war, wnd_baths2, wnd_port, wnd_sewers_port, wnd_ship |
| test_template | 36 | 2622 | 1255 | misc:1028, storage_containers:379, plants_vases:344, lighting_fire:158, structural_windows_walls:149, tools_port_work:103, tables_seating:98, food_drink_kitchen:90, overlays_grime_floor:73, sleep_private:63 | enon_test_ads, enon_test_ah, enon_test_arena, enon_test_bestia, enon_test_build, enon_test_chest, enon_test_cnr, enon_test_dm_cmd |
| tavern_brothel | 7 | 2614 | 724 | misc:988, storage_containers:400, food_drink_kitchen:371, tables_seating:241, structural_windows_walls:104, tools_port_work:84, lighting_fire:82, overlays_grime_floor:70, textiles_rugs:69, decor_status:66 | mar_tavern_base, pmpn_tygielv2, tavern_2, wnd_port_brothel, wnd_port_brthl_u, wnd_tavern, wnd_tavern_base |
| other | 28 | 2484 | 659 | misc:1104, storage_containers:356, food_drink_kitchen:271, structural_windows_walls:236, overlays_grime_floor:159, lighting_fire:86, tables_seating:68, maps_books_papers:46, plants_vases:46, tools_port_work:35 | appearance, arena004, demo, dressing_room, d_spiders, d_und, enon_distillery, enon_gang_1 |
| apartment_rich | 8 | 2439 | 578 | misc:793, storage_containers:221, food_drink_kitchen:199, lighting_fire:192, maps_books_papers:171, tables_seating:171, plants_vases:134, sleep_private:130, structural_windows_walls:128, textiles_rugs:124 | enon_house_1, enon_house_3, enon_house_4, enon_house_6, mar_house_1, mtt_hire_rch_1, njkb_brglr_rch_3, cdx_mapflat01 |
| apartment_middle | 9 | 1773 | 498 | misc:645, storage_containers:193, food_drink_kitchen:182, tables_seating:144, plants_vases:101, lighting_fire:96, structural_windows_walls:93, overlays_grime_floor:77, textiles_rugs:65, maps_books_papers:59 | enon_house_2, enon_house_5, enon_house_7, mtt_hire_md_1, mtt_hire_md_2, njkb_brglr_md_1, njkb_brglr_md_2, njkb_brglr_md_3 |
| cave_nature | 3 | 1713 | 180 | misc:1113, overlays_grime_floor:236, plants_vases:119, lighting_fire:89, storage_containers:76, structural_windows_walls:36, food_drink_kitchen:21, tables_seating:8, tools_port_work:7, maps_books_papers:5 | enon_cave, mtt_cave, wnd_cave_2 |
| shop_market | 8 | 1699 | 419 | misc:728, overlays_grime_floor:231, storage_containers:212, food_drink_kitchen:148, tables_seating:106, plants_vases:65, lighting_fire:58, structural_windows_walls:41, maps_books_papers:34, tools_port_work:32 | enon_bakery, enon_butcher, enon_butcher_2, enon_shop_1, enon_shop_2, enon_shop_3, enon_test_shop, wnd_citymarket |
| apartment_poor | 9 | 1117 | 335 | misc:491, storage_containers:152, food_drink_kitchen:125, tables_seating:58, lighting_fire:50, overlays_grime_floor:50, tools_port_work:47, textiles_rugs:41, structural_windows_walls:28, plants_vases:26 | claude_pr_01, mtt_hire_pr_1, mtt_hire_pr_2, mtt_hire_pr_3, njkb_brglr_pr_1, njkb_brglr_pr_2, njkb_brglr_pr_3, njkb_brglr_pr_4 |
| residential_ruin | 3 | 1037 | 300 | misc:380, storage_containers:267, food_drink_kitchen:104, lighting_fire:62, tables_seating:61, overlays_grime_floor:56, tools_port_work:29, structural_windows_walls:25, sleep_private:24, decor_status:12 | hx_descent_serw, wnd_hyena, wnd_rene_quarter |
| apartment_template | 9 | 808 | 298 | misc:348, overlays_grime_floor:111, structural_windows_walls:87, lighting_fire:46, plants_vases:43, storage_containers:41, food_drink_kitchen:39, tables_seating:39, textiles_rugs:21, maps_books_papers:12 | enon_test_burgla, enon_test_house, wnd_tmplt_flat_1, wnd_tmplt_flat_2, wnd_tmplt_flat_3, wnd_tmplt_flat_4, wnd_tmplt_flat_5, _winds_houses |
| guild_merchant | 3 | 741 | 263 | misc:351, maps_books_papers:93, overlays_grime_floor:87, storage_containers:46, tables_seating:41, structural_windows_walls:29, textiles_rugs:29, plants_vases:23, lighting_fire:14, tools_port_work:14 | guild_merchants, hx_guild_caverui, hx_guild_slavehu |

## Apartment buckets

| Bucket | Area | Name | Tileset | Size | Placeables | Unique templates | Top roles |
| --- | --- | --- | --- | --- | --- | --- | --- |
| apartment_middle | mtt_hire_md_2 | mtt_hire_md_2 | bci01 | 2x2 | 470 | 206 | misc:212, structural_windows_walls:38, storage_containers:33, food_drink_kitchen:30 |
| apartment_middle | mtt_hire_md_1 | mtt_hire_md_1 | bci01 | 2x2 | 442 | 176 | misc:145, food_drink_kitchen:62, tables_seating:44, storage_containers:43 |
| apartment_middle | njkb_brglr_md_2 | njkb_brglr_md_2 | sic11 | 2x2 | 176 | 142 | misc:47, storage_containers:27, food_drink_kitchen:26, tables_seating:18 |
| apartment_middle | njkb_brglr_md_3 | njkb_brglr_md_3 | sic11 | 2x2 | 160 | 129 | misc:54, storage_containers:22, food_drink_kitchen:17, plants_vases:15 |
| apartment_middle | enon_house_7 | enon_house_7 | bci01 | 2x2 | 148 | 56 | misc:56, structural_windows_walls:21, storage_containers:15, food_drink_kitchen:11 |
| apartment_middle | enon_house_2 | enon_house_2 | zin01 | 2x2 | 122 | 59 | misc:46, tables_seating:19, storage_containers:11, food_drink_kitchen:10 |
| apartment_middle | enon_house_5 | enon_house_5 | zin01 | 2x3 | 103 | 51 | misc:45, tables_seating:13, storage_containers:12, overlays_grime_floor:9 |
| apartment_middle | njkb_brglr_md_1 | njkb_brglr_md_1 | tcc01 | 2x2 | 90 | 75 | misc:22, storage_containers:21, food_drink_kitchen:16, textiles_rugs:7 |
| apartment_middle | njkb_hire_md_1 | njkb_hire_md_1 | tni01 | 2x2 | 62 | 49 | misc:18, storage_containers:9, food_drink_kitchen:8, lighting_fire:5 |
| apartment_poor | mtt_hire_pr_3 | mtt_hire_pr_3 | tni01 | 2x2 | 293 | 118 | misc:184, storage_containers:31, food_drink_kitchen:15, lighting_fire:15 |
| apartment_poor | mtt_hire_pr_1 | mtt_hire_pr_1 | tni01 | 2x2 | 236 | 109 | misc:99, storage_containers:34, food_drink_kitchen:30, tables_seating:13 |
| apartment_poor | mtt_hire_pr_2 | mtt_hire_pr_2 | tni01 | 2x2 | 194 | 99 | misc:80, storage_containers:25, food_drink_kitchen:23, tables_seating:13 |
| apartment_poor | njkb_brglr_pr_3 | njkb_brglr_pr_3 | tni01 | 2x3 | 110 | 72 | food_drink_kitchen:25, storage_containers:25, misc:24, overlays_grime_floor:9 |
| apartment_poor | njkb_brglr_pr_4 | njkb_brglr_pr_4 | bci01 | 2x2 | 90 | 74 | misc:31, storage_containers:13, food_drink_kitchen:10, sleep_private:7 |
| apartment_poor | claude_pr_01 | Ostatnie Miasto - Slumsy, Klitka Mokrego Kostka | tni01 | 2x2 | 62 | 43 | misc:36, overlays_grime_floor:9, food_drink_kitchen:7, storage_containers:5 |
| apartment_poor | njkb_brglr_pr_2 | njkb_brglr_pr_2 | tni01 | 2x2 | 50 | 45 | misc:13, storage_containers:10, food_drink_kitchen:6, tools_port_work:5 |
| apartment_poor | njkb_brglr_pr_1 | njkb_brglr_pr_1 | tni01 | 4x4 | 45 | 42 | misc:15, food_drink_kitchen:7, storage_containers:7, tables_seating:5 |
| apartment_poor | njkb_hire_pr_1 | njkb_hire_pr_1 | tni01 | 2x2 | 37 | 31 | misc:9, overlays_grime_floor:8, tables_seating:4, textiles_rugs:3 |
| apartment_rich | mtt_hire_rch_1 | mtt_hire_rch_1 | sic11 | 3x2 | 539 | 229 | misc:134, lighting_fire:84, food_drink_kitchen:64, storage_containers:50 |
| apartment_rich | mar_house_1 | mar_house_1 | zin01 | 2x3 | 385 | 168 | misc:183, food_drink_kitchen:38, storage_containers:32, overlays_grime_floor:25 |
| apartment_rich | enon_house_6 | enon_house_6 | sic11 | 3x5 | 317 | 131 | misc:119, storage_containers:39, food_drink_kitchen:33, tables_seating:29 |
| apartment_rich | cdx_mapflat01 | Ostatnie Miasto - Port, Mieszkanie Kartografa | sic11 | 3x2 | 312 | 99 | maps_books_papers:110, sleep_private:46, storage_containers:36, textiles_rugs:33 |
| apartment_rich | enon_house_3 | enon_house_3 | zin01 | 2x2 | 240 | 124 | misc:105, structural_windows_walls:34, food_drink_kitchen:20, plants_vases:19 |
| apartment_rich | enon_house_1 | enon_house_1 | zin01 | 2x3 | 235 | 96 | misc:111, overlays_grime_floor:26, storage_containers:18, lighting_fire:12 |
| apartment_rich | njkb_brglr_rch_3 | njkb_brglr_rch_3 | sic11 | 2x3 | 231 | 176 | misc:67, plants_vases:34, storage_containers:23, tables_seating:20 |
| apartment_rich | enon_house_4 | enon_house_4 | zin01 | 3x3 | 180 | 84 | misc:73, food_drink_kitchen:18, lighting_fire:14, storage_containers:13 |
| apartment_template | _winds_houses | _winds_houses | tcm01 | 16x16 | 220 | 69 | misc:128, overlays_grime_floor:59, plants_vases:24, structural_windows_walls:9 |
| apartment_template | enon_test_house | njkb_brglr_md_2 | sic11 | 2x2 | 176 | 142 | misc:47, storage_containers:27, food_drink_kitchen:26, tables_seating:18 |
| apartment_template | wnd_tmplt_flat_1 | wnd_tmplt_flat_1 | zin01 | 2x3 | 104 | 17 | misc:71, overlays_grime_floor:21, structural_windows_walls:5, lighting_fire:4 |
| apartment_template | wnd_tmplt_flat_5 | wnd_tmplt_flat_5 | sic11 | 3x2 | 104 | 56 | lighting_fire:22, misc:21, structural_windows_walls:21, storage_containers:9 |
| apartment_template | wnd_tmplt_flat_3 | wnd_tmplt_flat_3 | bci01 | 2x2 | 86 | 28 | misc:30, tables_seating:17, overlays_grime_floor:15, structural_windows_walls:10 |
| apartment_template | wnd_tmplt_flat_2 | wnd_tmplt_flat_2 | zin01 | 2x2 | 81 | 16 | misc:36, structural_windows_walls:31, overlays_grime_floor:4, lighting_fire:3 |
| apartment_template | wnd_tmplt_flat_4 | wnd_tmplt_flat_4 | sic11 | 2x2 | 31 | 25 | misc:13, structural_windows_walls:5, lighting_fire:3, food_drink_kitchen:2 |
| apartment_template | _winds_study | _winds_study | tcm01 | 2x2 | 4 | 4 | overlays_grime_floor:2, misc:1, structural_windows_walls:1 |
| apartment_template | enon_test_burgla | enon_test_burglary | tcn01 | 5x4 | 2 | 2 | misc:1, overlays_grime_floor:1 |

## Most reused templates

| Template | Role | Instances | Areas | Categories | Names |
| --- | --- | --- | --- | --- | --- |
| witcher267 | storage_containers | 2396 | 42 | underground_dungeon:1284, port_storage:893, dense_other:118, test_template:47 | [W2] Skrzynia, ma�a / [1] Wino / [Kana�] Rura |
| other_001 | misc | 1216 | 62 | dense_other:283, port_storage:189, apartment_rich:170, apartment_poor:122 | [W] Rusztowanie, cz�� |
| q_017 | storage_containers | 1104 | 49 | port_storage:523, underground_dungeon:363, dense_other:105, residential_ruin:26 | [W] Kuchnia 3 / [Q] Beczka 2 |
| zep_dirt012 | overlays_grime_floor | 1081 | 21 | dense_other:754, port_storage:141, shop_market:86, apartment_template:51 | Splotch: brud 5 |
| witcher230 | storage_containers | 1071 | 63 | port_storage:499, underground_dungeon:298, dense_other:138, test_template:33 | [W] Kuchnia 3 / [W2] Worek (zawi�zany) / [W2] Worek (zawizany) |
| mtt_v2_253 | misc | 920 | 8 | underground_dungeon:904, cave_nature:9, residential_ruin:6, dense_other:1 | [MTT] Sterta czasek 3 / [MTT] Stalagmit 1 |
| plc_bones | misc | 862 | 10 | underground_dungeon:854, other:4, test_template:4 | Torture: Shackle, Large / VALE - Stronghold Jail Chain 03 / VALE - Necropolis, Altar 03 |
| zep_bottle002 | food_drink_kitchen | 769 | 60 | port_storage:213, dense_other:148, tavern_brothel:105, other:85 | [W] Kuchnia 3 / TableObj: Bottle, Wine |
| ke_plama001 | misc | 625 | 37 | dense_other:252, cave_nature:99, apartment_middle:87, apartment_poor:76 | [W] Kuchnia 3 / Ciemna plama |
| witcher984 | structural_windows_walls | 519 | 12 | underground_dungeon:254, port_storage:188, apartment_rich:32, apartment_template:31 | [W] Okno 4 |
| mtt_v2_211 | misc | 462 | 8 | underground_dungeon:394, port_storage:43, dense_other:21, shop_market:4 | [MTT] Smieci w celi 2 / [MTT] Smieci w celi 1 |
| plc_ballista | misc | 457 | 5 | cave_nature:388, other:63, apartment_rich:6 | VALE-2 - Mountain Caves, Rock Group 09 / VALE - Hunk of Junk 01 / Crate |
| witcher494 | storage_containers | 450 | 39 | port_storage:213, underground_dungeon:148, dense_other:24, other:21 | [W] Skrzynka G�rnicza |
| mtt_v2_210 | misc | 443 | 7 | underground_dungeon:404, dense_other:38, port_storage:1 | [MTT] Krata 1 / [MTT] Smieci w celi 1 |
| mtt_v2_168 | misc | 366 | 21 | underground_dungeon:287, port_storage:57, dense_other:11, other:5 | [MTT] Kinkiet 1 / [MTT] Paj�czyna 1 / [MTT] Pajczyna 1 |
| mtt_v2_331 | misc | 356 | 6 | underground_dungeon:348, port_storage:5, dense_other:3 | [MTT] Kolumna zniszczona w py 1 / [MTT] Kolumna zniszczona w py� 1 / [MTT] Kolumna zniszczona w py� 2 |
| q_179 | lighting_fire | 355 | 33 | port_storage:154, underground_dungeon:111, dense_other:42, residential_ruin:18 | [Q] Latarnia 1 |
| fky001 | lighting_fire | 342 | 28 | port_storage:144, underground_dungeon:111, dense_other:41, residential_ruin:20 | [FKY] P�omie� |
| mtt_v2_244 | misc | 338 | 23 | underground_dungeon:186, dense_other:79, port_storage:52, cave_nature:13 | [MTT] Gruz 2 / [MTT] Gruz 3 |
| zep_house001 | overlays_grime_floor | 328 | 6 | port_storage:179, shop_market:90, dense_other:42, apartment_template:17 | [LC] Road Dirt Straight 2 / [LC] Road Dirt 90' / [LC] Road Dirt End |
| q_314 | overlays_grime_floor | 313 | 25 | underground_dungeon:130, port_storage:119, dense_other:39, tavern_brothel:16 | [Q] Czarny 1x1 |
| mtt_v2_537 | plants_vases | 310 | 4 | dense_other:197, cave_nature:113 | [MTT] Magiczna roslinka 1 |
| witcher914 | misc | 306 | 22 | port_storage:104, underground_dungeon:91, tavern_brothel:54, residential_ruin:29 | Karty [W] / Dekor_Karty / [W] Drzewo martwe, srednie |
| witcher789 | misc | 294 | 51 | port_storage:70, dense_other:63, tavern_brothel:39, underground_dungeon:29 | [W] Mikstura 1-22 |
| mtt_v2_356 | misc | 277 | 12 | underground_dungeon:186, cave_nature:79, port_storage:10, dense_other:2 | [MTT] Podoga 1 / wnd_broken_za-gl-ja / [MTT] Pod�oga 1 |
| sigsiedzenie | misc | 277 | 21 | tavern_brothel:114, dense_other:67, port_storage:37, guild_merchant:21 | Siedzenie / Niestandardowe Siedzenie |
| witcher216 | misc | 265 | 13 | dense_other:148, test_template:98, other:15, apartment_middle:2 | palmy / gold / [W2] G�az |
| mtt_v2_297 | misc | 259 | 6 | port_storage:143, dense_other:74, shop_market:42 | [MTT] Trawa 7 / [MTT] Trawa 9 |
| q_081 | misc | 251 | 6 | dense_other:182, shop_market:54, apartment_template:14, test_template:1 | [Q] Krzak, czerwone kwiaty |
| ke_magisciana005 | structural_windows_walls | 250 | 20 | test_template:100, port_storage:49, dense_other:42, apartment_middle:23 | �ciana niewidzialna - przej�cie |
| q_155 | overlays_grime_floor | 246 | 21 | port_storage:98, underground_dungeon:92, residential_ruin:20, dense_other:11 | [Q] Pod�oga drewniana 1x1 |
| plc_arrowcorpse | food_drink_kitchen | 236 | 4 | other:212, guild_merchant:15, dense_other:9 | Floorblood 6 / d_und_floor / Floor: Bones 1x1 |
| witcher409 | lighting_fire | 234 | 40 | dense_other:84, apartment_rich:50, tavern_brothel:27, apartment_middle:26 | [W] Swieca 8 / [W] Kuchnia 3 |
| mtt_v2_271 | misc | 227 | 12 | dense_other:93, underground_dungeon:84, cave_nature:28, test_template:22 | [MTT] Pochodnia na palu 1 / [MTT] Jaja 1 |
| witcher942 | structural_windows_walls | 214 | 16 | other:134, port_storage:36, tavern_brothel:15, test_template:10 | [W] Sciana Drewniana 2 / Zmiana To�samoci / Karta Postaci |
| mtt_v2_242 | misc | 213 | 12 | underground_dungeon:199, dense_other:5, port_storage:4, cave_nature:2 | [MTT] Graciarnia / [MTT] Gruz 1 |
| mtt_v2_212 | misc | 212 | 29 | other:44, dense_other:37, port_storage:37, test_template:31 | [MTT] Smieci w celi 2 / [MTT] Smieci 1 |
| q_038 | overlays_grime_floor | 204 | 13 | dense_other:92, underground_dungeon:56, cave_nature:49, test_template:4 | [Q] Plama Krwi 1 |
| mtt_v2_067 | misc | 201 | 40 | port_storage:95, underground_dungeon:59, dense_other:17, cave_nature:8 | [MTT] Koszyki 1 / [MTT] Koszyki 2 |
| lc_plc001 | misc | 200 | 20 | underground_dungeon:107, dense_other:34, port_storage:32, shop_market:23 | [PS] Gruz 2 |

## Files

- Full JSON map: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\last-city-placeable-usage-map-parity-tilemap73-nw-worn-rug-shrink-vt-offline-20260706\placeable-usage-map.json`
- Instance CSV: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\last-city-placeable-usage-map-parity-tilemap73-nw-worn-rug-shrink-vt-offline-20260706\placeable-instances.csv`

## Next enrichment pass

Use Aurora Web placeables/catalog data to add these fields per template:

- render status / thumbnail availability;
- appearance type and resolved model path;
- light metadata from `placeables.2da` and UTP;
- editor palette family if exposed;
- curated semantic tags like `rich_bedroom`, `poor_storage`, `port_rope`, `merchant_counter`, `paperwork`, `warm_light`.

The CSV is intentionally flat so it can be joined later by `templateResRef` with catalog/export data.

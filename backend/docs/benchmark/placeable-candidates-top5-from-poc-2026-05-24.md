# Placeable Top 5 (Unique Resref) From POC

Data: 2026-05-24  
Zrodlo: `C:\Projects\nwn-last-city\Areas Generator 3d\benchmark-candidates-by-type.json`

## Zasady

1. Dedup po `resref` w ramach typu.
2. Ranking: `triangles desc`, potem `meshes desc`, potem `emitters desc`, potem `resref asc`.
3. Brane pierwsze 5 unikalnych dla typu.

## Generic

1. `zep_wrm027` (`tri=0`, `mesh=53`, `emit=0`)
2. `witcher424` (`tri=0`, `mesh=32`, `emit=0`)
3. `witcher996` (`tri=0`, `mesh=17`, `emit=0`)
4. `c_wingsmeph` (`tri=0`, `mesh=16`, `emit=0`)
5. `q_264` (`tri=0`, `mesh=16`, `emit=0`)

## Door

1. `nw_door_ttr_01` (`tri=0`, `mesh=10`, `emit=3`)
2. `tn_drawbridge` (`tri=0`, `mesh=10`, `emit=1`)
3. `drzwi001` (`tri=0`, `mesh=7`, `emit=1`)
4. `x3_door_wood001` (`tri=0`, `mesh=7`, `emit=1`)
5. `x3_door_stn003` (`tri=0`, `mesh=6`, `emit=1`)

## VFX

1. `x0_brokenfurnit1` (`tri=0`, `mesh=28`, `emit=2`)
2. `ad_top_lion_1` (`tri=0`, `mesh=28`, `emit=1`)
3. `x3_plc_mshroom5` (`tri=0`, `mesh=23`, `emit=1`)
4. `x3_plc_mshroom4` (`tri=0`, `mesh=20`, `emit=1`)
5. `drzwi017` (`tri=0`, `mesh=18`, `emit=1`)

## Container

1. `q_209` (`tri=0`, `mesh=10`, `emit=0`)
2. `zep_barrel006` (`tri=0`, `mesh=8`, `emit=3`)
3. `zep_barrel005` (`tri=0`, `mesh=6`, `emit=3`)
4. `q_127` (`tri=0`, `mesh=5`, `emit=3`)
5. `q_133` (`tri=0`, `mesh=5`, `emit=0`)

## Light Source

1. `x0_brokenfurnit1` (`tri=0`, `mesh=28`, `emit=2`)
2. `ad_top_lion_1` (`tri=0`, `mesh=28`, `emit=1`)
3. `x3_plc_mshroom5` (`tri=0`, `mesh=23`, `emit=1`)
4. `x3_plc_mshroom4` (`tri=0`, `mesh=20`, `emit=1`)
5. `drzwi017` (`tri=0`, `mesh=18`, `emit=1`)

## Trigger Proxy

1. `ke_magisciana005` (`tri=0`, `mesh=1`, `emit=0`)

## Uwagi Jakosci Danych

1. Wszystkie rekordy maja `triangles=0`, wiec ranking jest de facto oparty na `meshes` i `emitters`.
2. `vfx` i `light_source` daja ten sam top-5 (mozliwe nakladanie reguly klasyfikacji).
3. `trigger_proxy` ma tylko jeden unikalny `resref`.

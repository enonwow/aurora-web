# Audyt Aurora-first: wysokość i widoczność tile w viewport

## Źródła

- Referencyjna dekompilacja: `C:\Projects\New Folder\export\decompiled_all.c`.
- Referencyjny SET: `backend/test/fixtures/area-editing/real-tms01.set.gz.base64`.
- Wizualny przypadek reprodukcji: lokalne Area `areatiletms03`, `tms01`, 4×4,
  podniesienie tile `[0,0]` o jeden poziom.

## Ustalenia

1. Toolset ładuje `Tile_Height` z elementu `Tile_List`, a następnie oblicza jego
   wysokość renderowaną jako `Tile_Height * tileset[0x60]`.
   Dowód: `decompiled_all.c:255396-255399`.
2. Ten sam mnożnik jest użyty przez komendy zmniejszenia i zwiększenia wysokości
   tile oraz przy przeliczaniu siatki przejść wysokości. Dowód:
   `decompiled_all.c:252560`, `252703`, `253580`, `253694`.
3. `tms01.set` zawiera `[GENERAL] Transition=5` i `Interior=0`. Przy skali GLB
   `0.1` jedna wartość `Tile_Height` musi zatem przesunąć model o `5 * 0.1 = 0.5`
   jednostki viewportu. Poprzedni renderer przesuwał o `1.0`, więc płaski tile
   zawisał ponad modelami przejściowymi o wysokości `0.5`.
4. Dla `Interior=0` podniesione poziome fragmenty modeli `tms01_a02_01` i
   `tms01_a04_01` są terenem przejściowym, nie sufitem. Poprzednia heurystyka
   geometrii ukrywała je jako ceiling; runtime potwierdził
   `ceilingMeshHiddenCount=4`.

## Zmiana

- viewport oblicza wysokość tile z autoratywnego `SET [GENERAL] Transition`;
- ta sama konwersja obejmuje modele, ImageMap2D, światła, bridge i camera frame;
- dla autoratywnego zewnętrznego SET (`Interior=0`) renderer nie ukrywa fragmentów
  terenu jako ceiling;
- brak definicji SET zachowuje dotychczasowy fallback renderera zamiast wymyślać
  mnożnik dla nieznanego tilesetu.

## Uzupełnienie: orientacja przejść wysokościowych

Drugi proof wykazał niezależny błąd układu. `tms01` `[TILE3]` deklaruje
`Model=tms01_a04_01` i `Orientation=270`, lecz viewport odrzucał tę bazę
modelu. Po podniesieniu `[0,0]` retile poprawnie tworzył `TILE1`, `TILE1`,
`TILE3`, ale diagonalny `TILE3` był renderowany w złym narożniku, dlatego
między przejściami pojawiały się czarne luki.

Kontrakt renderu dla przekonwertowanego modelu jest `SET Orientation - ARE
Tile_Orientation` (normalizowany do czterech ćwierć-obrotów). Dla tej
reprodukcji `ARE=0`, `SET=270` daje yaw `270°`; proof końcowy potwierdza
`renderYawQuarterTurns=3` i brak luk między trzema modelami przejściowymi.

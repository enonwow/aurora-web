# Audyt Aurora-first: tworzenie i edycja tile w obszarze

Data: 2026-07-16  
Repo implementacyjny: `C:\Projects\aurora-web`  
Referencja tylko do odczytu: `C:\Projects\New Folder`

## Werdykt

Nie znaleziono potwierdzonego braku P0--P2 w implementacji tworzenia ani edycji
tile. Aktualny kod pokrywa utworzenie obszaru, pełną macierz tile, terrain,
crossers, wysokość, wariant, grupy SET, resize, obrót obszaru, Tile Properties,
copy/cut/paste, Undo/Redo oraz bezpieczny zapis nowego obszaru jako
`ARE + GIT + GIC + module.ifo`.

Wykryto jeden **blokujący problem integracyjny canvasu**, ale nie jest on
defektem Area/tile: nieśledzony moduł VFX
`frontend/src/modules/layout/adapters/three/auroraRetailBloomPass.ts` importuje
`../../placeables/adapters/three/auroraMtrCustomShaderProgram`. Z katalogu
`layout/adapters/three` ta ścieżka nie istnieje; rzeczywisty plik znajduje się
w `frontend/src/modules/placeables/adapters/three/`. Błąd uniemożliwia
załadowanie `AuroraAreaEditingPanel` w teście Vite, dlatego nie zmieniono go w
tym audycie -- oba pliki są nieśledzonymi, cudzymi zmianami VFX.

## Dowód z dekompilacji

Źródło Aurora Toolset pokazuje następujący kontrakt pojedynczej komórki `Tile_List`:

- `Tile_ID`, `Tile_Orientation`, `Tile_Height`;
- `Tile_MainLight1`, `Tile_MainLight2`, `Tile_SrcLight1`, `Tile_SrcLight2`;
- `Tile_AnimLoop1`, `Tile_AnimLoop2`, `Tile_AnimLoop3`.

Odczyt: `C:\Projects\New Folder\export\decompiled_all.c:255376-255420`.  
Zapis: `C:\Projects\New Folder\export\decompiled_all.c:255934-255952`.

`Tile_group` nie jest dodatkowym polem instancji ARE w tym potwierdzonym
kontrakcie. Jest elementem modelu SET/grup i układu ich członków. Nie należy go
dopisywać do serializatora ARE na podstawie nazwy/stringu: byłaby to fałszywa
implementacja. Definicje UI/modelu dla kreatora i resize są obecne w eksporcie
jako `@@Areawizard@Initialize` oraz `@@Nwtarearesize@Initialize`, a akcje
Toolsetu obejmują `actAreaResizeExecute`, `actAreaRotateExecute`,
`actSelectTerrainExecute` i `actTilePropertiesExecute`.

## Mapowanie referencja -> aurora-web

| Aurora | Implementacja |
| --- | --- |
| Kreator obszaru, wymiary 2..32 | `createAuroraAreaEditingState`, `createBlankAreaScene`, `persistNewArea` |
| `Tile_List` i 10 pól instancji | `aurora-gff-area-editing-writer.ts` |
| SET: terrain, crosser, kandydaci, grupy | `aurora-set-tileset-parser.ts`, `auroraAreaEditing.ts` |
| Resize i Area Rotate | `resizeAuroraArea`, `rotateAuroraArea` |
| Tile Properties | `auroraAreaTileProperties.ts` i dialog UI |
| Operacje grupowe | `place/remove/rotate/change height` oraz ścieżka source-group eraser |
| Copy/Cut/Paste i historia | `useAuroraAreaTileClipboardCommands.ts` oraz Scene History |
| Zapis nowego obszaru | transakcja ARE/GIT/GIC + patch `Mod_Area_list` + read-back/rollback |

## Walidacja wykonana 2026-07-16

- frontend-domain/API: **67 testów, 6 plików -- PASS**:
  `auroraAreaEditing`, `auroraAreaEraser`, clipboard, Tile Properties,
  export HTTP i hook clipboard;
- backend: **45 testów, 5 suite'ów -- PASS**:
  `area-editing.application.service`, schematy, writer ARE, parser ARE i parser SET;
- test canvas panelu nie wystartował wyłącznie z opisanym powyżej błędem importu VFX.

## Decyzja implementacyjna

Nie wprowadzono zmiany w domenie Area/tile, bo nie ma źródłowo potwierdzonej
usterki; zmiana byłaby spekulacją i mogłaby naruszyć istniejącą zgodność.
Następny bezpieczny krok to osobna poprawka właściciela VFX importu, następnie
ponowne uruchomienie testu `AuroraAreaEditingPanel.canvasSelection` i runtime
capture Area, jeśli ma być odświeżony artefakt wizualny.

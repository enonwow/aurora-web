# Area Concept Comparison Runbook

Cel: porownac koncept art lokacji z aktualnym zrzutem z Aurora Toolset bez przejmowania globalnej myszy ani klawiatury.

To narzedzie nie robi pixel-perfect parity. Koncept art i Toolset sa roznymi mediami, wiec porownanie jest semantyczne:

- ksztalt i czytelnosc ukladu,
- zgodnosc filarow lokacji z konceptem,
- role placeabli z mapy uzycia,
- konkretne instancje placeabli z GIT/CSV przypiete do motywow konceptu,
- czy realny viewport z Aurory pokazuje to, co mialo zostac zbudowane.

## Narzedzie

Skrypt:

```powershell
node backend\scripts\compare-area-concept-art.mjs
```

Dla iteracji mieszkania Last City uzywaj najpierw wrappera:

```powershell
node backend\scripts\compare-last-city-concept-parity.mjs --modulePath <candidate.mod> --baseline <baseline.mod> --toolset <readonly-capture.png> --toolsetCrop 610,275,690,470 --label <candidate-label>
```

Ten wrapper generuje swieza mape placeabli, anchor compare, tile-layout diff,
candidate diff, edge mask, image delta, `fast-iteration-plan` oraz
`layer-blame-map`. Od 2026-07-06 generuje tez `operator-scorecard.md`, czyli
domyslny pierwszy plik do czytania po kazdym przebiegu. `comparison-brief.md`
zostaje krotszym drilldownem/kompatybilnym raportem. Sam
`compare-area-concept-art.mjs` zostaje niskopoziomowym porownaniem obrazu, ale
nie wystarcza do decyzji czy kolejny ruch ma dotyczyc placeable, tile,
VisualTransform, czy lighting.

Mapa `concept-placeable-tile-map.json` moze tez zawierac `visualIntent` dla
konkretnych kafli. To jest pamiec z konceptu i poprzednich proofow: subkomorki
3x3 do obserwacji oraz twarde blokady na ruchy, ktore juz wizualnie
zregresowaly. Jezeli `check-last-city-concept-placeable-map.mjs` zwroci
`failed` przez `visualIntent.status=blocked`, nie otwieraj Toolsetu dla tego
kandydata.

Wrapper `compare-last-city-concept-parity.mjs` traktuje taka blokade jako
normalny wynik raportowy. Status `blocked_by_toolset_preflight` z blockerem
`concept_map_not_clean` oznacza, ze mapa poprawnie zatrzymala znany zly albo
neutralny kierunek przed Aurora/Toolsetem.

Domyslnie uzywa:

- konceptu `docs/assets/last-city/last-city-cartographer-apartment-concept-2026-07-02.png`,
- ostatniego manifestu Toolsetu `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-manifest.json`,
- mapy placeabli `backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map/placeable-usage-map.json`,
- instancji placeabli `backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map/placeable-instances.csv`.

## Typowy przebieg

1. Uruchom wrapper offline z `--baseline`. Jezeli safety gates nie przejda, nie
   otwieraj Toolsetu.
2. Jezeli wrapper zwroci `offline_pass_awaiting_toolset_visual`, otworz lokacje
   w Aurora Toolset i zrob jeden zrzut skryptem readonly capture.
3. Uruchom wrapper jeszcze raz z tym samym modulem i `--toolset`.
4. Najpierw obejrz:

```powershell
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/<label>/operator-scorecard.md
```

5. Dopiero potem, jezeli trzeba, wejdz w drilldown:

- `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/<label>/comparison-brief.md`
- `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/<label>/layer-blame-map.md`
- `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/comparison-contact-sheet.png`
- `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/comparison-report.md`
- `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/comparison-report.json`

`operator-scorecard.md` jest szybszy od recznego skladania raportow, bo w jednym
miejscu pokazuje:

- `action`: odrzuc, splituj, zrob capture, albo stworz jeden kandydat;
- `Next Candidate Contract`: jedna dozwolona warstwa zmiany, co zostaje stale,
  i co powoduje odrzucenie kandydata;
- `Gates`: osobno candidate diff, crash-risk, preflight, anchors i visual;
- `Ranked Tile/Placeable Work`: pierwszy tile, warstwa odpowiedzialna,
  placeable gate, VT gate i metryki obrazu;
- `First Tile Evidence`: najgorsze subkomorki, najblizsze placeable,
  istniejace kandydaty VT i zablokowane/odlozone tile shortlisty;
- `Blocked Moves`: ruchy, ktorych nie wolno powtarzac.

Jezeli `action` to `reject_current_candidate`, nie poprawiaj tego samego modulu
w Toolsecie. Wroc do baseline albo utworz nowy kandydat z nastepnego
dozwolonego ruchu.

## Jakosc zrzutu Toolsetu

Zrzut Toolsetu jest dowodem tylko wtedy, gdy pokazuje czysty viewport
oczekiwanego obszaru. Nie porownuj konceptu z obrazem, na ktorym widac
foreground `nwmain`, loading module, `Open` module dialog, okno recovery,
progress dialog albo access violation.

Skrypt `capture-areas-toolset-window-readonly.mjs` blokuje domyslny screen-copy
capture, gdy wykryje Toolset modal albo zewnetrzne okno zaslaniajace Toolset.
`--forcePrintWindow 1` jest dopuszczalne tylko jako kontrolowany readonly proof:
modul i area musza byc juz otwarte przez no-global open script, manifest nie moze
pokazywac Toolset modala, a po proofie Toolset trzeba zamknac.

Przyklad z `tilemap65`: zrzut `20260706T151642Z` jest niewazny, bo zlapal
foreground NWN loading/module window. Zrzut `20260706T152455Z` jest wazny i
dopiero on moze wejsc do wrappera `compare-last-city-concept-parity.mjs`.

## Opcje

Inny koncept:

```powershell
node backend\scripts\compare-area-concept-art.mjs --concept path\to\concept.png
```

Inny zrzut Toolsetu:

```powershell
node backend\scripts\compare-area-concept-art.mjs --toolset path\to\toolset.png
```

Reczne wyciecie viewportu, gdy autodetekcja zlapie za duzo UI:

```powershell
node backend\scripts\compare-area-concept-art.mjs --toolsetCrop 610,295,700,450
```

Format `--toolsetCrop` to `x,y,width,height` w pikselach obrazu z Toolsetu.

Inny CSV z instancjami placeabli:

```powershell
node backend\scripts\compare-area-concept-art.mjs --placeableInstances path\to\placeable-instances.csv
```

## Interpretacja wyniku

`pass_with_iteration_notes` oznacza, ze lokacja przechodzi bramke konceptu, ale raport moze nadal wskazac elementy do wzmocnienia.

`needs_iteration` oznacza, ze lokacja ma poprawny kierunek, ale jeden lub kilka filarow konceptu nie czyta sie jeszcze wystarczajaco.

`fails_concept_alignment` oznacza, ze lokacja nie powinna byc uznana za gotowa wzgledem konceptu.

Dla `cdx_mapflat01` aktualny raport po iteracji z 2026-07-02T15:03Z ma score `1.0`: wszystkie checklisty sa `matched`, wlacznie z `central_map_worktable`.

Sekcja `Placeable Concept Coverage` sprawdza placeable osobno od kompozycji obrazu. Uzywa wyeksportowanych instancji z Aurory: template, tag, role, nazwa oraz przyblizona strefa pokoju w ukladzie 3x2. Dla `cdx_mapflat01` wszystkie motywy placeabli przechodza, a finalny Toolset crop pokazuje jasna mape/pergaminy na centralnym stole.

Wazna lekcja z tej iteracji: nie wystarczy dodac template mapy/pergaminu do GIT. Dla placeabli lezacych na stole trzeba ustawic sensowne `Z` okolo `0.95-1.10`; dla map/scian okolo `2.0-2.3`. Zerowanie `Z` chowa drobne obiekty pod blatem albo przenosi scienne mapy na podloge, przez co coverage semantyczny moze wygladac dobrze, ale viewport Aurory nie bedzie zgodny z concept artem.

## Bezpieczenstwo Toolsetu

Samo porownanie obrazow nie wysyla zadnych komunikatow do Aurora Toolsetu. Uzywa tylko plikow PNG, manifestu capture i danych placeabli. Etap zrzutu Toolsetu pozostaje readonly i opisany jest w runbooku no-global-input.

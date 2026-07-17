# Aurora Toolset runner extraction spec - 2026-06-19

Rola: `POST-LIVE ROLA D runner extraction planner`.

Zakres: docs-only extraction plan. Ten dokument nie jest skryptem i nie
uruchamia Aurory. Nie zaklada globalnej myszy, globalnego `SendKeys`,
`SetCursorPos`, focus stealing, canvas input, save ani paint.

## Source atom

`ORCH-020 right palette Features branch pulse orchestrator`

Evidence folder:

`.codex-tmp/aurora-live-evidence/orch-020-right-palette-features-pulse-orchestrator-20260619-004446-228`

Promotowalne fakty z ORCH-020:

- aktywny target byl prawdziwym Toolset frame: `TfrmFrame` z tytulem
  `BioWare Aurora Neverwinter Nights Toolset ... the_last_city - codex.mod`;
- przed akcja i po akcji nie bylo modali (`modalCountBefore=0`,
  `modalCountAfter=0`);
- prawy `TTreeView` byl widoczny i mial znany `HWND`, klase i bounds;
- pulse byl wykonany celowanym `WM_LBUTTONDOWN/UP` do prawego `TTreeView` w
  client point `x=13,y=9`, bez globalnej myszy i bez `SendKeys`;
- `03-after-features-pulse.png` pokazuje rozwiniete `Features`;
- drugi celowany click wizualnie zwinal `Features`;
- `responding=true`, `mutation=false`, `save=false`, `canvasInput=false`;
- evidence packet ma komplet: before full, before palette, after pulse,
  after rollback palette, after rollback full, plus `summary.json`.

Niepromotowalne / nie do automatycznego awansu:

- `rollbackMatchesBefore=false`; runner moze raportowac visual-collapse, ale
  nie moze na tej podstawie twierdzic canonical rollback;
- konkretne `HWND` z ORCH-020, absolutne monitor coordinates i timestamp sa
  danymi runu, nie konfiguracja reusable runnera;
- nazwy widocznych dzieci `Features` nie powinny byc parsowane z PNG jako
  twardy kontrakt, dopoki runner nie ma osobnego bezpiecznego mechanizmu
  etykiet;
- atom nie dowodzi canvas input, paint, save, render parity, parsed inventory,
  ani open-area state.

## Post-live runner artifact

Rzeczywisty runner wyekstrahowany po live runie:

`.codex-tmp/aurora-orchestrator/right-palette-features-pulse.ps1`

To nie jest juz tylko spec. Skrypt:

- nie uruchamia Aurory i nie laduje modulu;
- zaklada, ze osobny live owner ma juz otwarty Toolset;
- znajduje proces `nwtoolset`, realny `TfrmFrame` i widoczny prawy
  `TTreeView`;
- zapisuje `01-before-full.png`, `02-before-right-palette.png`,
  `03-after-features-pulse.png`, `04-after-features-rollback.png`,
  `05-after-rollback-full.png` oraz `summary.json`;
- wysyla lokalne `WM_LBUTTONDOWN/UP` do prawego `TTreeView` w punkcie
  klientowym `x=13,y=9`;
- nie uzywa globalnej myszy, globalnego `SendKeys`, focus stealing, canvas
  input ani save.

Komenda z katalogu `C:\Projects\aurora-web` dla kolejnych kontekstow:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.codex-tmp\aurora-orchestrator\right-palette-features-pulse.ps1 -EvidenceRoot C:\Projects\aurora-web\.codex-tmp\aurora-live-evidence -AtomId <context-id>-right-palette-features-pulse -TargetX 13 -TargetY 9
```

`-AtomId` musi byc unikalny dla danego kontekstu/runu. Domyslne `TargetX=13`
i `TargetY=9` sa ORCH-020/ORCH-021-derived hintem dla `Features` expandera,
nie wspolrzednymi ekranu ani uniwersalnym canvas targetem.

## ORCH-021 runner proof

`ORCH-021` potwierdza, ze powyzszy runner zostal wykonany jako realny
post-live artefakt:

Evidence folder:

`.codex-tmp/aurora-live-evidence/orch-021-runner-right-palette-features-pulse-20260619-004936-567`

Promotowalne fakty z ORCH-021:

- `atom=orch-021-runner-right-palette-features-pulse`;
- `status=completed`;
- metoda: targeted `WM_LBUTTONDOWN/UP` do prawego `TTreeView`, potem drugi
  click rollback; bez global mouse, bez `SendKeys`, bez canvas input, bez save;
- `targetClientPoint={"x":13,"y":9,"intendedRoot":"Features expander"}`;
- `clickPulse.down=true`, `clickPulse.up=true`;
- `clickRollback.down=true`, `clickRollback.up=true`;
- `afterDiffers=true`;
- `rollbackMatchesBefore=true`;
- `modalCountBefore=0`, `modalCountAfter=0`;
- `responding=true`;
- `mutation=false`, `save=false`, `canvasInput=false`;
- komplet plikow: `01-before-full.png`, `02-before-right-palette.png`,
  `03-after-features-pulse.png`, `04-after-features-rollback.png`,
  `05-after-rollback-full.png`, `summary.json`;
- completed at `2026-06-19T00:49:38.6381148+02:00`.

Zakres ORCH-021 pozostaje waski: dowodzi runner-backed right-palette
`Features` branch pulse + rollback evidence. Nie dowodzi paint, save,
parsed palette inventory, render parity, ani open-area state.

## Runner shape

Reusable PowerShell runner powinien byc malym, parametryzowanym harness-em dla
celowanych Toolset atoms. ORCH-020 wnosi do niego piec prymitywow:

1. znalezienie prawdziwego frame Toolsetu;
2. znalezienie prawego palette tree;
3. zapis regionow/screenshotow i hashy;
4. celowany local click pulse na konkretnym child window;
5. gotowy atom `PulseFeatures`, ktory sklada powyzsze elementy w evidence
   packet.

Runner powinien zawsze zwracac strukturalny wynik, nie sam tekst statusu.
Minimalny wynik kazdej funkcji: `ok`, `status`, `blocker`, `data`, `evidence`.

## Function specs

### FindToolsetFrame

Cel: znalezc widoczny glowny `TfrmFrame` Toolsetu, a nie pusty
`TApplication` ani przypadkowe okno.

Inputs:

- `TitleIncludes`: lista opcjonalnych fragmentow, np. `the_last_city`,
  `codex.mod`;
- `RequireResponding`: domyslnie `true`;
- `AllowMultiple`: domyslnie `false`.

Behavior:

- enumeruje top-level windows bez zmiany focusu;
- filtruje po `class=TfrmFrame`, `visible=true`, niezerowym rect i tytule
  zaczynajacym sie od `BioWare Aurora Neverwinter Nights Toolset`;
- jesli podano `TitleIncludes`, wszystkie fragmenty musza pasowac do tytulu;
- odrzuca `TApplication` zero-size i wszystkie okna, ktore nie sa realnym
  frame;
- sprawdza responsiveness przez timeout-safe query, bez dlugiego zawieszania
  runnera;
- przy wielu kandydatach zwraca `blocker=ambiguous_toolset_frame`, chyba ze
  `AllowMultiple=true`.

Output data:

- `hwnd`, `class`, `title`, `rect`, `processId`, `responding`;
- `topLevelCandidates` dla diagnostyki;
- `selectedReason`.

Fail-fast blockers:

- `toolset_frame_missing`;
- `toolset_frame_ambiguous`;
- `toolset_frame_not_responding`;
- `title_filter_not_matched`.

### FindRightPaletteTree

Cel: wybrac prawy `TTreeView` palety, odrozniajac go od lewego area tree.

Inputs:

- `Frame`: wynik `FindToolsetFrame`;
- `ExpectedSide`: domyslnie `right`;
- `MinWidth`: domyslnie `200`;
- `RequireVisible`: domyslnie `true`;
- `EvidenceFolder`: opcjonalny folder dla cropu potwierdzajacego.

Behavior:

- enumeruje children/descendants `Frame.hwnd`;
- zbiera widoczne `TTreeView` z bounds;
- klasyfikuje kandydatow po polozeniu wzgledem frame rect: right palette tree
  ma lezec blisko prawej krawedzi frame i miec wysokosc panelu palety;
- jesli istnieje lewy i prawy `TTreeView`, wybiera prawy na podstawie rect, nie
  `WindowFromPoint`;
- opcjonalnie zapisuje crop prawej palety przez `SaveRegion`;
- nie uzywa remote-memory tree reads/writes jako prymitywu operatora.

Output data:

- `hwnd`, `class`, `text`, `visible`, `rect`, `relativeRect`;
- `allTreeCandidates`;
- `selectionReason`;
- `paletteRegionHint`.

Fail-fast blockers:

- `right_ttreeview_missing`;
- `right_ttreeview_ambiguous`;
- `right_ttreeview_not_visible`;
- `right_ttreeview_bounds_invalid`;
- `frame_missing`.

### SaveRegion

Cel: zapisac durable visual evidence dla full-window i cropow regionow.

Inputs:

- `Frame`: wynik `FindToolsetFrame`;
- `RegionName`: np. `before-full`, `before-right-palette`,
  `after-features-pulse`;
- `Rect`: screen rect regionu; dla full-window uzywa `Frame.rect`;
- `EvidenceFolder`;
- `Sequence`: liczba porzadkujaca nazwe pliku;
- `HashAlgorithm`: domyslnie `SHA256`.

Behavior:

- tworzy folder evidence, jesli go nie ma;
- zapisuje PNG z deterministyczna nazwa `NN-region-name.png`;
- liczy hash zapisanego PNG;
- zwraca rozmiar, rect, hash i sciezke;
- nie zmienia okna, nie aktywuje go i nie wysyla inputu.

Output data:

- `path`, `rect`, `width`, `height`, `hash`, `capturedAt`;
- `sourceFrameHwnd`, `regionName`.

Fail-fast blockers:

- `region_rect_invalid`;
- `capture_failed`;
- `file_write_failed`;
- `empty_or_tiny_capture`;
- `evidence_folder_unavailable`.

### TargetClick

Cel: wyslac lokalny click do konkretnego child `HWND`, bez globalnego kursora.

Inputs:

- `TargetHwnd`;
- `ClientPoint`: `x`, `y`;
- `Button`: na razie `left`;
- `Mode`: domyslnie `down_up`;
- `WaitMsAfter`: domyslnie krotki, np. `150`;
- `NoGlobalInput`: musi pozostac `true`.

Behavior:

- waliduje, ze `TargetHwnd` istnieje, jest widoczny i nadal nalezy do
  oczekiwanego frame/process;
- waliduje, ze client point miesci sie w client rect;
- wysyla tylko lokalne `WM_LBUTTONDOWN` i `WM_LBUTTONUP` do `TargetHwnd`;
- nie uzywa `SetCursorPos`, `mouse_event`, globalnej myszy, `SendKeys`,
  aktywacji okna ani canvas input;
- loguje lParam/client point, message ids i wynik timeout-safe send/post.

Output data:

- `targetHwnd`, `clientPoint`, `messagesSent`, `down`, `up`, `sentAt`;
- `targetRectBefore`, `targetRectAfter` jesli tanie do pobrania.

Fail-fast blockers:

- `target_hwnd_missing`;
- `target_hwnd_not_visible`;
- `target_not_child_of_frame`;
- `client_point_out_of_bounds`;
- `send_message_failed`;
- `global_input_required`.

### PulseFeatures

Cel: reusable atom z ORCH-020: rozwinac i zwinac root `Features` w prawym
palette tree, produkujac packet PNG + `summary.json`.

Inputs:

- `EvidenceFolder`;
- `TitleIncludes`: np. `the_last_city`, `codex.mod`;
- `RootName`: domyslnie `Features`;
- `RootClientPoint`: domyslnie ORCH-020-derived hint `x=13,y=9`, ale runner
  powinien traktowac to jako konfigurowalny point, nie hardcoded universal;
- `RequireNoModals`: domyslnie `true`;
- `RequireResponding`: domyslnie `true`;
- `RollbackMode`: domyslnie `second_click_same_point`;
- `ClassifyRollbackHashMismatchAs`: domyslnie `partial_visual_collapse`.

Procedure:

1. `FindToolsetFrame`.
2. Sprawdz modal count. Jesli `RequireNoModals` i sa modale, stop.
3. `FindRightPaletteTree`.
4. `SaveRegion` dla `01-before-full.png`.
5. `SaveRegion` dla `02-before-right-palette.png`.
6. `TargetClick` na prawy `TTreeView` w `RootClientPoint`.
7. `SaveRegion` dla `03-after-features-pulse.png`.
8. `TargetClick` rollback tym samym punktem, jesli `RollbackMode` tego wymaga.
9. `SaveRegion` dla `04-after-features-rollback.png`.
10. `SaveRegion` dla `05-after-rollback-full.png`.
11. Sprawdz `modalCountAfter`, `responding`, `mutation=false`, `save=false`,
    `canvasInput=false`.
12. Zapisz `summary.json` z funkcjami, parametrami, hwnd/rect provenance,
    plikami, hashami, click pulse, rollback click i klasyfikacja.

Expected classification:

- `accepted-narrow` tylko gdy screenshoty pokazuja pulse i finalny stan jest
  poprawnie udokumentowany, bez modali, bez canvas input, bez save i z
  `responding=true`;
- `partial` gdy visual pulse jest udany, ale hash rollbacku nie wraca do
  before, jak w ORCH-020;
- `blocked` gdy brakuje frame, prawego tree, PNG, summary, no-modal baseline,
  lub target wymagalby globalnej myszy/SendKeys.

Output summary fields:

- `atom`, `method`, `mainWindow`, `modalCountBefore`;
- `rightTree`, `targetClientPoint`, `files`;
- `clickPulse`, `clickRollback`;
- `hashBeforePalette`, `hashAfterPalette`, `hashRollbackPalette`;
- `afterDiffers`, `rollbackMatchesBefore`;
- `modalCountAfter`, `topLevelAfter`, `responding`;
- `mutation=false`, `save=false`, `canvasInput=false`;
- `classification`, `blocker`, `completedAt`.

## Reusable extraction from ORCH-020

Move into runner:

- top-level frame discovery and title disambiguation from `FindToolsetFrame`;
- child inventory and bounds-based right `TTreeView` selection from
  `FindRightPaletteTree`;
- evidence packet naming/order: before full, before palette, after pulse,
  after rollback palette, after rollback full, summary;
- region capture + hash bookkeeping from `SaveRegion`;
- local child-window click via `WM_LBUTTONDOWN/UP` from `TargetClick`;
- no-global-input hard rules and fail-fast blockers;
- partial classification when visual rollback exists but hash rollback differs;
- summary schema fields used by ORCH-020.

Leave as run-specific data:

- `hwnd=395506`, `hwnd=395484`;
- absolute negative screen rects from the current monitor layout;
- `the_last_city - codex.mod` as default test data, not universal routing;
- timestamp `2026-06-19T00:44:48.2585082+02:00`;
- exact hashes from ORCH-020 except as fixture expectations for that evidence
  folder.

## Guardrails for future contexts

- Runner must not launch Aurora or load modules unless a separate caller
  explicitly owns that setup; this extraction covers operating against an
  already-open, verified Toolset frame.
- Runner must not infer success from folder names, nonblank screenshots, or
  hash delta alone.
- Runner must always emit a precise blocker when the target is ambiguous.
- Runner must keep live mutation claims false unless a separate atom proves
  mutation intentionally and safely.
- Runner must keep `rollbackMatchesBefore=false` as noncanonical, even when
  the final screenshot is visually collapsed.
- Runner must be safe to reuse for other palette roots by changing
  `RootName/RootClientPoint`, while preserving all no-global-input and
  evidence gates.

## Function list

- `FindToolsetFrame`
- `FindRightPaletteTree`
- `SaveRegion`
- `TargetClick`
- `PulseFeatures`

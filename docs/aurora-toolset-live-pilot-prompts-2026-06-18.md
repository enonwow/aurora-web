# Aurora Toolset live-pilot prompts - 2026-06-18

Rola: PILOT PROMPT WRITER 5/6

Zakres: gotowe prompty dla kolejnych live-pilotow. Ten plik nie jest dowodem
wykonania zadnego atomu i nie promuje statusow bez nowych artefaktow live.

Wspolne guardraile dla kazdego promptu:

- Pracuj w `C:\Projects\aurora-web`.
- Nie uruchamiaj Aurory ani `nwtoolset.exe`; pracuj tylko na juz istniejacej
  sesji, jezeli jest dostepna.
- Zero globalnej myszy, globalnych klikow, globalnych dragow i globalnego
  `SendKeys`.
- Nie uzywaj menu-clickow. Preferuj pasywna enumeracje oraz celowane komunikaty
  do konkretnego `HWND`/child control.
- Nie zapisuj modulu i nie wykonuj `Save`, `Save As`, `Build Module`,
  `Test Module`, `OK`/`Apply` w properties ani zadnej mutacji danych modulu.
- Jeden live-pilot ma jeden ticket i jeden katalog dowodow. Jesli preflight nie
  pasuje, zakoncz jako blocker zamiast naprawiac sesje w tym samym atomie.
- Nie traktuj niepustego screena jako sukcesu. Dowod musi pokazac wlasciwy
  Toolset/modul/area/control, stan modali, target `HWND`, akcje oraz clean final.
- Jesli widzisz nieoczekiwany modal, popup destrukcyjny, `Responding=False`,
  1x1/blank screenshot albo brak targetu, przerwij atom i zwroc blocker.

## Prompt 1 - ORCH-004D modal child button cleanup

```text
ROLA: LIVE-PILOT MODAL CLEANUP. Pracujesz w C:\Projects\aurora-web. Masz jeden
ticket: ORCH-004D / Old File Format modal child-button cleanup.

Cel: usunac tylko potwierdzony, modalny blocker `Old File Format` przez
targetowany child button, bez globalnej myszy i bez SendKeys. Nie uruchamiaj
Aurory/nwtoolset.exe. Nie dotykaj okna globalnie.

Kontekst: poprzedni cleanup `WM_COMMAND IDOK` do parent `#32770` nie dowiodl
zamkniecia, bo `modalStillPresent=true`. Ten pilot ma najpierw pasywnie
potwierdzic modal i child controls, potem uzyc tylko bezpiecznego child button.

Katalog dowodow:
`.codex-tmp/aurora-live-evidence/orch-004d-old-file-format-child-cleanup-<timestamp>/`

Dozwolone:
- EnumWindows / EnumChildWindows dla procesu Toolsetu.
- Screenshot modala i calego frame przez konkretne HWND.
- Targetowany `BM_CLICK` albo rownowazny child-control message tylko do
  znalezionego child `TButton`/`Button`, jezeli caption i tekst dialogu sa
  bezpieczne.
- Targetowany `SendMessageTimeout` z krotkim timeoutem; brak komend bez timeoutu.

Zakazane:
- globalna mysz, globalny klik/drag, SendKeys, menu-click.
- `OK`/`Apply` w jakimkolwiek properties/editorze.
- zamykanie nieznanego modala bez screena i bez rozpoznanego child button.

Sekwencja:
1. Enumeruj widoczne top-level windows i wybierz realny `TfrmFrame` Toolsetu,
   nie puste `TApplication`.
2. Enumeruj modal-like top-level windows. Jesli nie ma `#32770` title
   `Old File Format`, zapisz `already-clean` i przejdz do finalnego raportu.
3. Dla `Old File Format` zapisz:
   - `01-window-dump-before.txt`
   - `01-modal-before.png`
   - liste child controls: hwnd, class, caption/text, rect, enabled/visible.
4. Odczytaj tekst dialogu, jezeli mozliwe. Jesli tekst sugeruje zapis,
   konwersje, destrukcyjna zmiane albo nie jest czytelny, nie klikaj niczego:
   zakoncz `blocked-unsafe-modal-text`.
5. Znajdz bezpieczny child button. Preferowany caption: `OK` tylko jezeli modal
   jest informacyjny; `Cancel` tylko jezeli istnieje i oznacza brak mutacji.
   Jesli nie ma jednoznacznego child button, zakoncz
   `blocked-no-safe-child-button`.
6. Wyslij targetowany `BM_CLICK`/child-control message do tego child button.
7. Po 250-750 ms ponownie enumeruj windows i zrob:
   - `02-window-dump-after.txt`
   - `02-after-cleanup.png`
8. Jesli `Old File Format` zniknal, zapisz `summary.json` z
   `result="cleaned-modal-child-button"`, `modalStillPresent=false`,
   `responding=<true|false>`, `globalInput=false`, `moduleSaved=false`.
9. Jesli modal nadal istnieje, nie probuj drugiej metody w tym tickecie. Zapisz
   `result="blocked-modal-still-present-after-child-click"` i oddaj blocker.

Finalny raport:
ORCH-004D: <cleaned-modal-child-button|already-clean|blocked-*>
Evidence folder: <path>
Modal before: <hwnd/title/class albo none>
Child button used: <hwnd/caption/class albo none>
Final: responding=<true|false>, modalStillPresent=<true|false>, globalInput=false, moduleSaved=false
Next recommendation: ORCH-004E passive clean baseline, ale tylko gdy modalStillPresent=false.
```

## Prompt 2 - ORCH-004E passive clean baseline

```text
ROLA: LIVE-PILOT PASSIVE BASELINE. Pracujesz w C:\Projects\aurora-web. Masz
jeden ticket: ORCH-004E / passive clean baseline.

Cel: pasywnie udowodnic aktualny stan Toolsetu po cleanupie: realny frame,
viewer/area, brak modali, screenshot czytelnego stanu. Nie wysylaj zadnego inputu
do Toolsetu.

Katalog dowodow:
`.codex-tmp/aurora-live-evidence/orch-004e-passive-clean-baseline-<timestamp>/`

Dozwolone:
- EnumWindows / EnumChildWindows.
- Pasywne sprawdzanie `IsWindowVisible`, rect, title, class, responding/hung.
- Screenshot z konkretnego `TfrmFrame` i, jesli mozliwe, viewer/canvas HWND.
- Hash/size/entropy screenshotow tylko jako pomocnicza walidacja.

Zakazane:
- jakikolwiek `WM_COMMAND`, `PostMessage`, `BM_CLICK`, `WM_KEY*`, `WM_MOUSE*`.
- globalna mysz, SendKeys, menu-click.
- proby otwierania modulu/area albo naprawiania sesji.

Sekwencja:
1. Enumeruj top-level windows i wybierz widoczny `TfrmFrame` Toolsetu. Jesli
   istnieje tylko puste/zerowe `TApplication`, zakoncz blocker.
2. Enumeruj wszystkie modal-like windows (`#32770`, popupy, dialogi VCL). Jesli
   jakikolwiek modal jest widoczny, zrob screenshot modala i zakoncz
   `blocked-modal-present`.
3. Enumeruj child windows pod `TfrmFrame`. Szukaj viewerow typu
   `TfrmViewerArea - <area>`, aktywnego modulu `the_last_city - codex.mod`, oraz
   innych czytelnych child titles.
4. Zapisz:
   - `01-window-dump.txt`
   - `01-frame-baseline.png`
   - `02-viewer-baseline.png`, jezeli viewer HWND jest jednoznaczny
   - `summary.json`
5. Nie wykonuj zadnego cleanupu ani akcji widokowej. Ten atom konczy sie po
   pasywnych dowodach.

`summary.json` minimalnie:
{
  "ticket": "ORCH-004E",
  "result": "passive-clean-baseline|blocked-modal-present|blocked-no-real-frame|blocked-no-readable-viewer",
  "frame": {"hwnd": "...", "class": "TfrmFrame", "title": "...", "rect": "..."},
  "viewerCandidates": [],
  "modalLikeCount": 0,
  "responding": true,
  "globalInput": false,
  "moduleSaved": false
}

Finalny raport:
ORCH-004E: <passive-clean-baseline|blocked-*>
Evidence folder: <path>
Frame: <hwnd/title/rect>
Viewer: <hwnd/title/rect albo none>
Final: responding=<true|false>, modalLikeCount=<n>, globalInput=false, moduleSaved=false
Next recommendation: Fog 106 clean proof, jezeli baseline jest clean.
```

## Prompt 3 - ORCH-004F Fog 106 clean proof

```text
ROLA: LIVE-PILOT VIEW TOGGLE. Pracujesz w C:\Projects\aurora-web. Masz jeden
ticket: ORCH-004F / Fog 106 clean proof.

Cel: wykonac jeden widokowy toggle `Environment -> Fog` przez celowane
`WM_COMMAND 106`, zebrac before/after/rollback i zostawic stan startowy
przywrocony. Bez zapisu modulu.

Katalog dowodow:
`.codex-tmp/aurora-live-evidence/orch-004f-fog-106-clean-proof-<timestamp>/`

Preflight hard stop:
- musi istniec widoczny realny `TfrmFrame`;
- musi istniec otwarty czytelny area viewer;
- `modalLikeCount` musi byc `0`;
- musisz moc zrobic screenshot z frame albo viewer HWND;
- musisz potwierdzic menu-state/readback dla Fog, jezeli dostepny.

Dozwolone:
- EnumWindows / EnumChildWindows.
- Screenshoty z konkretnego HWND.
- Celowane `SendMessageTimeout` albo `PostMessage` `WM_COMMAND 106` tylko do
  realnego `TfrmFrame`.
- Menu-state readback przed/po/rollback, jezeli dostepny.

Zakazane:
- globalna mysz, SendKeys, menu-click.
- jakikolwiek save/build/test.
- drugi atom po Fog; jesli cos nie pasuje, stop.

Sekwencja:
1. Zapisz `01-window-dump.txt` z frame, viewer, modal status i command target.
2. Zrob `01-before-fog.png`.
3. Odczytaj startowy stan `Environment -> Fog`, jezeli mozliwe
   (`0x100` unchecked albo `0x108` checked). Jesli nie mozliwe, zapisz
   `unknown`, ale nadal wymagaj czytelnego after/rollback proofu.
4. Wyslij celowane `WM_COMMAND 106` do `TfrmFrame`.
5. Zrob `02-after-fog-toggle.png` i odczytaj stan po togglu.
6. Wyslij drugi raz `WM_COMMAND 106` jako rollback.
7. Zrob `03-after-fog-rollback.png` i odczytaj finalny stan.
8. Sprawdz `Responding=True`, `modalLikeCount=0`, finalny screenshot czytelny.
9. `summary.json` moze miec result `rolled-back-view-toggle` tylko gdy after
   rozni sie od before przez hash/menu/region diff, a final wraca do startu.
   Jesli efekt wizualny jest slaby, ale menu-state pokazuje przejscie i powrot,
   ustaw `result="menu-state-proven-visual-weak"`, nie pelny visual success.

Finalny raport:
ORCH-004F: <rolled-back-view-toggle|menu-state-proven-visual-weak|blocked-*>
Evidence folder: <path>
Command: WM_COMMAND 106 to <frame hwnd>
Before/after/rollback: <3 paths>
Menu states: <start -> after -> final>
Final: responding=<true|false>, modalLikeCount=<n>, restored=<true|false>, moduleSaved=false
```

## Prompt 4 - ORCH-004G Display Grid command-id discovery, no action unless confirmed

```text
ROLA: LIVE-PILOT COMMAND-ID DISCOVERY. Pracujesz w C:\Projects\aurora-web. Masz
jeden ticket: ORCH-004G / Display Grid command-id discovery.

Cel: potwierdzic albo zablokowac live command-id dla
`Environment -> Display Grid`. Ten ticket jest discovery-first. Nie wysylaj
`WM_COMMAND 104` ani zadnego toggle, dopoki live readback nie potwierdzi, ze
realna pozycja menu `Display Grid` ma ID `104` w aktualnym `TfrmFrame`.

Katalog dowodow:
`.codex-tmp/aurora-live-evidence/orch-004g-display-grid-command-id-discovery-<timestamp>/`

Dozwolone:
- EnumWindows / EnumChildWindows.
- Pasywne menu enumeration/readback z realnego `TfrmFrame`.
- Screenshot frame/viewer jako kontekst.
- Zapis dumpu menu: path, caption, id, state, enabled/checked.

Zakazane bez dodatkowej zgody:
- wyslanie `WM_COMMAND 104`;
- jakikolwiek widokowy toggle;
- globalna mysz, SendKeys, menu-click;
- save/build/test.

Sekwencja:
1. Potwierdz realny `TfrmFrame`, viewer i `modalLikeCount=0`.
2. Zapisz `01-window-dump.txt` i `01-baseline.png`.
3. Z enumeracji menu zapisz `02-menu-dump.txt` oraz `summary.json`.
4. Znajdz sciezke menu odpowiadajaca `Environment -> Display Grid`.
5. Jesli caption `Display Grid`, command id `104`, enabled state i checked state
   sa potwierdzone live z aktualnego frame, ustaw
   `result="display-grid-command-id-confirmed"`.
6. Jesli ID jest inne, nieczytelne, brak menu readbacku albo jest konflikt z
   aktywnym targetem, ustaw `result="blocked-grid-command-id-unconfirmed"`.
7. Nie wykonuj toggle w tym tickecie. Jego outputem ma byc tylko bezpieczny
   discovery proof albo blocker. Nastepny pilot moze dostac osobny ticket na
   toggle dopiero po potwierdzeniu ID.

Finalny raport:
ORCH-004G: <display-grid-command-id-confirmed|blocked-grid-command-id-unconfirmed|blocked-*>
Evidence folder: <path>
Display Grid menu: <path/caption/id/state/source>
Action sent: none
Final: responding=<true|false>, modalLikeCount=<n>, globalInput=false, moduleSaved=false
Next recommendation: osobny Display Grid toggle+restore ticket tylko jesli command-id-confirmed.
```

## Prompt 5 - ORCH-004H canvas HWND proof

```text
ROLA: LIVE-PILOT PASSIVE CANVAS TARGETING. Pracujesz w C:\Projects\aurora-web.
Masz jeden ticket: ORCH-004H / canvas HWND proof.

Cel: pasywnie wskazac realny inner canvas/control HWND dla otwartego area
viewer, zeby kolejne atomy nie celowaly w frame, tab albo pusty wrapper. Zero
inputu do Toolsetu.

Katalog dowodow:
`.codex-tmp/aurora-live-evidence/orch-004h-canvas-hwnd-proof-<timestamp>/`

Dozwolone:
- EnumWindows / EnumChildWindows pod realnym `TfrmFrame`.
- Rect/class/title dump dla `TfrmViewerArea - <area>` i jego potomkow.
- Screenshot full frame, viewer oraz crop/screenshot kandydata canvasu.
- Pasywne porownanie rectow, rozmiaru i niepustosci bitmapy.

Zakazane:
- `WM_COMMAND`, `PostMessage`, `BM_CLICK`, `WM_KEY*`, `WM_MOUSE*`.
- globalna mysz, SendKeys, menu-click.
- zmiana aktywnego tab/area lub otwieranie czegokolwiek.

Sekwencja:
1. Znajdz realny, widoczny `TfrmFrame`; jezeli brak, zakoncz
   `blocked-no-real-frame`.
2. Potwierdz `modalLikeCount=0`; jezeli jest modal, zrob screenshot i zakoncz
   `blocked-modal-present`.
3. Znajdz aktywny `TfrmViewerArea - <area>` lub najlepszego viewer candidate.
   Nie zgaduj `_ikea`, jezeli widoczny tytul/tree mowi inaczej.
4. Enumeruj potomkow viewer i zapisz `01-child-dump.txt`:
   hwnd, class, title, rect, size, visible/enabled, parent chain.
5. Wybierz canvas candidate tylko jesli:
   - jest potomkiem viewer;
   - ma duzy rect odpowiadajacy obszarowi renderu;
   - screenshot/crop nie jest pusty/1x1;
   - nie jest tabem, toolbar, statusbar ani zewnetrzna ramka.
6. Zapisz:
   - `01-frame.png`
   - `02-viewer.png`
   - `03-canvas-candidate.png`
   - `summary.json`
7. Nie wykonuj zadnego inputu. Jesli kandydatow jest kilka albo obraz jest
   niejednoznaczny, ustaw `result="blocked-canvas-hwnd-ambiguous"` i wypisz
   top 3 kandydatow z powodami.

Finalny raport:
ORCH-004H: <canvas-hwnd-proven|blocked-canvas-hwnd-ambiguous|blocked-*>
Evidence folder: <path>
Frame: <hwnd/title/rect>
Viewer: <hwnd/title/rect>
Canvas candidate: <hwnd/class/rect/reason albo none>
Action sent: none
Final: responding=<true|false>, modalLikeCount=<n>, globalInput=false, moduleSaved=false
```

## Recommended next launch

Odpal jako nastepny **Prompt 1 - ORCH-004D modal child button cleanup**.

Powod: ostatni udokumentowany stan mial blocker `Old File Format`, a cleanup
przez parent `WM_COMMAND IDOK` nie dowiodl usuniecia modala. Dopiero po
`modalStillPresent=false` ma sens pasywny baseline, a dopiero po baseline
widokowy Fog/Grid/canvas targeting.

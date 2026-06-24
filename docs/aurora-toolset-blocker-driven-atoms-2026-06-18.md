# Aurora Toolset: blocker-driven atoms

Data: 2026-06-18

Rola: BLOCKER-DRIVEN ATOM PLANNER 4/6

Zakres: plan atomow pod obecne blokery z `evidence QA`, `open questions` i
`next pilot packet`. Ten plik nie jest raportem live i nie dodaje nowych
dowodow. Nie uruchamiac Aurory, nie dotykac okna, nie uzywac globalnej myszy
ani globalnego `SendKeys`.

## Zrodla decyzyjne

- `docs/aurora-toolset-evidence-qa-2026-06-18.md`
- `docs/aurora-toolset-open-questions-2026-06-18.md`
- `docs/aurora-toolset-next-pilot-packet-2026-06-18.md`
- `docs/aurora-toolset-live-evidence-manifest-2026-06-18.md`
- `docs/aurora-toolset-modal-blockers-2026-06-18.md`
- `docs/aurora-toolset-command-map-2026-06-18.md`
- `docs/aurora-toolset-display-grid-findings-2026-06-18.md`
- `docs/aurora-toolset-fog-toggle-findings-2026-06-18.md`

## Kolejka 10 atomow

### Atom 01 - ORCH-004D targeted Old File Format modal cleanup proof

- Blocker: `Old File Format` modal jest twardym blokerem; aktualny cleanup
  folder istnieje, ale `modalStillPresent=true`, wiec cleanup nie jest
  udowodniony.
- Cel: zamknac tylko ten modal, przez celowany `WM_COMMAND IDOK` do jego
  `#32770` HWND, i udowodnic brak modala po re-enumeracji.
- Proof: `01-before-modal.txt/png` z `#32770`, tytulem `Old File Format`,
  hwnd i rect; `02-after-cleanup.txt/png` z ta sama ramka Toolsetu,
  `modalLikeCount=0`, `responding=true`, oraz brakiem widocznego popupu.
- Rollback: brak mutacji modulu; jesli po komendzie modal nadal istnieje, nie
  wysylac kolejnych szerokich inputow, tylko zapisac `cleanup-required`.
- Fail-fast threshold: stop przed akcja, jesli nie ma jednoznacznego modala
  `Old File Format`, jest wiecej niz jeden modal-like blocker, albo nie da sie
  przypisac modala do glownej ramki Toolsetu; stop po jednej probie, jesli
  `modalStillPresent=true`.

### Atom 02 - NXA-BASE-001 clean full-frame baseline after cleanup

- Blocker: bez czystego baseline kazdy nastepny atom moze trafic w zle okno,
  zly modul albo stan po cudzym pilocie.
- Cel: pasywnie potwierdzic `TfrmFrame` dla `the_last_city - codex.mod`, brak
  modali, widoczny aktywny viewer/tab area i responsywny Toolset.
- Proof: full-frame screenshot, `window-dump.txt` z widocznym `TfrmFrame`, bez
  `#32770` blockerow, `responding=true`, title zawierajacy `the_last_city` i
  `codex.mod`, oraz widoczny viewer/tab.
- Rollback: brak mutacji; jesli baseline nie jest czysty, nie naprawiac go w
  tym atomie poza raportem blockerowym.
- Fail-fast threshold: stop, jesli widac modal, puste/zerowe `TApplication`
  jest jedynym targetem, frame jest hung, albo screenshot nie pokazuje pelnego
  Toolsetu.

### Atom 03 - NXA-BASE-002 target-area identity readback

- Blocker: foldery i summary moga overclaimowac target; QA wskazuje przyklad
  `_ikea` folderu pokazujacego `_winds_houses`.
- Cel: ustalic realny otwarty target area bez otwierania nowych area.
- Proof: screenshot z widoczna nazwa aktywnej zakladki/viewera oraz dump child
  titles zawierajacy `TfrmViewerArea - <area>`. Wynik ma jawnie zapisac:
  `targetArea=_winds_houses|inna|unknown`.
- Rollback: brak mutacji; jesli target nie jest oczekiwany, nie przelaczac
  area w tym atomie.
- Fail-fast threshold: stop, jesli nazwa area nie jest widoczna w screenie ani
  child-title dumpie, albo aktywny viewer jest zasloniety.

### Atom 04 - NXA-HWND-001 inner canvas HWND proof

- Blocker: open questions wymagaja realnego canvas/HWND, nie samej ramki
  viewera ani pustego okna.
- Cel: pasywnie wskazac prawdopodobny inner canvas/control pod
  `TfrmViewerArea`, z rectem i screenshotem targetu.
- Proof: `canvas-window-dump.txt` z parent chain, class, hwnd, rect i size;
  screenshot full-frame plus opcjonalny cropped target pokazujacy render area,
  nie modal ani pusty frame.
- Rollback: brak mutacji; bez pewnego canvasu nie wysylac zadnych komunikatow
  do canvasu w kolejnych atomach.
- Fail-fast threshold: stop, jesli child recty sa zerowe, canvas crop jest
  blank/1x1/loading-only, albo wykryto modal/popup nad viewerem.

### Atom 05 - NXA-GRID-001 Display Grid command/menu-state readback preflight

- Blocker: next pilot packet zabrania wysylac `WM_COMMAND 104` w ciemno;
  command-map nie promuje jeszcze Display Grid w glownej tabeli tak mocno jak
  Fog.
- Cel: przed jakimkolwiek toggle potwierdzic live-readback pozycji
  `Environment -> Display Grid`, command id `104` i stan startowy
  `checked|unchecked`.
- Proof: menu/readback dump z realnego `TfrmFrame`, nie `TApplication`,
  zawierajacy `Display Grid`, id `104`, start state `0x108|0x100`, frame hwnd,
  target area i brak modali.
- Rollback: brak mutacji w tym atomie; jesli readback jest niepewny, kolejnym
  atomem nie moze byc grid toggle.
- Fail-fast threshold: stop, jesli id nie jest `104`, stan jest `unknown`,
  readback pochodzi z niewlasciwego frame, albo target area/baseline nie sa
  czyste.

### Atom 06 - NXA-GRID-002 Display Grid toggle + restore with dual proof

- Blocker: HB-010 ma menu transition `0x108 -> 0x100 -> 0x108`, ale wszystkie
  screenshoty byly identyczne, wiec QA odrzuca to jako visual proof.
- Cel: wykonac jeden view-only toggle `Display Grid` i natychmiastowy restore,
  z dowodem menu-state oraz widocznej zmiany lub jawnym statusem visual-weak.
- Proof: `01-before`, `02-after-toggle`, `03-after-restore`, plus summary:
  command `104`, start/after/final menu state, `afterDiffersFromBefore`,
  `finalMatchesBefore`, `responding=true`, `noModal=true`.
- Rollback: drugi `WM_COMMAND 104` do stanu startowego przed zakonczeniem
  atomu.
- Fail-fast threshold: stop przed toggle, jesli Atom 05 nie potwierdzil id i
  state; po pierwszym toggle natychmiast restore, jesli screenshot jest blank,
  frame hung, modal sie pojawi, albo menu-state ma nieoczekiwana wartosc.

### Atom 07 - NXA-GRID-003 repaint/readback recovery for visual-weak grid

- Blocker: jezeli Atom 06 daje tylko menu-state, grid pozostaje
  `menu-state-proven-visual-weak`, nie visual success.
- Cel: bez dodatkowego toggle udowodnic, czy po zmianie gridu mozna wymusic
  bezpieczny repaint/readback widoku albo oznaczyc blocker `repaint-required`.
- Proof: screenshot/crop po neutralnym odswiezeniu widoku, menu-state zgodny z
  oczekiwanym stanem, oraz finalny restored screenshot. Repaint nie moze byc
  traktowany jako nowa mutacja.
- Rollback: jesli atom startuje po togglu, najpierw doprowadzic final do stanu
  startowego `Display Grid`; jesli restore nie jest pewny, zapisac
  `restore-unconfirmed`.
- Fail-fast threshold: maksymalnie jedna neutralna proba recapture/repaint; stop
  jesli hash nadal identyczny i brak widocznej roznicy, albo jesli repaint
  wymaga globalnego inputu/menu clicka.

### Atom 08 - NXA-FOG-001 Fog fallback preflight on same clean target

- Blocker: gdy `Display Grid` jest zablokowany przez brak readbacku albo brak
  widocznej zmiany, fallback ma isc przez `Fog`, bo command-map oznacza
  `WM_COMMAND 106` jako proven.
- Cel: przygotowac fallback bez jeszcze wysylania komendy: potwierdzic ten sam
  clean baseline, target area, brak modali i startowy stan `Fog`.
- Proof: dump menu/readback `Environment -> Fog`, id `106`, start state
  `0x100|0x108`, frame hwnd, target area, screenshot before.
- Rollback: brak mutacji; jesli start state fog jest unknown, nie wykonywac
  fallback toggle.
- Fail-fast threshold: stop, jesli command id nie jest `106`, start state jest
  unknown, target nie zgadza sie z baseline, albo Toolset nie odpowiada.

### Atom 09 - NXA-FOG-002 Fog toggle + restore fallback packet

- Blocker: potrzebny alternatywny view-only atom, gdy grid nie daje
  dopuszczalnego proofu.
- Cel: wykonac `Fog` przez celowany `WM_COMMAND 106`, z before/after/restore i
  finalem matching-before.
- Proof: `01-before-fog`, `02-after-fog`, `03-after-fog-rollback`, summary z
  `0x100 -> 0x108 -> 0x100` albo odwrotnie, `afterDiffers=true`,
  `finalMatchesBefore=true`, `responding=true`, `noModal=true`.
- Rollback: drugi `WM_COMMAND 106` do stanu startowego; Fog nie moze zostac
  zmieniony po atomie.
- Fail-fast threshold: po pierwszym toggle restore jest natychmiastowy, jesli
  after-screen jest blank/ciemny-nieczytelny, pojawia sie modal, albo state nie
  zmienia sie zgodnie z oczekiwaniem.

### Atom 10 - NXA-QA-021 blocker packet reconciliation and next pilot ticket

- Blocker: bez QA reconcile latwo promowac partial/menu-only/identical-hash jako
  sukces.
- Cel: bez dotykania Toolsetu sklasyfikowac ostatni atom jako
  `cleaned`, `blocked`, `menu-state-proven-visual-weak`,
  `rolled-back-view-toggle` albo `cleanup-required`, i wystawic nastepny
  jednoatomowy pilot.
- Proof: krotka tabela z paths: before, after, restored/final, summary json,
  hash/readback, status modala i target area; status nie moze wykraczac poza
  dowody.
- Rollback: jesli wnioski sa sprzeczne z QA, cofnac status do `blocked` i
  wybrac atom cleanup/baseline jako nastepny.
- Fail-fast threshold: stop, jesli brakuje ktoregokolwiek z: target area,
  no-modal final, responding status, rollback/final proof, albo jezeli
  screenshoty maja identyczny hash przy claimie visual-success.

## Atom nr 1 po cleanupie

Po udowodnionym Atomie 01 nastepny atom do wykonania to Atom 02:
`NXA-BASE-001 clean full-frame baseline after cleanup`.

Nie wolno przeskakiwac bezposrednio do `Display Grid`, dopoki baseline po
cleanupie nie pokazuje: realnego `TfrmFrame`, `the_last_city - codex.mod`,
braku modali, responsywnosci oraz widocznego viewer/tab area.

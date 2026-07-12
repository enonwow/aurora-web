# Aurora Toolset: session recovery findings

> Historical manual-recovery evidence. The canonical unattended workflow is `backend/docs/aurora-reverse/aurora-toolset-session-workflow.md`; it treats a recovery prompt as a blocker and never follows recovery with `File > Open`.

Data: 2026-06-18

Ten dokument opisuje recovery po restarcie Aurora Toolsetu dla modulu
`the_last_city - codex.mod`. To nie jest nowy atom edycyjny; to zasada
stabilizacji sesji przed dalsza praca heartbeatowa.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul roboczy: `the_last_city - codex.mod`.
- Wymaganie operatora: Toolset ma byc widoczny na drugim ekranie.
- Drugi ekran w tej sesji: bounds `left=-1920 top=0 width=1920 height=1080`.
- Po restarcie Toolset pokazal pytanie o odzyskanie modulu z backupu.

## Co zadzialalo

1. Glowne okno `TfrmFrame` zostalo ustawione na drugim ekranie.
2. Dialog odzyskiwania backupu zostal obsluzony przez `WM_COMMAND IDYES=6`.
3. Po wybraniu `Tak`/`Yes` Toolset zaladowal odzyskany stan modulu.
4. Po odzyskaniu backupu nie trzeba otwierac modulu drugi raz przez
   `File > Open`.
5. Jezeli przez pomylke pojawi sie dialog `Open`, nalezy go anulowac i wrocic
   do odzyskanego stanu.
6. Z odzyskanego drzewa modulu da sie rozwinac `Areas`, wybrac `_ikea` i
   otworzyc render obszaru.

## Sekwencja bezpieczna

1. Potwierdzic, ze `nwtoolset.exe` dziala.
2. Ustawic `TfrmFrame` na drugim ekranie.
3. Jesli pojawia sie backup prompt, wybrac `Tak`/`Yes`.
4. Poczekac, az Toolset zakonczy ladowanie odzyskanego stanu.
5. Nie wykonywac `File > Open` po skutecznym recovery.
6. Potwierdzic screenshotem widoczne drzewo modulu.
7. Rozwinac `Areas` w drzewie.
8. Otworzyc `_ikea` i poczekac na realny render sceny.

## Dowody

Backup prompt na drugim ekranie:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-010-aurora-on-second-screen.png`

Ladowanie po wybraniu `Tak`/`Yes`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-012-after-backup-recovered-second-screen.png`

Odzyskany stan po anulowaniu przypadkowego dialogu `Open`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-014-after-open-dialog-cancel-second-screen.png`

Rozwiniete `Areas` z widoczna `_ikea`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-015-areas-tree-expanded.png`

Otwarta i renderujaca `_ikea`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-017-ikea-after-wait.png`

## Pulapki

- Nie traktowac screenshotu Codexa albo zlego prostokata ekranu jako dowodu
  pracy w Aurorze.
- Po backup recovery nie otwierac modulu drugi raz; to moze popsuc stan sesji
  i niepotrzebnie wydluza heartbeat.
- Jesli Toolset lub dialog pojawia sie jako klasa `Ghost`, nie kontynuowac
  atomu na tym samym oknie. Zapisac screenshot, zrestartowac Toolset i wybrac
  `Tak` przy backup recovery.
- Nie uzywac globalnego `SendKeys` ani nie przejmowac kursora.
- Nie uzywac remote-memory read/write na TreeView; wczesniej bylo to ryzykowne
  dla stabilnosci Toolsetu.
- Sama obecnosc `TfrmViewerArea - _ikea` nie wystarcza. Trzeba miec screenshot
  z niepustym renderem sceny.

## HB-S19: recovery po ghost window

W trakcie proby `Find Instance` eksperymenty `UIAutomationClient` /
`ValuePattern` oraz keypost do pola `With Tag` doprowadzily do ghost window.
Toolset zostal wymuszony do zamkniecia, uruchomiony ponownie z modulem
`the_last_city — codex.mod`, a prompt backup recovery zostal obsluzony przez
przycisk `&Tak`.

Dowody:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-222-s19-find-instance-after-wmclose.png` | Ghost window po nieudanym zamknieciu `Find Instance`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-223-s19-after-restart-second.png` | Backup prompt po restarcie Toolsetu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-224-s19-after-backup-yes-second.png` | Odzyskane drzewo modulu po `Tak`, bez ponownego `File > Open`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-226-s19-areas-expanded-after-restart.png` | `Areas` rozwiniete po recovery. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-234-s19-after-area-properties-cancel.png` | Powrot do czystego drzewa po anulowaniu `_ikea` Area Properties. |

Wniosek: backup recovery dziala, ale po tym konkretnym restarcie `_ikea`
otwierala `Old File Format` i `Area Properties` z pustym `Name`. Klik `OK`
pokazywal `Invalid Filename`; zamknieto przez `Cancel`, bez zapisu modulu.

## Status

- Recovery backupu: `opened-live`.
- Otwarcie `_ikea` z odzyskanego drzewa: `safe-repeatable`, o ile dowod
  zawiera niepusty render sceny.
- Modul nie zostal zapisany w ramach tej proby.

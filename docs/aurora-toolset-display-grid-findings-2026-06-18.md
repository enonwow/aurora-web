# Aurora Toolset: Environment Display Grid

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area: `enon_bakery`  
Status: `safe-repeatable` dla widokowego toggle `Display Grid`, bez zapisu
modulu.

## Cel

Nauczyc atom `Environment -> Display Grid`: wylaczenie i przywrocenie czerwonych
linii grid/tile bounds na aktywnym canvasie area.

Ten atom jest przydatny przy pracy z tile/terrain:

- grid wlaczony pomaga widziec granice tile;
- grid wylaczony pomaga robic czystsze screenshoty kompozycji i dekoracji.

## Stan startowy

- Toolset otwarty na drugim ekranie.
- Aktywny canvas `enon_bakery`.
- Brak modalnych okien.
- `Display Grid` byl wlaczony przed testem.

## Przebieg live

1. Odczytano menu z faktycznej ramki `TfrmFrame` (`HWND 458816`), nie z
   zerowego `TApplication`.
2. `Environment -> Display Grid` ma ID menu `104`.
3. Stan przed testem: `0x108`, czyli pozycja checked.
4. Wyslano celowane `WM_COMMAND 104` do `TfrmFrame`.
5. Stan po pierwszym toggle: `0x100`, czyli unchecked; na screenshotcie czerwone
   linie grid/tile bounds zniknely.
6. Wyslano `WM_COMMAND 104` drugi raz jako rollback.
7. Stan po rollbacku: `0x108`, czyli checked; czerwone linie wrocily.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-296-s30-before-display-grid-toggle.png` | Stan przed toggle; grid widoczny. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-297-s30-after-display-grid-first-toggle.png` | Po pierwszym toggle; czerwone linie grid/tile bounds zniknely. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-298-s30-after-display-grid-restore.png` | Po rollbacku; grid wrocil. |

## Wniosek operacyjny

`Display Grid` jest bezpiecznym atomem widokowym i nie wymaga zapisu modulu.
Najpewniejszy dowod to polaczenie:

- screenshot przed/po;
- odczyt stanu menu: `0x108 -> 0x100 -> 0x108`.

## Rollback

Przed zakonczeniem atomu stan ma wrocic do wartosci startowej. W tym przebiegu
stan startowy byl checked, wiec rollback to drugie wywolanie `Display Grid`.

## Pulapki

- Nie pobierac ID z `TApplication`, bo to okno ma zerowy rozmiar i nie jest
  robocza ramka Toolsetu.
- Nie mylic `Display Grid` z `Object Filters`: grid zmienia czerwone linie
  tile, ale nie ukrywa obiektow.
- Jezeli kolejny eksperyment potrzebuje czystego screenshotu, mozna grid
  wylaczyc, ale trzeba wpisac to w stan startowy i przywrocic po tescie.
- Refresh HB-010 na aktywnym `d_und`: `PostMessage WM_COMMAND 104` zmienil stan
  menu `0x108 -> 0x100 -> 0x108`, ale screenshoty before/after/rollback mialy
  identyczny SHA256. Tego przebiegu nie promowac jako visual-success; kolejny
  test powinien wymusic repaint/refresh canvasu i dopiero wtedy sprawdzac
  znikniecie czerwonych linii.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak zapisu modulu.
- Toolset pozostal responsywny po operacji.

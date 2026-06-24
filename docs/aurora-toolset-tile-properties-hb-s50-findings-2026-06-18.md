# Aurora Toolset - Tile Properties HB-S50 Findings

Data: 2026-06-18

Cel: odtworzyc bezpieczna sciezke do `Tile Properties` bez malowania tile i
sprawdzic, czy pozycje popupu da sie aktywowac akceleratorem bez globalnego
kursora.

## Status

- Rodzina: `Tile/Terrain`.
- Atom: wybor istniejacego tile + popup `Tile Properties`.
- Wynik: `partial-live`.
- `Select Terrain` i zaznaczenie tile sa powtarzalne.
- Popup z pozycja `Tile Properties` pojawia sie live.
- Dialog `Tile Properties` nadal jest `gap`.
- Nie wykonano paint, nie zapisano modulu.

## Warunek startowy

- Aurora Toolset dzialal na drugim ekranie.
- Modul `the_last_city - codex.mod` byl otwarty.
- Aktywny obszar: `d_und`.
- Widoczny canvas z istniejacymi tile.
- Widoczna lewa galaz `d_und -> Triggers`; prawa paleta byla w stanie
  `Placeables`.
- Brak widocznego modala.

## Akcje

1. Zrobiono screenshot stanu startowego.
2. Wyslano `WM_COMMAND 73` do glownej ramki Toolsetu, czyli
   `View -> Selection Mode -> Select Terrain`.
3. Celowanym `WM_LBUTTONDOWN/UP` kliknieto istniejacy tile na aktywnym
   `TScrollBox` canvasu (`client 455,752`).
4. Tile dostal niebieski outline zaznaczenia; brak paint.
5. Celowanym `WM_RBUTTONDOWN/UP` otworzono popup na zaznaczonym tile.
6. Popup `#32768` pojawil sie na pierwszym ekranie przy pozycji kursora
   systemowego, mimo ze globalny kursor nie byl ruszany.
7. Proba `SendMessage WM_CHAR 't'` do popupu nie otworzyla dialogu i
   zablokowala skrypt PowerShell do timeoutu narzedzia.
8. Toolset pozostal responsywny; widoczny byl tylko popup `#32768`.
9. Popup zamknieto przez targetowane `PostMessage Escape`.
10. Przywrocono `Select Objects` przez `WM_COMMAND 74`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/aurora-atomic-ops/hb-539-s50-tileprops-current-state.png` | Stan startowy: `d_und`, canvas widoczny, brak modala. |
| `../.codex-tmp/aurora-atomic-ops/hb-540-s50-after-select-terrain-command73.png` | Po `WM_COMMAND 73`; tryb wyboru terenu bez paint. |
| `../.codex-tmp/aurora-atomic-ops/hb-541-s50-after-existing-tile-click.png` | Po kliknieciu istniejacego tile; niebieski outline selection. |
| `../.codex-tmp/aurora-atomic-ops/hb-545-s50-timeout-recovery-virtual.png` | Po timeout: popup `Tile Properties` widoczny na pierwszym ekranie, Toolset responsywny. |
| `../.codex-tmp/aurora-atomic-ops/hb-546-s50-after-popup-closed-select-objects.png` | Po zamknieciu popupu i powrocie do `Select Objects`. |
| `../.codex-tmp/aurora-atomic-ops/hb-547-s50-after-popup-closed-virtual.png` | Stan koncowy na wszystkich ekranach; brak popupu i modala. |

## Wnioski

- `WM_COMMAND 73` + celowany klik w istniejacy tile jest bezpiecznym atomem
  wyboru terrain/tile.
- Popup `Tile Properties` jest powtarzalny, ale jego pozycja moze byc na
  pierwszym ekranie, zgodnie z aktualna pozycja kursora systemowego.
- `SendMessage WM_CHAR 't'` do popupu `#32768` nie jest bezpieczna metoda:
  moze zablokowac proces automatyzacji do timeoutu i nie otwiera dialogu.
- Do kolejnych prob z popupem uzywac tylko `PostMessage` albo
  `SendMessageTimeout`, nigdy zwyklego `SendMessage` bez timeoutu.
- Nie awansowac dialogu `Tile Properties` do `opened-live`; live mamy tylko
  selection i popup.

## Nastepny eksperyment

Szukac alternatywnej sciezki do dialogu `Tile Properties`:

- przez menu glowne po aktywnym `Select Terrain`;
- przez identyfikacje VCL menu-loop zamiast surowego Win32 popupu;
- albo odlozyc dialog `Tile Properties` i przejsc do kolejnych atomow
  `Tile/Terrain`, ktore nie wymagaja aktywacji problematycznego popupu.


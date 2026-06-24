# Aurora Toolset: Area Properties enon_bakery safe-cancel refresh

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area: `enon_bakery`  
Status: `opened-live`, bez mutacji i bez zapisu modulu.

## Cel

Odtworzyc bezpieczna sciezke do `Area Properties` dla `enon_bakery`, zrobic
swieza serie screenshotow wszystkich zakladek i `Environment Options`, a potem
zamknac wszystko przez `Cancel`.

Ten dokument jest swiezym przebiegiem po atomach `Display Grid`, `Use Area
Lighting` i `Fog`. Nie zastepuje starszego dokumentu Area Properties; oddziela
bezpieczna sciezke `Cancel-only` od historycznej proby, w ktorej pojawil sie
dirty marker `*`.

## Stan startowy

- Toolset otwarty na drugim ekranie.
- Aktywny canvas `enon_bakery`.
- `enon_bakery` zaznaczone w drzewie `Areas`.
- Brak modalnych okien.
- `Use Area Lighting` i `Fog` byly przywrocone do off po poprzednich atomach.

## Sekwencja live

1. Proba celowanego `Enter` do lewego `TTreeView` nie otworzyla dialogu.
2. Otworzono menu kontekstowe na zaznaczonym `enon_bakery`.
3. Menu pokazalo `View Area`, `Create Copy`, `Remove`, `Export Area`,
   `Properties`.
4. Akcelerator `p` zamknal menu bez akcji, wiec nie uznajemy go za pewna
   sciezke.
5. Pewna sciezka w tym przebiegu: celowany klik w dolny wiersz popupu
   `Properties`.
6. Otworzyl sie `TdlgAreaProperties` z `Name = enon_bakery`.
7. Zrobiono crop dialogu dla wszystkich zakladek.
8. Na karcie `Visual` kliknieto `Customize Environment`.
9. Zrobiono screenshot `Environment Options`.
10. `Environment Options` zamknieto przez `Cancel`.
11. `Area Properties` zamknieto przez `Cancel`.

## Zakladki Area Properties

| Zakladka | Screenshot |
| --- | --- |
| `Basic` | `../.codex-tmp/toolset-heartbeat-20260618/hb-312-s33-area-properties-tab-basic.png` |
| `Visual` | `../.codex-tmp/toolset-heartbeat-20260618/hb-312-s33-area-properties-tab-visual.png` |
| `Audio` | `../.codex-tmp/toolset-heartbeat-20260618/hb-312-s33-area-properties-tab-audio.png` |
| `Events` | `../.codex-tmp/toolset-heartbeat-20260618/hb-312-s33-area-properties-tab-events.png` |
| `Advanced` | `../.codex-tmp/toolset-heartbeat-20260618/hb-312-s33-area-properties-tab-advanced.png` |
| `Comments` | `../.codex-tmp/toolset-heartbeat-20260618/hb-312-s33-area-properties-tab-comments.png` |

## Environment Options

Screenshot:

`../.codex-tmp/toolset-heartbeat-20260618/hb-313-s33-environment-options-dialog.png`

Widoczne wartosci:

- Day/Night Cycle: `Always Dark`.
- Sun: `Fog Amount = 0`.
- Moon: `Fog Amount = 10`.
- Fog Clip Distance (m): `45`.
- Shadow Opacity: `60`.
- Weather Wind Power: suwak przy `Min`.
- Weather snow/rain/lightning: `0`.
- Sky Box: `None`.

Przyciski widoczne w dialogu: `Apply`, `OK`, `Cancel`. W tym przebiegu uzyto
tylko `Cancel`.

## Dowody dodatkowe

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-307-s33-before-area-context-properties.png` | Stan przed menu kontekstowym. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-308-s33-area-context-menu-properties.png` | Menu kontekstowe z `Properties`; akcelerator `p` okazal sie niewystarczajacy. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-310-s33-area-context-menu-before-click-properties.png` | Druga proba z menu przed celowanym kliknieciem w `Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-311-s33-after-click-properties-row.png` | `Area Properties` otwarte dla `enon_bakery`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-314-s33-after-environment-options-cancel-area-properties.png` | Powrot do `Area Properties` po `Cancel` w `Environment Options`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-315-s33-after-area-properties-cancel.png` | Powrot do canvasu po `Cancel` w `Area Properties`. |

## Wnioski operacyjne

- Dla `enon_bakery` pewna sciezka do `Area Properties` to context menu area i
  klik `Properties`.
- Sam `Enter` do `TTreeView` nie zadzialal w tym stanie.
- Akcelerator `p` nie jest pewny; moze zamknac popup bez akcji.
- `Customize Environment` otwiera pelny dialog lighting/fog/weather/skybox.
- `Always Dark` tlumaczy, dlaczego `Use Area Lighting` daje prawie czarny
  podglad renderu.

## Refresh HB-S46: targeted-only gap

Nowszy przebieg bez globalnego kursora zapisano osobno:
[Area Properties context menu targeting refresh](aurora-toolset-area-properties-context-menu-targeting-refresh-2026-06-18.md).

Wniosek z refreshu:

- Lewy tree trzeba celowac bezposrednio jako `TTreeView` `329966`; 
  `WindowFromPoint` moze zwrocic glowna ramke i zostawic zaznaczony zly area.
- Popup context menu dla `enon_bakery` otwiera sie stabilnie z `TTreeView`.
- `Properties` w popupie ma ID `19`, ale proste `WM_COMMAND 19`,
  `PostMessage` click i `VK_END + VK_RETURN` nie otworzyly dialogu w tej sesji.
- `WM_CHAR p` jest ryzykowne: w HB-S46 otworzylo properties dla zlego
  `enon_butcher`; dialog zamknieto przez `Cancel`.
- Dlatego stary safe-cancel snapshot pozostaje dowodem historycznym, ale
  aktualna targetowana aktywacja `Properties` ma status `gap`.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak `OK`.
- Brak `Apply`.
- Brak zapisu modulu.
- Oba dialogi zamkniete przez `Cancel`.
- Toolset pozostal responsywny po operacji.

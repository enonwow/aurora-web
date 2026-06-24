# Aurora Toolset: Area Properties environment findings

Data: 2026-06-18

Ten dokument opisuje pierwszy live-open atom dla oswietlenia/fogu obszaru.
Zgodnie z ustaleniem operatora testy oswietlenia robimy na `enon_bakery`.

## Kontekst proby

- Modul: `the_last_city - codex.mod`.
- Area: `enon_bakery`.
- Stan startowy: Toolset odzyskany z backupu, ustawiony na drugim ekranie,
  `enon_bakery` otwarta i renderujaca.
- Zakres: tylko otwarcie dialogow i rozpoznanie kontrolek, bez mutacji.

## Sekwencja, ktora zadzialala

1. W drzewie modulu rozwinac `Areas`.
2. Otworzyc `enon_bakery` i potwierdzic render.
3. Prawy klik na wpisie `enon_bakery` w drzewie.
4. W menu kontekstowym wybrac `Properties`.
   - Potwierdzony item menu: `&Properties`, ID `19`.
   - Najpewniejsza sciezka w tej sesji: po otwarciu menu kontekstowego wyslac
     akcelerator `P` do popupu.
5. W `Area Properties` przejsc na karte `Visual`.
6. Kliknac `Customize Environment`.
7. Zrobic screenshot `Environment Options`.
8. Zamknac `Environment Options` przez `Cancel`.
9. Zamknac `Area Properties` przez `Cancel`.

## Rozpoznane kontrolki

`Area Properties`:

- klasa dialogu: `TdlgAreaProperties`;
- karty: `Basic`, `Visual`, `Audio`, `Events`, `Advanced`, `Comments`;
- karta do oswietlenia: `Visual`;
- przycisk: `Customize Environment`.

`Environment Options`:

- klasa dialogu: `TdlgEnvironment`;
- Day/Night Cycle: `Cycle Day and Night`, `Always Bright`, `Always Dark`;
- Sun: ambient color, diffuse color, fog amount, fog color, shadows;
- Moon: ambient color, diffuse color, fog amount, fog color, shadows enabled;
- Fog Clip Distance;
- Shadow Opacity;
- Weather: wind power, snow, rain, lightning;
- Sky Box;
- przyciski: `Apply`, `OK`, `Cancel`.

W obserwowanym stanie `enon_bakery` miala zaznaczone `Always Dark`.
Widoczne wartosci na screenie: `Sun - Fog Amount = 0`,
`Moon - Fog Amount = 10`, `Fog Clip Distance = 45`,
`Shadow Opacity = 60`, weather snow/rain/lightning = `0`, `Sky Box = None`.

## Dowody

`enon_bakery` otwarta i renderujaca:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-018-enon-bakery-open-attempt.png`

`Area Properties` na karcie `Basic`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-023-after-context-p-properties.png`

`Area Properties` na karcie `Visual`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-024-area-properties-visual-tab.png`

`Environment Options`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-025-customize-environment-opened.png`

Stan po `Cancel`, z czytelnym renderem:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-027-after-cancel-buttons-readable-render.png`

## Pulapki

- Nie wybierac presetow z listy `Visual` bez osobnej zgody. Dialog ostrzega,
  ze wybor Environment Scheme moze skasowac custom area lighting, weather i
  tile lighting.
- Nie klikac `Apply` ani `OK` w pierwszym rozpoznaniu.
- `SendMessage BM_CLICK` na przycisku otwierajacym modal moze zablokowac
  proces wywolujacy do czasu zamkniecia dialogu. Dla przyszlych prob lepiej
  uzywac `PostMessage` albo liczyc sie z timeoutem.
- Po testach lighting/fog przywrocic z gornego paska domyslny czytelny widok,
  bo ciemny/fogowy render moze popsuc kolejne screenshoty dowodowe.
- Zamykac oba dialogi przez konkretne przyciski `Cancel`, nie przez `Apply`.

## HB-S19: dodatkowa dokumentacja zakladek Area Properties

Po restarcie Toolsetu i wyborze backup recovery `Tak` otwarcie `_ikea` z drzewa
`Areas` pokazalo modal `Old File Format`, a potem `Area Properties`.

W tym przebiegu udokumentowano wszystkie widoczne zakladki `Area Properties`:

| Zakladka | Screenshot |
| --- | --- |
| `Basic` | `../.codex-tmp/toolset-heartbeat-20260618/hb-230-s19-area-properties-tab-basic-crop.png` |
| `Visual` | `../.codex-tmp/toolset-heartbeat-20260618/hb-230-s19-area-properties-tab-visual-crop.png` |
| `Audio` | `../.codex-tmp/toolset-heartbeat-20260618/hb-230-s19-area-properties-tab-audio-crop.png` |
| `Events` | `../.codex-tmp/toolset-heartbeat-20260618/hb-230-s19-area-properties-tab-events-crop.png` |
| `Advanced` | `../.codex-tmp/toolset-heartbeat-20260618/hb-230-s19-area-properties-tab-advanced-crop.png` |
| `Comments` | `../.codex-tmp/toolset-heartbeat-20260618/hb-230-s19-area-properties-tab-comments-crop.png` |

Dodatkowy wniosek:

- karta `Basic` dla `_ikea` miala puste `Name`;
- klik `OK` w tym stanie pokazal `Invalid Filename` z tekstem
  `The area name is blank. Please enter a name.`;
- dialog zostal zamkniety przez `Cancel`, bez zapisu modulu;
- `_ikea` z tego przebiegu nie awansuje do poprawnego otwarcia canvasu, bo
  nie bylo widocznego renderu obszaru po zamknieciu properties.

## HB-S20: enon_bakery po recovery

Po anulowaniu `_ikea` wybrano w drzewie `enon_bakery` i wyslano `Enter`.
Otworzylo sie `Area Properties` z poprawnym `Name = enon_bakery`.

Udokumentowano osobna serie zakladek dla `enon_bakery`:

| Zakladka | Screenshot |
| --- | --- |
| `Basic` | `../.codex-tmp/toolset-heartbeat-20260618/hb-236-s20-enon-bakery-area-properties-tab-basic-crop.png` |
| `Visual` | `../.codex-tmp/toolset-heartbeat-20260618/hb-236-s20-enon-bakery-area-properties-tab-visual-crop.png` |
| `Audio` | `../.codex-tmp/toolset-heartbeat-20260618/hb-236-s20-enon-bakery-area-properties-tab-audio-crop.png` |
| `Events` | `../.codex-tmp/toolset-heartbeat-20260618/hb-236-s20-enon-bakery-area-properties-tab-events-crop.png` |
| `Advanced` | `../.codex-tmp/toolset-heartbeat-20260618/hb-236-s20-enon-bakery-area-properties-tab-advanced-crop.png` |
| `Comments` | `../.codex-tmp/toolset-heartbeat-20260618/hb-236-s20-enon-bakery-area-properties-tab-comments-crop.png` |

Wnioski:

- `enon_bakery` jest dobrym targetem do poznawania kart `Area Properties`;
- karta `Visual` ma preset `Interior Torch-lit Only` zaznaczony w tym stanie;
- karta `Audio` pokazuje brak ambient sound i brak music tracks;
- karta `Advanced` pokazuje `ResRef = enon_bakery`, `Tag = enon_bakery`,
  `Exterior`, `Artificial`, `Above ground`;
- klik `OK` zamknal properties i oznaczyl modul jako dirty (`*` w tytule),
  ale nie pokazal renderu/canvasu;
- ponowny `Enter` na `enon_bakery` otworzyl `Area Properties` ponownie;
- zakonczono przez `Cancel`, bez zapisu modulu.

Nastepny eksperyment dla oswietlenia nie powinien zaczynac od `OK` w tym
dialogu, tylko od znalezienia sciezki, ktora daje realny render obszaru albo
od jawnej decyzji, ze akceptujemy prace na dirty module w pamieci.

## Status

- `Area Properties -> Visual`: `opened-live`.
- `Environment Options`: `opened-live`.
- Mutacje: brak.
- Zapis modulu: brak.

## HB-S33: bezpieczny przebieg Cancel-only

Swiezy przebieg po odzyskaniu stabilnego canvasu `enon_bakery` zapisano w:

[Area Properties enon_bakery safe-cancel refresh](aurora-toolset-area-properties-enon-bakery-safe-cancel-2026-06-18.md).

Najwazniejsze roznice wzgledem starszych prob:

- `Area Properties` otwarto przez context menu area i klik `Properties`;
- `Enter` do `TTreeView` nie zadzialal w tym stanie;
- akcelerator `p` na popupie nie byl pewny;
- wszystkie zakladki oraz `Environment Options` udokumentowano screenshotami;
- `Environment Options` i `Area Properties` zamknieto przez `Cancel`;
- nie kliknieto `OK` ani `Apply`.

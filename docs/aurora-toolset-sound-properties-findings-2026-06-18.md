# Aurora Toolset: Sound Properties findings

Data: 2026-06-18

Ten dokument opisuje pierwszy live-open atom dla istniejacego sound markera w
Aurora Toolsecie. Celem bylo znalezienie gestszej lokacji niz `enon_bakery`,
otwarcie `Sound Properties`, rozpoznanie zakladek i zamkniecie bez mutacji.

## Kontekst proby

- Modul: `the_last_city - codex.mod`.
- Lokacja wybrana do dzwiekow: drzewo pokazuje
  `Arkona, Kanaly - zapomniany odcinek`; otwarty resref area:
  `hx_tygiel_under`.
- Powod wyboru: scena jest duzo gestsza od `enon_bakery`, ma wiele elementow,
  widoczne markery/obiekty i kontekst wodno-mechaniczny dobry do sound radius.
- Obiekt dzwiekowy: `Fireplace`.
- Zakres: tylko otwarcie properties i rozpoznanie kontrolek, bez zmian,
  bez `OK`, bez zapisu modulu.

## Sekwencja, ktora zadzialala

1. Otworzyc gestsza lokacje `Arkona, Kanaly - zapomniany odcinek`
   (`hx_tygiel_under`) z drzewa `Areas`.
2. Rozwinac galez area `Sounds`.
3. Wybrac istniejacy sound `Fireplace`.
4. Prawy klik na `Fireplace`.
5. Menu kontekstowe sounda zawiera:
   - `Focus on Object`, ID `2`;
   - `Adjust Location`, ID `3`;
   - `Cut`, ID `9`;
   - `Copy`, ID `10`;
   - `Remove`, ID `12`;
   - `Add To Palette`, ID `15`;
   - `Variables`, ID `18`;
   - `Properties`, ID `19`.
6. Po otwarciu menu kontekstowego wyslac akcelerator `P` do popupu, co wybiera
   `Properties`.
7. Przejsc przez zakladki `Basic`, `Positioning`, `Advanced`.
8. Zamknac przez `Cancel`.

## Rozpoznane zakladki

### Basic

- `Name`: `Fireplace`.
- `Tag`: `Fireplace`.
- Lista dzwiekow do odtwarzania: `al_cv_fireplace1`.
- Przyciski: `Play`, `Stop`, `Add Sounds...`, `Remove`, `Move Up`,
  `Move Down`.
- `Volume`: suwak z wartoscia przy prawej stronie skali, wizualnie `10`.

### Positioning

- Tryby:
  - `Plays everywhere in area`;
  - `Plays from a random position each time it is played`;
  - `Plays from a specific position`.
- Dla `Fireplace` zaznaczone bylo `Plays from a specific position`.
- `Volume Distances`:
  - `Cutoff distance (m)`: `10,0`;
  - `Max Volume Distance (m)`: `1,0`.
- `Height (m)`: `1,5`.
- `Random Range`: `North-South Random Range (m)` i
  `West-East Random Range (m)`, widoczne jako `0,0`.

### Advanced

- `Blueprint ResRef`: `fireplace`.
- `Active`: wlaczone.
- `When to play`:
  - `Play during the day`;
  - `Play at night`;
  - `Play at all times`;
  - `Specific Hours`.
- Dla `Fireplace` zaznaczone bylo `Play at all times`.
- `Play Style`: `Once`, `Repeating`, `Seamlessly looping`.
- Dla `Fireplace` zaznaczone bylo `Seamlessly looping`.
- `Play Order`: `Sequential`, `Random`.
- `Interval`, `Volume Variation`, `Pitch Variation` sa widoczne, ale
  czesc pol jest wyszarzona dla aktualnego stylu.

## Dowody

Gestsza lokacja `hx_tygiel_under` po otwarciu:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-029-candidate-area-arkona-kanaly.png`

Rozwinieta galaz `Sounds` z lista istniejacych sound markerow:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-030-arkona-sounds-node-attempt.png`

`Sound Properties` karta `Basic`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-031-fireplace-sound-properties.png`

`Sound Properties` karta `Positioning`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-032-fireplace-sound-positioning-tab.png`

`Sound Properties` karta `Advanced`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-033-fireplace-sound-advanced-tab.png`

Stan po `Cancel`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-034-after-sound-properties-cancel.png`

## Pulapki

- Najpierw szukac istniejacych sound markerow w `Areas > <area> > Sounds`.
  To pozwala uczyc properties bez tworzenia nowego obiektu.
- Menu kontekstowe sounda ma destrukcyjne `Remove`, wiec nie wybierac pozycji
  po koordynatach bez odczytu menu.
- `Adjust Location` jest dostepne takze dla sounda, ale pozostaje osobnym
  atomem.
- `Play` moze uruchomic dzwiek w Toolsecie; pierwszy atom properties nie
  wymaga playbacku.
- Zamykac przez `Cancel`, dopoki nie ma jawnego celu mutacji.
- Nie bylo globalnego ruchu kursora ani globalnego `SendKeys`.

## Status

- Wybór gestszej lokacji pod soundy: `opened-live`.
- `Sound Properties` dla istniejacego sounda: `opened-live`.
- Mutacje: brak.
- Zapis modulu: brak.

## Refresh HB-S47: playback i volume

Swiezy przebieg zapisano w:
[Sound playback and volume refresh](aurora-toolset-sound-playback-volume-refresh-2026-06-18.md).

Wnioski z refreshu:

- `hx_tygiel_under -> Sounds -> Fireplace` da sie ponownie odtworzyc live.
- `Play` i `Stop` dzialaja jako przyciski `TBitBtn` wywolywane przez
  `BM_CLICK`; screenshot pokazuje wykonana operacje UI, ale nie jest dowodem
  slyszalnosci audio.
- `Volume` nie mapuje sie bezposrednio jako `0..10`. Surowy `TTrackBar`
  startowal na `127`, co wizualnie odpowiada maksimum `10`; raw `64` daje
  okolice srodka, a raw `5` prawie minimum.
- Po tescie przywrocono raw `127` i zamknieto przez `Cancel`, bez `OK` i bez
  zapisu modulu.

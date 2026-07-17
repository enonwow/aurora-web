# Aurora Toolset: Sound playback and volume refresh

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area: `hx_tygiel_under` (`Arkona, Kanaly - zapomniany odcinek`)  
Sound: `Fireplace`  
Status: `opened-live`; `Play/Stop` uruchomione live, suwak volume rozpoznany
jako dialog-only z rollbackiem i `Cancel`.

## Cel

Odtworzyc sound atom na gestszej lokacji: otworzyc istniejacy marker sound,
uzyc `Play`/`Stop`, rozpoznac bezpieczne sterowanie suwakiem `Volume`, odswiezyc
screeny kart `Basic`, `Positioning`, `Advanced`, a potem zamknac przez `Cancel`.

## Stan startowy

- Toolset dzialal na drugim ekranie.
- Aktywne byly karty `enon_bakery*`, `enon_test_build`, pozniej takze
  `guild_merchants` i `hx_tygiel_under`.
- Brak modalnych okien przed otwarciem sound properties.
- Lewy tree `TTreeView` mial uchwyt `329966`.
- Modul byl juz oznaczony gwiazdka z wczesniejszych prac; w tym atomie nie
  wykonywano `OK` ani zapisu.

## Sekwencja live

1. Aktualny widok drzewa byl nizej niz poprzedni snapshot soundow.
2. `WM_MOUSEWHEEL` do `TTreeView` przewinal drzewo do okolicy Arkony.
3. Pierwszy double-click trafil w sasiedni area i otworzyl `guild_merchants`.
   To nie bylo zatwierdzenie ani zapis; karta zostala po prostu otwarta.
4. Skorygowany double-click wiersz wyzej otworzyl `hx_tygiel_under`.
5. Rozwinieto `hx_tygiel_under -> Sounds`.
6. Pierwsza proba trafila w `Triggers`; druga proba trafila w `Sounds` i
   pokazala liste markerow.
7. Zaznaczono `Fireplace`.
8. Prawy klik `PostMessage WM_RBUTTONDOWN/UP` na `Fireplace` otworzyl popup.
9. `WM_CHAR p` do popupu otworzyl `Sound Properties`.
10. W `Basic` kliknieto `Play`, odczekano ok. `800 ms`, kliknieto `Stop`.
11. Rozpoznano `TTrackBar` volume:
    - startowy `TBM_GETPOS` zwrocil `127`;
    - ustawienie raw `5` pokazalo suwak prawie przy minimum, wiec nie jest to
      ludzka skala `0..10`;
    - raw `64` pokazuje okolice srodka;
    - raw `127` przywraca wizualne maksimum `10`.
12. Po restore raw `127` przejscie na `Positioning` pokazalo radius/cutoff.
13. Przejscie na `Advanced` pokazalo aktywnosc, pory dnia i play style.
14. Dialog zamknieto przez `Cancel`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-482-s47-current-state-before-sound-refresh.png` | Stan przed sound refreshem, aktywne `enon_bakery`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-483-s47-after-tree-scroll-up-for-hx-tygiel.png` | Po celowanym przewinieciu tree; `Arkona, Kanaly...` widoczna. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-484-s47-after-doubleclick-hx-tygiel-area.png` | Bledny double-click otworzyl `guild_merchants`; pulapka koordynatow. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-485-s47-after-corrected-doubleclick-hx-tygiel.png` | Skorygowany double-click otworzyl `hx_tygiel_under`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-488-s47-after-corrected-expand-sounds-row.png` | `hx_tygiel_under -> Sounds` rozwiniete; `Fireplace` widoczny. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-489-s47-after-open-fireplace-sound-properties.png` | `Sound Properties` dla `Fireplace`, karta `Basic`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-490-s47-after-sound-play.png` | Po kliknieciu `Play`. Screenshot nie dowodzi audio, ale dowodzi operacji UI. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-491-s47-after-sound-stop.png` | Po kliknieciu `Stop`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-492-s47-volume-set-to-5-dialog-only.png` | Raw `5`: suwak blisko minimum, nie ludzka wartosc `5/10`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-494-s47-volume-raw64-approx-middle.png` | Raw `64`: okolice srodka skali volume. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-495-s47-volume-raw127-restored-max.png` | Raw `127`: przywrocone wizualne maksimum. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-496-s47-sound-positioning-tab-refresh.png` | `Positioning`: cutoff `10,0`, max volume distance `1,0`, height `1,5`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-497-s47-sound-advanced-tab-refresh.png` | `Advanced`: `Active`, `Play at all times`, `Seamlessly looping`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-498-s47-after-sound-properties-cancel.png` | Powrot po `Cancel`; brak modala i brak zatwierdzenia. |

## Wnioski operacyjne

- `hx_tygiel_under` jest dobrym obszarem do nauki soundow: ma wiele markerow,
  gesty widok i widoczne radius/obiekty.
- Dla sound markerow `WM_CHAR p` do popupu nadal jest skuteczna sciezka do
  `Properties`; inaczej niz przy area popup w S46.
- `Play`/`Stop` mozna wywolac przez `BM_CLICK` na przyciskach `TBitBtn`.
- Screenshot po `Play`/`Stop` nie dowodzi faktycznego dzwieku; dowodem live
  pozostaje wykonanie UI i brak zawieszenia Toolsetu. Audio wymaga osobnej
  metody weryfikacji, jesli bedzie potrzebne.
- `Volume` w `Sound Properties` uzywa raw skali `0..127`, mimo ze etykiety UI
  pokazuja `0`, `5`, `10`. Raw `127` odpowiada wizualnemu maksimum `10`.
- Nie uzywac `TBM_SETPOS 10` jako "volume 10"; to ustawia wartosc blisko
  minimum. Dla srodka uzyc okolic raw `64`; dla maksimum raw `127`.

## Rollback / cancel

- Po eksperymencie volume przywrocono raw `127`, czyli wizualny stan startowy.
- Dialog zamknieto przez `Cancel`.
- Nie klikano `OK`.
- Nie zapisano modulu.

## Pulapki

- Koordynaty drzewa sa wrazliwe na scroll i rozwiniete galezie. W S47 klik
  obok otworzyl `guild_merchants`, a klik za nisko zaznaczyl `Triggers`.
- Otwarta przez pomylke karta area nie jest mutacja modulu, ale nalezy zapisac
  ja jako hazard nawigacji.
- `TTrackBar` VCL moze miec skale surowa inna niz podpisy na UI.
- Nie promowac playbacku do pelnej weryfikacji audio bez zewnetrznego dowodu
  slyszalnosci albo logu audio.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak `OK`.
- Brak zapisu modulu.
- Toolset pozostal responsywny po `Cancel`.

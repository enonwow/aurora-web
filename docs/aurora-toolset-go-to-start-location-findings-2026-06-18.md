# Aurora Toolset: Go to Start Location findings

Data: 2026-06-18

Ten dokument opisuje live probe atomu `Go to Start Location` na aktywnym
canvasie `enon_bakery`. Zakres: wywolanie komendy widoku bez edycji area, bez
zapisu modulu i z porownaniem screenshotow przed/po.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul: `the_last_city - codex.mod` / wariant pliku z em-dash.
- Area: `enon_bakery`, otwarta przez `View Area`.
- Stan startowy: aktywny render area, brak modalnych okien, `Select Objects`
  ustawiony jako tryb pracy.
- Uwaga: tytul Toolsetu mial `*` juz przed tym atomem po wczesniejszym `OK` w
  `Area Properties`. W tym atomie nie wykonano mutacji i nie zapisano modulu.

## Sekwencja

1. Zrobic screenshot przed komenda.
2. Wywolac `Go to Start Location` przez ID menu `99`, zgodne z pozycja
   `View -> Object Filters -> Go to Start Location`.
3. Poczekac na odswiezenie renderu.
4. Zrobic screenshot po komendzie.
5. Porownac screenshoty.

## Wynik

Komenda nie zawiesila Toolsetu i nie otworzyla zadnego dialogu. Proces pozostal
`Responding=True`.

W tym konkretnym kadrze nie bylo jednak wyraznej zmiany widoku. Proste
porownanie probkowane po obszarze roboczym dalo okolo `0.53%` roznych probek,
co jest zbyt slabe, zeby traktowac ten przebieg jako pelny dowod resetu
pozycji kamery. Najbardziej prawdopodobne wyjasnienia:

- widok byl juz blisko start location;
- komenda resetuje tylko czesc stanu widoku;
- potrzeba najpierw celowo przesunac/panowac widok, a dopiero potem powtorzyc
  `Go to Start Location`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-286-s28-before-go-to-start-location.png` | Kadr przed `Go to Start Location`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-287-s28-after-go-to-start-location.png` | Kadr po `Go to Start Location`. |

## Pulapki

- Samo wywolanie komendy nie jest dowodem resetu widoku. Potrzebny jest
  screenshot diff albo wyrazna zmiana kadru.
- Dla kolejnej proby najpierw wykonac kontrolowany, udokumentowany pan/zoom,
  potem `Go to Start Location` i dopiero wtedy oceniac reset.
- `Go to Start Location` jest w menu `View -> Object Filters`, ale semantycznie
  dziala jak reset/nawigacja widoku, nie filtr obiektow.
- Zielony terrain preview nadal byl widoczny w tym przebiegu; nie mylic jego
  obecnosci z efektem `Go to Start Location`.

## Status

- `Go to Start Location`: `partial-live`.
- Mutacje: brak.
- Zapis modulu: brak.
- Nastepny eksperyment: najpierw kontrolowanie przesunac kadr, potem powtorzyc
  `Go to Start Location` i wymagac wyraznego before/after.

## HB-S35: proba po kontrolowanym panie

Cel: sprawdzic, czy `Go to Start Location` potrafi cofnac wyrazne, kontrolowane
przesuniecie widoku area wykonane z dolnego paska canvasu.

Stan startowy:

- aktywna area: `enon_bakery`;
- Toolset odpowiadal (`Responding=True`);
- brak modalnych okien;
- prawy palette pozostawal w trybie Placeables;
- widoczny nadal byl zielony terrain preview z poprzednich eksperymentow.

Akcja:

1. Screenshot przed panem: `hb-335-s35-before-camera-pan-buttons.png`.
2. Wykonano pan w prawo dolnym przyciskiem `TBitBtn` osiem razy.
3. Wykonano pan w dol dolnym przyciskiem `TBitBtn` szesc razy.
4. Screenshot po panie: `hb-336-s35-after-camera-pan-buttons.png`.
5. Wywolano `Go to Start Location` przez ID menu `99`; brak widocznego resetu.
6. Powtorzono sciezke realnego popup menu:
   `View -> Object Filters -> Go to Start Location`.
7. Screenshot po sciezce menu: `hb-342-s35-after-menu-path-go-to-start.png`.
8. Widok przywrocono recznie odwrotnymi panami: osiem razy w lewo i szesc razy
   w gore.

Wynik:

- kontrolowany pan byl bardzo widoczny: probkowany diff przed/po panie wyniosl
  ok. `32.867%`;
- `Go to Start Location` po tym panie nie przywrocil pozycji startowej:
  probkowany diff przed/po wywolaniu z menu wyniosl tylko ok. `0.028%`;
- reczne odwrocenie panow przywrocilo czytelny kadr roboczy;
- status zostaje `partial-live`, a dla resetowania panowania widoku ten atom ma
  wynik negatywny.

Dowody dodatkowe:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-335-s35-before-camera-pan-buttons.png` | Kadr przed kontrolowanym panem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-336-s35-after-camera-pan-buttons.png` | Kadr po panie w prawo/dol; widok wyraznie przesuniety. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-341-s35-go-to-start-highlighted-menu.png` | Realne menu z podswietlonym `Go to Start Location`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-342-s35-after-menu-path-go-to-start.png` | Kadr po wybraniu `Go to Start Location` z menu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-343-s35-after-camera-pan-restore-buttons.png` | Kadr po recznym rollbacku panowania. |

Wniosek operacyjny:

- Nie uzywac `Go to Start Location` jako pewnego rollbacku po dolnych
  przyciskach panowania canvasu.
- Dla testow, ktore przesuwaja widok przyciskami pan, rollbackiem pozostaje
  odwrotna sekwencja panow albo oddzielnie zweryfikowany reset widoku.
- Nastepny sensowny eksperyment to rozdzielic semantyke: sprawdzic start
  location marker, zoom/rotation oraz panning jako oddzielne stany widoku.

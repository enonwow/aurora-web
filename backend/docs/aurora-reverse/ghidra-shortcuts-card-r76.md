# Ghidra Shortcuts Card (R76)

Data: 2026-05-24  
Zakres: krotka karta skrotow Ghidry (Windows) pod reverse `nwtoolset`.  
Rola: Agent B13 (Keyboard Shortcuts Card).

Uwaga: mapowanie moze sie roznic miedzy wersjami; w razie rozjazdu sprawdz `Edit -> Tool Options -> Key Bindings`.

| # | Skrot (Windows) | Co robi | Kiedy uzywac przy reverse `nwtoolset` |
|---|---|---|---|
| 1 | `Ctrl+S` | Zapis projektu/sesji | Po kazdej sensownej zmianie (rename, komentarze, typy). |
| 2 | `Ctrl+F` | Szukanie w aktywnym widoku | Szybkie filtrowanie w listingu/dekompilatorze/stringach. |
| 3 | `Ctrl+Shift+F` | Globalne wyszukiwanie (zaleznie od fokusu) | Szukanie tokenow domenowych przez panele. |
| 4 | `G` | Go To (adres/symbol) | Skok do adresu z notatek/exportu. |
| 5 | `L` | Rename symbol/label | Nadawanie nazw `AURORA_*` funkcjom i etykietom. |
| 6 | `;` | End-of-line comment | Krotkie `FACT/HYP` przy konkretnej instrukcji. |
| 7 | `Shift+;` | Pre-comment | Dluzszy kontekst nad blokiem kodu. |
| 8 | `X` | Xrefs do elementu | Sledzenie kto wywoluje/odwoluje sie do funkcji/stringa. |
| 9 | `F` | Create Function | Oznaczenie nowo rozpoznanego bloku jako funkcji. |
| 10 | `P` | Disassemble from cursor | Rozkladanie nierozpoznanego obszaru kodu. |
| 11 | `D` | Data type redefine/create data | Korekta interpretacji danych/struktur. |
| 12 | `Ctrl+Z` | Undo | Cofniecie nieudanej masowej zmiany. |
| 13 | `Ctrl+Y` | Redo | Przywrocenie cofniecia, gdy zmiana byla poprawna. |
| 14 | `Ctrl+C` | Copy | Kopiowanie adresow, nazw symboli, fragmentow pseudokodu. |
| 15 | `Ctrl+V` | Paste | Wklejanie nazw/komentarzy z przygotowanych notatek. |

## Mini rytm pracy (30s)

1. `G` do punktu zaczepienia (adres/symbol/string).  
2. `X` aby znalezc call-site i kontekst.  
3. `L` + `;`/`Shift+;` aby utrwalic znaczenie.  
4. `Ctrl+S` zanim przejdziesz dalej.

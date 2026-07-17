# Ghidra: Common Pitfalls (R72)

Poniżej lista najczęstszych pułapek początkujących w Ghidrze oraz szybkie sposoby naprawy.

## 1) Zły język procesora / architektura przy imporcie
- Pułapka: wybór np. x86 zamiast x64 albo ARM little-endian zamiast big-endian.
- Objawy: bezsensowny deasemblat, dziwne skoki, dużo `undefined`.
- Naprawa: zaimportuj plik ponownie z poprawnym `Language` i `Compiler Spec`; porównaj z nagłówkiem PE/ELF/Mach-O.

## 2) Ignorowanie opcji Auto-Analysis
- Pułapka: uruchomienie analizy na domyślnych ustawieniach bez refleksji.
- Objawy: brak wykrytych funkcji, słabe nazwy, niepełny CFG.
- Naprawa: uruchom Auto-Analysis ponownie i włącz brakujące analizatory (np. demangler, function ID, stack).

## 3) Brak ponownej analizy po większych zmianach
- Pułapka: ręcznie poprawiasz funkcje, ale nie re-runujesz analizy.
- Objawy: stare etykiety, niespójne typy, zdeaktualizowane referencje.
- Naprawa: użyj `Analysis -> Auto Analyze` dla programu lub zakresu po istotnych edycjach.

## 4) Mylenie kodu z danymi
- Pułapka: oznaczanie danych jako instrukcje (albo odwrotnie).
- Objawy: „śmieciowy” deasemblat, nierealne instrukcje.
- Naprawa: użyj `D` (Data) / `C` (Code), sprawdź XREF-y, alignment i sekcję (`.text` vs `.rdata/.data`).

## 5) Nieuwzględnianie punktu wejścia i startup code
- Pułapka: analiza zaczyna się od „pierwszej ciekawej funkcji”, pomijając init/loader.
- Objawy: brak kontekstu argumentów, globalsów i flow uruchomienia.
- Naprawa: zacznij od Entry Point, przejdź przez CRT/startup i dopiero potem do logiki aplikacji.

## 6) Przesadne zaufanie dekompilatorowi
- Pułapka: traktowanie pseudokodu jak źródła prawdy.
- Objawy: błędne założenia o warunkach, pętlach i typach.
- Naprawa: zawsze weryfikuj w Listingu ASM i CFG; przy niejasnościach trzymaj się instrukcji.

## 7) Brak poprawnego modelu wywołań (calling convention)
- Pułapka: złe `__stdcall/__cdecl/fastcall/thiscall`.
- Objawy: „rozjechany” stos, złe argumenty, dziwne wartości zwracane.
- Naprawa: ustaw właściwy calling convention w sygnaturze funkcji; porównaj użycie rejestrów i cleanup stosu.

## 8) Niepoprawne typy danych i struktur
- Pułapka: pozostawianie `undefined*` wszędzie.
- Objawy: nieczytelny pseudokod, brak sensu w offsetach.
- Naprawa: twórz i aplikuj `struct/enum/typedef`; propaguj typy od znanych API i buforów.

## 9) Ignorowanie menedżera stringów
- Pułapka: brak przeglądu stringów na początku analizy.
- Objawy: tracisz szybkie tropy funkcjonalności.
- Naprawa: użyj okna `Defined Strings`, przechodź po XREF-ach do stringów i taguj istotne ścieżki.

## 10) Słabe nazewnictwo symboli
- Pułapka: zostawianie domyślnych `FUN_...`, `DAT_...`.
- Objawy: chaos poznawczy po kilku godzinach.
- Naprawa: od razu renamuj funkcje/zmienne według roli; dodawaj krótkie komentarze i bookmarki.

## 11) Brak pracy z XREF-ami
- Pułapka: analiza „linia po linii” bez grafu zależności.
- Objawy: gubienie przepływu danych i kontroli.
- Naprawa: używaj `References To/From`, Call Graph i Function Graph jako głównej nawigacji.

## 12) Pomijanie tablic skoków (jump tables)
- Pułapka: nierozpoznanie switch-case.
- Objawy: „ucięte” bloki, brak części ścieżek.
- Naprawa: ręcznie oznacz tablice i targety; popraw typy indeksu; uruchom re-analizę zakresu.

## 13) Błędna interpretacja wskaźników i pointer arithmetic
- Pułapka: traktowanie offsetów jak „losowych liczb”.
- Objawy: mylne wnioski o layoutcie obiektów.
- Naprawa: zbuduj strukturę docelową i mapuj offsety do pól; sprawdzaj skale indeksowania.

## 14) Brak rozpoznania importów i API
- Pułapka: ignorowanie funkcji bibliotecznych/systemowych.
- Objawy: marnowanie czasu na analizę znanych rutyn.
- Naprawa: zacznij od import table/externals; nazwij wrappery; śledź przepływ przez API graniczne.

## 15) Nierozpoznanie packera/obfuscacji
- Pułapka: pełna analiza statyczna spakowanej próbki.
- Objawy: mało sensownych funkcji, nietypowe sekcje, anty-analiza.
- Naprawa: wykryj packer, wykonaj unpacking (dynamicznie lub narzędziowo), analizuj rozpakowany obraz.

## 16) Brak walidacji hipotez
- Pułapka: przyjęcie pierwszej interpretacji bez testów.
- Objawy: „ładna” teoria, która nie trzyma się całości.
- Naprawa: potwierdzaj hipotezy w wielu miejscach (ASM, XREF, dane, emulacja/dynamika).

## 17) Praca bez wersjonowania notatek i artefaktów
- Pułapka: zmiany i odkrycia zostają tylko w projekcie lokalnym.
- Objawy: trudny powrót do wcześniejszych wniosków.
- Naprawa: prowadź dziennik analizy, eksportuj kluczowe notatki, trzymaj je w repo.

## 18) Brak checkpointów projektu Ghidra
- Pułapka: duże eksperymenty bez punktu powrotu.
- Objawy: trudność z odkręceniem nietrafionych zmian.
- Naprawa: rób kopie projektu/snapshoty przed większym refactoringiem typów i symboli.

## Szybka checklista na start
- Potwierdź architekturę, endianness i ABI.
- Uruchom Auto-Analysis świadomie (nie ślepo).
- Zacznij od Entry Point i importów.
- Od razu poprawiaj nazwy, typy i komentarze.
- Każdy ważny wniosek sprawdź w ASM, nie tylko w dekompilatorze.

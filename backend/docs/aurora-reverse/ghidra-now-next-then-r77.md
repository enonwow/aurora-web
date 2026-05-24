# Ghidra: Now-Next-Then (dla początkującego)

## NOW (15 min)
Cel: uruchomić projekt i nie zgubić się w interfejsie.

1. Otwórz Ghidrę i utwórz nowy projekt (`Non-Shared Project`).
2. Zaimportuj jeden plik binarny (na start tylko jeden).
3. Kliknij `Analyze` i zostaw domyślne opcje.
4. W oknach `Symbol Tree`, `Listing` i `Decompiler` sprawdź, jak przełącza się między funkcjami.
5. Zapisz 3 notatki: co to za plik, jaki ma rozmiar, co było niezrozumiałe.

Gotowe, jeśli: plik jest zaimportowany, analiza się skończyła, a Ty umiesz otworzyć dowolną funkcję i zobaczyć ją w dekompilatorze.

## NEXT (30 min)
Cel: znaleźć pierwsze punkty zaczepienia w kodzie.

1. Otwórz `Functions` i przejrzyj nazwy funkcji (szukaj sensownych nazw lub podejrzanych prefiksów).
2. Otwórz `Defined Strings` i znajdź 5 ciekawych stringów (np. błędy, URL-e, ścieżki, nazwy komend).
3. Dla każdego stringa sprawdź `Xrefs` (kto go używa).
4. Oznacz 3 funkcje jako „ważne na później” (np. zmieniając nazwę lokalnie lub dodając komentarz).
5. Zapisz krótkie podsumowanie: „co wygląda na logikę biznesową, a co na bibliotekę/system”.

Gotowe, jeśli: masz listę 5 stringów + 3 funkcje warte dalszej analizy.

## THEN (60 min)
Cel: zrobić pierwszy mini-przegląd przepływu działania.

1. Wybierz 1 z 3 oznaczonych funkcji i przeanalizuj ją dokładniej.
2. Sprawdź `Xrefs to` i `Xrefs from`, żeby zobaczyć kto ją wywołuje i co wywołuje ona.
3. Rozrysuj prostą ścieżkę łańcucha wywołań (minimum 5 funkcji).
4. Dodaj komentarze w kluczowych miejscach: wejście, warunek, wyjście.
5. Zrób mini-raport (5-10 zdań):
   - co ta część programu robi,
   - jakie dane wejściowe przetwarza,
   - gdzie mogą być punkty ryzyka (np. parsowanie wejścia, operacje na plikach, sieć).

Gotowe, jeśli: masz jeden udokumentowany przepływ i jasny następny krok na kolejną sesję.

---

## Zasada na start
Nie próbuj zrozumieć całego pliku naraz. W każdej sesji kończ z jednym małym, konkretnym wynikiem.

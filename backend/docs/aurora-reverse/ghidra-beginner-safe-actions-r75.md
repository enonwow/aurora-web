# Agent C12: Beginner Safe Actions (Ghidra)

## 20 bezpiecznych akcji (co wolno robić od razu)

1. Utwórz nowy projekt w Ghidrze i pracuj na kopii pliku, nie na oryginale.
2. Zaimportuj binarkę w trybie domyślnym, bez agresywnych eksperymentalnych opcji.
3. Uruchom Auto-Analysis z ustawieniami domyślnymi przy pierwszym przejściu.
4. Zapisuj regularnie projekt po każdej większej serii zmian.
5. Przeglądaj "Program Trees" i sekcje, aby zrozumieć strukturę pliku.
6. Używaj "Symbol Tree" do nawigacji po funkcjach i symbolach.
7. Zmieniaj nazwy funkcji na bardziej opisowe (np. `FUN_...` -> `parse_header`).
8. Dodawaj komentarze do instrukcji i funkcji z własnymi hipotezami.
9. Oznaczaj stringi i miejsca ich użycia przez "References".
10. Śledź cross-references (XREF), aby zrozumieć przepływ wywołań.
11. Ustawiaj bookmarki w ważnych punktach kodu.
12. Używaj "Function Graph" do wizualnej analizy przepływu.
13. Ręcznie poprawiaj typy argumentów i zmiennych, gdy masz pewność.
14. Korzystaj z "Data Type Manager" do prostych, lokalnych struktur.
15. Porównuj dekompilację z listingiem assemblera przed wnioskami.
16. Dokumentuj niepewności komentarzem zamiast zgadywać na twardo.
17. Eksportuj notatki lub raport po sesji, aby zachować kontekst.
18. Twórz snapshoty projektu (kopie) przed większymi zmianami.
19. Traktuj wyniki dekompilatora jako sugestię, nie absolutną prawdę.
20. Weryfikuj kluczowe ustalenia w kilku miejscach (XREF, listing, decompiler).

## 10 niebezpiecznych akcji (czego unikać)

1. Nie analizuj jedynej kopii pliku bez backupu projektu.
2. Nie zakładaj, że dekompilacja C jest zawsze poprawna semantycznie.
3. Nie zmieniaj masowo typów i sygnatur bez punktów kontrolnych.
4. Nie usuwaj pochopnie istniejących symboli/etykiet bez notatki dlaczego.
5. Nie ignoruj kontekstu architektury (ABI, calling convention, endianness).
6. Nie nadpisuj własnych wcześniejszych notatek bez śladu zmian.
7. Nie wyciągaj wniosków o działaniu malware tylko z jednej funkcji.
8. Nie uruchamiaj podejrzanych próbek poza izolowanym środowiskiem.
9. Nie opieraj raportu na jednym artefakcie (np. samych stringach).
10. Nie wykonuj ryzykownych eksperymentów w głównym projekcie bez kopii.

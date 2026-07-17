# Ghidra PDB Warning Guidance (r74)

## Co oznacza warning PDB w Ghidrze
Warning o PDB zwykle znaczy, ze Ghidra nie znalazla albo nie zaladowala pliku debug symbols (.pdb) dla analizowanego pliku PE (EXE/DLL). To nie blokuje deasemblacji ani dekompilacji, ale tracisz dodatkowe metadane (np. nazwy funkcji, typy, struktury, czasem nazwy plikow zrodlowych).

## Kiedy mozna to zignorowac
- Gdy robisz szybki triage i interesuje Cie tylko flow sterowania lub konkretne byte-patterny.
- Gdy binarka jest i tak mocno stripowana/obfuskowana i PDB nie jest realistycznie dostepne.
- Gdy masz inne silne zrodla nazewnictwa: sygnatury API, stringi, porownanie z innymi buildami, wlasne mapowanie funkcji.

## Kiedy trzeba aktywnie szukac PDB
- Gdy analizujesz duzy modul i potrzebujesz szybko zrozumiec architekture kodu.
- Gdy robisz precyzyjne mapowanie typow, struktur i calling conventions.
- Gdy wynik RE ma trafic do zespolu dev/IR i musi byc czytelny, odtwarzalny i audytowalny.
- Gdy roznice miedzy wersjami (diff RE) sa kluczowe i potrzebujesz stabilnych nazw symboli.

## Wplyw na reverse engineering
Brak PDB nie uniemozliwia RE, ale podnosi koszt i ryzyko blednej interpretacji:
- wiecej czasu na reczne nazywanie funkcji i struktur,
- slabsza jakosc dekompilatu (mniej czytelne typy, nazwy genericzne),
- trudniejsza wspolpraca i review (mniej semantyki, wiecej domyslow).

Praktycznie: zacznij bez PDB, ale jesli po 30-60 minutach analiza stoi na nazewnictwie/typach, oplaca sie zatrzymac i sprobowac pozyskac PDB.

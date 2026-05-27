# Ghidra Safe Rename Policy (R74) — Beginner Rename Rules

## Cel
Te zasady pomagają nazywać funkcje i etykiety w Ghidrze tak, aby **nie psuć analizy** i łatwo cofać błędy.

## Zasada główna
Zmieniaj tylko nazwę. **Nie zmieniaj** typu, sygnatury, calling convention, stack frame ani komentarzy automatycznych, jeśli nie masz pewności.

## 1) Co wolno renamować
- Funkcje użytkownika (te, które analizujesz ręcznie).
- Lokalne etykiety/basic block labels, gdy poprawiają czytelność przepływu.
- Globalne symbole tylko wtedy, gdy ich rola jest stabilna i potwierdzona.

## 2) Czego nie ruszać na początku
- Funkcji bibliotecznych/importów (`thunk`, PLT, API wrappers), jeśli nie jesteś pewien.
- Symboli automatycznych używanych przez analizator, gdy ich znaczenie nie jest jasne.
- Nazw z konfliktami domenowymi (np. `decrypt_data`), gdy masz tylko jedną poszlakę.

## 3) Poziomy pewności (obowiązkowe)
Stosuj sufiks pewności w nazwie:
- `_p20` — hipoteza słaba (1 poszlaka)
- `_p50` — hipoteza średnia (2 niezależne poszlaki)
- `_p80` — hipoteza mocna (3+ poszlak)

Przykład:
- `FUN_00412340` -> `parse_header_p50`
- `LAB_00412410` -> `err_bad_magic_p80`

## 4) Minimalny standard dowodu przed rename
Zanim zmienisz nazwę funkcji, potwierdź przynajmniej 2 z poniższych:
- XREF-y (kto woła i w jakim kontekście).
- Stałe/ciągi znaków używane w funkcji.
- Wzorzec argumentów i wartości zwracanej.
- Podobieństwo do znanego idiomu (parser, checksum, init, cleanup).

Jeśli masz tylko 1 przesłankę, użyj neutralnej nazwy + `_p20`.

## 5) Konwencja nazw (bezpieczna)
- Używaj `snake_case`.
- Czasownik + obiekt dla funkcji: `parse_config`, `build_packet`, `check_crc`.
- Etykiety opisowe stanu/błędu: `err_timeout`, `loop_next_item`, `exit_ok`.
- Bez polskich znaków, bez spacji, bez skrótów nieczytelnych dla zespołu.

## 6) Nazwy neutralne vs. ryzykowne
Preferuj neutralne:
- `process_buffer_p20` zamiast `decrypt_payload_p20`
- `check_value_p50` zamiast `verify_license_p50`

Nazwy domenowe (np. `encrypt`, `auth`, `exploit`) dopiero przy `_p80`.

## 7) Reguły antykolizyjne
- Nie nadawaj tej samej nazwy różnym funkcjom bez prefiksu kontekstu.
- Gdy są warianty, dodaj sufiks techniczny:
  - `_len`, `_ctx`, `_impl`, `_v2`
- Przy rodzinie funkcji używaj wspólnego rdzenia:
  - `packet_read_*`, `packet_write_*`

## 8) Etykiety w funkcji (LAB_*)
- Zmieniaj tylko etykiety kluczowych gałęzi (error path, loop head, early return).
- Nie renamuj każdej etykiety — nadmiar nazw obniża czytelność.
- Dla warunków używaj nazw semantycznych, nie assemblerowych:
  - `if_invalid_len` zamiast `jz_target_1`

## 9) Workflow bezpieczny (krok po kroku)
1. Otwórz funkcję i przejrzyj dekompilację + listing.
2. Sprawdź XREF-y i call graph.
3. Zbierz 2-3 przesłanki.
4. Nadaj nazwę z poziomem pewności (`_p20/_p50/_p80`).
5. Dodaj krótki komentarz: skąd wniosek (1 linia).
6. Przejdź dalej; wróć do rewizji po analizie sąsiednich funkcji.

## 10) Kiedy cofnąć rename
Cofnij lub obniż pewność, gdy:
- Nowe XREF-y przeczą nazwie.
- Typy argumentów po dalszej analizie się nie zgadzają.
- Funkcja okazuje się wrapperem/thunkiem.

Przy cofnięciu zachowaj historię w komentarzu, np.:
- `was: decrypt_payload_p50, reason: actually checksum path`

## 11) Czerwone flagi (stop rename)
Wstrzymaj rename i oznacz jako `_p20`, gdy:
- Silna obfuskacja / flattening CFG.
- Mieszanie wielu odpowiedzialności w jednej funkcji.
- Brak stabilnych stringów i brak czytelnych call-site.

## 12) Szybki szablon nazwy
`<verb>_<object>[_<context>]_pXX`

Przykłady:
- `read_header_net_p50`
- `validate_token_fmt_p20`
- `init_session_ctx_p80`

## 13) Definition of Done dla rename
Rename jest „safe”, jeśli:
- Nazwa jest neutralna lub adekwatna do poziomu pewności.
- Ma sufiks `_pXX`.
- Istnieją minimum 2 przesłanki (albo jawnie `_p20`).
- Nie zmieniono nic poza nazwą (i ewentualnie krótkim komentarzem).

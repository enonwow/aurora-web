# Ghidra P0 Function Hunt Playbook (R72)

## Cel
Ten playbook prowadzi krok po kroku przez ręczne wyszukiwanie funkcji klasy **P0** w Ghidrze, z naciskiem na:
- `imports`
- `strings`
- `xrefs`
- `callgraph`

Zakładamy, że P0 to funkcje o najwyższym ryzyku (RCE, auth bypass, crypto misuse, niebezpieczna deserializacja, eskalacja uprawnień, trwały DoS, wyciek tajemnic).

## Definicja robocza P0 (co oznaczać)
Oznacz funkcję jako kandydat P0, gdy spełnia co najmniej jeden warunek:
1. Umożliwia zdalne wykonanie kodu/komendy lub ładowanie nieufnego kodu.
2. Pozwala obejść autoryzację lub podnieść uprawnienia bez poprawnej walidacji.
3. Przetwarza dane wejściowe użytkownika w kontekście parsera/deserialize bez twardych ograniczeń.
4. Dotyka sekretów (tokeny, klucze, hasła) i ma wyciek do logów/sieci/pliku.
5. Realizuje operacje krytyczne bez kontroli integralności lub bez sprawdzenia błędów.

## Etap 0: Przygotowanie projektu
1. Zaimportuj binarkę do Ghidry i uruchom `Auto Analyze` (domyślne + dekompilator).
2. Otwórz widoki: `Symbol Tree`, `Defined Strings`, `Function Call Graph`, `Decompiler`.
3. Ustaw własny system tagów/bookmarków:
- `P0-CANDIDATE`
- `P0-VERIFIED`
- `P1`
- `NEEDS-DATAFLOW`
4. Jeśli binarka jest stripowana, od razu planuj renaming funkcji po zachowaniach.

## Etap 1: Hunt po imports (szybki triage)
### 1.1 Lista importów wysokiego ryzyka
W `Symbol Tree -> Imports` szukaj najpierw API powiązanych z:
- Exec/Process: `system`, `popen`, `exec*`, `CreateProcess*`, `WinExec`
- Dynamic loading: `LoadLibrary*`, `GetProcAddress`, `dlopen`, `dlsym`
- Memory RWX / shellcode: `VirtualAlloc`, `VirtualProtect`, `mmap`, `mprotect`
- Deserializacja/parsery: `yaml`, `xml`, `json parse`, `protobuf decode`, custom unpack
- Crypto: `EVP_*`, `AES_*`, `RSA_*`, `BCrypt*`, `Crypt*`
- Sieć i IPC: `send`, `recv`, `WSARecv`, `HttpSendRequest`, `named pipe`
- Pliki/ścieżki: `fopen`, `CreateFile*`, `WriteFile`, `DeleteFile`, `MoveFile`
- Auth/identity: `LogonUser*`, `Impersonate*`, token/JWT helpers

### 1.2 Xrefs z importu do miejsc użycia
1. Na każdym imporcie: `Right click -> References -> Show References To`.
2. Grupuj miejsca użycia według kontekstu:
- Czy argument pochodzi z inputu sieciowego/CLI/pliku?
- Czy występuje sanitizacja/walidacja?
- Czy błędy są ignorowane?
3. Oznacz funkcję wywołującą jako `P0-CANDIDATE`, jeśli import jest krytyczny i wejście jest nieufne.

### 1.3 Priorytetyzacja importów
Najpierw analizuj ścieżki: `network input -> parser -> privileged action`.
To zwykle daje najwyższe prawdopodobieństwo P0.

## Etap 2: Hunt po strings (semantyka funkcji)
### 2.1 Wyszukiwanie stringów sygnałowych
W `Defined Strings` filtruj słowa kluczowe:
- Auth/session: `auth`, `token`, `jwt`, `session`, `admin`, `root`, `role`
- Crypto/secrets: `key`, `secret`, `private`, `BEGIN RSA`, `nonce`, `salt`
- Debug/backdoor: `debug`, `bypass`, `disable`, `test_mode`, `backdoor`
- Command/path: `cmd`, `powershell`, `/bin/sh`, `bash -c`, `exec`, `run`
- Error policy: `ignore`, `skip verify`, `insecure`, `TODO`
- Aktualizacje/ładowanie: `update`, `plugin`, `module`, `load`

### 2.2 String -> Xrefs -> Funkcja
1. Otwórz string.
2. `Show References To`.
3. Wejdź do funkcji i przeczytaj dekompilację wokół użycia stringa.
4. Oceń, czy string reprezentuje:
- decyzję bezpieczeństwa (np. flaga disable/allow),
- ścieżkę krytyczną (np. endpoint admin),
- operację uprzywilejowaną (np. restart usługi, update, exec).

### 2.3 Heurystyka scoringu stringów
Daj +1 za każdą cechę:
- string dotyczy auth/sekretów,
- występuje obok importu high-risk,
- funkcja ma wielu callerów (szeroki blast radius),
- brak oczywistej walidacji w dekompilacji.
Wynik 3-4: natychmiastowy `P0-CANDIDATE`.

## Etap 3: Xrefs i dataflow (dowód ryzyka)
### 3.1 Backward slicing (skąd dane)
Dla podejrzanego argumentu (np. do `system`):
1. Znajdź zmienną w dekompilatorze.
2. Idź wstecz po przypisaniach i callerach.
3. Ustal source: sieć, plik, env, rejestr, IPC.

### 3.2 Forward slicing (co robi dalej)
1. Od punktu walidacji (lub jej braku) idź do sinka.
2. Potwierdź, że dane trafiają do operacji krytycznej bez bezpiecznika.

### 3.3 Checkpointy walidacji
Szukaj twardych barier:
- allowlista zamiast regex-only,
- limity długości i typów,
- canonicalization ścieżek,
- podpis/MAC przed wykonaniem,
- fail-closed na błędzie.
Brak tych elementów wzmacnia klasyfikację P0.

## Etap 4: Callgraph (zasięg i osiągalność)
### 4.1 Budowa grafu dla kandydata
1. Otwórz funkcję kandydata.
2. `Function Call Graph` (in/out).
3. Zidentyfikuj:
- upstream entrypointy (socket handler, RPC, HTTP route, CLI),
- downstream privileged sinki (exec, file write, auth change, crypto key ops).

### 4.2 Pytania decyzyjne
- Czy ścieżka jest osiągalna z niezaufanego wejścia?
- Czy wymaga auth? Jeśli tak, czy check jest lokalny i szczelny?
- Czy jedna funkcja jest wspólna dla wielu endpointów?
- Czy błąd w tej funkcji daje jednorazowy crash czy trwały compromise?

### 4.3 Blast radius
Im więcej callerów i im bliżej centralnych dispatcherów, tym wyższy priorytet.
Funkcja używana globalnie + krytyczny sink => bardzo mocny kandydat P0.

## Etap 5: Manualna klasyfikacja P0
Oznacz jako `P0-VERIFIED`, jeśli masz łańcuch dowodowy:
1. **Source**: nieufne dane wejściowe.
2. **Path**: brak skutecznej walidacji/autoryzacji.
3. **Sink**: operacja krytyczna (exec/auth/sekret/integrity).
4. **Impact**: realny, wysoki skutek (RCE, takeover, wyciek kluczy, trwały DoS).

Jeśli brakuje jednego elementu, zostaw `NEEDS-DATAFLOW` i zbierz dodatkowe dowody.

## Etap 6: Szablon notatki dla każdej funkcji
Używaj jednolitego wpisu:

```text
Function: <name/address>
Tag: P0-CANDIDATE | P0-VERIFIED | P1
Source: <network/file/env/...>
Sink: <exec/auth/file/crypto/...>
Guards: <what exists / missing>
Reachability: <entrypoint + call path>
Impact: <RCE/auth bypass/data leak/DoS>
Confidence: High/Medium/Low
Evidence: <xrefs, strings, import names, key pseudocode lines>
```

## Etap 7: Kolejność pracy (praktyczny workflow 60-90 min)
1. 10-15 min: Imports triage + pierwsze `P0-CANDIDATE`.
2. 15-20 min: Strings hunt i mapowanie do funkcji.
3. 20-30 min: Xrefs/dataflow dla top 5 kandydatów.
4. 10-20 min: Callgraph i potwierdzenie osiągalności/impactu.
5. 5 min: Ostateczne tagi `P0-VERIFIED` + notatki dowodowe.

## Najczęstsze pułapki
1. Nadmierne zaufanie do nazwy funkcji (szczególnie po strip/obfuscation).
2. Pominięcie ścieżki błędu (czasem bypass jest tylko w error branch).
3. Brak analizy konfiguracji/flag runtime (feature flags potrafią otwierać sink).
4. Koncentracja na pojedynczym xref bez oceny osiągalności z entrypointu.

## Szybka checklista końcowa
1. Czy każdy `P0-VERIFIED` ma source-path-sink-impact?
2. Czy sprawdzono branch success i error?
3. Czy oceniono blast radius przez callgraph?
4. Czy istnieje minimalny scenariusz reprodukcji logicznej?
5. Czy są artefakty dowodowe (adresy, xrefs, stringi, API)?

---
Ten playbook jest celowo manualny i defensywny: najpierw szeroki triage (imports/strings), potem dowód przez xrefs/dataflow i na końcu priorytetyzacja callgraphem.

# Immediate Next 10 Tasks Post Ghidra (r71 -> start implementacji)

Data: 2026-05-24
Rola: Agent F8b
Baza: r69 (kontrakty + invariants), r70 (kolejnosc PR), r71 (plan i format eksportu Ghidra)

1. **Zamrozic i zweryfikowac artefakty eksportu r71 (preflight gate).**
- Wejscie: komplet plikow `nwtoolset_r71_*` z Pass A/B/C/D.
- Akcja: sprawdzic obecne pliki vs wymagany minimalny zestaw (`manifest`, `imports`, `functions`, `call-edges`, `globals`, `strings`, `decomp`, `failed-decomp`, `quality-report`).
- DoD: powstaje `backend/docs/aurora-reverse/r71-export-freeze-checklist.md` z `PASS/FAIL` dla kazdego artefaktu + hash SHA-256 paczki eksportu.

2. **Zaimplementowac walidator schematu JSONL dla artefaktow r71.**
- Wejscie: `functions_all_*.jsonl`, `call_edges_*.jsonl`, `strings_all_*.jsonl`, `imports_all_*.jsonl`.
- Akcja: dodac skrypt walidacji typow i pol wymaganych (address, symbol key, source layer, xref count, chunk id).
- DoD: komenda `npm run ghidra:validate-r71` zwraca exit code 0 dla poprawnej paczki i !=0 dla kontrolowanego bad sample.

3. **Zbudowac deterministyczny indeks funkcji z chunkow r71 (pod resolver/diagnostics).**
- Wejscie: `functions_all_*.jsonl`.
- Akcja: wygenerowac ujednolicony indeks `functionKey -> {address, symbol, flags, namespace, chunk}` z dedup po `(address, normalized_symbol)`.
- DoD: plik indeksu ma stabilny hash przy 2 kolejnych uruchomieniach na tym samym wejsciu.

4. **Zbudowac indeks call graph hot-path dla priorytetyzacji implementacji resolvera.**
- Wejscie: `call_edges_*.jsonl` + manifest entrypoints/imported UI callbacks.
- Akcja: policzyc centralnosc i reachability; wypluc top liste funkcji do decomp-first.
- DoD: powstaje `backend/docs/aurora-reverse/r71-hot-path-top100.md` z top-100 i uzasadnieniem rankingu.

5. **Wydzielic seed fixtures z r71 do testow kontraktowych resolvera (CT-01..CT-10 z r69).**
- Wejscie: decomp + function inventory + strings.
- Akcja: przygotowac 10 minimalnych fixture-setow pod scenariusze `ARE/GIT/2DA/TLK/UTC/UTP` (required/optional, policy-blocked, tie-break, timeout).
- DoD: pliki fixture sa gotowe pod `backend/test/contract/source-resolver/fixtures/*.json` i mapuja 1:1 na CT-01..CT-10.

6. **Uruchomic PR-1 step 1: dodac `pathSecurity` do runtime settings kontraktu i defaults (r69/r70).**
- Wejscie: rozjazdy I1 + D2 z `runtime-settings-adr-consistency-r69.md`.
- Akcja: rozszerzyc typy/schema/default config + migracja legacy bez `pathSecurity`.
- DoD: testy unit schema/repository przechodza i stary config laduje sie bez crasha.

7. **Uruchomic PR-1 step 2: wymusic split permission `admin.runtime_paths.write` dla mutacji path-sensitive.**
- Wejscie: D1 + I2 z r69.
- Akcja: dodac permission do policy, przekazac actor context do service, wymusic warunkowe 403 dla zmian path fields.
- DoD: e2e ma przypadek `403 FORBIDDEN_PERMISSION` bez nowej permission i `200` z kompletem uprawnien.

8. **Uruchomic PR-1 step 3: wdrozyc `RuntimeSettingsPathSecurityService` z canonical validation.**
- Wejscie: acceptance R69-PATH-01..08.
- Akcja: traversal/allowlist/absolute/symlink/TOCTOU checks + mapowanie do `422 VALIDATION_FAILED` z `details[].reasonCode`.
- DoD: nowe testy `runtime-settings.security.e2e-spec.ts` pokrywaja min. R69-PATH-01..07.

9. **Uruchomic PR-2 step 1: skeleton `SourceResolverPort` + `SourceResolverService` zgodny z kontraktem r69.**
- Wejscie: `resolver-interfaces-contract-r69.md`.
- Akcja: dodac `resolve`/`resolveMany`, canonical error model `SOURCE_*`, retry policy (`maxAttempts=3`, backoff+jitter).
- DoD: unit testy potwierdzaja no-retry dla validation/policy/not-found oraz retry tylko dla dependency/timeout.

10. **Uruchomic PR-2 step 2: podpiac CandidateCatalog adapter do indeksow r71 i odpalic kontraktowe CT-01..CT-10.**
- Wejscie: taski 3-5 + kontrakt r69.
- Akcja: adapter czyta przygotowane indeksy i zwraca kandydatow deterministycznie (stable order + tie-break).
- DoD: `npm run test:contract -- source-resolver` przechodzi dla wszystkich 10 scenariuszy.

## Kolejnosc wykonania (bezpieczna wg r70)
1. Task 1-5 (stabilizacja i operacjonalizacja eksportu r71)
2. Task 6-8 (PR-1 Runtime Settings Security Foundation)
3. Task 9-10 (start PR-2 Source Resolver Core)

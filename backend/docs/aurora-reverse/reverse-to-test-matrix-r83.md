# Reverse-to-Test Matrix R83 (Agent R15)

Data: 2026-05-24  
Zakres: mapowanie odkryc reverse (`r78-r82`) na testy backendowe `unit/regression/mutation`.

## 1. Zasady mapowania

1. `unit`: logika deterministyczna, walidacje kontraktow, state machine, policy.
2. `regression`: e2e/integration kontrakty API i zachowania cross-module.
3. `mutation`: opcjonalny eksperyment dla krytycznych bramek decyzyjnych; nie jest gate ani kryterium ukończenia i wymaga wyraźnego żądania użytkownika.
4. Priorytet gate:
- `P0`: musi wejsc do stalego CI teraz.
- `P1`: powinno wejsc po domknieciu biezacej iteracji.
- `P2`: hardening lub obszar HOLD.

## 2. Macierz reverse -> test

| Reverse ID / odkrycie | Co zabezpieczamy | Unit (scenariusze) | Regression (scenariusze) | Mutation (scenariusze) | Mapowanie na suite/pliki backend | Gate |
|---|---|---|---|---|---|---|
| `C1+C2+C3` (`reverse-validation-matrix-r79.md`) bootstrap path/TLK fallback | Kolejnosc pipeline i jawny error-path TLK | `R83-UNIT-001` bootstrap order; `R83-UNIT-002` dialog.tlk missing -> typed error | `R83-REG-001` `GET/PUT runtime` + restart/fail-fast behavior | `R83-MUT-001` negacja branchy fail-fast i missing TLK | Istniejace: `backend/test/unit/runtime-settings-bootstrap.service.spec.ts`, `backend/test/runtime-settings.e2e-spec.ts`; nowy: `backend/test/unit/tlk-resolver.service.spec.ts` | `P0` |
| `C4+C5` round-trip `Module.IFO` | Stabilnosc read/write kluczy (`Mod_CustomTlk`, `Mod_HakList`) | `R83-UNIT-003` read/write preserves keys; `R83-UNIT-004` unknown key passthrough policy | `R83-REG-002` packed-module sync keeps metadata unchanged after cycle | `R83-MUT-002` mutacje serializera (drop/rename key) maja byc zabite | Istniejace: `backend/test/unit/nwn-erf-packed-module-extractor.service.spec.ts`; nowy: `backend/test/unit/module-ifo-metadata.service.spec.ts` | `P0` |
| `C6+G6+MH-06` HAK conflict semantics niepelne | Determinizm rozstrzygania konfliktow i brak driftu | `R83-UNIT-005` stable sort+tiebreak for hak candidates | `R83-REG-003` fixture: kolidujace zasoby w wielu HAK -> ten sam winner/provenance | `R83-MUT-003` zabij mutacje comparatora (`>`, `<`, equality branch) | Istniejace: `backend/test/unit/runtime-settings.application.service.spec.ts`; nowy: `backend/test/unit/hak-priority-sorter.spec.ts`, `backend/test/haks-resolved.e2e-spec.ts` | `P1` |
| `C7+NH-04` 2DA lookup staged | Zaleznosc lookup od source stack + provenance | `R83-UNIT-006` lookup requires prepared source stack | `R83-REG-004` `resolved haks` + 2DA provenance consistency | `R83-MUT-004` mutacje branchy includeHaks/mode (`disabled/profile/inline`) | Istniejace: `backend/test/unit/runtime-settings.application.service.spec.ts`; nowy: `backend/test/unit/two-da-lookup.service.spec.ts` | `P1` |
| `C8+C9+C10+G7+MH-01+MH-05` wielosc parser lane GIT | Ochrona przed overfit do jednego call-path | `R83-UNIT-007` parser contract adapters accept equivalent list variants | `R83-REG-005` golden fixtures parse->serialize->parse dla `Creature/Door/Placeable List` | `R83-MUT-005` mutacje cardinality/list-key mapping musza padac | Nowy (po odblokowaniu module): `backend/test/unit/area-git-parser.contract.spec.ts`, `backend/test/processing-area.roundtrip.e2e-spec.ts` | `P2` (HOLD strict area) |
| `C11+MH-02` `AreaProperties` read/write | Spojnosc osobnego kontraktu `AreaProperties` vs listy | `R83-UNIT-008` strict field mapping + defaults policy | `R83-REG-006` regression dla `AreaProperties` round-trip | `R83-MUT-006` mutacje mapowania typow i required fields | Nowy: `backend/test/unit/area-properties.contract.spec.ts`, `backend/test/processing-area-properties.e2e-spec.ts` | `P2` |
| `C12+G2+MH-03` alias/duplikaty `LoadScreenID|LoadScreenId`, `LinkedToFlags` | Kompatybilna polityka aliasow bez cichej zmiany semantyki | `R83-UNIT-009` duplicate keys matrix (first/last wins - feature flagged) | `R83-REG-007` fixture corpus alias-case variants + numeric bounds | `R83-MUT-007` mutacje branchy alias policy i parse numeric (`byte/ushort`) | Nowy: `backend/test/unit/transition-alias-policy.spec.ts`, `backend/test/processing-transition-alias.e2e-spec.ts` | `P2` |
| `C13+H1+MH-04` UTC/UTP branch mapping czesciowo pewny | Brak falszywego przypisania lane `creature/placeable` | `R83-UNIT-010` classifier remains conservative when confidence low | `R83-REG-008` UT* fixtures keep current non-strict behavior | `R83-MUT-008` mutacje hard-map branch -> lane maja byc zabite | Nowy: `backend/test/unit/ut-branch-classifier.spec.ts`, `backend/test/processing-ut-enrichment.e2e-spec.ts` | `P2` |
| `G3+NH-05` runtime vs toolset drift | Obrona przed niezamierzonym overfit eksportu toolset | `R83-UNIT-011` parser mode flag (`runtime` vs `toolset`) affects only allowed branches | `R83-REG-009` same input under two modes -> expected deltas only | `R83-MUT-009` mutacje ignorujace mode flag sa zabijane | Nowy: `backend/test/unit/parser-mode-policy.spec.ts`, `backend/test/processing-mode-regression.e2e-spec.ts` | `P2` |
| Security `PARTIAL` (`reverse-coverage-audit-r82.md`, `security-controls-acceptance-tests-r69.md`) | Path hardening, permission split, anti-leak partition | `R83-UNIT-012` traversal/NUL/symlink deny; `R83-UNIT-013` defense-in-depth permission check | `R83-REG-010` R69-PATH-01..08; `R83-REG-011` R69-PERM-01..06; `R83-REG-012` R69-PART-01..07 | `R83-MUT-010` mutacje guard/policy branches (`FORBIDDEN_*`, ACL filters) | Istniejace: `backend/test/unit/runtime-settings.application.service.spec.ts`, `backend/test/unit/access.guard.spec.ts`, `backend/test/unit/auth.policy.spec.ts`, `backend/test/runtime-settings.e2e-spec.ts`, `backend/test/areas.e2e-spec.ts`, `backend/test/catalog.e2e-spec.ts` | `P0`->`P1` |
| Runtime settings `COMPLETE` (`reverse-coverage-audit-r82.md`) | Nie-regresja kontraktu `GET/PUT` i `haks/resolved` | `R83-UNIT-014` schema negative matrix A07-A12; `R83-UNIT-015` mode=none/profile/inline precedence | `R83-REG-013` A13-A15 + B09 authz matrix e2e | `R83-MUT-011` mutacje walidatora (required field, enum, trim/dedupe) | Istniejace: `backend/test/unit/runtime-settings.schemas.spec.ts`, `backend/test/unit/runtime-settings.application.service.spec.ts`, `backend/test/runtime-settings.e2e-spec.ts` | `P0` |
| Processing jobs `COMPLETE` (`reverse-coverage-audit-r82.md`, `job-state-machine-invariants-r69.md`) | Invarianty lifecycle i idempotency | `R83-UNIT-016` allowed/disallowed transitions + retry/cancel invariants | `R83-REG-014` enqueue->status->cancel/retry + duplicate request idempotency | `R83-MUT-012` mutacje transition guards i terminal states | Czesciowo nowe (modul jobs): `backend/test/unit/processing-job-state-machine.spec.ts`, `backend/test/processing-jobs.e2e-spec.ts` | `P0` |
| Source resolver `PARTIAL` (`reverse-coverage-audit-r82.md`, `H3`, `NH-03`) | Fallback chain bez niejawnych branch regressions | `R83-UNIT-017` fallback order matrix for TLK/HAK roots | `R83-REG-015` provenance trace includes winner+rejected reasons | `R83-MUT-013` mutacje fallback order (swap precedence) sa zabijane | Nowy: `backend/test/unit/source-resolver.fallback-order.spec.ts`, `backend/test/source-resolver.provenance.e2e-spec.ts` | `P1` |
| Benchmarks `COMPLETE` (`reverse-coverage-audit-r82.md`) | Determinizm `datasetFingerprint` i release gate artefaktow | `R83-UNIT-018` stable fingerprint for same corpus | `R83-REG-016` required artifacts set (`report/events/summary`) generated | `R83-MUT-014` mutacje fingerprint inputs i threshold comparisons | Docelowo (po dodaniu harness module): `backend/test/unit/benchmark-fingerprint.spec.ts`, `backend/test/benchmark-harness.e2e-spec.ts` | `P1` |

## 3. Katalog scenariuszy R83 (skrot implementacyjny)

1. `R83-UNIT-001..004`: bootstrap + TLK/IFO contracts.
2. `R83-UNIT-005..011`: resolver/HAK/2DA + parser policy guards (obszary PARTIAL/HOLD).
3. `R83-UNIT-012..017`: security, runtime settings matrix, source fallback order.
4. `R83-UNIT-018`: benchmark determinism guard.
5. `R83-REG-001..016`: e2e/integration regresja API i kontraktow pipeline.
6. `R83-MUT-001..014`: mutacje tylko dla warunkow decyzyjnych o wysokim ryzyku regresji.

## 4. Priorytet wykonawczy (kolejnosc wdrozenia testow)

1. `P0` teraz: Security + Runtime settings + Processing jobs + TLK/IFO fail-fast (R83-UNIT-001..004, 012..016; R83-REG-001..002, 010..014; R83-MUT-001..002, 010..012).
2. `P1` nastepnie: Source resolver/HAK/2DA + benchmark guards (R83-UNIT-005..006, 017..018; R83-REG-003..004, 015..016; R83-MUT-003..004, 013..014).
3. `P2` po domknieciu P0 z Ghidry (`MH-01..MH-08`): strict area/object/alias/UT mapping (R83-UNIT-007..011; R83-REG-005..009; R83-MUT-005..009).

## 5. Kryterium DONE dla tej macierzy

1. Kazdy wpis `P0/P1/P2` ma przypisany co najmniej jeden test `unit`, jeden `regression`, oraz jeden cel `mutation`.
2. Zadania `P2` pozostaja oznaczone jako `HOLD strict behavior` do czasu zamkniecia brakow `MH-01..MH-08`.
3. Pipeline CI mapuje sie na: `npm run test:unit`, `npm run test:e2e` oraz właściwe skupione testy. Kolumna `Mutation` pozostaje wyłącznie historycznym katalogiem kandydatów do opcjonalnych eksperymentów.

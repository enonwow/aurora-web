# Path Security Hardening Spec R63 (Agent U1)

Data: 2026-05-24
Status: Draft (security hardening contract)
Zakres: hardening bezpieczenstwa sciezek dla `moduleDecompiledPath`, `modulePackedPath`, `hakDirectoryPath` i wpisow HAK (`hakProfiles`, `hakPriorityList`) w Aurora Reverse + backend.

## 1. Cel

Zamknac klasy ryzyk:
1. path traversal (`..`, mixed separators, drive tricks),
2. symlink/junction escape poza dozwolone rooty,
3. brak twardej whitelisty rootow dla modul/decompiled/hak,
4. zbyt szerokie uprawnienia do modyfikacji path config i dostepu FS.

Efekt docelowy: deterministyczny, audytowalny i fail-fast kontrakt path security zgodny z linia R63.

## 2. Evidence Base (Aurora Reverse + backend)

## 2.1 Reverse evidence
1. `backend/docs/aurora-reverse/module-source-priority-spec-r63.md`
- source precedence: `module_decompiled -> module_packed -> hak -> vanilla`.
2. `backend/docs/aurora-reverse/hak-resolution-spec-r63.md`
- deterministyczna kolejnosc HAK i first-match-wins implikuja potrzebe twardej kontroli, skad wolno ladowac archiwa.
3. `backend/docs/aurora-reverse/admin-runtime-settings-contract-spec-r63.md`
- obecny kontrakt dopuszcza `hakPaths` jako absolute (`entry absolute albo resolve(hakDirectoryPath, entry)`), co bez guardow tworzy surface dla escape.

## 2.2 Backend evidence (aktualna implementacja)
1. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
- `resolveHakPath()` zwraca absolute entry bez ograniczenia rootem.
- relative entry jest `resolve(hakDirectoryPath, entry)` bez blokady `..`.
2. `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts`
- walidacja path to glownie `trim/non-empty`; brak canonicalizacji, brak whitelist roots, brak symlink policy.
3. `backend/src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service.ts`
- `resolveModulePath()` dopuszcza relative path do `process.cwd()`.
- extractor otwiera wskazana sciezke bez policy "within approved roots".
4. `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts`
- startup gate sprawdza tylko "czy cos jest ustawione", nie "czy sciezka jest bezpieczna".
5. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller.ts`
- write config jest admin-only + `admin.config.write`, ale brak dodatkowego policy gate dla "high-risk path mutation".

## 3. Snapshot ryzyk (AS-IS)

1. `hakProfiles` i `hakPriorityList` moga zawierac `../`, absolute drive path, UNC path lub inny external path.
2. `hakDirectoryPath` moze wskazywac symlink/junction prowadzacy poza oczekiwane drzewo.
3. `modulePackedPath` relative do `process.cwd()` jest zalezne od runtime contextu procesu.
4. Brak jednolitej canonicalizacji oznacza ryzyko bypassow przez warianty zapisu tej samej sciezki.
5. Brak twardych wymagan ACL/permissions na poziomie hosta moze umozliwic odczyt danych spoza obszaru gry.

## 4. Model zagrozen (R63 Path Security)

1. `PATH_TRAVERSAL_HAK_ENTRY`
- atak przez `hakProfiles[*]` lub `hakPriorityList[*]` z `..\..\secret`.
2. `ABSOLUTE_PATH_ESCAPE`
- atak przez absolute entry kierujacy do nieautoryzowanego roota.
3. `SYMLINK_ESCAPE`
- root wskazany w config jest linkiem/junctionem do innego miejsca.
4. `TOCTOU_PATH_SWAP`
- podmiana linku/targetu miedzy walidacja a faktycznym open/read.
5. `OVERPRIVILEGED_PATH_WRITE`
- nieautoryzowana zmiana runtime settings z pathami o wysokim ryzyku.
6. `OVERBROAD_FS_READ`
- konto procesu ma read do zbyt szerokich lokalizacji systemowych.

## 5. Canonical Path Security Contract (MUST)

## 5.1 Normalizacja wejscia
Kazda sciezka przyjmowana z config/API musi przejsc:
1. `trim`.
2. Reject jesli zawiera `NUL` (`\0`) lub kontrolne znaki ASCII `< 0x20`.
3. Reject jesli po trimie pusta (dla pol wymaganych).
4. Normalize separatorow i canonical case handling przez `path.resolve` + `fs.realpath`.

## 5.2 Canonical compare
Porownania "czy path jest pod rootem" musza dzialac na canonical path:
1. `rootCanon = realpath(rootInput)`.
2. `candidateAbs = isAbsolute(input) ? input : resolve(baseRoot, input)`.
3. `candidateCanon = realpath(candidateAbs)` (lub `realpath(dirname(candidateAbs))` + final segment przy tworzeniu nowych plikow).
4. `withinRoot = candidateCanon === rootCanon OR candidateCanon startsWith(rootCanon + sep)`.
5. Jesli `withinRoot=false` -> hard fail.

## 5.3 Zakaz implicit fallback
Brak mozliwosci "best effort" przy naruszeniu policy.
Kazde naruszenie path security jest `fail-fast` (422 dla `PUT`, startup fatal dla bootstrap).

## 6. Whitelist Roots Contract (MUST)

## 6.1 Nowy kontrakt konfiguracyjny
Wprowadzic policy object (nazwa robocza):

```json
{
  "pathSecurity": {
    "enforce": true,
    "allowUncPaths": false,
    "allowAbsoluteHakEntries": false,
    "symlinkPolicy": "deny",
    "roots": {
      "moduleDecompiledRoots": ["C:/..."],
      "modulePackedRoots": ["C:/..."],
      "hakRoots": ["C:/..."]
    }
  }
}
```

`roots.*` to allowlist (whitelist) canonical root directories.

## 6.2 Reguly rootow
1. `paths.moduleDecompiledPath` musi byc pod `moduleDecompiledRoots`.
2. `paths.modulePackedPath` (jesli ustawione) musi byc pod `modulePackedRoots`.
3. `paths.hakDirectoryPath` musi byc pod `hakRoots`.
4. Kazdy efektywny `hakPath` (z profilu lub inline) musi byc pod `hakRoots`.

## 6.3 HAK entry policy
1. Domyslnie: tylko relatywne nazwy/segmenty HAK, bez absolute path.
2. `allowAbsoluteHakEntries=true` tylko gdy absolute entry nadal przechodzi `hakRoots` allowlist.
3. HAK entry zawierajace traversal (`..`) lub path namespace/device patterns sa odrzucane.

## 7. Symlink/Junction Policy (MUST)

## 7.1 Domyslna polityka
`symlinkPolicy=deny`:
1. rooty (`moduleDecompiledPath`, `modulePackedPath`, `hakDirectoryPath`) nie moga byc symlink/junction.
2. finalny target read/open nie moze byc symlink.

## 7.2 Opcjonalna polityka kompatybilnosci
`symlinkPolicy=allow_inside_root`:
1. symlink/junction dozwolony tylko gdy `realpath(target)` nadal miesci sie w tym samym allowlisted root.
2. nadal obowiazuje canonical compare i fail-fast przy escape.

## 7.3 TOCTOU guard
Przed odczytem pliku:
1. wykonac validation na canonical path,
2. otworzyc plik read-only,
3. potwierdzic, ze finalny otwarty obiekt nadal odpowiada zwalidowanemu targetowi (check po open),
4. przy mismatch -> fail i telemetry event `path_security_toctou_detected`.

## 8. Field-Level Hardening Rules (MUST)

## 8.1 `moduleDecompiledPath`
1. Musi wskazywac istniejacy katalog.
2. Musi przejsc allowlist `moduleDecompiledRoots`.
3. Przy `symlinkPolicy=deny`: katalog i jego final target nie moga byc linkami.

## 8.2 `modulePackedPath`
1. Musi wskazywac istniejacy plik.
2. Musi przejsc allowlist `modulePackedRoots`.
3. Rozszerzenie pliku: allowlist `.mod`, `.erf`, `.nwm`, `.hak`.
4. Relative path dozwolony tylko jako syntactic sugar; po resolve + realpath musi przejsc te same reguly.

## 8.3 `hakDirectoryPath`
1. Musi wskazywac istniejacy katalog.
2. Musi przejsc allowlist `hakRoots`.
3. Nie moze byc path aliasem poza root (symlink escape).

## 8.4 `hakProfiles` i `hakPriorityList`
1. Kazda pozycja po trim:
- non-empty,
- bez `NUL` i control chars,
- bez traversal.
2. Dla relative entry: resolve wzgledem `hakDirectoryPath`, potem canonical check.
3. Dla absolute entry: dopuszczalne tylko przy `allowAbsoluteHakEntries=true` i po allowlist check.
4. Wynikowy `hakPaths` endpoint ma zwracac tylko zwalidowane sciezki canonicalne.

## 9. Permissions Hardening (MUST)

## 9.1 API permissions
1. `PUT /api/v1/settings/runtime` zostaje `admin` + `admin.config.write`.
2. Dodatkowo dla zmian path fields wymagany audit trail:
- `updatedBy`,
- diff pathow,
- event `runtime_paths_changed`.
3. Dla rollout strict-mode rekomendowane osobne permission:
- `admin.runtime_paths.write`.

## 9.2 Host filesystem permissions
Konto procesu backend:
1. read-only do `moduleDecompiledPath`, `modulePackedPath`, `hakDirectoryPath`,
2. brak write do tych katalogow (poza jawnie zatwierdzonymi maintenance flows),
3. write tylko do:
- pliku runtime settings,
- katalogow roboczych backendu,
- tymczasowego storage pipeline (jesli dotyczy).

## 9.3 Secrets i log hygiene
1. Logi path security nie moga ujawniac sekretow.
2. Dla pathow logowac canonical path lub redacted variant zgodnie z policy observability.

## 10. Error Contract (MUST)

## 10.1 API validation (`PUT`)
`HTTP 422`, `retryable=false`, kody:
1. `RUNTIME_PATH_INVALID_FORMAT`
2. `RUNTIME_PATH_TRAVERSAL_DETECTED`
3. `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`
4. `RUNTIME_PATH_SYMLINK_FORBIDDEN`
5. `RUNTIME_HAK_ABSOLUTE_ENTRY_FORBIDDEN`

## 10.2 Bootstrap/runtime fatal
Startup fail-fast (no silent fallback):
1. `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`
2. `RUNTIME_PATH_SECURITY_TOCTOU_DETECTED`

## 10.3 Mapping semantyczny
1. deterministic/path-policy violations -> `retryable=false`.
2. transient IO (np. chwilowy brak dostepu do dysku) -> `retryable=true` tylko gdy klasyfikowane jako dependency transient.

## 11. Telemetryka i Audyt (MUST)

Eventy:
1. `path_security_validation_failed`
- pola: `field`, `reason_code`, `input_kind` (`absolute|relative`), `updatedBy`.
2. `path_security_escape_blocked`
- pola: `field`, `candidate_path`, `root_matched=false`.
3. `path_security_symlink_blocked`
- pola: `field`, `path`, `symlinkPolicy`.
4. `runtime_paths_changed`
- pola: `updatedBy`, `revision`, `changed_fields[]`.

Metryki:
1. `path_security_reject_count{field,reason}`
2. `path_security_toctou_count`
3. `runtime_paths_change_count`

## 12. Test Matrix (minimum)

1. `hakPriorityList=["../x.hak"]` -> `422 RUNTIME_PATH_TRAVERSAL_DETECTED`.
2. `hakProfiles` absolute entry poza `hakRoots` -> `422 RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`.
3. `moduleDecompiledPath` ustawione na symlink (policy deny) -> reject.
4. `modulePackedPath` relative wskazujace poza `modulePackedRoots` po resolve -> reject.
5. `hakDirectoryPath` junction do innego wolumenu -> reject (deny policy).
6. Poprawne sciezki w rootach -> accept.
7. Bootstrap z niepoprawnym path config -> fail-fast i `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`.
8. Endpoint `haks/resolved` nigdy nie zwraca pathu poza allowlist.

## 13. Migration Plan (recommended)

1. Faza A: `audit-only`
- walidacje liczone i logowane, ale bez twardego reject dla historycznych danych.
2. Faza B: `enforce-on-write`
- twardy reject na `PUT`, legacy rekordy nadal czytelne z warningiem.
3. Faza C: `enforce-on-read/bootstrap`
- startup blokowany, jesli config nadal narusza policy.
4. Faza D: cleanup
- usunac legacy sciezki i wymusic strict policy globalnie.

## 14. R63 Decision Summary

1. Pathy `module/decompiled/hak` przechodza obowiazkowa canonicalizacje i check "within allowlisted roots".
2. Path traversal i symlink/junction escape sa traktowane jako twarde naruszenia bez silent fallback.
3. HAK absolute entries sa domyslnie zabronione.
4. Uprawnienia API + host FS sa zawezone do zasady least privilege.
5. Security telemetry jest pierwszorzednym elementem kontraktu, nie dodatkiem.

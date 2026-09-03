# Code Skeleton: Runtime Settings (R68)

Data: 2026-05-24  
Agent: A6 (Code Skeleton: Runtime Settings)  
Status: Technical implementation skeleton (no code changes)

## 1. Scope i cel

Ten szkic dotyczy tylko modulu `backend/src/modules/runtime-settings` oraz jego stykow z `auth`.

Cel:
1. Doprecyzowac docelowe klasy/pliki i odpowiedzialnosci dla runtime settings.
2. Zdefiniowac interfejsy (porty + kontrakty domenowe) pod wdrozenie ADR-66-02 i specyfikacji R63-R67.
3. Ustalic kolejnosc TDD od najszybszych testow unit do e2e security matrix.

## 2. Zasady architektury (docelowy shape)

1. `domain` zawiera tylko typy, polityki i walidacje deterministyczne.
2. `application` orkiestruje use-case, authorization split i walidacje operacyjne path security.
3. `adapters/inbound/http` mapuje request/response + envelope bledow.
4. `adapters/outbound/*` realizuje IO (`file`, `fs`, `blob`, `nwn`) przez porty.
5. Bootstrap nie ma silent fallback i opiera sie na jednym policy entry point.

## 3. Proposed files/classes

## 3.1 Domain

| File | Status | Proposed class/type | Responsibility |
|---|---|---|---|
| `backend/src/modules/runtime-settings/domain/runtime-settings.types.ts` | update | `RuntimePathSecuritySettings`, `RuntimePathSecurityRoots`, `RuntimeModuleSourceMode`, `PathSecurityReasonCode`, `PathSensitiveFieldPath` | Rozszerzenie payloadu o `pathSecurity` i stale typy dla powodow odrzucenia + klasyfikacji mutacji high-risk. |
| `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts` | update | `runtimePathSecuritySchema`, `runtimeSettingsPayloadSchema` (extended) | Statyczna walidacja kontraktu payloadu, z `details[].reasonCode` dla przypadkow path policy. |
| `backend/src/modules/runtime-settings/domain/runtime-settings.defaults.ts` | update | `buildDefaultRuntimeSettings()` with strict `pathSecurity` defaults | Bezpieczne domyslne roots/policy (`enforce=true`, `symlinkPolicy=deny`). |
| `backend/src/modules/runtime-settings/domain/runtime-source-priority.policy.ts` | new | `decideRuntimeModuleSourceMode()` | Jedno miejsce wyliczania `DECOMPILED_PRIMARY/DECOMPILED_ONLY/PACKED_SYNC_REQUIRED/FAIL_FAST`. |
| `backend/src/modules/runtime-settings/domain/runtime-path-security.errors.ts` | new | `RuntimePathSecurityError` | Stabilna reprezentacja bledu domenowego z `reasonCode`, `fieldPath`, `retryable`. |

## 3.2 Application

| File | Status | Proposed class/type | Responsibility |
|---|---|---|---|
| `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts` | update | `RuntimeSettingsApplicationService` | Orkiestracja read/replace/resolved-haks, diff path-sensitive, enforce permission split, audit event, delegacja do path security service. |
| `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts` | update | `RuntimeSettingsBootstrapService` | Startup fail-fast, walidacja path security, wybor source mode policy, packed sync tylko dla packed-only. |
| `backend/src/modules/runtime-settings/application/runtime-settings-path-security.service.ts` | new | `RuntimeSettingsPathSecurityService` | Walidacja operacyjna sciezek (canonicalize/realpath/allowlist/symlink policy/traversal/TOCTOU hook). |
| `backend/src/modules/runtime-settings/application/runtime-settings-mutation-classifier.ts` | new | `RuntimeSettingsMutationClassifier` | Rozroznienie mutacji `path-sensitive` vs `safe` i lista zmienionych pol. |
| `backend/src/modules/runtime-settings/application/runtime-settings-authz.service.ts` | new | `RuntimeSettingsAuthzService` | Regula: `admin.config.write` zawsze, a `admin.runtime_paths.write` tylko dla mutacji high-risk. |
| `backend/src/modules/runtime-settings/application/ports/runtime-path-fs.port.ts` | new | `RuntimePathFsPort` | Port do IO path security (`realpath`, `lstat`, `openReadOnly`, `isSymlinkLike`, `exists`). |
| `backend/src/modules/runtime-settings/application/ports/runtime-settings-audit.port.ts` | new | `RuntimeSettingsAuditPort` | Port emitowania zdarzen `runtime_paths_changed` i `path_security_*`. |

## 3.3 Inbound adapters (HTTP)

| File | Status | Proposed class/type | Responsibility |
|---|---|---|---|
| `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller.ts` | update | `RuntimeSettingsController` | Zachowanie endpointow R63; przekazanie `actor` (username + permissions) do service i mapowanie bledow authz/validation. |
| `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.schemas.ts` | update | `parseReplaceRuntimeSettingsRequest()` | Parse `zod`, mapowanie issue -> `{ path, reason, reasonCode? }`, stale `422 VALIDATION_FAILED`. |

## 3.4 Outbound adapters

| File | Status | Proposed class/type | Responsibility |
|---|---|---|---|
| `backend/src/modules/runtime-settings/adapters/outbound/file/file-runtime-settings.repository.ts` | update | `FileRuntimeSettingsRepository` | Odczyt legacy bez `pathSecurity`, normalizacja/migracja in-memory i zapis w nowym formacie. |
| `backend/src/modules/runtime-settings/adapters/outbound/fs/node-runtime-path-fs.adapter.ts` | new | `NodeRuntimePathFsAdapter` | Produkcyjna implementacja `RuntimePathFsPort` na `node:fs/promises` + `node:path`. |
| `backend/src/modules/runtime-settings/adapters/outbound/telemetry/runtime-settings-audit.adapter.ts` | new (optional) | `RuntimeSettingsAuditAdapter` | Emisja telemetry/audyt (na poczatek logger-based). |

## 3.5 Module i auth wiring

| File | Status | Proposed class/type | Responsibility |
|---|---|---|---|
| `backend/src/modules/runtime-settings/runtime-settings.module.ts` | update | provider wiring | Rejestracja nowych serwisow i portow (`RuntimePathFsPort`, `RuntimeSettingsAuditPort`). |
| `backend/src/modules/auth/domain/auth.policy.ts` | update | `Permission` union + role map | Dodanie `admin.runtime_paths.write` i przypisanie do `admin`. |
| `backend/src/modules/auth/domain/auth.types.ts` | update (typ-only) | `RequestAuthContext` reuse | Bez zmian strukturalnych, ale nowa permission musi przejsc przez istniejacy model sesji. |

## 4. Interfaces (proponowany kontrakt)

## 4.1 Domain interfaces

```ts
export type RuntimeModuleSourceMode =
  | "DECOMPILED_PRIMARY"
  | "DECOMPILED_ONLY"
  | "PACKED_SYNC_REQUIRED"
  | "FAIL_FAST";

export type PathSecurityReasonCode =
  | "RUNTIME_PATH_INVALID_FORMAT"
  | "RUNTIME_PATH_TRAVERSAL_DETECTED"
  | "RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT"
  | "RUNTIME_PATH_SYMLINK_FORBIDDEN"
  | "RUNTIME_HAK_ABSOLUTE_ENTRY_FORBIDDEN";

export interface RuntimePathSecurityRoots {
  moduleDecompiledRoots: string[];
  modulePackedRoots: string[];
  hakRoots: string[];
}

export interface RuntimePathSecuritySettings {
  enforce: boolean;
  allowUncPaths: boolean;
  allowAbsoluteHakEntries: boolean;
  symlinkPolicy: "deny" | "allow_inside_root";
  roots: RuntimePathSecurityRoots;
}
```

## 4.2 Application contracts

```ts
export interface RuntimePathValidationViolation {
  fieldPath: string;
  reasonCode: PathSecurityReasonCode;
  reason: string;
  candidatePath?: string;
}

export interface RuntimePathValidationResult {
  ok: boolean;
  violations: RuntimePathValidationViolation[];
}

export interface RuntimeSettingsActorContext {
  username: string;
  permissions: string[];
}
```

```ts
export interface RuntimePathFsPort {
  resolveAbsolute(inputPath: string, basePath?: string): string;
  realpath(inputPath: string): Promise<string>;
  exists(inputPath: string): Promise<boolean>;
  isSymlinkLike(inputPath: string): Promise<boolean>;
}
```

```ts
export interface RuntimeSettingsAuditPort {
  emitRuntimePathsChanged(event: {
    updatedBy: string;
    revision: number;
    changedFields: string[];
  }): Promise<void>;
  emitPathSecurityRejected(event: {
    updatedBy: string;
    violations: RuntimePathValidationViolation[];
  }): Promise<void>;
}
```

## 4.3 Service methods (target signatures)

```ts
class RuntimeSettingsPathSecurityService {
  async validateForWrite(payload: RuntimeSettingsPayload): Promise<RuntimePathValidationResult>;
  async validateForBootstrap(settings: RuntimeSettingsRecord): Promise<RuntimePathValidationResult>;
  async resolveHakPathSafely(
    hakDirectoryPath: string,
    entry: string,
    security: RuntimePathSecuritySettings
  ): Promise<string>;
}
```

```ts
class RuntimeSettingsApplicationService {
  async replaceRuntimeSettings(
    payload: RuntimeSettingsPayload,
    actor: RuntimeSettingsActorContext
  ): Promise<RuntimeSettingsRecord>;
}
```

```ts
function decideRuntimeModuleSourceMode(paths: {
  moduleDecompiledPath: string;
  modulePackedPath: string;
}): RuntimeModuleSourceMode;
```

## 5. Responsibility split (flow)

1. HTTP `PUT`:
`runtime-settings.controller` -> `parseReplaceRuntimeSettingsRequest` -> `RuntimeSettingsApplicationService.replaceRuntimeSettings`.
2. Service:
`MutationClassifier` wylicza `changedFields` -> `AuthzService` sprawdza potrzebne permissions -> `PathSecurityService.validateForWrite` -> repository save -> audit emit.
3. HTTP `GET haks/resolved`:
service liczy listy HAK i kazdy path przechodzi `resolveHakPathSafely` przed zwrotem.
4. Bootstrap:
repository get -> `PathSecurityService.validateForBootstrap` -> `decideRuntimeModuleSourceMode` -> packed sync tylko dla `PACKED_SYNC_REQUIRED`.

## 6. TDD test order (red -> green -> refactor)

## 6.1 Faza 1: domain schema i source mode policy (najpierw szybkie unit)

1. `backend/test/unit/runtime-settings.schemas.spec.ts`
- reject empty required roots when `pathSecurity.enforce=true`
- reject traversal in `hakPriorityList` with `reasonCode=RUNTIME_PATH_TRAVERSAL_DETECTED`
- reject absolute HAK entry when `allowAbsoluteHakEntries=false`
- keep existing cases: module gate + bucket dependency + unknown profile
2. `backend/test/unit/runtime-source-priority.policy.spec.ts` (new)
- C01..C04 matrix (`D/P`) as table-driven tests.

## 6.2 Faza 2: path security operational service (unit, mocked fs port)

1. `backend/test/unit/runtime-settings-path-security.service.spec.ts` (new)
- canonical within-root pass
- outside-root fail with `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`
- symlink deny fail with `RUNTIME_PATH_SYMLINK_FORBIDDEN`
- invalid format (`NUL`/control char) fail with `RUNTIME_PATH_INVALID_FORMAT`
- TOCTOU hook mismatch -> dedicated fatal classification.

## 6.3 Faza 3: application service + auth split + audit

1. `backend/test/unit/runtime-settings.application.service.spec.ts`
- path-sensitive mutation without `admin.runtime_paths.write` -> forbidden
- non-path mutation with `admin.config.write` only -> allowed
- `replaceRuntimeSettings` emits `runtime_paths_changed` when changed fields exist
- `getResolvedHakSettings` never returns path outside allowlist.
2. `backend/test/unit/auth.policy.spec.ts` (extend)
- `admin.runtime_paths.write` exists in `PERMISSIONS`
- admin role contains permission.

## 6.4 Faza 4: repository migration and bootstrap fail-fast

1. `backend/test/unit/file-runtime-settings.repository.spec.ts` (new)
- legacy record without `pathSecurity` is normalized on read
- normalized shape is persisted with unchanged metadata contract.
2. `backend/test/unit/runtime-settings-bootstrap.service.spec.ts`
- `FAIL_FAST` when both module paths missing
- `DECOMPILED_*` skips packed sync
- `PACKED_SYNC_REQUIRED` enforces full blob config
- invalid path security -> fail with `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`.

## 6.5 Faza 5: e2e contract and security matrix

1. `backend/test/runtime-settings.e2e-spec.ts` (extend)
- existing happy-path remains green
- `422 VALIDATION_FAILED` response includes `details.reasonCode` for path violations.
2. `backend/test/e2e/runtime-settings.security.e2e-spec.ts` (new)
- non-admin denied
- admin without `admin.config.write` denied
- admin without `admin.runtime_paths.write` denied for path-sensitive `PUT`
- admin with both permissions allowed
- `GET haks/resolved` returns only canonical policy-compliant paths.

## 6.6 Gate order po TDD

1. P0: `npm run build` + runtime-settings unit subset.
2. P1: pelne `npm run test:unit` + `npm run test:e2e` + skupione negatywne testy runtime-settings/security.
3. P2: powtorka P1 na release cut i security sign-off.

Mutation testing jest opcjonalne, poza P0/P1/P2, i wymaga wyraźnego żądania
użytkownika.

## 7. Minimal rollout sequence

1. Add domain types/schema/defaults + tests (Faza 1).
2. Add `RuntimeSettingsPathSecurityService` + fs port adapter + tests (Faza 2).
3. Wire authz split, mutation classifier, audit port (Faza 3).
4. Add repository migration + bootstrap hardening (Faza 4).
5. Close e2e security matrix and gates (Faza 5).

## 8. Definition of Done (R68 skeleton completion criteria)

1. Wszystkie planned files maja jednoznaczna odpowiedzialnosc i brak dublowania logiki policy.
2. Interfejsy portow umozliwiaja testowanie unit bez realnego filesystemu.
3. `RuntimeModuleSourceMode` jest wyliczany w jednym miejscu i testowany tabelarycznie.
4. Permission split `admin.config.write` + `admin.runtime_paths.write` jest egzekwowany tylko tam, gdzie wymagany.
5. Error envelope dla walidacji path policy niesie `reasonCode`, zgodnie z R63/R66/R67.

# Code Skeleton: Security Controls R68 (Agent D6)

Data: 2026-05-24  
Status: Draft (implementation skeleton)  
Zakres: path hardening, permission gates, partition filters.

## 1. Cel

Przygotowac szkic wdrozenia security controls zgodny z R63/R66/R67, osadzony w aktualnym backendzie NestJS:

1. Path hardening (canonicalizacja, allowlist roots, TOCTOU guard).
2. Permission gates (precyzyjne uprawnienia dla high-risk mutation paths).
3. Partition filters (record-level access filtering dla read endpoints).

Ten dokument definiuje:

1. miejsca w kodzie do rozszerzenia,
2. szkielety klas/funkcji,
3. plan testow unit + e2e.

## 2. Miejsca w kodzie (mapa)

## 2.1 Istniejace pliki do modyfikacji

1. `backend/src/common/config/env.schema.ts`
2. `backend/src/common/config/app-config.service.ts`
3. `backend/src/common/http/request.types.ts`
4. `backend/src/modules/auth/domain/auth.policy.ts`
5. `backend/src/modules/auth/adapters/inbound/http/access.guard.ts`
6. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller.ts`
7. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
8. `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts`
9. `backend/src/modules/runtime-settings/adapters/outbound/file/file-runtime-settings.repository.ts`
10. `backend/src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service.ts`
11. `backend/src/modules/areas/adapters/inbound/http/areas.controller.ts`
12. `backend/src/modules/areas/application/areas.application.service.ts`
13. `backend/src/modules/areas/domain/area.types.ts`
14. `backend/src/modules/catalog/adapters/inbound/http/placeables.controller.ts`
15. `backend/src/modules/catalog/adapters/inbound/http/creatures.controller.ts`
16. `backend/src/modules/catalog/adapters/inbound/http/items.controller.ts`
17. `backend/src/modules/catalog/application/catalog.application.service.ts`
18. `backend/src/modules/catalog/domain/template.types.ts`

## 2.2 Nowe pliki (proponowane)

1. `backend/src/common/security/path/path-security.types.ts`
2. `backend/src/common/security/path/path-security.policy.ts`
3. `backend/src/common/security/path/path-security.service.ts`
4. `backend/src/common/security/path/secure-open.service.ts`
5. `backend/src/common/security/partition/partition.types.ts`
6. `backend/src/common/security/partition/partition.policy.ts`
7. `backend/src/common/security/partition/partition-filter.service.ts`

## 3. Path Hardening Skeleton

## 3.1 Kontrakt konfiguracyjny (env + config service)

Dodac do `env.schema.ts`:

```ts
PATH_SECURITY_ENFORCE: z.coerce.boolean().default(true),
PATH_SECURITY_ALLOW_UNC_PATHS: z.coerce.boolean().default(false),
PATH_SECURITY_ALLOW_ABSOLUTE_HAK_ENTRIES: z.coerce.boolean().default(false),
PATH_SECURITY_SYMLINK_POLICY: z.enum(["deny", "allow_inside_root"]).default("deny"),
PATH_SECURITY_MODULE_DECOMPILED_ROOTS: z.string().min(1),
PATH_SECURITY_MODULE_PACKED_ROOTS: z.string().min(1),
PATH_SECURITY_HAK_ROOTS: z.string().min(1)
```

Dodac do `app-config.service.ts` gettery budujace `PathSecurityPolicy`.

## 3.2 Typy i reason codes

`path-security.types.ts`:

```ts
export type PathReasonCode =
  | "RUNTIME_PATH_INVALID_FORMAT"
  | "RUNTIME_PATH_TRAVERSAL_DETECTED"
  | "RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT"
  | "RUNTIME_PATH_SYMLINK_FORBIDDEN"
  | "RUNTIME_HAK_ABSOLUTE_ENTRY_FORBIDDEN"
  | "RUNTIME_PATH_SECURITY_TOCTOU_DETECTED";

export interface PathValidationFailure {
  code: PathReasonCode;
  message: string;
  field: string;
}
```

## 3.3 Serwis walidacji path

`path-security.service.ts`:

```ts
export class PathSecurityService {
  validateDirectory(input: string, field: string, roots: string[]): string { /* ... */ }
  validateFile(input: string, field: string, roots: string[]): string { /* ... */ }
  validateHakEntry(input: string, hakRoot: string): string { /* ... */ }
  assertWithinAllowedRoot(candidateCanonical: string, rootsCanonical: string[]): void { /* ... */ }
}
```

Minimalne reguly:

1. trim + reject control chars/NUL,
2. resolve + realpath,
3. canonical compare vs allowlist,
4. symlink policy deny/allow_inside_root,
5. bez fallback "best effort".

## 3.4 Secure open (TOCTOU)

`secure-open.service.ts`:

```ts
export class SecureOpenService {
  async readFileUtf8Validated(inputPath: string, policy: PathOpenPolicy): Promise<string> {
    // validate -> open read-only -> post-open reverify -> read
  }
}
```

Integracja:

1. `nwn-erf-packed-module-extractor.service.ts` - wszystkie read/open przez `SecureOpenService`.
2. `runtime-settings-bootstrap.service.ts` - walidacja path policy przed extract/sync.

## 3.5 Runtime settings write path

W `runtime-settings.application.service.ts`:

1. przed `repository.save(next)` walidacja `payload.paths` i rozwiazanych HAK path,
2. przy naruszeniu `AppException(422, code=RUNTIME_PATH_*)`,
3. `getResolvedHakSettings()` zwraca tylko canonical + validated `hakPaths`.

W `file-runtime-settings.repository.ts`:

1. usunac implicit fallback z `process.cwd()` dla security-critical path,
2. walidowac `RUNTIME_SETTINGS_FILE` (allowlist config dir),
3. hard fail przy path naruszajacym policy.

## 4. Permission Gates Skeleton

## 4.1 Permission split

W `auth.policy.ts`:

```ts
export const PERMISSIONS = [
  // existing...
  "admin.runtime_paths.write",
  "processing.job.cancel",
  "processing.job.retry",
  "processing.job.delete"
] as const;
```

W `ROLE_PERMISSIONS`:

1. `admin.runtime_paths.write` tylko dla `admin`,
2. lifecycle permissions przypisane jawnie (minimum: `admin`).

## 4.2 Runtime settings endpoint gate

W `runtime-settings.controller.ts`:

1. dla `PUT /settings/runtime` dodac `@Permissions("admin.config.write", "admin.runtime_paths.write")`,
2. przekazac caly actor do application service (nie tylko username), np. `request.auth`.

W `runtime-settings.application.service.ts`:

1. detekcja czy payload modyfikuje path fields,
2. jesli tak: dodatkowa kontrola permission (defense-in-depth),
3. audit metadata: `updatedBy`, changed fields, revision.

## 4.3 Request auth context (pod partition i audit)

W `request.types.ts` (bez zmiany kontraktu HTTP):

```ts
export interface AppRequest extends FastifyRequest {
  requestId?: string;
  auth?: RequestAuthContext;
}
```

Utrzymac, ale konsystentnie przekazywac `request.auth` do service layer.

## 5. Partition Filters Skeleton

## 5.1 Typy ACL w domenie

Rozszerzyc:

1. `area.types.ts`
2. `template.types.ts`

o fields:

```ts
ownerUserId: string;
visibilityScope: "public" | "role_scoped" | "private";
aclRoles: UserRole[];
aclUserIds: string[];
securityLabel: "standard" | "dm_sensitive" | "admin_only";
isDeleted: boolean;
```

## 5.2 Reusable policy

`partition.policy.ts`:

```ts
export function canReadRecord(principal: Principal, record: AccessRecord): boolean {
  // ownership/public/shared
  // securityLabel gates
  // scene.read mandatory
}
```

`partition-filter.service.ts`:

```ts
export class PartitionFilterService {
  filterAreas(principal: Principal, records: AreaRecord[]): AreaRecord[] { /* ... */ }
  filterTemplates(principal: Principal, records: TemplateRecord[]): TemplateRecord[] { /* ... */ }
}
```

## 5.3 Integracja read endpoints

`areas.controller.ts`:

1. przekazac `request.auth` do `list/get/preview`.

`areas.application.service.ts`:

1. filtr ACL zanim policzymy `objectCounts` i `composition`,
2. przy deny na `GET /areas/:areaId` i `/preview` zwracac `404 AREA_NOT_FOUND`.

`catalog` controllers + `catalog.application.service.ts`:

1. analogiczny filter path dla list i preview,
2. brak cross-partition leak przez `total` i `items`.

Uwaga implementacyjna: aby nie leakowac `total`, filtr musi byc przed paginacja (docelowo w repo query layer lub przez port rozszerzony o principal/filter spec).

## 6. Test Skeleton (unit + e2e)

## 6.1 Nowe testy unit (proponowane)

1. `backend/test/unit/path-security.service.spec.ts`
2. `backend/test/unit/secure-open.service.spec.ts`
3. `backend/test/unit/partition.policy.spec.ts`
4. `backend/test/unit/partition-filter.service.spec.ts`

Przypadki minimalne:

1. traversal `../` -> `RUNTIME_PATH_TRAVERSAL_DETECTED`,
2. absolute poza root -> `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`,
3. symlink deny -> `RUNTIME_PATH_SYMLINK_FORBIDDEN`,
4. TOCTOU mismatch -> `RUNTIME_PATH_SECURITY_TOCTOU_DETECTED`,
5. owner/public/shared allow vs foreign private deny,
6. `dm_sensitive` creature/vfx wymaga odpowiednich permissions.

## 6.2 Rozszerzenie istniejacych unit testow

1. `backend/test/unit/runtime-settings.application.service.spec.ts`
2. `backend/test/unit/runtime-settings-bootstrap.service.spec.ts`
3. `backend/test/unit/access.guard.spec.ts`
4. `backend/test/unit/areas.application.service.spec.ts`
5. `backend/test/unit/catalog.application.service.spec.ts`

Dopisac:

1. reject invalid path payloads (422 + `RUNTIME_PATH_*`),
2. bootstrap fail-fast (`RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`),
3. permission deny dla braku `admin.runtime_paths.write`,
4. partition filtering bez leakow counts/preview.

## 6.3 Rozszerzenie e2e

1. `backend/test/runtime-settings.e2e-spec.ts`
2. `backend/test/areas.e2e-spec.ts`
3. `backend/test/catalog.e2e-spec.ts`

Nowe scenariusze:

1. `PUT /settings/runtime` traversal/absolute/symlink payload -> `422` + code,
2. `PUT /settings/runtime` admin bez dedykowanego permission -> `403 FORBIDDEN_PERMISSION`,
3. `GET /areas/:id` poza partycja -> `404 AREA_NOT_FOUND`,
4. list endpoints zwracaja tylko rekordy dozwolone przez ACL, bez leakow w `total`.

## 7. Minimalny rollout plan

1. Etap A: wprowadzenie `PathSecurityService` + unit tests.
2. Etap B: podlaczenie runtime settings write/bootstrap + e2e path cases.
3. Etap C: permission split + guard tests.
4. Etap D: partition policy + area/catalog tests.
5. Etap E: domkniecie telemetry/audit events i stabilizacja gate `P1`.

## 8. Definition of Done (R68 skeleton)

1. Wszystkie trzy kontrolki maja centralne reusable komponenty:
   1. path security service,
   2. permission gate policy,
   3. partition filter policy.
2. Runtime path mutations sa fail-fast i mapowane na canonical error codes.
3. Read API nie ujawnia danych poza partycja (payload + counts + total).
4. Testy unit i e2e pokrywaja przynajmniej przypadki z R67: PATH/AUTH/PERM krytyczne.


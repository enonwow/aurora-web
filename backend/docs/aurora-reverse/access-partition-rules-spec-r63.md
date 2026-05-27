# Access Partition Rules Spec R63 (Agent P1)

## 1. Scope
Ten dokument definiuje backendowe reguly partycjonowania dostepu do:
- `areas`
- `area entities` (`placeable`, `door`, `creature`, `item`, `vfx`)
- `catalog assets` (`placeable`, `creature`)

Cel:
1. Zdefiniowac kto widzi jakie `area/placeable/creature` per `role` i `ownership`.
2. Dostarczyc gotowe reguly filtracji do wdrozenia po stronie backend (read-path).
3. Utrzymac zgodnosc z obecnym modelem auth (`@Roles`, `@Permissions`, deny-by-default).

## 2. Evidence i backend baseline
Reguly opieraja sie na:
1. `backend/src/modules/auth/domain/auth.types.ts` (`viewer|builder|dm|admin`)
2. `backend/src/modules/auth/domain/auth.policy.ts` (`scene.read`, `dm.spawn_creature`, `dm.spawn_vfx`, itd.)
3. `backend/docs/architecture/processing-authorization-matrix-agent-r10.md`
4. `backend/docs/standards/backend-security-error-observability-ssot-agent-r46.md`
5. `backend/docs/aurora-reverse/area-composition-spec-r63.md` (lane: `Placeable List`, `Door List`, `Creature List`)
6. `backend/docs/aurora-reverse/placeable-classification-spec-r63.md` (rozroznienie `placeable/door/vfx`)
7. `backend/docs/aurora-reverse/creature-enrichment-spec-r63.md` (tozsamosc `Creature List`)
8. `backend/docs/aurora-reverse/asset-id-strategy-spec-r63.md` (`sourceList/sourceIndex`, `instanceAddressId`)

## 3. Model partycjonowania (canonical)

## 3.1 Wymagane atrybuty dostepu (record-level)
Kazdy rekord read-modelu `area` oraz `asset` musi miec:
1. `ownerUserId: string` (MUST)
2. `visibilityScope: "public" | "role_scoped" | "private"` (MUST)
3. `aclRoles: UserRole[]` (MUST, moze byc puste)
4. `aclUserIds: string[]` (MUST, moze byc puste)
5. `securityLabel: "standard" | "dm_sensitive" | "admin_only"` (MUST, default `standard`)
6. `isDeleted: boolean` (MUST, soft-delete guard)

## 3.2 Dziedziczenie dla obiektow w obszarze
Dla encji w `composition.*`:
1. `entityVisibilityMode: "inherit_area" | "custom"`
2. Gdy `inherit_area`, ACL encji jest liczony z `area`.
3. Gdy `custom`, encja musi miec pelny zestaw pol ACL z sekcji 3.1.
4. `door` i `vfx` sa traktowane jako rodziny `placeable` dla partycji ownership, ale zachowuja osobny `kind`.

## 3.3 Brak metadanych ACL
Jesli rekord nie ma kompletu pol ACL, backend traktuje go jako:
1. `visibilityScope = "private"`
2. `ownerUserId = "__unknown__"`
3. Dostep tylko dla `admin`.

To zapobiega przypadkowemu wyciekowi danych przez niekompletna migracje.

## 4. Matryca widocznosci (role + ownership)

## 4.1 Partycje ownership
Definicje:
1. `OWNER`: `record.ownerUserId == request.auth.user.id`
2. `PUBLIC`: `record.visibilityScope == "public"`
3. `ROLE_SHARED`: `record.visibilityScope == "role_scoped"` i `request.role in record.aclRoles`
4. `USER_SHARED`: `request.userId in record.aclUserIds`
5. `FOREIGN_PRIVATE`: zadna z powyzszych

## 4.2 Dostep bazowy do partycji
| Role | OWNER | PUBLIC | ROLE_SHARED | USER_SHARED | FOREIGN_PRIVATE |
|---|---|---|---|---|---|
| `viewer` | allow | allow | allow | allow | deny |
| `builder` | allow | allow | allow | allow | deny |
| `dm` | allow | allow | allow | allow | deny |
| `admin` | allow | allow | allow | allow | allow |

Warunek globalny: role musi miec `scene.read`; w obecnym baseline maja go wszystkie role, ale filtr musi to sprawdzac jawnie.

## 4.3 Dodatkowe bramki per typ assetu
Po przejsciu partycji ownership stosujemy dodatkowe bramki:
1. `securityLabel == "admin_only"`:
- tylko `admin`
2. `kind == "creature"` i `securityLabel == "dm_sensitive"`:
- wymagane `dm.spawn_creature` lub `admin`
3. `kind == "vfx"` i `securityLabel == "dm_sensitive"`:
- wymagane `dm.spawn_vfx` lub `admin`
4. `kind in {"placeable","door","item","area"}` i `securityLabel == "standard"`:
- brak dodatkowej bramki poza ownership + `scene.read`

Wynik praktyczny:
1. `viewer` widzi tylko niesensytywne rekordy zgodne z ownership.
2. `builder` widzi placeable/door/area zgodnie z ownership, ale `dm_sensitive creature` jest ukryty.
3. `dm` widzi `creature` i `dm_sensitive vfx` zgodnie z ownership.
4. `admin` widzi wszystko (z wyjatkiem hard-deleted).

## 5. Gotowe reguly filtracji backend

## 5.1 Kontekst principal (z request.auth)
MUST:
1. `userId = request.auth.user.id`
2. `role = request.auth.user.role`
3. `permissions = new Set(request.auth.permissions)`

Brak `request.auth`:
1. endpoint niepubliczny -> `401 UNAUTHORIZED`
2. endpoint publiczny (poza zakresem tej specyfikacji) moze miec osobne reguly

## 5.2 Predykat reusable (TypeScript)
```ts
type VisibilityScope = "public" | "role_scoped" | "private";
type SecurityLabel = "standard" | "dm_sensitive" | "admin_only";
type UserRole = "viewer" | "builder" | "dm" | "admin";
type EntityKind = "area" | "placeable" | "door" | "creature" | "item" | "vfx";

interface Principal {
  userId: string;
  role: UserRole;
  permissions: Set<string>;
}

interface AccessRecord {
  ownerUserId: string;
  visibilityScope: VisibilityScope;
  aclRoles: UserRole[];
  aclUserIds: string[];
  securityLabel: SecurityLabel;
  isDeleted: boolean;
  kind: EntityKind;
}

export function canReadRecord(principal: Principal, record: AccessRecord): boolean {
  if (record.isDeleted) return false;
  if (!principal.permissions.has("scene.read")) return false;

  const isAdmin = principal.role === "admin";
  const isOwner = record.ownerUserId === principal.userId;
  const isPublic = record.visibilityScope === "public";
  const isRoleShared =
    record.visibilityScope === "role_scoped" &&
    record.aclRoles.includes(principal.role);
  const isUserShared = record.aclUserIds.includes(principal.userId);

  const partitionAllowed =
    isAdmin || isOwner || isPublic || isRoleShared || isUserShared;
  if (!partitionAllowed) return false;

  if (record.securityLabel === "admin_only") return isAdmin;

  if (record.securityLabel === "dm_sensitive" && record.kind === "creature") {
    return isAdmin || principal.permissions.has("dm.spawn_creature");
  }

  if (record.securityLabel === "dm_sensitive" && record.kind === "vfx") {
    return isAdmin || principal.permissions.has("dm.spawn_vfx");
  }

  return true;
}
```

## 5.3 SQL WHERE fragment (PostgreSQL)
Zaklada kolumny:
- `owner_user_id text`
- `visibility_scope text`
- `acl_roles text[]`
- `acl_user_ids text[]`
- `security_label text`
- `is_deleted boolean`
- `kind text`

```sql
WHERE
  is_deleted = false
  AND :has_scene_read = true
  AND (
    :is_admin = true
    OR owner_user_id = :user_id
    OR visibility_scope = 'public'
    OR (visibility_scope = 'role_scoped' AND :role = ANY(acl_roles))
    OR :user_id = ANY(acl_user_ids)
  )
  AND (
    security_label <> 'admin_only' OR :is_admin = true
  )
  AND (
    security_label <> 'dm_sensitive'
    OR kind NOT IN ('creature', 'vfx')
    OR :is_admin = true
    OR (kind = 'creature' AND :has_dm_spawn_creature = true)
    OR (kind = 'vfx' AND :has_dm_spawn_vfx = true)
  )
```

## 5.4 Filtracja endpointow
1. `GET /areas`:
- filtr ACL na `areas`
- `objectCounts` musi byc liczone po przefiltrowanych encjach, nie po pelnym zbiorze
2. `GET /areas/:areaId` i `GET /areas/:areaId/preview`:
- najpierw filtr ACL area
- potem filtr encji `composition.*` (placeable/door/creature/item/vfx)
- jesli area nie przejdzie filtra -> `404 AREA_NOT_FOUND` (bez ujawniania istnienia)
3. `GET /catalog/placeables`:
- `kind in ('placeable','door','vfx')` i filtr ACL
4. `GET /catalog/creatures`:
- `kind = 'creature'` i filtr ACL + bramka `dm_sensitive`
5. Wszystkie endpointy read musza zostac deny-by-default przy braku role mapping (`@Roles(...)`) zgodnie z `AccessGuard`.

## 6. Kolejnosc filtracji (MUST)
Backend wykonuje filtry w kolejnosci:
1. Auth guard (`UNAUTHORIZED` / `FORBIDDEN_ROLE` / `FORBIDDEN_PERMISSION`)
2. Partycja ownership (`owner/public/shared/private`)
3. Security label (`standard/dm_sensitive/admin_only`)
4. Filtry funkcjonalne query (`query`, `tag`, `biome`, `subtype`, `benchmark`)
5. Pagination (`limit`, `offset`)

To minimalizuje ryzyko wyciekow przez `total`, `counts`, i side-channel.

## 7. Reguly dla `area` vs `asset` (policy summary)
1. `area`:
- widocznosc z ACL area
- encje dziedzicza ACL area, o ile nie maja `entityVisibilityMode=custom`
2. `placeable`:
- ownership + `securityLabel`
- `vfx` moze miec osobna bramke `dm.spawn_vfx` gdy `dm_sensitive`
3. `creature`:
- ownership + `securityLabel`
- `dm_sensitive creature` wymaga `dm.spawn_creature` (lub admin)

## 8. Zgodnosc z Aurora Reverse
Reguly sa spojne z reverse:
1. Encje pochodza z list GIT (`Placeable List`, `Door List`, `Creature List`) i moga byc filtrowane per `kind/sourceList/sourceIndex`.
2. Rozroznienie `door` vs `placeable` i `vfx` jest zachowane.
3. Tozsamosc instancji (`instanceAddressId`) pozostaje stabilnym targetem write-path, niezaleznie od read partition.

## 9. Acceptance criteria (backend)
1. `viewer` nie widzi `FOREIGN_PRIVATE` area/asset.
2. `builder` nie widzi `dm_sensitive creature` bez uprawnien DM.
3. `dm` widzi `dm_sensitive creature` w swoich partycjach ownership.
4. `admin` widzi wszystkie rekordy nieusniete.
5. `GET /areas/:id` dla area poza partycja zwraca `404 AREA_NOT_FOUND`.
6. `objectCounts` i `composition` nie ujawniaja encji ukrytych przez filtr.
7. Brak ACL metadata nie skutkuje publicznym wyciekiem (fallback admin-only).


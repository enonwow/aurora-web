# Door Transition Spec R63

Data: 2026-05-24
Status: Draft for backend contract alignment
Zakres: reguly serializacji i mapowania przejsc dla `Door List` (DOOR) i `TriggerList` (trigger transitions), z boundary parserow, aliasami kluczy i edge-case policy.

## 1. Scope i granice

1. Spec obejmuje warstwe danych (parse/map/write contract), nie semantyke gameplay runtime.
2. Spec bazuje na artefaktach reverse oraz obecnym kodzie backendu w `C:\Projects\aurora-web-backend\backend`.
3. Dla pol o niepotwierdzonej semantyce retail stosujemy stance `preserve-first`.

## 2. Evidence base (reverse + backend)

### 2.1 Reverse: DOOR i Trigger transition
1. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_TRANSITION_FIELD_STATUS_MATRIX_2026-05-19.md`
2. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_TRANSITION_INSTANCE_BASELINE_2026-05-19.md`
3. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_TRANSITION_MAPPED_KEY_POLICY_2026-05-20.md`
4. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_TRANSITION_PARSER_BOUNDARY_PARITY_2026-05-20.md`
5. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_GIT_TRANSITION_KEY_CONFIRM_2026-05-19.md`
6. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_GIT_SCRIPT_SLOT_KEY_CONFIRM_2026-05-19.md`
7. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Area-ARE-GIT\DOOR_LOADSCREEN_COUNTER_NAMING_PARITY_2026-05-20.md`
8. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0426_git_object_schema_profile.json`
9. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0437_git_trigger_schema_profile.json`
10. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0518_door_trigger_transition_matrix.json`
11. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0526_transition_loader_parity_matrix.json`
12. `C:\Projects\nwn-last-city\Aurora\reverse\runs\LC_AURORA_RE_ARTIFACT_2026-05-18_0616_gic_comment_anchor_transition_profile.json`
13. `C:\Projects\nwn-last-city\Aurora\reverse\cpp_impl\include\aurora\door\door_transition.h`
14. `C:\Projects\nwn-last-city\Aurora\reverse\cpp_impl\src\aurora\door\door_transition.cpp`

### 2.2 Backend: aktualny i docelowy kontrakt
1. `C:\Projects\aurora-web-backend\backend\src\modules\areas\domain\area.types.ts`
2. `C:\Projects\aurora-web-backend\backend\src\modules\areas\application\areas.application.service.ts`
3. `C:\Projects\aurora-web-backend\backend\src\modules\areas\adapters\inbound\http\areas.controller.ts`
4. `C:\Projects\aurora-web-backend\backend\docs\architecture\area-dto-contract-agent-r3.md`
5. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\placeable-classification-spec-r63.md`

## 3. Canonical field surface

## 3.1 Door transition keys (data-level)

Potwierdzona powierzchnia kluczy dla drzwi:
1. `LinkedTo`
2. `LinkedToFlags`
3. `LoadScreenID`
4. `LoadScreenId` (alias wejscia)
5. `TransitionDestin` (historyczny spelling)
6. `TransitionDestination` (alias kompatybilnosci)
7. `LinkedToModule`

Uwagi:
1. `LinkedTo` / `LinkedToFlags` / `LoadScreenID` maja twarde potwierdzenie w profilu `0426`.
2. `TransitionDestin` / `LinkedToModule` sa potwierdzone na poziomie key-surface w macierzy `0518`, ale bez mocnego dowodu niepustych wartosci instancji w obecnym korpusie.

## 3.2 Trigger transition-adjacent keys (data-level)

Potwierdzona powierzchnia kluczy triggerow (`0437`):
1. `LinkedTo`
2. `LinkedToFlags`
3. `LoadScreenID`
4. skrypty: `ScriptOnEnter`, `ScriptOnExit`, `ScriptHeartbeat`, `ScriptUserDefine`, `OnClick`, `OnDisarm`, `OnTrapTriggered`

Dodatkowo:
1. `TriggerList` wystepuje w korpusie (25/25 area present jako lista), ale nie jest ladowany przez sledzone sciezki NWN/NWN2 w macierzy loadera `0526`.
2. Loader parity `0526` wskazuje, ze `TriggerList` loader path wystepuje po stronie kotorbase, nie po stronie NWN/NWN2.

## 4. Parser i alias policy (DOOR)

## 4.1 Reguly mapowania kluczy

1. Mapowanie jest strict-case i explicit-key (`door_transition.cpp`).
2. Aliasy kluczy:
1. `LoadScreenID` i `LoadScreenId` -> `load_screen_id`
2. `TransitionDestin` i `TransitionDestination` -> `transition_destination`
3. Nieznane klucze sa ignorowane (bez fail parsera).

## 4.2 Reguly wartosci

1. `LinkedTo`, `TransitionDestination`, `LinkedToModule`:
1. trim whitespace,
2. preserve string,
3. bez interpretacji semantyki.
2. `LinkedToFlags`, `LoadScreenID`:
1. parse jako signed int32,
2. overflow/invalid token -> statusy `kInvalidLinkedToFlags` albo `kInvalidLoadScreenId`.

## 4.3 Reguly kolejnosci i duplikatow

1. Przy duplikatach kluczy obowiazuje `last-wins` przed finalna walidacja.
2. To dotyczy tez par aliasowych (`LoadScreenID` + `LoadScreenId`, `TransitionDestin` + `TransitionDestination`).
3. Fail jest deterministyczny: jezeli ostatni token dla mapowanego pola jest invalid, wynik parsera jest invalid.

## 5. Snapshot corpus baseline (bez eskalacji runtime)

Z `0616` i `0518`:
1. Drzwi:
1. `entries=8`
2. `linkedto_nonempty=8`
3. `linkedtoflags_values={"1":8}`
4. `transitiondestin_nonempty=0`
5. `linkedtomodule_nonempty=0`
6. `loadscreeen_nonzero=0`
2. Triggery:
1. `entries=4`
2. `linkedto_nonempty=0`
3. `linkedtoflags_values={"0":4}`
4. `script_on_enter_nonempty=4`
5. `loadscreeen_nonzero=0`

Interpretacja boundary:
1. To jest dowod wycinka korpusu, nie uniwersalna semantyka engine.
2. Brak dowodu niepustych `TransitionDestin`/`LinkedToModule` w obecnych instancjach nie moze byc traktowany jako zakaz tych pol.

## 6. Backend contract mapping

## 6.1 Stan aktualny backendu (as-is)

1. `AreaObjectKind` to tylko `"placeable" | "creature" | "item"`.
2. Brak dedykowanych kolekcji `doors` i `triggers` w `AreaRecord`.
3. Endpoint `GET /api/v1/areas/:areaId` zwraca `composition` jako liczniki + plaska liste `objects`.

Konsekwencja:
1. Aktualny model nie przenosi transition fields dla DOOR/Trigger.
2. Potrzebne jest rozszerzenie kontraktu read/write przed pelna obsluga przejsc.

## 6.2 Target mapping (R63 rekomendacja)

Minimalny docelowy model DTO:

```ts
export interface TransitionFieldRawDto {
  canonicalField:
    | "LinkedTo"
    | "LinkedToFlags"
    | "LoadScreenID"
    | "TransitionDestination"
    | "LinkedToModule";
  rawKey: string;
  rawValue: string;
  occurrenceIndex: number;
}

export interface TransitionNumericDiagnosticDto {
  field: "LinkedToFlags" | "LoadScreenID";
  rawToken: string;
  parsedValue?: number;
  status:
    | "ok"
    | "invalid_parse"
    | "invalid_overflow"
    | "invalid_plus_prefix"
    | "runtime_domain_unknown";
}

export interface AreaDoorTransitionDto {
  doorIndex: number;
  tag?: string;
  linkedTo?: string;
  linkedToFlags?: number;
  loadScreenId?: number;
  transitionDestination?: string;
  linkedToModule?: string;
  scripts?: {
    onClick?: string;
    onOpen?: string;
    onClosed?: string;
    onLock?: string;
    onUnlock?: string;
    onFailToOpen?: string;
  };
  rawFields?: TransitionFieldRawDto[];
  diagnostics?: TransitionNumericDiagnosticDto[];
  evidenceStatus:
    | "confirmed_in_corpus"
    | "present_key_surface_only"
    | "runtime_unknown";
}

export interface AreaTriggerTransitionDto {
  triggerIndex: number;
  tag?: string;
  linkedTo?: string;
  linkedToFlags?: number;
  loadScreenId?: number;
  scripts?: {
    onEnter?: string;
    onExit?: string;
    heartbeat?: string;
    onClick?: string;
    onDisarm?: string;
    onTrapTriggered?: string;
    userDefined?: string;
  };
  rawFields?: TransitionFieldRawDto[];
  diagnostics?: TransitionNumericDiagnosticDto[];
  evidenceStatus:
    | "confirmed_in_corpus"
    | "runtime_loader_gap"
    | "runtime_unknown";
}
```

Mapowanie kolekcji:
1. `Door List[i]` -> `composition.doors[i].transition` (`AreaDoorTransitionDto`).
2. `TriggerList[i]` -> `composition.triggers[i].transition` (`AreaTriggerTransitionDto`).
3. Jezeli etap migracji nie ma jeszcze `composition.triggers`, dopuszczalny fallback tymczasowy:
1. `composition.triggerProxies[]` (jawnie oznaczone jako tymczasowe),
2. ale NIE wolno mieszac trigger transition z `placeable/vfx`.

## 6.3 Write contract (revision-gated)

1. Operacje mutujace przejsc musza byc `expectedRevision` gated.
2. Konflikt stale-write -> `writeBlockedReason = "stale_revision"`.
3. Brak revision -> `writeBlockedReason = "missing_revision"`.
4. Bledy walidacji transition -> `writeBlockedReason = "validation_error"`.
5. `door` i `trigger` powinny miec osobne operation families (nie laczyc w jedna, niesparametryzowana liste mutacji).

## 7. Edge-case policy

## 7.1 Aliasy i spelling drift

1. Akceptowac oba spellingi destination (`TransitionDestin`, `TransitionDestination`) na wejsciu.
2. W modelu kanonicznym emitowac jedno pole: `transitionDestination`.
3. Zachowywac `rawKey` dla audytu i diagnostyki.

## 7.2 Counter-key typo w artefaktach

1. W artefaktach reverse istnieje wariant `loadscreeen_nonzero` (triple `e`).
2. Adapter telemetry powinien:
1. zachowac surowy klucz,
2. dodatkowo wystawic znormalizowany alias `loadscreen_nonzero`.

## 7.3 Strict key matching

1. Non-canonical case (np. `linkedtoflags`) i whitespace-padded keys nie sa mapowane przez parser mapped-key.
2. Dla backendu: rejestrowac to jako `ignored_unknown_key`, nie fail-fast calego obiektu.

## 7.4 Numeric boundaries

1. DOOR parser reverse akceptuje signed int32 range i odrzuca overflow.
2. Plus-prefixed tokeny (`+1`, `+3`) nie przechodza strict parse.
3. Trigger schema z `0437` wskazuje typy waskie (`LinkedToFlags=byte`, `LoadScreenID=word`), ale bez twardej polityki writera w tym repo.
4. Rekomendacja: dla trigger write path dodac policy-level ograniczenia domeny (`0..255` / `0..65535`) za feature flag `strictTriggerNumericDomain`, domyslnie `off` do czasu retail write-proof.

## 7.5 Observed-empty fields

1. `TransitionDestin` i `LinkedToModule` sa obecnie `observed-empty-in-corpus` na poziomie instancji.
2. Nie wolno usuwaæ tych pol z DTO ani writera; musza pozostac preserve-capable.

## 8. Invariants (must hold)

1. Brak semantycznej interpretacji `LinkedToFlags` na etapie API contract (brak mapowania enum `door/waypoint/nothing` jako twardego faktu runtime).
2. Dla kazdego door/trigger transition pola numeric:
1. backend przechowuje `rawToken` i wynik parse,
2. parse-fail nie moze byc cicho normalizowany.
3. Canonical emit nie wypuszcza jednoczesnie aliasow tego samego pola.
4. Niezmienione pola transition musza przechodzic writeback bez mutacji wartosci (`preserve-first`).

## 9. Ryzyka i otwarte punkty

1. Brak retail-hard potwierdzenia runtime efektu `LoadScreenID`.
2. Brak retail-hard mapowania `rbLinkedTo* -> LinkedToFlags`.
3. Brak direct writer-proof dla `TransitionDestination` i `LinkedToModule`.
4. Trigger runtime path w NWN/NWN2 jest niespojny z obecnoscia danych trigger transitions w korpusie, wiec behavior claims musza pozostac zablokowane.

## 10. R63 decyzja implementacyjna

1. Wprowadzic data-contract dla transition fields teraz (read + diagnostics + revisioned write envelope).
2. Utrzymac `preserve-first`, bez semantycznego mapowania `LinkedToFlags` i bez runtime claims.
3. Rozdzielic rodziny operacji `door` i `trigger`.
4. Domknac parser/adapter alias policy: `LoadScreenID/LoadScreenId`, `TransitionDestin/TransitionDestination`, `loadscreeen_nonzero/loadscreen_nonzero`.
5. Traktowac trigger transitions jako supported-data / runtime-unknown do czasu dodatkowego hard-confirm.

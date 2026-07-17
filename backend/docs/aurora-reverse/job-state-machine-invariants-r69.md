# Job State Machine Invariants (R69, Agent C7)

Data: 2026-05-24  
Status: Normatywne invariants dla Processing Jobs Foundation (PR-3)  
Zakres: formalne reguly lifecycle jobow processingu (`enqueue/status/cancel/retry`) zgodne z `code-skeleton-processing-jobs-r68.md` i zaleznosciami PR z `pr-dependency-graph-r69.md`.

## 1. Definicje formalne

Niech:
1. `S = {queued, running, cancelling, completed, completed_with_drift, failed, cancelled}` - zbior statusow joba.
2. `T = {completed, completed_with_drift, failed, cancelled}` - zbior statusow terminalnych.
3. `N = S \ T = {queued, running, cancelling}` - zbior statusow nieterminalnych.
4. `A = {enqueue, start, progress, cancel_request, cancel_ack, complete, complete_with_drift, fail, retry_manual, retry_auto}` - zbior akcji lifecycle.
5. `delta subseteq S0 x A x S`, gdzie `S0 = S U {null}` - relacja dozwolonych przejsc (sekcja 2).
6. `attempt in Z+`, `maxAttempts in Z+`, `retryCount in Z>=0`, `transitionVersion in Z>=0`.
7. `error.retryable in {true,false}` dla bledu konczacego probe.
8. `cancelRequested, cancelHonored in {true,false}`.

Kazdy rekord joba `J` musi byc interpretowany jako snapshot stanu `J = (status, phase, attempt, maxAttempts, retryCount, transitionVersion, cancelRequested, cancelHonored, ...)`.

## 2. Invarianty przejsc stanu (Allowed Transitions)

### INV-STM-01: Zamkniety zbior statusow
`status(J) in S` zawsze.

### INV-STM-02: Jedyna dozwolona relacja `delta`
Dozwolone sa tylko przejscia:
1. `(null, enqueue, queued)`
2. `(queued, start, running)`
3. `(running, progress, running)`
4. `(queued, cancel_request, cancelled)`
5. `(running, cancel_request, cancelling)`
6. `(cancelling, cancel_ack, cancelled)`
7. `(running, complete, completed)`
8. `(cancelling, complete, completed)`
9. `(running, complete_with_drift, completed_with_drift)`
10. `(running, fail, failed)`
11. `(cancelling, fail, failed)`
12. `(failed, retry_manual, queued)`
13. `(cancelled, retry_manual, queued)`
14. `(running, retry_auto, queued)`

Kazde przejscie spoza listy jest niedozwolone i musi skutkowac konfliktem stanu (`PIPELINE_JOB_STATE_CONFLICT`).

### INV-STM-03: Brak wyjsc z terminali bez jawnego retry_manual
Dla `s in T` niedozwolone jest jakiekolwiek przejscie poza `retry_manual` z `failed|cancelled`.
W szczegolnosci:
1. `cancel_request` z `completed|completed_with_drift|failed|cancelled` jest zabronione.
2. `retry_*` z `queued|running|cancelling|completed|completed_with_drift` jest zabronione.

### INV-STM-04: Monotonicznosc semantyczna
Status przechodzi z `N` do `T` monotonicznie, z jednym wyjatkiem kontrolowanym: `running -> queued` tylko przez `retry_auto` (nowa proba).

## 3. Invarianty atomowosci i wspolbieznosci

### INV-CAS-01: CAS gate na kazdym przejsciu
Kazda mutacja lifecycle musi byc warunkowa:
`WHERE job_id = :jobId AND transition_version = :expectedVersion`.

### INV-CAS-02: Jedno przejscie = jeden inkrement wersji
Przy poprawnym przejsciu:
1. `transitionVersion' = transitionVersion + 1`
2. `updatedAt' = now()`

### INV-CAS-03: Conflict on lost update
Jesli CAS nie zaktualizowal rekordu (0 rows), wynik musi byc konflikt stanu (`PIPELINE_JOB_STATE_CONFLICT`) i brak side effectow lifecycle dla tej akcji.

## 4. Invarianty terminalnosci

### INV-TERM-01: Definicja terminalna
`isTerminal(status) <=> status in T`.

### INV-TERM-02: Wymagalnosc czasu zakonczenia
Dla `status in T` musi byc ustawione `completedAt != null`.
Dla `status in N` pole `completedAt` musi pozostac `null`.

### INV-TERM-03: Koncowe flagi cancel
Dla `status=cancelled`: `cancelRequested=true` oraz `cancelHonored=true`.
Dla statusow innych niz `cancelled`, `cancelHonored` moze byc `false`.

## 5. Invarianty retry caps

### INV-RET-01: Retry auto tylko dla bledow retryable
`retry_auto` jest dozwolone tylko gdy ostatni blad ma `error.retryable=true`.

### INV-RET-02: Twardy limit automatycznych prob
`retry_auto` jest dozwolone tylko gdy `attempt < maxAttempts`.
Po osiagnieciu limitu (`attempt >= maxAttempts`) wynik musi byc terminalny `failed` z kodem `PIPELINE_RETRY_EXHAUSTED` (bez kolejnego enqueue auto).

### INV-RET-03: Retry auto blokowane przez cancel
Jesli `cancelRequested=true`, `retry_auto` jest zabronione.

### INV-RET-04: Budzet retry jest skonczony
Dla pojedynczego przebiegu joba liczba automatycznych ponowien jest skonczona i ograniczona przez `maxAttempts`.
Formalnie: sekwencja przejsc zawierajaca `retry_auto` ma dlugosc <= `maxAttempts - 1`.

### INV-RET-05: Retry manual tylko z terminali retry-eligible
`retry_manual` jest dozwolone tylko dla `status in {failed, cancelled}` i skutkuje `status'=queued` oraz nowa proba (`attempt' = attempt + 1`).

## 6. Invarianty idempotencji API

### INV-IDEM-01: Idempotency-Key wymagany dla mutujacego enqueue
Dla `POST /api/v1/processing/{type}` brak `Idempotency-Key` jest bledem kontraktu (`PIPELINE_IDEMPOTENCY_KEY_REQUIRED`).

### INV-IDEM-02: Scope unikalnosci klucza
Klucz idempotencji jest unikalny co najmniej w scope:
`(actorId, routeTemplate, pipelineType, idempotencyKey)`.

### INV-IDEM-03: Replay semantyczny
Dla tego samego scope i tego samego `requestFingerprint` odpowiedz musi byc replayem tego samego logical result (ten sam `jobId`/snapshot), bez tworzenia nowego joba.

### INV-IDEM-04: Reuse collision = konflikt
Dla tego samego scope i innego `requestFingerprint` wynik musi byc konflikt (`PIPELINE_IDEMPOTENCY_KEY_REUSED`) i system nie tworzy nowego joba.

### INV-IDEM-05: Idempotent cancel/retry
Operacje `cancel` i `retry` musza byc idempotentne semantycznie:
1. powtorzenie tej samej skutecznej akcji nie moze tworzyc dodatkowych side effectow,
2. odpowiedz pozostaje zgodna ze stanem docelowym i zasadami konfliktu stanu.

## 7. Invarianty spojnosc stanu <-> telemetry

### INV-OBS-01: Event retry
Kazde przejscie `retry_auto` musi emitowac event `pipeline.retry.scheduled`.

### INV-OBS-02: Event exhausted
Przejscie do `failed` z powodu limitu prob musi emitowac `pipeline.retry.exhausted`.

### INV-OBS-03: Event cancel request
Kazde przejscie `cancel_request` musi emitowac `pipeline.job.cancel_requested`.

## 8. Kryteria zgodnosci implementacyjnej (R68/R69)

Implementacja PR-3 jest zgodna z tym dokumentem tylko wtedy, gdy:
1. `job-status.state-machine` egzekwuje dokladnie `delta` z INV-STM-02.
2. Repozytorium transition stosuje CAS z INV-CAS-*.
3. Retry policy i scheduler egzekwuja INV-RET-*.
4. Idempotency store i endpoint enqueue egzekwuja INV-IDEM-*.
5. E2E/Integration testy lifecycle pokrywaja co najmniej: legal transitions, illegal transitions (409), retry exhausted, replay idempotency, key reuse conflict.

## 9. Niezmienniki bezpieczenstwa zmian (R69 graph discipline)

Aby nie naruszyc topologii zaleznosci R69:
1. Invarianty z tego dokumentu sa kontraktem PR-3 i nie wymagaja modyfikacji zakresu PR-1 ani PR-2.
2. Wszelkie rozszerzenia state machine poza `S` i `delta` musza byc traktowane jako zmiana kontraktu i wymagaja osobnego ADR/spec update.
3. Konflikty merge w `app.module.ts` i `database/schema.ts` nie moga oslabic INV-CAS, INV-RET ani INV-IDEM.

# Aurora Web Backend - Hexagonal Architecture

## Cel
Ten dokument opisuje docelowa architekture heksagonalna (Ports & Adapters) dla backendu Aurora Web.
Obecny kod dziala i ma zabezpieczenia CORS/RBAC, ale nie jest jeszcze w 100% rozdzielony heksagonalnie.

## Zasady
1. Domena nie zna NestJS, HTTP, SQL ani Docker.
2. Use case (application) zna tylko porty (interfejsy), nie zna adapterow.
3. Adaptery sa wymienialne (Postgres, cache, Neverwinter, image pipeline).
4. Inbound adapter (API) wywoluje use case; outbound adapter realizuje port.
5. Autoryzacja jest egzekwowana na backendzie (roles + permissions), nigdy tylko w UI.

## Diagram (Docelowy)
```mermaid
flowchart LR
  FE["Frontend (Docker)"] --> API["Inbound Adapter: HTTP API (Nest Controllers)"]
  JOB["Worker / Queue Consumers"] --> API

  API --> APP["Application Layer (Use Cases / Commands / Queries)"]
  APP --> DOM["Domain Layer (Entities, Value Objects, Domain Services)"]

  APP --> P1["Port: UserRepository"]
  APP --> P2["Port: SessionRepository"]
  APP --> P3["Port: AreaRepository"]
  APP --> P4["Port: AssetRepository"]
  APP --> P5["Port: ImageProcessingPort"]
  APP --> P6["Port: EventPublisherPort (Outbox)"]
  APP --> P7["Port: NeverwinterGatewayPort"]

  P1 --> DBA["Outbound Adapter: Postgres/Drizzle"]
  P2 --> DBA
  P3 --> DBA
  P4 --> DBA
  P5 --> IMG["Outbound Adapter: Image Processor + Cache Builder"]
  P6 --> OUT["Outbound Adapter: Outbox + Queue"]
  P7 --> NWN["Outbound Adapter: Neverwinter Integration"]

  CORS["CORS Policy"] --> API
  AUTH["Auth Guard (Roles + Permissions)"] --> API
  OBS["Logging / Tracing / Metrics"] --> API
  OBS --> APP
  OBS --> DBA
```

## Diagram warstwowy (Frontend -> Backend -> Data)
```mermaid
flowchart TB
  subgraph L0["Layer 0 - Client"]
    FE["Frontend SPA (Docker, browser)"]
  end

  subgraph L1["Layer 1 - Edge/API (Inbound)"]
    API["Nest Controllers + DTO + OpenAPI"]
    CORSL["CORS policy"]
    AUTHL["Auth Guard (Roles + Permissions)"]
  end

  subgraph L2["Layer 2 - Application"]
    APP["Use Cases / Commands / Queries"]
  end

  subgraph L3["Layer 3 - Domain"]
    DOM["Entities + Value Objects + Domain Rules"]
  end

  subgraph L4["Layer 4 - Ports (Abstractions)"]
    PUSR["UserRepositoryPort"]
    PSES["SessionRepositoryPort"]
    PAREA["AreaRepositoryPort"]
    PASS["AssetRepositoryPort"]
    PIMG["ImageProcessingPort"]
    POUT["EventPublisherPort (Outbox)"]
    PNWN["NeverwinterGatewayPort"]
  end

  subgraph L5["Layer 5 - Infrastructure (Outbound Adapters)"]
    ADPDB["Postgres adapters (Drizzle)"]
    ADPIMG["Image processing workers + cache builder"]
    ADPOUT["Outbox + queue adapter"]
    ADPNWN["Neverwinter integration adapter"]
  end

  subgraph L6["Layer 6 - Data/External Systems"]
    DB["Postgres database"]
    CACHE["File/object cache for processed assets"]
    MQ["Queue broker / worker runtime"]
    NWN["Neverwinter services"]
  end

  FE --> API
  CORSL --> API
  AUTHL --> API
  API --> APP
  APP --> DOM

  APP --> PUSR
  APP --> PSES
  APP --> PAREA
  APP --> PASS
  APP --> PIMG
  APP --> POUT
  APP --> PNWN

  PUSR --> ADPDB
  PSES --> ADPDB
  PAREA --> ADPDB
  PASS --> ADPDB
  PIMG --> ADPIMG
  POUT --> ADPOUT
  PNWN --> ADPNWN

  ADPDB --> DB
  ADPIMG --> CACHE
  ADPOUT --> MQ
  ADPNWN --> NWN
```

## Layer responsibilities (kto za co odpowiada)
1. Layer 0 - Client: frontend wysyla requesty i tylko renderuje UI.
2. Layer 1 - Edge/API: walidacja wejscia, auth, CORS, mapowanie HTTP -> use case.
3. Layer 2 - Application: scenariusze biznesowe, orkiestracja, transakcje aplikacyjne.
4. Layer 3 - Domain: reguly domenowe, encje i niezmienniki.
5. Layer 4 - Ports: kontrakty zaleznosci, brak szczegolow technologicznych.
6. Layer 5 - Infrastructure: implementacje portow (DB, image pipeline, outbox, integracje).
7. Layer 6 - Data/External: fizyczna baza, cache, kolejki, systemy zewnetrzne.

## Granice odpowiedzialnosci
1. Frontend nigdy nie omija backendowej autoryzacji.
2. Domain/Application nie importuja klas NestJS ani SQL drivera.
3. Adaptery outbound nie zawieraja logiki domenowej, tylko I/O i mapowanie.
4. Kazda nowa funkcja przechodzi sciezke: inbound -> use case -> domain -> port -> adapter.

## Warstwy
### 1) Domain (rdzen biznesowy)
- encje, value objecty, reguly biznesowe
- brak zaleznosci do frameworka
- przyklady: `User`, `Role`, `Permission`, `Area`, `Asset`

### 2) Application (use cases)
- orkiestruje scenariusz
- operuje na portach
- waliduje reguly aplikacyjne
- przyklady: `LoginUser`, `GetCurrentUser`, `ProcessAreaTextures`, `GetBenchmarkAreas`

### 3) Inbound adapters
- HTTP kontrolery, DTO, parsery request/response
- mapowanie request -> use case
- egzekwowanie auth (guard, role, permission)

### 4) Outbound adapters
- repozytoria DB (Postgres)
- integracje z systemami zewnetrznymi
- pipeline przetwarzania obrazow i cache
- outbox / queue

## Proponowany uklad katalogow backendu
```text
backend/src/
  modules/
    auth/
      domain/
      application/
      adapters/
        inbound/http/
        outbound/postgres/
    areas/
      domain/
      application/
      adapters/
        inbound/http/
        outbound/postgres/
        outbound/image-processing/
    assets/
      domain/
      application/
      adapters/
        inbound/http/
        outbound/postgres/
    benchmark/
      domain/
      application/
      adapters/
        inbound/http/
        outbound/postgres/
  shared/
    application/
    domain/
    infrastructure/
```

## Mapowanie obecnego stanu -> heksagon
1. `modules/auth/adapters/inbound/http/auth.controller.ts` -> inbound adapter (HTTP).
2. `modules/auth/application/auth.application.service.ts` -> use case/application service.
3. `modules/auth/application/ports/auth-repository.port.ts` -> port interfejsowy.
4. `modules/auth/adapters/outbound/**` -> adaptery infrastrukturalne (memory/postgres).
5. `modules/auth/adapters/inbound/http/access.guard.ts` -> inbound policy enforcement.
6. `common/http/cors.ts` -> inbound policy (granica sieciowa).

## Kolejnosc wdrozenia (bez rewolucji)
1. `DONE`: wydzielone porty i use case w module `auth`.
2. `DONE`: `auth` przepiety na porty + adaptery outbound.
3. Powtorzyc wzorzec dla `areas` i `assets`.
4. Dodac `ImageProcessingPort` + adapter worker/queue.
5. Dodac `EventPublisherPort` (Outbox) pod integracje Neverwinter.

## Definicja Done dla modulu heksagonalnego
1. Domena i use case bez zaleznosci do NestJS.
2. Kontroler nie zawiera logiki biznesowej.
3. Repozytoria i integracje tylko przez porty.
4. Testy: unit (domain/use case), regresja (API), mutacyjne (logika krytyczna).
5. Kontrola dostepu: role + permissions na akcjach.

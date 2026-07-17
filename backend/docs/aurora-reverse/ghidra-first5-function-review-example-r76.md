# F12 - First 5 Function Review Example (R76)

Cel: pokazowe, fikcyjne wypelnienie szablonu dla 5 funkcji, zeby latwo zobaczyc oczekiwany poziom szczegolowosci.

## Instrukcja wypelnienia
- `nazwa`: nazwa funkcji (symbol z Ghidra lub nazwa robocza).
- `rola`: co funkcja robi w analizowanym przeplywie.
- `evidence`: konkretne przeslanki (dekompilat, stale, API, logika warunkow).
- `xrefs`: kluczowe odwolania (callers/callees, adresy, string refs).
- `risk`: poziom ryzyka (Low/Medium/High) i uzasadnienie.
- `backend impact`: potencjalny wplyw na backend (endpointy, walidacja, auth, dane, telemetry).

## Tabela przegladu (pierwsze 5 funkcji)

| # | nazwa | rola | evidence | xrefs | risk | backend impact |
|---|---|---|---|---|---|---|
| 1 | `FUN_14001A2B0` | Normalizuje i waliduje token sesji z naglowka klienta. | Dekompilat: trim + lowercase + porownanie prefixu `"Bearer "`; stale: `ERR_TOKEN_FORMAT`; branch przy dlugosci < 24. | callers: `FUN_140012340` (dispatcher), `FUN_14007C910` (refresh); callees: `FUN_14003F120` (base64 decode). | `High` - bledna normalizacja moze obchodzic auth. | Wplyw na warstwe auth middleware oraz mapowanie kodow 401/403 w API. |
| 2 | `FUN_14002C910` | Buduje obiekt uprawnien uzytkownika na podstawie bitmaski roli. | Widoczna maska `0x1F3`; switch dla flag `ADMIN`, `MOD`, `AUDIT`; fallback do `GUEST`. | callers: `FUN_140010F00`; callees: `FUN_14002CB80`, `FUN_14005AA40`; string refs: `"role escalation denied"`. | `Medium` - ryzyko blednej interpretacji roli. | Wplyw na authz endpointow administracyjnych i filtrowanie danych. |
| 3 | `FUN_140045670` | Odczytuje konfiguracje runtime z pliku i nadpisuje wartosci domyslne. | Uzywa `GetPrivateProfileStringA`; klucze: `MaxUploadMb`, `EnableVerboseTrace`; brak clamp dla wartosci > 1024. | callers: `FUN_1400012D0` (startup); callees: `FUN_140046A10` (parse int). | `Medium` - moze destabilizowac runtime przez skrajne wartosci. | Wplyw na limity requestow i telemetry level backendu. |
| 4 | `FUN_14006D220` | Serializuje rekord zdarzenia do bufora przed wysylka do kolejki. | Petla kopiujaca pola bez jawnej walidacji dlugosci `event_name`; stale: `QUEUE_EVT_V2`; warunek retry do 3 prob. | callers: `FUN_14006CFB0`; callees: `FUN_140011A90` (queue publish), `memcpy`; xref do stringa `"publish failed"`. | `High` - mozliwe uszkodzenie danych eventu / overflow logiczny. | Wplyw na pipeline telemetry i jakosc danych observability. |
| 5 | `FUN_14008F0A0` | Tlumaczy kody bledow warstwy natywnej na kody API. | Tablica mapowan: `0x05->400`, `0x0B->404`, default `500`; dodatkowy case dla `ERR_TIMEOUT` => `503`. | callers: `FUN_140013D20` (HTTP response builder); callees: brak; string refs: `"internal failure"`. | `Low` - glownie spojnosc odpowiedzi, niski wplyw security. | Wplyw na kontrakt API i semantyke bledow dla klientow frontend. |

## Sekcja szczegolowa (opcjonalnie, po jednym bloku na funkcje)

### Funkcja 1: `FUN_14001A2B0`
- nazwa: `FUN_14001A2B0` (roboczo: `NormalizeSessionToken`)
- rola: Oczyszcza token, sprawdza format Bearer i przygotowuje dane do dekodowania.
- evidence: `if (len < 24) return ERR_TOKEN_FORMAT;`, porownanie prefixu `"Bearer "`, wywolanie dekodera base64.
- xrefs: Callerzy: `FUN_140012340`, `FUN_14007C910`; callee: `FUN_14003F120`; string: `"invalid token"`.
- risk: `High` - blad moze dopuscic tokeny o niepoprawnym formacie.
- backend impact: Kandydat do mapowania na walidator w middleware auth + testy regresji 401.

### Funkcja 2: `FUN_14002C910`
- nazwa: `FUN_14002C910` (roboczo: `BuildPermissionSet`)
- rola: Zamienia bitmaske roli na zestaw uprawnien runtime.
- evidence: Operacje bitowe na `0x1F3`, gałęzie dla ról uprzywilejowanych, log `"role escalation denied"`.
- xrefs: Caller: `FUN_140010F00`; callees: `FUN_14002CB80`, `FUN_14005AA40`.
- risk: `Medium` - niescislosc mapowania moze dawac za szerokie lub za waskie uprawnienia.
- backend impact: Wplywa na reguly autoryzacji endpointow `admin/*` i `audit/*`.

### Funkcja 3: `FUN_140045670`
- nazwa: `FUN_140045670` (roboczo: `LoadRuntimeIniOverrides`)
- rola: Laduje nadpisania konfiguracji i aplikuje je na bootstrapie.
- evidence: Odczyt kluczy INI, parsowanie int bez ograniczenia gornej granicy, fallback do defaultow.
- xrefs: Caller: `FUN_1400012D0`; callee: `FUN_140046A10`.
- risk: `Medium` - zle wartosci moga powodowac niestabilnosc lub degradacje wydajnosci.
- backend impact: Powiazanie z backendowym `runtime settings` i walidacja zakresow.

### Funkcja 4: `FUN_14006D220`
- nazwa: `FUN_14006D220` (roboczo: `SerializeQueueEventV2`)
- rola: Sklada zdarzenie i publikuje do kolejki z retry.
- evidence: `memcpy` w petli, brak twardego limitu `event_name`, licznik retry do 3.
- xrefs: Caller: `FUN_14006CFB0`; callees: `FUN_140011A90`, `memcpy`; string: `"publish failed"`.
- risk: `High` - mozliwe uszkodzenie payloadu i bledy integralnosci telemetry.
- backend impact: Kandydat do twardych limitow dlugosci pola i dodatkowych metryk odrzucen.

### Funkcja 5: `FUN_14008F0A0`
- nazwa: `FUN_14008F0A0` (roboczo: `MapNativeErrorToHttp`)
- rola: Konwertuje bledy natywne do kodow HTTP widocznych dla klienta.
- evidence: Statyczna tablica mapowan, domyslny fallback 500, specjalna obsluga timeout.
- xrefs: Caller: `FUN_140013D20`; brak callees; string: `"internal failure"`.
- risk: `Low` - dotyczy glownie ergonomii API i diagnostyki.
- backend impact: Stabilizuje kontrakt API i upraszcza handling bledow po stronie frontend/client SDK.

## Kryteria ryzyka (szybka skala)
- `Low`: brak bezposredniego wplywu na security/integralnosc danych.
- `Medium`: mozliwy wplyw na logike biznesowa, walidacje lub stabilnosc.
- `High`: potencjalny wplyw na auth/authz, poufnosc, integralnosc danych lub RCE.

## Notatki sesji
- Data przegladu: 2026-05-24
- Rewersujacy: Agent A13 (przyklad demonstracyjny)
- Zakres binarki/modulu: `aurora-client.exe` (fikcyjny modul `Session/Telemetry`)
- Powiazane artefakty: `ghidra-first5-function-review-template-r75.md`, notatki lokalne z sesji triage

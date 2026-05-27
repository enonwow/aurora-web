# Ops Runbook: Module Refresh (Spec R63, Agent V1)

Data: 2026-05-24  
Status: Draft operational runbook  
Zakres: nadpisanie modulu, restart backendu, cleanup starego stagingu, re-ingest do bloba, rollback i diagnostyka.

## 1. Cel i granice

Ten runbook definiuje bezpieczna procedure odswiezenia modulu dla Aurora backend, zgodna z:
1. `module-source-priority-spec-r63.md`
2. `admin-runtime-settings-contract-spec-r63.md`
3. `blob-ingest-pipeline-spec-r63.md`
4. `processing-error-taxonomy-spec-r63.md`
5. aktualnym runtime backendu (`runtime-settings-bootstrap.service.ts`, `s3-module-blob-storage.service.ts`).

Runbook zaklada operacje na srodowisku, gdzie backend startuje z `OnApplicationBootstrap` i ma global prefix `api/v1`.

## 2. Zalozenia runtime (Aurora Reverse + backend)

1. Priorytet zrodla modulu jest deterministyczny:
- `module_decompiled` > `module_packed` > `hak` > `vanilla`.

2. Dla wyboru modulu obowiazuje matrix:
- `D!=empty, P!=empty` -> `DECOMPILED_PRIMARY`, packed sync `SKIP`.
- `D!=empty, P==empty` -> `DECOMPILED_ONLY`, packed sync `SKIP`.
- `D==empty, P!=empty` -> `PACKED_SYNC_REQUIRED`, packed sync `REQUIRED`.
- `D==empty, P==empty` -> fail-fast startup.

3. Re-ingest packed -> blob jest wykonywany przy starcie backendu tylko gdy `D==empty && P!=empty`.

4. Sync do bloba robi `replace snapshot`:
- normalizuje `modulePrefix`,
- czyta liste obiektow pod prefixem,
- usuwa wszystkie obiekty pod prefixem,
- uploaduje nowy snapshot.

5. Health endpoint:
- `GET /api/v1/health` -> `200` i payload z `status=ok`.

6. Runtime settings:
- domyslnie `backend/config/runtime-settings.json`,
- override przez `RUNTIME_SETTINGS_FILE`,
- `PUT /api/v1/settings/runtime` nadpisuje caly payload i zwieksza `revision`.

## 3. Ryzyka operacyjne

1. Jesli `moduleDecompiledPath` nie jest pusty, restart NIE zrobi packed re-ingest.
2. `replace snapshot` kasuje caly aktualny prefix bloba przed uploadem nowego snapshotu.
3. Nieudany refresh bez backupu prefixu i runtime settings utrudnia szybki rollback.
4. Reczny cleanup moze usunac aktywne dane, jesli zakres usuwania nie jest restrykcyjny.

## 4. Wejscia i zmienne operatora

Ustal przed startem:

```powershell
$ApiBase = "http://localhost:3000/api/v1"
$BackendService = "backend"              # docker compose service
$RuntimeSettingsFile = "C:\Projects\aurora-web-backend\backend\config\runtime-settings.json"
$ModulePackedPath = "C:\path\to\new\module.mod"
$RunId = (Get-Date -Format "yyyyMMdd-HHmmss")
$BackupRoot = "C:\Projects\aurora-web-backend\backend\.ops-backups\module-refresh\$RunId"

# Blob assumptions (przyklad z runtime defaults)
$BlobEndpoint = "http://localhost:8333"
$BlobBucket = "aurora-module-assets"
$ModulePrefix = "modules/current"
$BlobBackupPrefix = "ops-backup/module-refresh/$RunId/modules-current"

# Lokalny staging (dla reverse workflow / przyszlych ingest jobow)
$StagingRoot = "C:\Projects\aurora-web-backend\backend\.staging\module-refresh"
```

Uwaga: wartosci blob (`endpoint/bucket/prefix`) pobierz z aktualnych runtime settings, nie hardcode.

## 5. Pre-flight (obowiazkowe)

1. Zweryfikuj, ze backend odpowiada:

```powershell
Invoke-WebRequest -Uri "$ApiBase/health" -Method GET
```

2. Zrob backup runtime settings:

```powershell
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
Copy-Item -LiteralPath $RuntimeSettingsFile -Destination "$BackupRoot\runtime-settings.before.json"
```

3. Zanotuj hash nowego pliku `.mod`:

```powershell
Get-FileHash -Algorithm SHA256 -Path $ModulePackedPath | Format-List
```

4. Zrob backup aktualnego prefixu blob (wymagane przed refresh):

```powershell
aws --endpoint-url $BlobEndpoint s3 cp "s3://$BlobBucket/$ModulePrefix" "s3://$BlobBucket/$BlobBackupPrefix" --recursive
```

5. Zapisz liste obiektow prefixu (audit):

```powershell
aws --endpoint-url $BlobEndpoint s3 ls "s3://$BlobBucket/$ModulePrefix/" --recursive | Out-File "$BackupRoot\blob-prefix.before.txt"
```

## 6. Procedura glowna

## 6.1 Nadpisanie modulu (runtime switch do packed refresh)

Cel: wymusic poprawny tryb `PACKED_SYNC_REQUIRED` na restart.

1. Pobierz aktualne runtime settings (admin API) i zapisz kopie:

```powershell
# wymaga tokena admina (Bearer)
$token = "<ADMIN_BEARER_TOKEN>"
$headers = @{ Authorization = "Bearer $token" }
$resp = Invoke-RestMethod -Uri "$ApiBase/settings/runtime" -Headers $headers -Method GET
$runtime = $resp.data
$runtime | ConvertTo-Json -Depth 20 | Out-File "$BackupRoot\runtime-settings.api.before.json"
```

2. Przygotuj payload override:
- `paths.moduleDecompiledPath = ""`
- `paths.modulePackedPath = <nowy path MOD>`
- pozostale pola bez zmian.

3. Wyslij `PUT /api/v1/settings/runtime`:

```powershell
$runtime.paths.moduleDecompiledPath = ""
$runtime.paths.modulePackedPath = $ModulePackedPath
$body = $runtime | ConvertTo-Json -Depth 20
Invoke-RestMethod -Uri "$ApiBase/settings/runtime" -Headers $headers -Method PUT -ContentType "application/json" -Body $body
```

Warunek przejscia:
1. HTTP 200.
2. `revision` zwiekszone o +1.

## 6.2 Restart backendu

1. Restart uslugi backend:

```powershell
docker compose restart $BackendService
```

2. Oczekuj na health:

```powershell
for ($i=0; $i -lt 60; $i++) {
  try {
    $h = Invoke-RestMethod -Uri "$ApiBase/health" -Method GET -TimeoutSec 2
    if ($h.status -eq "ok") { "HEALTH_OK"; break }
  } catch {}
  Start-Sleep -Seconds 2
}
```

3. Zweryfikuj log startu i sync:

```powershell
docker compose logs $BackendService --since=5m | Select-String -Pattern "Packed module detected|Module blob sync completed|Runtime settings invalid"
```

Warunek przejscia:
1. Jest `Packed module detected (...)`.
2. Jest `Module blob sync completed: ...`.
3. Brak fatal `Runtime settings invalid...`.

## 6.3 Cleanup starego stagingu

Cel: usunac osierocone artefakty stagingu, bez naruszania aktywnego runu.

Zasada bezpieczenstwa:
1. Nigdy nie usuwaj katalogu biezacego runu (`$RunId`).
2. Nigdy nie usuwaj `cas/blobs/*`, `commits/*`, `refs/*`.
3. Czysc tylko przestrzenie staging z TTL.

Lokalny cleanup (przykladowy TTL 7 dni):

```powershell
New-Item -ItemType Directory -Force -Path $StagingRoot | Out-Null
Get-ChildItem -Path $StagingRoot -Directory |
  Where-Object { $_.Name -ne $RunId -and $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
  Remove-Item -Recurse -Force
```

Blob cleanup (tylko staging prefix, jesli uzywany przez worker):

```powershell
$StagingPrefix = "staging/module-refresh/"
aws --endpoint-url $BlobEndpoint s3 ls "s3://$BlobBucket/$StagingPrefix" --recursive | Out-File "$BackupRoot\blob-staging.before.txt"

# usuwaj tylko stare podkatalogi stagingowe, nigdy aktywne CAS/commit/ref
# przyklad: reczny delete wskazanego, starego runu
# aws --endpoint-url $BlobEndpoint s3 rm "s3://$BlobBucket/$StagingPrefix<OLD_RUN_ID>/" --recursive
```

## 6.4 Re-ingest do bloba (weryfikacja)

W obecnym runtime re-ingest jest czescia restartu w kroku 6.2. Teraz potwierdz:

1. Prefix istnieje i ma obiekty:

```powershell
aws --endpoint-url $BlobEndpoint s3 ls "s3://$BlobBucket/$ModulePrefix/" --recursive | Out-File "$BackupRoot\blob-prefix.after.txt"
```

2. Porownaj before/after:
- liczba obiektow > 0 po refresh,
- timestampy/rozmiary zgodne z oczekiwanym snapshotem.

3. (Opcjonalnie) smoke test API po refresh:

```powershell
Invoke-WebRequest -Uri "$ApiBase/health" -Method GET
```

## 6.5 Powrot do decompiled primary (opcjonalny, jesli to standard runtime)

Jesli srodowisko ma dzialac na decompiled:
1. Przywroc `paths.moduleDecompiledPath` (wartosc z backupu).
2. Pozostaw `modulePackedPath` jako fallback lub wyzeruj wg polityki.
3. Zrob drugi restart backendu.
4. Potwierdz log:
- `Using moduleDecompiledPath as primary module source...`
  lub
- `Both module paths are configured... skipping packed module blob sync.`

## 7. Rollback

## 7.1 Trigger rollback

Uruchom rollback natychmiast, gdy:
1. backend nie przechodzi health do 2-5 minut po restarcie,
2. logi wskazuja `RUNTIME_SETTINGS_INVALID_*` lub failure extract/sync,
3. po refresh wykryto krytyczna regresje danych.

## 7.2 Krok A: rollback runtime settings

1. Przywroc plik runtime settings z backupu:

```powershell
Copy-Item -LiteralPath "$BackupRoot\runtime-settings.before.json" -Destination $RuntimeSettingsFile -Force
```

2. Restart backendu:

```powershell
docker compose restart $BackendService
```

3. Sprawdz health:

```powershell
Invoke-WebRequest -Uri "$ApiBase/health" -Method GET
```

## 7.3 Krok B: rollback blob prefix

1. Wyczyść biezacy prefix:

```powershell
aws --endpoint-url $BlobEndpoint s3 rm "s3://$BlobBucket/$ModulePrefix/" --recursive
```

2. Przywroc backup prefix:

```powershell
aws --endpoint-url $BlobEndpoint s3 cp "s3://$BlobBucket/$BlobBackupPrefix/" "s3://$BlobBucket/$ModulePrefix/" --recursive
```

3. Potwierdz liste:

```powershell
aws --endpoint-url $BlobEndpoint s3 ls "s3://$BlobBucket/$ModulePrefix/" --recursive | Out-File "$BackupRoot\blob-prefix.rollback.txt"
```

## 7.4 Krok C: final verification rollback

1. `GET /api/v1/health` -> `200`.
2. Brak bledow startup w logach backendu.
3. Snapshot bloba pod `modulePrefix` zgodny z backupem.

## 8. Diagnostyka (playbook)

## 8.1 Szybkie komendy triage

```powershell
# health
Invoke-WebRequest -Uri "$ApiBase/health" -Method GET

# ostatnie logi backendu
docker compose logs $BackendService --since=10m

# filtrowanie bledow runtime/module refresh
docker compose logs $BackendService --since=10m | Select-String -Pattern "Runtime settings invalid|Packed module|blob sync|VALIDATION_FAILED|PIPELINE_"

# aktualne runtime settings przez API
Invoke-RestMethod -Uri "$ApiBase/settings/runtime" -Headers $headers -Method GET
```

## 8.2 Mapowanie symptom -> przyczyna -> akcja

1. Symptom: startup fail z `either paths.moduleDecompiledPath or paths.modulePackedPath must be configured`
- Przyczyna: oba path puste.
- Akcja: ustaw co najmniej jeden path; dla refresh packed ustaw `D=""`, `P=<mod>`.

2. Symptom: startup fail z `Missing: blobStorage.*`
- Przyczyna: packed-only bez kompletnego blob config.
- Akcja: uzupelnij `endpoint/region/bucket/modulePrefix/accessKeyId/secretAccessKey`.

3. Symptom: `Unsupported module signature` / `Unsupported module ERF version` / range errors
- Przyczyna: zly lub uszkodzony plik `.mod/.erf`.
- Akcja: zweryfikuj plik, hash, uprawnienia i format; rollback jesli potrzeba.

4. Symptom: `blobStorage.modulePrefix cannot be empty`
- Przyczyna: pusty `modulePrefix` po trim.
- Akcja: ustaw niepusty prefix i powtorz restart.

5. Symptom: `VALIDATION_FAILED` przy `PUT /settings/runtime`
- Przyczyna: naruszenie schema (np. packed path bez bucket, zly hakProfileId).
- Akcja: popraw payload wg kontraktu admin runtime.

6. Symptom: bledy `PIPELINE_DECOMP_TIMEOUT` / `PIPELINE_DECOMP_DEPENDENCY_UNAVAILABLE`
- Przyczyna: transient dependency/timeout.
- Akcja: retry zgodnie z policy (exponential backoff), monitoruj infrastrukture.

## 9. Kryteria sukcesu refreshu

1. Runtime settings zapisane z nowa `revision`.
2. Backend po restarcie zwraca `health=ok`.
3. Log potwierdza packed detect + `Module blob sync completed`.
4. Blob prefix po refresh zawiera kompletny snapshot.
5. Stary staging wyczyszczony tylko w dozwolonym zakresie.
6. Backup + rollback artefakty zapisane pod `$BackupRoot`.

## 10. Notatki operacyjne

1. Dla minimalizacji downtime wykonuj refresh w oknie serwisowym.
2. Zawsze utrzymuj gotowy backup runtime settings i backup blob prefixu.
3. Przy migracji do pelnego ingest job R63 (lease/checkpoint/commit/ref) ten runbook pozostaje bazowym flow operatora; zmieni sie tylko mechanizm triggera re-ingest (job API zamiast samego restartu).

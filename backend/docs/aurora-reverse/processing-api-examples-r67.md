# Processing API Contract Examples (R67, Agent D5)

Data: 2026-05-24  
Status: Examples pack  
Zakres: przykladowe payloady request/response dla lifecycle jobs Processing API (`enqueue/status/cancel/retry`) zgodne z `implementation-slice-processing-api-jobs-r66.md`.

## 1. Konwencje wspolne

1. Base path: `/api/v1`.
2. Wszystkie odpowiedzi sa w `SuccessEnvelope/ErrorEnvelope`.
3. Dla `POST /api/v1/processing/{type}` naglowek `Idempotency-Key` jest wymagany.
4. `type in {placeable, creature, area}`.

Przyklad `SuccessEnvelope`:

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1A0P7QAX2A0V3Q4X9N6D0S",
  "data": {}
}
```

Przyklad `ErrorEnvelope`:

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1A0P7QAX2A0V3Q4X9N6D0S",
  "error": {
    "code": "PIPELINE_INPUT_INVALID",
    "message": "Invalid processing request payload.",
    "details": [
      {
        "path": "target.instanceAddressId",
        "reason": "must be non-empty when templateResRef is missing"
      }
    ],
    "retryable": false
  }
}
```

## 2. Happy path

## 2.1 Enqueue `placeable` (nowy job)

Request:

```http
POST /api/v1/processing/placeable
Authorization: Bearer <token>
Idempotency-Key: idem_placeable_20260524_001
Content-Type: application/json
```

```json
{
  "sourceContext": {
    "areaResref": "lc_market_01",
    "moduleSourceFingerprint": "modfp_8f2a4f27b9",
    "sourcePolicy": "DECOMPILED_PRIMARY",
    "runtimeProfile": "xoreos-nwn"
  },
  "execution": {
    "validationMode": "strict",
    "dryRun": true,
    "timeoutMs": 120000,
    "priority": "interactive"
  },
  "expectedRevision": "rev_000184",
  "target": {
    "instanceAddressId": "placeable/Placeable List/17",
    "templateResRef": "plc_barrel_a",
    "transformDraft": {
      "x": 132.5,
      "y": 87.125,
      "z": 2.0,
      "bearing": 90.0
    }
  }
}
```

Response (`202 Accepted`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1A4Q2D5FJ3GK6GMF2Z7VXN",
  "data": {
    "jobId": "prc_01JY1A4PVRR1QFG8Q22TKQ9A0M",
    "jobKey": "jk_55dff0c5f4b9f6f59f2fc1a2fd9ab5de5cbd0d04e7a9da3fb9f7abcf31cb880f",
    "pipelineType": "placeable",
    "status": "queued",
    "phase": "enqueue",
    "attempt": 1,
    "maxAttempts": 3
  }
}
```

## 2.2 Idempotent replay tego samego enqueue

Request: identyczny jak `2.1` (ten sam `Idempotency-Key`, ten sam payload).

Response (`200 OK`, replay snapshot):

```http
x-idempotency-replayed: true
```

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1A6B1HCR9H9KAXSMVMR4CD",
  "data": {
    "jobId": "prc_01JY1A4PVRR1QFG8Q22TKQ9A0M",
    "jobKey": "jk_55dff0c5f4b9f6f59f2fc1a2fd9ab5de5cbd0d04e7a9da3fb9f7abcf31cb880f",
    "pipelineType": "placeable",
    "status": "queued",
    "phase": "enqueue",
    "attempt": 1,
    "maxAttempts": 3
  }
}
```

## 2.3 Status `placeable` (running, z extension klasyfikacji)

Request:

```http
GET /api/v1/processing/jobs/prc_01JY1A4PVRR1QFG8Q22TKQ9A0M
Authorization: Bearer <token>
```

Response (`200 OK`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1A8WFV1X4R33K19Z1J6N5M",
  "data": {
    "jobId": "prc_01JY1A4PVRR1QFG8Q22TKQ9A0M",
    "jobKey": "jk_55dff0c5f4b9f6f59f2fc1a2fd9ab5de5cbd0d04e7a9da3fb9f7abcf31cb880f",
    "pipelineType": "placeable",
    "status": "running",
    "phase": "transform",
    "attempt": 1,
    "maxAttempts": 3,
    "retryCount": 0,
    "nextRetryAt": null,
    "percent": 46,
    "currentStep": "classify.placeable_kind",
    "stepsCompleted": 5,
    "stepsTotal": 11,
    "lastHeartbeatAt": "2026-05-24T09:11:28.214Z",
    "lock": {
      "scope": "area",
      "keyHash": "lk_2d89cf18d6",
      "leaseExpiresAt": "2026-05-24T09:11:58.214Z"
    },
    "expectedRevision": "rev_000184",
    "actualRevision": "rev_000184",
    "conflict": false,
    "diagnosticsSummary": {
      "errorCount": 0,
      "warnCount": 1,
      "infoCount": 2
    },
    "lastError": null,
    "cancelRequested": false,
    "cancelHonored": false,
    "classification": {
      "kind": "vfx",
      "sourceList": "Placeable List",
      "sourceIndex": 17,
      "validationCodes": [
        "SCENE_HELPER_ONLY_WITH_VFX"
      ],
      "tokenDiagnostics": [
        {
          "canonicalField": "Bearing",
          "rawToken": "90.0",
          "parsedValue": 90,
          "domainStatus": "ok"
        }
      ]
    },
    "createdAt": "2026-05-24T09:11:20.889Z",
    "startedAt": "2026-05-24T09:11:21.102Z",
    "completedAt": null,
    "updatedAt": "2026-05-24T09:11:28.214Z"
  }
}
```

## 2.4 Status `creature` (completed, z extension enrichment)

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1ABKQYRXFMTSBD2T7VTPSW",
  "data": {
    "jobId": "prc_01JY1A9ZX6N9YB2AXQ2KS1P9GT",
    "jobKey": "jk_0fc8f9e26dcbf78f02cab5f47753d52c56f09b7d11fbf8f2f35f3de5d16f91a0",
    "pipelineType": "creature",
    "status": "completed",
    "phase": "finalize",
    "attempt": 1,
    "maxAttempts": 3,
    "retryCount": 0,
    "nextRetryAt": null,
    "percent": 100,
    "currentStep": "finalize",
    "stepsCompleted": 10,
    "stepsTotal": 10,
    "lastHeartbeatAt": "2026-05-24T09:13:14.713Z",
    "lock": {
      "scope": "area",
      "keyHash": "lk_74ad9f0f21",
      "leaseExpiresAt": "2026-05-24T09:13:44.713Z"
    },
    "expectedRevision": "rev_000184",
    "actualRevision": "rev_000184",
    "conflict": false,
    "diagnosticsSummary": {
      "errorCount": 0,
      "warnCount": 1,
      "infoCount": 3
    },
    "lastError": null,
    "cancelRequested": false,
    "cancelHonored": false,
    "creature": {
      "creatureKey": {
        "areaResRef": "lc_market_01",
        "gitIndex": 5,
        "templateResRef": "nw_bandit001",
        "tag": "bandit_guard_05"
      },
      "utcResolved": true,
      "twoDa": {
        "rowsFound": 5,
        "rowsMissing": 0
      },
      "tlk": {
        "resolvedFrom": {
          "inline": 2,
          "tlk_main": 1,
          "tlk_alt": 0,
          "empty": 0
        }
      },
      "hak": {
        "effectivePriorities": [
          "lc_hak_core",
          "lc_hak_creatures"
        ]
      },
      "validationIssuesTop": [
        "CREATURE_ORIENTATION_ZERO_VECTOR"
      ]
    },
    "createdAt": "2026-05-24T09:12:40.122Z",
    "startedAt": "2026-05-24T09:12:40.498Z",
    "completedAt": "2026-05-24T09:13:14.901Z",
    "updatedAt": "2026-05-24T09:13:14.901Z"
  }
}
```

## 2.5 Status `area` (completed_with_drift, z extension composition)

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AE5WPJSTDX7DXEWSR8G35",
  "data": {
    "jobId": "prc_01JY1ADQXJ6VFJ18BWNJ17T0K8",
    "jobKey": "jk_d7473f07015f9f9e14ea15bcaad087ff3fbca168df29337f5df4f7a3a77b80d9",
    "pipelineType": "area",
    "status": "completed_with_drift",
    "phase": "finalize",
    "attempt": 1,
    "maxAttempts": 3,
    "retryCount": 0,
    "nextRetryAt": null,
    "percent": 100,
    "currentStep": "finalize",
    "stepsCompleted": 9,
    "stepsTotal": 9,
    "lastHeartbeatAt": "2026-05-24T09:17:03.003Z",
    "lock": {
      "scope": "module",
      "keyHash": "lk_bf7b4d7200",
      "leaseExpiresAt": "2026-05-24T09:17:33.003Z"
    },
    "expectedRevision": "rev_000184",
    "actualRevision": "rev_000184",
    "conflict": false,
    "diagnosticsSummary": {
      "errorCount": 0,
      "warnCount": 2,
      "infoCount": 5
    },
    "lastError": {
      "code": "PIPELINE_DETERMINISM_DRIFT",
      "message": "Output drift detected against baseline snapshot.",
      "retryable": false,
      "details": [
        {
          "path": "area.compositionCounts.items",
          "reason": "baseline=47 actual=48"
        }
      ]
    },
    "cancelRequested": false,
    "cancelHonored": false,
    "area": {
      "compositionCounts": {
        "tiles": 256,
        "placeables": 84,
        "doors": 19,
        "creatures": 34,
        "triggers": 11,
        "waypoints": 45,
        "sounds": 7,
        "encounters": 3,
        "stores": 2,
        "environment": 4,
        "items": 48
      },
      "tileListCardinality": {
        "expected": 256,
        "actual": 256,
        "delta": 0,
        "severity": "INFO"
      },
      "gitTopLevelListSchema": "ok",
      "gitParseDiagnosticsSummary": {
        "raw": 259,
        "loaded": 259,
        "failed": 0
      },
      "runtimeProfile": "xoreos-nwn2"
    },
    "createdAt": "2026-05-24T09:16:17.710Z",
    "startedAt": "2026-05-24T09:16:18.012Z",
    "completedAt": "2026-05-24T09:17:03.120Z",
    "updatedAt": "2026-05-24T09:17:03.120Z"
  }
}
```

## 2.6 Cancel `running -> cancelling` (cooperative)

Request:

```http
POST /api/v1/processing/jobs/prc_01JY1A4PVRR1QFG8Q22TKQ9A0M:cancel
Authorization: Bearer <token>
```

Response (`202 Accepted`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AFQ26R3QPSVDW2VJZ1D9P",
  "data": {
    "jobId": "prc_01JY1A4PVRR1QFG8Q22TKQ9A0M",
    "jobKey": "jk_55dff0c5f4b9f6f59f2fc1a2fd9ab5de5cbd0d04e7a9da3fb9f7abcf31cb880f",
    "pipelineType": "placeable",
    "status": "cancelling",
    "phase": "transform",
    "attempt": 1,
    "maxAttempts": 3,
    "cancelRequested": true,
    "cancelHonored": false
  }
}
```

## 2.7 Retry `failed -> queued` (attempt + 1)

Request:

```http
POST /api/v1/processing/jobs/prc_01JY1AH0J7XH1VHG0S1WQ2B4W8:retry
Authorization: Bearer <token>
```

Response (`202 Accepted`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AHFX8VX0DQYF6W4ENF9Y4",
  "data": {
    "jobId": "prc_01JY1AH0J7XH1VHG0S1WQ2B4W8",
    "jobKey": "jk_357694e30f2eff7ece7c31cd64f302f4e52bd65466f5f83f1d4592b9ee41f0f4",
    "pipelineType": "creature",
    "status": "queued",
    "phase": "enqueue",
    "attempt": 2,
    "maxAttempts": 3,
    "retryCount": 1,
    "nextRetryAt": null
  }
}
```

## 3. Przyklady bledow

## 3.1 Brak `Idempotency-Key`

Request:

```http
POST /api/v1/processing/area
Authorization: Bearer <token>
Content-Type: application/json
```

Response (`422 Unprocessable Entity`, `PIPELINE_IDEMPOTENCY_KEY_REQUIRED`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AJ9E7KQXQ3XW34M8SEYNA",
  "error": {
    "code": "PIPELINE_IDEMPOTENCY_KEY_REQUIRED",
    "message": "Idempotency-Key header is required for this route.",
    "details": [
      {
        "path": "headers.Idempotency-Key",
        "reason": "missing"
      }
    ],
    "retryable": false
  }
}
```

## 3.2 Reuse key z innym payload

Response (`409 Conflict`, `PIPELINE_IDEMPOTENCY_KEY_REUSED`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AKJ6EFHCV2PXDFJ65QK9Q",
  "error": {
    "code": "PIPELINE_IDEMPOTENCY_KEY_REUSED",
    "message": "Idempotency key already used with a different request fingerprint.",
    "details": [
      {
        "path": "idempotencyKey",
        "reason": "existing fingerprint does not match current payload"
      }
    ],
    "retryable": false
  }
}
```

## 3.3 Niepoprawny payload startu

Response (`422 Unprocessable Entity`, `PIPELINE_INPUT_INVALID`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AM6Q0N7XWQ8ZB3K2XV1QW",
  "error": {
    "code": "PIPELINE_INPUT_INVALID",
    "message": "Start payload validation failed.",
    "details": [
      {
        "path": "sourceContext.areaResref",
        "reason": "must be non-empty"
      },
      {
        "path": "execution.timeoutMs",
        "reason": "must be between 1000 and 900000"
      },
      {
        "path": "target.includeLanes.tiles",
        "reason": "expected boolean"
      }
    ],
    "retryable": false
  }
}
```

## 3.4 Job nie istnieje

Response (`404 Not Found`, `PIPELINE_JOB_NOT_FOUND`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1ANPYYHZ7N5BW9XEA6YTV8",
  "error": {
    "code": "PIPELINE_JOB_NOT_FOUND",
    "message": "Processing job not found.",
    "details": [
      {
        "path": "jobId",
        "reason": "prc_01JY1ANMISSING000000000000"
      }
    ],
    "retryable": false
  }
}
```

## 3.5 Cancel na jobie terminalnym

Response (`409 Conflict`, `PIPELINE_JOB_STATE_CONFLICT`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AQ3QK8A3J7Y8V94E2WYZK",
  "error": {
    "code": "PIPELINE_JOB_STATE_CONFLICT",
    "message": "Cannot cancel a terminal job.",
    "details": [
      {
        "path": "job.status",
        "reason": "expected queued|running|cancelling, got completed"
      }
    ],
    "retryable": false
  }
}
```

## 3.6 Retry na jobie nieterminalnym

Response (`409 Conflict`, `PIPELINE_JOB_STATE_CONFLICT`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1ARFVTBPA0TK6H9PZB1JSR",
  "error": {
    "code": "PIPELINE_JOB_STATE_CONFLICT",
    "message": "Cannot retry a non-terminal job.",
    "details": [
      {
        "path": "job.status",
        "reason": "expected failed|cancelled, got running"
      }
    ],
    "retryable": false
  }
}
```

## 3.7 Lock/source contention (retryable)

Response (`409 Conflict`, `PIPELINE_SOURCE_LOCK_CONFLICT`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AT6RM30VB4Z4YJW9A2VPH",
  "error": {
    "code": "PIPELINE_SOURCE_LOCK_CONFLICT",
    "message": "Source lock is held by another active job.",
    "details": [
      {
        "path": "lock.scope",
        "reason": "area:lc_market_01"
      },
      {
        "path": "lock.leaseExpiresAt",
        "reason": "2026-05-24T09:24:21.000Z"
      }
    ],
    "retryable": true
  }
}
```

## 3.8 Revision conflict

Response (`409 Conflict`, `PIPELINE_REVISION_CONFLICT`):

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AV2K8QYFDX6M1D6K0K2SZ",
  "error": {
    "code": "PIPELINE_REVISION_CONFLICT",
    "message": "Expected revision does not match current source revision.",
    "details": [
      {
        "path": "expectedRevision",
        "reason": "expected=rev_000184 actual=rev_000185"
      }
    ],
    "retryable": false
  }
}
```

## 3.9 Retry exhausted (final failure)

Przyklad statusu po przekroczeniu `maxAttempts`:

```json
{
  "contractVersion": "r66",
  "requestId": "req_01JY1AWJ0H9P8Y6QEM2H0H8DZ2",
  "data": {
    "jobId": "prc_01JY1AH0J7XH1VHG0S1WQ2B4W8",
    "jobKey": "jk_357694e30f2eff7ece7c31cd64f302f4e52bd65466f5f83f1d4592b9ee41f0f4",
    "pipelineType": "creature",
    "status": "failed",
    "phase": "resolve_sources",
    "attempt": 3,
    "maxAttempts": 3,
    "retryCount": 2,
    "nextRetryAt": null,
    "percent": 12,
    "currentStep": "resolve_sources.lock_wait",
    "stepsCompleted": 1,
    "stepsTotal": 9,
    "lastHeartbeatAt": "2026-05-24T09:27:03.411Z",
    "diagnosticsSummary": {
      "errorCount": 1,
      "warnCount": 0,
      "infoCount": 1
    },
    "lastError": {
      "code": "PIPELINE_RETRY_EXHAUSTED",
      "message": "Retry budget exhausted for retryable error.",
      "retryable": false,
      "details": [
        {
          "path": "attempt",
          "reason": "attempt=3 maxAttempts=3"
        }
      ]
    },
    "cancelRequested": false,
    "cancelHonored": false,
    "createdAt": "2026-05-24T09:24:01.033Z",
    "startedAt": "2026-05-24T09:24:01.490Z",
    "completedAt": "2026-05-24T09:27:03.612Z",
    "updatedAt": "2026-05-24T09:27:03.612Z"
  }
}
```

## 4. Szybka mapa scenariusz -> status HTTP

1. Enqueue nowy job: `202`.
2. Enqueue replay (ten sam key + payload): `200` (`x-idempotency-replayed: true`).
3. Status joba: `200` lub `404 PIPELINE_JOB_NOT_FOUND`.
4. Cancel `queued`: `202` (lub `200` dla idempotentnego ponowienia).
5. Cancel `running`: `202` (`status=cancelling`).
6. Retry `failed|cancelled`: `202` (`attempt+1`, `status=queued`).
7. Retry/cancel w niedozwolonym stanie: `409 PIPELINE_JOB_STATE_CONFLICT`.

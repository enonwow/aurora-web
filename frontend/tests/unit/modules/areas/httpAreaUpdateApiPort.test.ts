import { describe, expect, it, vi } from "vitest";

import {
  HttpAreaUpdateApiPort,
  resolveAreaUpdateApiBaseUrl
} from "../../../../src/modules/areas/adapters/httpAreaUpdateApiPort";
import type {
  AreaUpdateCommand,
  AreaUpdateValidationCommand
} from "../../../../src/modules/areas/areaUpdateContracts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);
const HASH_E = "e".repeat(64);
const MODULE_REVISION = "module-revision-before";
const NEW_MODULE_REVISION = "module-revision-after";

function tileProductionAdmission() {
  return {
    schemaVersion: "area-tile-production-admission.v1",
    policyVersion: "area-tile-production-admission-policy.v1",
    reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
    planId: "plan-01",
    corpusHash: HASH_C,
    profileId: "source-bound-v7",
    ledgerSha256: HASH_D,
    reportSha256: HASH_E,
    tilesetResRef: "tms01",
    uniqueTileIdCount: 2,
    tileIdSetSha256: HASH_A
  };
}

function validationCommand(): AreaUpdateValidationCommand {
  return {
    schemaVersion: "area-update-validation.v1",
    moduleId: "workspace-module-01",
    areaResRef: "crypt01",
    expectedModuleRevision: MODULE_REVISION,
    draft: { id: "draft-01", revision: 7, normalizedSha256: HASH_C },
    clientCommandId: "client-command-01"
  };
}

function updateCommand(): AreaUpdateCommand {
  return { ...validationCommand(), schemaVersion: "area-update-command.v1" };
}

function resource(extension: "are" | "git" | "gic", sha256: string) {
  const resourceType = { are: 2012, git: 2023, gic: 2046 }[extension];
  return {
    extension,
    fileName: `crypt01.${extension}`,
    resourceType,
    size: 128,
    sha256
  };
}

function validationReceipt() {
  return {
    schemaVersion: "area-update-validation-receipt.v1",
    validationId: "validation-01",
    commandHash: HASH_D,
    moduleId: "workspace-module-01",
    moduleRevision: MODULE_REVISION,
    areaResRef: "crypt01",
    sourceAreaSha256: HASH_A,
    draft: validationCommand().draft,
    setFingerprintSha256: HASH_B,
    tileProductionAdmission: tileProductionAdmission(),
    candidateAre: resource("are", HASH_D),
    candidateResources: [
      resource("are", HASH_D),
      resource("git", HASH_B),
      resource("gic", HASH_C)
    ],
    candidateModuleIfo: {
      fileName: "module.ifo",
      resourceType: 2014,
      size: 256,
      sha256: HASH_E
    },
    unchangedCompanions: {
      gitSha256: HASH_B,
      gicSha256: HASH_C,
      moduleIfoSha256: HASH_E
    },
    validatorVersion: "area-update-candidate-validator.v1",
    createdAt: "2026-08-18T20:00:00.000Z",
    expiresAt: "2026-08-18T20:05:00.000Z"
  };
}

function updateReceipt() {
  return {
    schemaVersion: "area-update-receipt.v1",
    transactionId: "transaction-01",
    areaResRef: "crypt01",
    moduleId: "workspace-module-01",
    previousModuleRevision: MODULE_REVISION,
    newModuleRevision: NEW_MODULE_REVISION,
    sourceAreaSha256: HASH_A,
    candidateAreaSha256: HASH_D,
    draft: updateCommand().draft,
    setFingerprintSha256: HASH_B,
    tileProductionAdmission: tileProductionAdmission(),
    commandHash: HASH_D,
    validatorVersion: "area-update-candidate-validator.v1",
    resources: validationReceipt().candidateResources.map((entry) => ({
      ...entry,
      key: `modules/current/${entry.fileName}`
    })),
    moduleIfo: { key: "modules/current/module.ifo", size: 256, sha256: HASH_E },
    unchangedCompanions: validationReceipt().unchangedCompanions,
    readbackStatus: "verified",
    warnings: [],
    updatedAt: "2026-08-18T20:00:01.000Z"
  };
}

function variableMutation() {
  return {
    expectedEntries: [
      { sourceIndex: 0, name: "COUNT", type: "int", value: 3 },
      { sourceIndex: 1, name: "TEXT", type: "string", value: "old" }
    ],
    entries: [
      { name: "TEXT", type: "string", value: "updated" },
      { name: "COUNT", type: "int", value: 7 }
    ],
    sourceGitSha256: HASH_A,
    candidateGitSha256: HASH_B
  };
}

function audioEnvironmentMutation() {
  const expectedValue = {
    ambientSoundDayId: 41,
    ambientSoundNightId: 42,
    ambientSoundDayVolume: 101,
    ambientSoundNightVolume: 102,
    environmentAudioId: 7,
    musicBattleId: 13,
    musicDayId: 11,
    musicNightId: 12,
    musicDelayMilliseconds: 3000
  };
  return {
    expectedValue,
    value: { ...expectedValue, ambientSoundNightVolume: 77 },
    sourceGitSha256: HASH_A,
    candidateGitSha256: HASH_B
  };
}

function moduleStartLocationMutation() {
  return {
    expectedValue: {
      areaResRef: "crypt01",
      x: Math.fround(1),
      y: Math.fround(2),
      z: Math.fround(3),
      directionX: Math.fround(0),
      directionY: Math.fround(1)
    },
    value: {
      areaResRef: "crypt01",
      x: Math.fround(12.5),
      y: Math.fround(-4.25),
      z: Math.fround(3),
      directionX: Math.fround(0),
      directionY: Math.fround(1)
    },
    sourceIfoSha256: HASH_C,
    candidateIfoSha256: HASH_D
  };
}

function familyCounts(overrides: Readonly<Record<string, number>> = {}) {
  return {
    creature: 0,
    door: 0,
    encounter: 0,
    item: 0,
    placeable: 0,
    sound: 0,
    store: 0,
    trigger: 0,
    waypoint: 0,
    ...overrides
  };
}

function polygonObjectMutation() {
  return {
    sourceGitSha256: HASH_A,
    sourceGicSha256: HASH_E,
    candidateGitSha256: HASH_B,
    candidateGicSha256: HASH_C,
    sourceCounts: familyCounts({ trigger: 1 }),
    candidateCounts: familyCounts({ trigger: 1 }),
    deletedCounts: familyCounts(),
    transformedCounts: familyCounts(),
    propertyUpdatedCounts: familyCounts(),
    polygonUpdatedCounts: familyCounts({ trigger: 1 }),
    soundVolumeUpdatedCounts: familyCounts({ sound: 1 }),
    soundScheduleUpdatedCounts: familyCounts({ sound: 1 }),
    soundActiveUpdatedCounts: familyCounts({ sound: 1 }),
    soundPlayOrderUpdatedCounts: familyCounts({ sound: 1 }),
    soundPlayStyleUpdatedCounts: familyCounts({ sound: 1 }),
    soundPlaybackUpdatedCounts: familyCounts({ sound: 1 }),
    soundProfileUpdatedCounts: familyCounts({ sound: 1 }),
    addedCounts: familyCounts(),
    totalDeleted: 0,
    totalTransformed: 0,
    totalPropertyUpdated: 0,
    totalPolygonUpdated: 1,
    totalSoundVolumeUpdated: 1,
    totalSoundScheduleUpdated: 1,
    totalSoundActiveUpdated: 1,
    totalSoundPlayOrderUpdated: 1,
    totalSoundPlayStyleUpdated: 1,
    totalSoundPlaybackUpdated: 1,
    totalSoundProfileUpdated: 1,
    totalAdded: 0,
    blueprintSources: []
  };
}

function envelope(data: unknown) {
  return { contractVersion: "1.1.0", requestId: "request-01", data };
}

describe("HttpAreaUpdateApiPort", () => {
  it("posts the exact validation command and requires the matching module ETag", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(envelope(validationReceipt()), {
        headers: { ETag: `"${MODULE_REVISION}"` }
      })
    );
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1/");
    const command = validationCommand();

    const result = await port.validate({
      accessToken: "access-token",
      moduleId: command.moduleId,
      areaResRef: command.areaResRef,
      command
    });

    expect(fetchStub).toHaveBeenCalledWith(
      "/api/v1/modules/workspace-module-01/areas/crypt01/update-validations",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer access-token",
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(command)
      }
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        validationId: "validation-01",
        moduleRevision: MODULE_REVISION,
        tileProductionAdmission: tileProductionAdmission()
      },
      metadata: { etag: `"${MODULE_REVISION}"`, moduleRevision: MODULE_REVISION }
    });
  });

  it("puts the exact update command with CAS/idempotency headers and accepts only verified readback", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(envelope(updateReceipt()), {
        headers: {
          ETag: `"${NEW_MODULE_REVISION}"`,
          "Idempotency-Status": "created"
        }
      })
    );
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const command = updateCommand();

    const result = await port.update({
      accessToken: "access-token",
      moduleId: command.moduleId,
      areaResRef: command.areaResRef,
      idempotencyKey: "update-idempotency-01",
      command
    });

    expect(fetchStub).toHaveBeenCalledWith(
      "/api/v1/modules/workspace-module-01/areas/crypt01",
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer access-token",
          "Content-Type": "application/json; charset=utf-8",
          "Idempotency-Key": "update-idempotency-01",
          "If-Match": `"${MODULE_REVISION}"`
        },
        body: JSON.stringify(command)
      }
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        readbackStatus: "verified",
        newModuleRevision: NEW_MODULE_REVISION,
        tileProductionAdmission: tileProductionAdmission()
      },
      metadata: {
        etag: `"${NEW_MODULE_REVISION}"`,
        moduleRevision: NEW_MODULE_REVISION,
        idempotencyStatus: "created"
      }
    });
  });

  it("accepts an exact replayed Update receipt without weakening header validation", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(envelope(updateReceipt()), {
        headers: {
          ETag: `"${NEW_MODULE_REVISION}"`,
          "Idempotency-Status": "replayed"
        }
      })
    );
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.update({
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      idempotencyKey: "idem-replay-01",
      command: updateCommand()
    })).resolves.toMatchObject({
      ok: true,
      metadata: { idempotencyStatus: "replayed" }
    });
  });

  it("accepts exact typed ordered Area variable summaries in validation and Update receipts", async () => {
    const {
      unchangedCompanions: _validationUnchanged,
      ...validationBase
    } = validationReceipt();
    const {
      unchangedCompanions: _updateUnchanged,
      ...updateBase
    } = updateReceipt();
    const mutationSummaries = {
      variableMutation: variableMutation(),
      audioEnvironmentMutation: audioEnvironmentMutation(),
      moduleStartLocationMutation: moduleStartLocationMutation()
    };
    const validation = { ...validationBase, ...mutationSummaries };
    const update = { ...updateBase, ...mutationSummaries };
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(envelope(validation), {
        headers: { ETag: `"${MODULE_REVISION}"` }
      }))
      .mockResolvedValueOnce(Response.json(envelope(update), {
        headers: {
          ETag: `"${NEW_MODULE_REVISION}"`,
          "Idempotency-Status": "created"
        }
      }));
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.validate({
      accessToken: "token",
      moduleId: validationCommand().moduleId,
      areaResRef: validationCommand().areaResRef,
      command: validationCommand()
    })).resolves.toMatchObject({ ok: true, value: mutationSummaries });
    await expect(port.update({
      accessToken: "token",
      moduleId: updateCommand().moduleId,
      areaResRef: updateCommand().areaResRef,
      idempotencyKey: "idem-variables",
      command: updateCommand()
    })).resolves.toMatchObject({ ok: true, value: mutationSummaries });
  });

  it("accepts exact polygon and Sound storage mutation counts in validation and verified Update receipts", async () => {
    const { unchangedCompanions: _validationUnchanged, ...validationBase } = validationReceipt();
    const { unchangedCompanions: _updateUnchanged, ...updateBase } = updateReceipt();
    const objectMutation = polygonObjectMutation();
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(envelope({ ...validationBase, objectMutation }), {
        headers: { ETag: `"${MODULE_REVISION}"` }
      }))
      .mockResolvedValueOnce(Response.json(envelope({ ...updateBase, objectMutation }), {
        headers: {
          ETag: `"${NEW_MODULE_REVISION}"`,
          "Idempotency-Status": "created"
        }
      }));
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.validate({
      accessToken: "token",
      moduleId: validationCommand().moduleId,
      areaResRef: validationCommand().areaResRef,
      command: validationCommand()
    })).resolves.toMatchObject({
      ok: true,
      value: {
        objectMutation: {
          totalPolygonUpdated: 1,
          polygonUpdatedCounts: { trigger: 1 },
          totalSoundVolumeUpdated: 1,
          soundVolumeUpdatedCounts: { sound: 1 },
          totalSoundScheduleUpdated: 1,
          soundScheduleUpdatedCounts: { sound: 1 },
          totalSoundActiveUpdated: 1,
          soundActiveUpdatedCounts: { sound: 1 },
          totalSoundPlayOrderUpdated: 1,
          soundPlayOrderUpdatedCounts: { sound: 1 },
          totalSoundPlayStyleUpdated: 1,
          soundPlayStyleUpdatedCounts: { sound: 1 },
          totalSoundPlaybackUpdated: 1,
          soundPlaybackUpdatedCounts: { sound: 1 },
          totalSoundProfileUpdated: 1,
          soundProfileUpdatedCounts: { sound: 1 }
        }
      }
    });
    await expect(port.update({
      accessToken: "token",
      moduleId: updateCommand().moduleId,
      areaResRef: updateCommand().areaResRef,
      idempotencyKey: "polygon-mutation-01",
      command: updateCommand()
    })).resolves.toMatchObject({
      ok: true,
      value: {
        readbackStatus: "verified",
        objectMutation: {
          totalPolygonUpdated: 1,
          polygonUpdatedCounts: { trigger: 1 },
          totalSoundVolumeUpdated: 1,
          soundVolumeUpdatedCounts: { sound: 1 },
          totalSoundScheduleUpdated: 1,
          soundScheduleUpdatedCounts: { sound: 1 },
          totalSoundActiveUpdated: 1,
          soundActiveUpdatedCounts: { sound: 1 },
          totalSoundPlayOrderUpdated: 1,
          soundPlayOrderUpdatedCounts: { sound: 1 },
          totalSoundPlayStyleUpdated: 1,
          soundPlayStyleUpdatedCounts: { sound: 1 },
          totalSoundPlaybackUpdated: 1,
          soundPlaybackUpdatedCounts: { sound: 1 },
          totalSoundProfileUpdated: 1,
          soundProfileUpdatedCounts: { sound: 1 }
        }
      }
    });
  });

  it("rejects malformed Area variable receipt entries fail-closed", async () => {
    const { unchangedCompanions: _unchanged, ...base } = validationReceipt();
    const malformed = {
      ...base,
      variableMutation: {
        ...variableMutation(),
        expectedEntries: [
          { sourceIndex: 1, name: "COUNT", type: "int", value: 3 }
        ]
      }
    };
    const fetchStub = vi.fn(async () => Response.json(envelope(malformed), {
      headers: { ETag: `"${MODULE_REVISION}"` }
    }));
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.validate({
      accessToken: "token",
      moduleId: validationCommand().moduleId,
      areaResRef: validationCommand().areaResRef,
      command: validationCommand()
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_UPDATE_RESPONSE_INVALID" }
    });
  });

  it("rejects validation and Update success without tile admission provenance", async () => {
    const {
      tileProductionAdmission: _validationAdmission,
      ...validationWithoutAdmission
    } = validationReceipt();
    const {
      tileProductionAdmission: _receiptAdmission,
      ...receiptWithoutAdmission
    } = updateReceipt();
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(envelope(validationWithoutAdmission), {
          headers: { ETag: `"${MODULE_REVISION}"` }
        })
      )
      .mockResolvedValueOnce(
        Response.json(envelope(receiptWithoutAdmission), {
          headers: {
            ETag: `"${NEW_MODULE_REVISION}"`,
            "Idempotency-Status": "created"
          }
        })
      );
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.validate({
      accessToken: "token",
      moduleId: validationCommand().moduleId,
      areaResRef: validationCommand().areaResRef,
      command: validationCommand()
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_UPDATE_RESPONSE_INVALID" }
    });
    await expect(port.update({
      accessToken: "token",
      moduleId: updateCommand().moduleId,
      areaResRef: updateCommand().areaResRef,
      idempotencyKey: "idem-without-admission",
      command: updateCommand()
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_UPDATE_RESPONSE_INVALID" }
    });
  });

  it("rejects missing or mismatched success headers and unknown nested fields", async () => {
    const malformed = {
      ...updateReceipt(),
      moduleIfo: { ...updateReceipt().moduleIfo, unexpected: true }
    };
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(envelope(validationReceipt())))
      .mockResolvedValueOnce(
        Response.json(envelope(updateReceipt()), {
          headers: { ETag: '"wrong"', "Idempotency-Status": "created" }
        })
      )
      .mockResolvedValueOnce(
        Response.json(envelope(updateReceipt()), {
          headers: { ETag: `"${NEW_MODULE_REVISION}"` }
        })
      )
      .mockResolvedValueOnce(
        Response.json(envelope(malformed), {
          headers: {
            ETag: `"${NEW_MODULE_REVISION}"`,
            "Idempotency-Status": "replayed"
          }
        })
      );
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.validate({
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      command: validationCommand()
    })).resolves.toMatchObject({ ok: false, error: { code: "AREA_UPDATE_RESPONSE_INVALID" } });

    for (let index = 0; index < 3; index += 1) {
      await expect(port.update({
        accessToken: "token",
        moduleId: "workspace-module-01",
        areaResRef: "crypt01",
        idempotencyKey: "idem-01",
        command: updateCommand()
      })).resolves.toMatchObject({ ok: false, error: { code: "AREA_UPDATE_RESPONSE_INVALID" } });
    }
  });

  it("rejects malformed validation success and malformed backend error envelopes", async () => {
    const malformedValidation = {
      ...validationReceipt(),
      draft: { ...validationReceipt().draft, unexpected: true }
    };
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(envelope(malformedValidation), {
          headers: { ETag: `"${MODULE_REVISION}"` }
        })
      )
      .mockResolvedValueOnce(
        Response.json({ error: { code: "broken" } }, { status: 422 })
      );
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const input = {
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      command: validationCommand()
    };

    await expect(port.validate(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_UPDATE_RESPONSE_INVALID", status: 200 }
    });
    await expect(port.validate(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_UPDATE_RESPONSE_INVALID", status: 422 }
    });
  });

  it("maps Update backend failures and rejects unknown idempotency statuses", async () => {
    const backendError = {
      contractVersion: "1.1.0",
      requestId: "request-update-error",
      error: {
        code: "AREA_UPDATE_MODULE_REVISION_CONFLICT",
        message: "The module revision changed.",
        details: [{ path: "expectedModuleRevision", reason: "stale" }],
        retryable: false
      }
    };
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(backendError, { status: 412 }))
      .mockResolvedValueOnce(
        Response.json(envelope(updateReceipt()), {
          headers: {
            ETag: `"${NEW_MODULE_REVISION}"`,
            "Idempotency-Status": "unknown"
          }
        })
      );
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const input = {
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      idempotencyKey: "idem-01",
      command: updateCommand()
    };

    await expect(port.update(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_UPDATE_MODULE_REVISION_CONFLICT", status: 412 }
    });
    await expect(port.update(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_UPDATE_RESPONSE_INVALID", status: 200 }
    });
  });

  it("maps backend envelopes and transport exceptions without leaking adapter details", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          contractVersion: "1.1.0",
          requestId: "request-error",
          error: {
            code: "AREA_UPDATE_MODULE_REVISION_CONFLICT",
            message: "The module revision changed.",
            details: [{ path: "expectedModuleRevision", reason: "stale" }],
            retryable: false
          }
        }, { status: 412, headers: { ETag: '"current"' } })
      )
      .mockRejectedValueOnce(new Error("private network path"));
    const port = new HttpAreaUpdateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const input = {
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      command: validationCommand()
    };

    await expect(port.validate(input)).resolves.toMatchObject({
      ok: false,
      error: {
        code: "AREA_UPDATE_MODULE_REVISION_CONFLICT",
        status: 412,
        etag: '"current"'
      }
    });
    await expect(port.validate(input)).resolves.toEqual({
      ok: false,
      error: {
        code: "AREA_UPDATE_TRANSPORT_FAILED",
        operation: "validate_update",
        status: null,
        message: "The Area Update API request could not be completed.",
        retryable: true,
        details: []
      }
    });
  });

  it("resolves configured and default API roots without preserving whitespace or trailing slashes", () => {
    expect(resolveAreaUpdateApiBaseUrl("  https://api.example.test/v1///  ", false))
      .toBe("https://api.example.test/v1");
    expect(resolveAreaUpdateApiBaseUrl(undefined, true)).toBe("/_aurora/v1");
    expect(resolveAreaUpdateApiBaseUrl("   ", false)).toBe("/api/v1");
  });
});

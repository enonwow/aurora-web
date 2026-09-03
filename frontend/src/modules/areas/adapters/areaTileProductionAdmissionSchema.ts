import { z } from "zod";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

export const areaTileProductionAdmissionSchema = z
  .object({
    schemaVersion: z.literal("area-tile-production-admission.v1"),
    policyVersion: z.literal("area-tile-production-admission-policy.v1"),
    reportGeneratedAtIso: z.string().datetime(),
    planId: z.string().min(1).max(256),
    corpusHash: z.string().regex(SHA256_PATTERN),
    profileId: z.string().min(1).max(256),
    ledgerSha256: z.string().regex(SHA256_PATTERN),
    reportSha256: z.string().regex(SHA256_PATTERN),
    tilesetResRef: z.string().regex(RESREF_PATTERN),
    uniqueTileIdCount: z.number().int().positive().max(1_000_000),
    tileIdSetSha256: z.string().regex(SHA256_PATTERN)
  })
  .strict();

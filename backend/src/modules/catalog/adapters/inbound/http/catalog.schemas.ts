import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const listQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  subtype: z
    .enum([
      "generic",
      "door",
      "vfx",
      "vvx",
      "vvxy",
      "container",
      "light_source",
      "trigger_proxy"
    ])
    .transform((value) => (value === "vvx" || value === "vvxy" ? "vfx" : value))
    .optional(),
  benchmark: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const placeableAppearanceRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(256).default(100),
  offset: z.coerce.number().int().min(0).max(999999).default(0),
}).strict();

const creatureAppearanceRowsQuerySchema = placeableAppearanceRowsQuerySchema.extend({
  rowIndex: z.coerce.number().int().min(0).max(65535).optional(),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureGenderRowsQuerySchema = placeableAppearanceRowsQuerySchema.extend({
  rowIndex: z.coerce.number().int().min(0).max(255).optional(),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureAppendageRowsQuerySchema = placeableAppearanceRowsQuerySchema.extend({
  kind: z.enum(["wings", "tail"]),
  rowIndex: z.coerce.number().int().min(0).max(0xffff_ffff).optional(),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creaturePerceptionRangeRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  rowIndex: z.coerce.number().int().refine(
    (value) => value === 8 || value === 9 || value === 10 || value === 11,
    "rowIndex must be one of the native Toolset rows 8, 9, 10, or 11",
  ).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(16).default(16),
  offset: z.coerce.number().int().min(0).max(4).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureWalkRateRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  rowIndex: z.coerce.number().int().min(1).max(999_999).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(256).default(100),
  offset: z.coerce.number().int().min(0).max(999_999).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureSoundSetRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  rowIndex: z.coerce.number().int().min(0).max(65_535).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(256).default(100),
  offset: z.coerce.number().int().min(0).max(999_999).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureStartingPackageClassIdsSchema = z.string()
  .regex(/^\d+(?:,\d+){0,7}$/u)
  .transform((value) => value.split(",").map((entry) => Number(entry)))
  .refine(
    (value) => value.every((entry) => Number.isSafeInteger(entry) && entry <= 0x7fff_ffff),
    "classIds must contain one to eight non-negative native Int values",
  );

const creatureStartingPackageRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  classIds: creatureStartingPackageClassIdsSchema,
  rowIndex: z.coerce.number().int().min(0).max(255).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(256).default(100),
  offset: z.coerce.number().int().min(0).max(255).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureClassRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  rowIndex: z.coerce.number().int().min(0).max(65_535).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(256).default(100),
  offset: z.coerce.number().int().min(0).max(65_535).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureClassSpellRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  classesTableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  classId: z.coerce.number().int().min(0).max(65_535),
  spellLevel: z.coerce.number().int().min(0).max(13),
  rowIndex: z.coerce.number().int().min(0).max(65_535).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(256).default(100),
  offset: z.coerce.number().int().min(0).max(65_535).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureSkillRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  rowIndex: z.coerce.number().int().min(0).max(4_095).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(128).default(100),
  offset: z.coerce.number().int().min(0).max(4_095).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureFeatRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  rowIndex: z.coerce.number().int().min(0).max(65_535).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(128).default(100),
  offset: z.coerce.number().int().min(0).max(65_535).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creatureSpecialAbilityRowsQuerySchema = z.object({
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  rowIndex: z.coerce.number().int().min(0).max(65_535).optional(),
  query: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(256).default(100),
  offset: z.coerce.number().int().min(0).max(65_535).default(0),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
});

const creaturePhenotypeRowsQuerySchema = placeableAppearanceRowsQuerySchema.extend({
  rowIndex: z.coerce.number().int().min(0).max(255)
    .refine((value) => value !== 1, "Phenotype row 1 is normalized to row 0 by Aurora")
    .optional(),
  appearanceType: z.coerce.number().int().min(0).max(65535),
  appearanceTableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  appearanceRowCount: z.coerce.number().int().min(1).max(1_000_000),
}).strict().superRefine((value, context) => {
  if (value.rowIndex !== undefined && value.query !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rowIndex"],
      message: "rowIndex and query are mutually exclusive",
    });
  }
  if (value.appearanceType >= value.appearanceRowCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["appearanceType"],
      message: "appearanceType must be inside appearanceRowCount",
    });
  }
});

export function parseCatalogListQuery(input: unknown) {
  const parsed = listQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Catalog list query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

export function parsePlaceableAppearanceRowsQuery(input: unknown) {
  const parsed = placeableAppearanceRowsQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Placeable Appearance row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseWaypointAppearanceRowsQuery(input: unknown) {
  const parsed = placeableAppearanceRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Waypoint Appearance row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureAppearanceRowsQuery(input: unknown) {
  const parsed = creatureAppearanceRowsQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature Appearance row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureGenderRowsQuery(input: unknown) {
  const parsed = creatureGenderRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature Gender row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureAppendageRowsQuery(input: unknown) {
  const parsed = creatureAppendageRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature appendage row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreaturePerceptionRangeRowsQuery(input: unknown) {
  const parsed = creaturePerceptionRangeRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature PerceptionRange row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureWalkRateRowsQuery(input: unknown) {
  const parsed = creatureWalkRateRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature WalkRate row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureSoundSetRowsQuery(input: unknown) {
  const parsed = creatureSoundSetRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature SoundSetFile row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureStartingPackageRowsQuery(input: unknown) {
  const parsed = creatureStartingPackageRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature StartingPackage row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureClassRowsQuery(input: unknown) {
  const parsed = creatureClassRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature Class row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureClassSpellRowsQuery(input: unknown) {
  const parsed = creatureClassSpellRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature class spell row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureSkillRowsQuery(input: unknown) {
  const parsed = creatureSkillRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature SkillList row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureFeatRowsQuery(input: unknown) {
  const parsed = creatureFeatRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature FeatList row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreatureSpecialAbilityRowsQuery(input: unknown) {
  const parsed = creatureSpecialAbilityRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature SpecAbilityList row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

export function parseCreaturePhenotypeRowsQuery(input: unknown) {
  const parsed = creaturePhenotypeRowsQuerySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Creature Phenotype row query validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message,
    })),
  });
}

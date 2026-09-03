import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";
import {
  areaVisualEnvironmentsEqual,
  isAreaVisualEnvironment,
  type AreaVisualEnvironment,
  type ExistingAreaVisualEnvironmentMutation,
} from "../../../domain/area-visual-environment";
import {
  areaVisualEnvironmentScalarControlsEqual,
  isAreaVisualEnvironmentScalarControls,
  type AreaVisualEnvironmentScalarControls,
  type ExistingAreaVisualEnvironmentScalarControlsMutation,
} from "../../../domain/area-visual-environment-scalar-controls";
import type { ExistingAreaCommentsMutation } from "../../../domain/area-comments";
import type { ExistingAreaEventScriptMutations } from "../../../domain/area-event-scripts";
import {
  readExistingAreaBasicIdentityMutations,
  type ExistingAreaBasicIdentityMutations,
} from "../../../domain/area-basic-identity";
import type { ExistingAreaAdvancedFlagMutations } from "../../../domain/area-advanced-flags";
import type { ExistingAreaVisualEnvironmentCatalogSelectionMutation } from "../../../domain/area-visual-environment-catalog-selection-mutation";

const areaResRefSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{1,16}$/u);

const areaCommentsValueSchema = z.string().max(4096).refine(
  (value) => !value.includes("\0"),
  "Area Comments must not contain U+0000.",
);

const areaCommentsMutationSchema = z.object({
  expectedValue: areaCommentsValueSchema,
  value: areaCommentsValueSchema,
}).strict().superRefine((mutation, context) => {
  if (mutation.expectedValue === mutation.value) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Area Comments mutation must change the retained value.",
    });
  }
});

const areaEventScriptResRefSchema = z.string().regex(/^(?:|[a-z0-9_]{1,16})$/u);
const areaEventScriptMutationSchema = z.object({
  expectedResRef: areaEventScriptResRefSchema,
  resRef: areaEventScriptResRefSchema,
}).strict().superRefine((mutation, context) => {
  if (mutation.expectedResRef === mutation.resRef) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["resRef"],
      message: "Area event-script mutation must change the retained ResRef.",
    });
  }
});
const areaEventScriptsMutationSchema = z.object({
  onEnter: areaEventScriptMutationSchema.optional(),
  onExit: areaEventScriptMutationSchema.optional(),
  onHeartbeat: areaEventScriptMutationSchema.optional(),
  onUserDefined: areaEventScriptMutationSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one Area event-script mutation is required.",
});

const editableAreaNameSchema = z.string()
  .min(1)
  .max(256)
  .regex(/^[\x20-\x7e]+$/u)
  .refine((value) => value.trim().length > 0);
const areaDisplayNameSchema = z.string()
  .min(1)
  .max(256)
  .refine((value) => value.trim().length > 0);
const editableAreaTagSchema = z.string().max(64).regex(/^[\x20-\x7e]*$/u);
const areaBasicIdentityValueMutationSchema = (
  valueSchema: typeof editableAreaNameSchema | typeof editableAreaTagSchema,
) => z.object({
  expectedValue: valueSchema,
  value: valueSchema,
}).strict().superRefine((mutation, context) => {
  if (mutation.expectedValue === mutation.value) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Area basic-identity mutation must change the retained value.",
    });
  }
});
const areaNameIdentityMutationSchema = z.object({
  expectedValue: editableAreaNameSchema,
  value: editableAreaNameSchema,
  expectedProfile: z.enum([
    "simple_inline_ascii",
    "multi_entry_inline_ascii",
  ]).optional(),
  expectedEntries: z.array(z.object({
    languageId: z.number().int().min(0).max(0xffff_ffff),
    text: z.string().max(16_384).regex(/^[\x20-\x7e]*$/u),
  }).strict()).min(1).max(64).optional(),
  valueEntries: z.array(z.object({
    languageId: z.number().int().min(0).max(0xffff_ffff),
    text: z.string().max(16_384).regex(/^[\x20-\x7e]*$/u),
  }).strict()).min(1).max(64).optional(),
}).strict().superRefine((mutation, context) => {
  if (!readExistingAreaBasicIdentityMutations({ name: mutation })) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["name"],
      message: "Area Name mutation must be one complete changed source-bound CAS pair.",
    });
  }
});
const areaBasicIdentityMutationSchema = z.object({
  name: areaNameIdentityMutationSchema.optional(),
  tag: areaBasicIdentityValueMutationSchema(editableAreaTagSchema).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one Area basic-identity mutation is required.",
});

const areaTerrainTypeFlagsSchema = z.object({
  interior: z.boolean(),
  natural: z.boolean(),
  subterranean: z.boolean(),
}).strict();
const areaPvpModeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
const areaCheckModifierSchema = z.number().int().min(-99).max(99);
const areaLoadingScreenIdSchema = z.number().int().min(0).max(0xffff);
const changedAdvancedValueMutationSchema = <T extends z.ZodTypeAny>(
  valueSchema: T,
  equal: (left: z.infer<T>, right: z.infer<T>) => boolean = (left, right) => left === right,
) => z.object({
  expectedValue: valueSchema,
  value: valueSchema,
}).strict().superRefine((mutation, context) => {
  if (equal(mutation.expectedValue, mutation.value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Area advanced-flag mutation must change the retained value.",
    });
  }
});
const areaAdvancedFlagsMutationSchema = z.object({
  terrainType: changedAdvancedValueMutationSchema(
    areaTerrainTypeFlagsSchema,
    (left, right) => left.interior === right.interior
      && left.natural === right.natural
      && left.subterranean === right.subterranean,
  ).optional(),
  playerVsPlayer: changedAdvancedValueMutationSchema(areaPvpModeSchema).optional(),
  noRest: changedAdvancedValueMutationSchema(z.boolean()).optional(),
  listenCheckModifier: changedAdvancedValueMutationSchema(areaCheckModifierSchema).optional(),
  spotCheckModifier: changedAdvancedValueMutationSchema(areaCheckModifierSchema).optional(),
  loadingScreenId: changedAdvancedValueMutationSchema(areaLoadingScreenIdSchema).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one Area advanced-flag mutation is required.",
});

const areaVisualEnvironmentSchema = z.custom<AreaVisualEnvironment>(
  isAreaVisualEnvironment,
  "Area visual environment must contain the exact complete admitted tuple.",
);
const areaVisualEnvironmentMutationSchema = z.object({
  expectedValue: areaVisualEnvironmentSchema,
  value: areaVisualEnvironmentSchema,
}).strict().superRefine((mutation, context) => {
  if (areaVisualEnvironmentsEqual(mutation.expectedValue, mutation.value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Area visual-environment mutation must change the retained tuple.",
    });
  }
});

const areaVisualEnvironmentScalarControlsSchema =
  z.custom<AreaVisualEnvironmentScalarControls>(
    isAreaVisualEnvironmentScalarControls,
    "Area visual-environment scalar controls must contain the exact admitted pair.",
  );
const areaVisualEnvironmentScalarControlsMutationSchema = z.object({
  expectedValue: areaVisualEnvironmentScalarControlsSchema,
  value: areaVisualEnvironmentScalarControlsSchema,
}).strict().superRefine((mutation, context) => {
  if (areaVisualEnvironmentScalarControlsEqual(mutation.expectedValue, mutation.value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Area visual-environment scalar-controls mutation must change the retained pair.",
    });
  }
});

const areaVisualEnvironmentCatalogSelectionMutationSchema = z.object({
  catalogIdentity: z.object({
    environmentSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    skyBoxesSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  }).strict(),
  expectedValue: z.object({
    lightingSchemeRowIndex: z.number().int().min(0).max(0xff),
    skyBoxRowIndex: z.number().int().min(0).max(0xff),
    visualEnvironment: areaVisualEnvironmentSchema,
    visualEnvironmentScalarControls: areaVisualEnvironmentScalarControlsSchema,
  }).strict(),
  value: z.object({
    lightingSchemeRowIndex: z.number().int().min(0).max(0xff),
    skyBoxRowIndex: z.number().int().min(0).max(0xff),
    visualEnvironmentOverride: areaVisualEnvironmentSchema.optional(),
    visualEnvironmentScalarControlsOverride:
      areaVisualEnvironmentScalarControlsSchema.optional(),
  }).strict(),
}).strict().superRefine((mutation, context) => {
  if (
    mutation.expectedValue.lightingSchemeRowIndex
      === mutation.value.lightingSchemeRowIndex
    && mutation.expectedValue.skyBoxRowIndex === mutation.value.skyBoxRowIndex
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Area visual-environment catalog selection must change a row ordinal.",
    });
  }
});

const editableTileSchema = z.object({
  row: z.number().int().min(0).max(31),
  col: z.number().int().min(0).max(31),
  sourceRow: z.number().int().min(0).max(31).optional(),
  sourceCol: z.number().int().min(0).max(31).optional(),
  tileId: z.number().int().min(0),
  orientation: z.number().int().min(0).max(3),
  height: z.number().int().min(0).max(32),
  mainLight1: z.number().int().min(0).max(255).optional(),
  mainLight2: z.number().int().min(0).max(255).optional(),
  sourceLight1: z.number().int().min(0).max(255).optional(),
  sourceLight2: z.number().int().min(0).max(255).optional(),
  animLoop1: z.number().int().min(0).max(255).optional(),
  animLoop2: z.number().int().min(0).max(255).optional(),
  animLoop3: z.number().int().min(0).max(255).optional()
}).superRefine((tile, context) => {
  if ((tile.sourceRow === undefined) !== (tile.sourceCol === undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: tile.sourceRow === undefined ? ["sourceRow"] : ["sourceCol"],
      message: "sourceRow and sourceCol must either both be present or both be absent."
    });
  }
});

const areaEditingExportSchema = z.object({
  areaResRef: areaResRefSchema,
  name: areaDisplayNameSchema,
  width: z.number().int().min(2).max(32),
  height: z.number().int().min(2).max(32),
  tilesetResRef: areaResRefSchema,
  tilesetFingerprint: z.string().regex(/^[a-f0-9]{64}$/iu),
  areaFingerprint: z.string().regex(/^[a-f0-9]{64}$/iu).optional(),
  comments: areaCommentsMutationSchema.optional(),
  eventScripts: areaEventScriptsMutationSchema.optional(),
  basicIdentity: areaBasicIdentityMutationSchema.optional(),
  advancedFlags: areaAdvancedFlagsMutationSchema.optional(),
  visualEnvironment: areaVisualEnvironmentMutationSchema.optional(),
  visualEnvironmentScalarControls: areaVisualEnvironmentScalarControlsMutationSchema.optional(),
  visualEnvironmentCatalogSelection:
    areaVisualEnvironmentCatalogSelectionMutationSchema.optional(),
  tiles: z.array(editableTileSchema).min(4).max(1024)
});

export interface AreaEditingExportDraftRequest {
  areaResRef: string;
  name: string;
  width: number;
  height: number;
  tilesetResRef: string;
  tilesetFingerprint: string;
  areaFingerprint?: string;
  comments?: ExistingAreaCommentsMutation;
  eventScripts?: ExistingAreaEventScriptMutations;
  basicIdentity?: ExistingAreaBasicIdentityMutations;
  advancedFlags?: ExistingAreaAdvancedFlagMutations;
  visualEnvironment?: ExistingAreaVisualEnvironmentMutation;
  visualEnvironmentScalarControls?: ExistingAreaVisualEnvironmentScalarControlsMutation;
  visualEnvironmentCatalogSelection?: ExistingAreaVisualEnvironmentCatalogSelectionMutation;
  tiles: Array<{
    row: number;
    col: number;
    sourceRow?: number;
    sourceCol?: number;
    tileId: number;
    orientation: number;
    height: number;
    mainLight1?: number;
    mainLight2?: number;
    sourceLight1?: number;
    sourceLight2?: number;
    animLoop1?: number;
    animLoop2?: number;
    animLoop3?: number;
  }>;
}

export function parseAreaEditingExportDraft(input: unknown): AreaEditingExportDraftRequest {
  const parsed = areaEditingExportSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data as AreaEditingExportDraftRequest;
  }
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Area editing export payload validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

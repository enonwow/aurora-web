import { AppException } from "../../../../../common/http/app-exception";
import {
  runtimeSettingsPayloadSchema,
  type RuntimeSettingsPayloadDto
} from "../../../domain/runtime-settings.schema";

export function parseReplaceRuntimeSettingsRequest(
  input: unknown
): RuntimeSettingsPayloadDto {
  const parsed = runtimeSettingsPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Runtime settings validation failed.",
    details: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}

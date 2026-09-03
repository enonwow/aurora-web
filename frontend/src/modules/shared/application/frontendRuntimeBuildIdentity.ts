export interface FrontendRuntimeBuildIdentity {
  readonly commit: string | null;
  readonly imageDigest: string | null;
  readonly builtAt: string | null;
}

export type FrontendRuntimeBuildEnvironment = Readonly<{
  VITE_RUNTIME_BUILD_COMMIT?: unknown;
  VITE_RUNTIME_BUILD_IMAGE_DIGEST?: unknown;
  VITE_RUNTIME_BUILD_BUILT_AT?: unknown;
}>;

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function readFrontendRuntimeBuildIdentity(
  environment: FrontendRuntimeBuildEnvironment = import.meta.env
): FrontendRuntimeBuildIdentity {
  return {
    commit: nonEmptyString(environment.VITE_RUNTIME_BUILD_COMMIT),
    imageDigest: nonEmptyString(environment.VITE_RUNTIME_BUILD_IMAGE_DIGEST),
    builtAt: nonEmptyString(environment.VITE_RUNTIME_BUILD_BUILT_AT)
  };
}
